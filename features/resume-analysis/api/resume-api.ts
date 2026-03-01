import { getJson, postJson } from "@/features/resume-analysis/api/api-client";
import { type AnalysisResultData } from "@/features/resume-analysis/types/analysis";
import { convertFileToBase64 } from "@/features/resume-analysis/utils/file-conversion";
import {
  sanitizeFilename,
  truncateJobDescription,
} from "@/features/resume-analysis/utils/file-validation";
import { sleep } from "@/features/resume-analysis/utils/sleep";

const LEGACY_SAFE_JOB_DESCRIPTION_LENGTH = 500;

interface ApiErrorResponse {
  details?: string;
  error?: string;
  type?: string;
}

interface PresignedUploadResponse {
  expires_in: number;
  job_id: string;
  s3_key: string;
  s3_url: string;
  status: string;
  upload: {
    fields: PresignedUrlFields;
    url: string;
  };
}

interface PresignedUrlFields {
  [key: string]: string;
  AWSAccessKeyId: string;
  "Content-Type": string;
  key: string;
  policy: string;
  signature: string;
  "x-amz-meta-filename": string;
  "x-amz-meta-job_id": string;
}

interface UploadRequestPayload {
  filename: string;
  job_description?: string;
  pdf_base64?: string;
}

interface UploadResumeResponse {
  analysis_result?: AnalysisResultData;
  job_id?: string;
}

const isObjectRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const hasAnalysisResult = (
  value: unknown,
): value is { analysis_result: AnalysisResultData; job_id?: string } => {
  if (!isObjectRecord(value) || !("analysis_result" in value)) {
    return false;
  }

  const analysisResult = value.analysis_result;

  if (typeof analysisResult === "string") {
    return analysisResult.trim().length > 0;
  }

  return isObjectRecord(analysisResult);
};

const sendUploadRequest = async (requestBody: object): Promise<Response> =>
  postJson("/api/upload", requestBody);

const getUploadErrorMessage = (errorData: {
  details?: string;
  error?: string;
}) =>
  errorData.error || errorData.details
    ? `${errorData.error ?? ""} ${errorData.details ?? ""}`.trim()
    : null;

const getUploadFailureMessage = async (response: Response): Promise<string> => {
  const errorData = (await response.json().catch(() => ({}))) as {
    details?: string;
    error?: string;
  };

  return (
    getUploadErrorMessage(errorData) ||
    `Upload failed with status: ${response.status}`
  );
};

const isMetadataTooLargeError = (message: string): boolean =>
  /metadata(?:too| )large|metadata headers exceed/i.test(message);

const SERVICE_UNAVAILABLE_MESSAGE =
  "Analysis service is temporarily unavailable due to high demand. Please try again in a few minutes.";

const getErrorMessageFromResponse = async (
  response: Response,
  fallbackMessage: string,
): Promise<string> => {
  const errorData = (await response
    .json()
    .catch(() => ({}))) as ApiErrorResponse;
  const message = getUploadErrorMessage(errorData);

  if (message) {
    return message;
  }

  if (response.status === 503 && errorData.type === "ServiceUnavailable") {
    return SERVICE_UNAVAILABLE_MESSAGE;
  }

  return fallbackMessage;
};

/**
 * Uploads a PDF directly to S3 using a presigned URL
 * This avoids metadata size issues by using the presigned POST flow
 */
const uploadToS3 = async (
  file: File,
  presignedUrl: string,
  fields: PresignedUrlFields,
): Promise<void> => {
  const formData = new FormData();

  for (const [key, value] of Object.entries(fields)) {
    formData.append(key, value);
  }

  formData.append("file", file);

  const response = await fetch(presignedUrl, {
    body: formData,
    method: "POST",
  });

  if (!response.ok) {
    const errorText = await response.text();

    if (
      errorText.includes("MetadataTooLarge") ||
      errorText.includes("metadata headers exceed")
    ) {
      throw new Error(
        "File metadata is too large. Please try renaming your PDF file to be shorter.",
      );
    }
    throw new Error(
      `S3 upload failed: ${response.status} ${response.statusText}`,
    );
  }
};

/**
 * Triggers analysis on the backend after PDF is uploaded to S3
 */
const triggerAnalysis = async (
  jobId: string,
  options?: {
    jobDescription?: string;
    s3Url?: string;
  },
): Promise<null | UploadResumeResponse> => {
  const payload: {
    job_description?: string;
    job_id: string;
    s3_url?: string;
  } = { job_id: jobId };

  if (options?.s3Url) {
    payload.s3_url = options.s3Url;
  }

  if (options?.jobDescription) {
    payload.job_description = options.jobDescription;
  }

  const response = await postJson("/api/analyze", payload);

  if (!response.ok) {
    throw new Error(
      await getErrorMessageFromResponse(
        response,
        `Analysis trigger failed with status: ${response.status}`,
      ),
    );
  }

  const contentType = response.headers?.get?.("content-type");
  if (!contentType?.includes("application/json")) {
    return null;
  }

  const responseData = (await response.json()) as unknown;
  if (hasAnalysisResult(responseData)) {
    return responseData;
  }

  if (
    isObjectRecord(responseData) &&
    "job_id" in responseData &&
    typeof responseData.job_id === "string"
  ) {
    return { job_id: responseData.job_id };
  }

  return null;
};

const sendUploadRequestWithFallbacks = async (
  file: File,
  payload: UploadRequestPayload,
  truncatedDescription: string,
): Promise<Response> => {
  let uploadResponse = await sendUploadRequest(payload);

  if (uploadResponse.ok) {
    return uploadResponse;
  }

  const errorMessage = await getUploadFailureMessage(uploadResponse);
  if (!/pdf_base64/i.test(errorMessage)) {
    throw new Error(errorMessage);
  }

  const pdfBase64 = await convertFileToBase64(file);
  const legacyPayload: UploadRequestPayload = {
    ...payload,
    job_description: truncatedDescription.slice(
      0,
      LEGACY_SAFE_JOB_DESCRIPTION_LENGTH,
    ),
    pdf_base64: pdfBase64,
  };
  uploadResponse = await sendUploadRequest(legacyPayload);

  if (uploadResponse.ok) {
    return uploadResponse;
  }

  const legacyErrorMessage = await getUploadFailureMessage(uploadResponse);
  if (!isMetadataTooLargeError(legacyErrorMessage)) {
    throw new Error(legacyErrorMessage);
  }

  const metadataSafeLegacyPayload: UploadRequestPayload = {
    filename: "resume.pdf",
    pdf_base64: pdfBase64,
  };
  uploadResponse = await sendUploadRequest(metadataSafeLegacyPayload);

  if (uploadResponse.ok) {
    return uploadResponse;
  }

  throw new Error(await getUploadFailureMessage(uploadResponse));
};

export const uploadResume = async (
  file: File,
  jobDescription: string,
  onProgress?: (message: string) => void,
): Promise<UploadResumeResponse> => {
  const sanitizedFilename = sanitizeFilename(file.name);
  const truncatedDescription = truncateJobDescription(jobDescription);

  const payload = {
    filename: sanitizedFilename,
    job_description: truncatedDescription,
  };
  const uploadResponse = await sendUploadRequestWithFallbacks(
    file,
    payload,
    truncatedDescription,
  );

  const uploadData = (await uploadResponse.json()) as PresignedUploadResponse;

  if (uploadData.upload?.url && uploadData.upload?.fields) {
    onProgress?.("Uploading Resume...");
    await uploadToS3(file, uploadData.upload.url, uploadData.upload.fields);

    onProgress?.("Analyzing Resume...");
    const analyzeResponse = await triggerAnalysis(uploadData.job_id, {
      jobDescription: truncatedDescription,
      s3Url: uploadData.s3_url,
    });

    if (analyzeResponse?.analysis_result) {
      return {
        analysis_result: analyzeResponse.analysis_result,
        job_id: analyzeResponse.job_id ?? uploadData.job_id,
      };
    }

    return { job_id: uploadData.job_id };
  }

  const legacyData = uploadData as unknown as UploadResumeResponse;
  if (legacyData.analysis_result || legacyData.job_id) {
    return legacyData;
  }

  throw new Error("Unexpected response from upload endpoint");
};

export const pollForResults = async (
  jobId: string,
  onProgress: (message: string) => void,
): Promise<AnalysisResultData> => {
  const statusUrl = `/api/status/${jobId}`;
  const maxAttempts = 150;
  let attempts = 0;

  while (attempts < maxAttempts) {
    attempts++;
    await sleep(2000);

    const statusResponse = await getJson(statusUrl);
    if (!statusResponse.ok) {
      throw new Error(
        await getErrorMessageFromResponse(
          statusResponse,
          "Status check failed.",
        ),
      );
    }

    const statusData = (await statusResponse.json()) as {
      analysis_result?: AnalysisResultData;
      error?: string;
      status?: string;
    };

    if (hasAnalysisResult(statusData)) {
      return statusData.analysis_result;
    }

    if (statusData.status === "completed") {
      const analysisResult = statusData.analysis_result;
      assertCompletedPollResult(analysisResult);
      return analysisResult;
    }

    if (statusData.status === "failed") {
      throw new Error(statusData.error || "Analysis failed on server.");
    }

    onProgress("Analyzing Resume...");
  }

  throw new Error("Request timed out.");
};

function assertCompletedPollResult(
  analysisResult: AnalysisResultData | undefined,
): asserts analysisResult is AnalysisResultData {
  if (typeof analysisResult === "string" && !analysisResult.trim()) {
    throw new Error("Analysis completed, but no result was returned.");
  }

  if (!analysisResult) {
    throw new Error("Analysis completed, but no result was returned.");
  }
}
