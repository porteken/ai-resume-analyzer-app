import { convertFileToBase64 } from "@/features/resume-analysis/utils/file-conversion";
import {
  sanitizeFilename,
  truncateJobDescription,
} from "@/features/resume-analysis/utils/file-validation";
import { sleep } from "@/features/resume-analysis/utils/sleep";
import { throwIfAborted } from "@/lib/abort-utils";
import { ApiClientError, getJson, postJson } from "@/lib/api-client";
import { isObjectRecord } from "@/lib/type-guards";

import type { AnalysisResultData } from "@/types";

const LEGACY_SAFE_JOB_DESCRIPTION_LENGTH = 500;
const POLL_DELAY_BY_ATTEMPT_MS = [1000, 2000, 3000, 5000] as const;

type ApiErrorResponse = {
  details?: string;
  error?: string;
  type?: string;
};

type PresignedUploadResponse = {
  job_id: string;
  s3_url?: string;
  upload: {
    fields: PresignedUrlFields;
    url: string;
  };
};

type PresignedUrlFields = Record<string, string>;

type StatusResponseData = {
  analysis_result?: AnalysisResultData;
  error?: string;
  status?: string;
};

type UploadRequestOptions = {
  signal?: AbortSignal;
};

type UploadRequestPayload = {
  filename: string;
  job_description?: string;
  pdf_base64?: string;
};

type UploadResumeResponse = {
  analysis_result?: AnalysisResultData;
  job_id?: string;
};

const isAbortError = (error: unknown): boolean =>
  error instanceof Error && error.name === "AbortError";

const isStringRecord = (value: unknown): value is Record<string, string> =>
  isObjectRecord(value) &&
  Object.values(value).every((entry) => typeof entry === "string");

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

const isAnalysisResultData = (value: unknown): value is AnalysisResultData =>
  (typeof value === "string" && value.trim().length > 0) ||
  isObjectRecord(value);

const parseAnalysisResult = (value: unknown): AnalysisResultData | null =>
  isAnalysisResultData(value) ? value : null;

const parseApiErrorResponse = (value: unknown): ApiErrorResponse => {
  if (!isObjectRecord(value)) {
    return {};
  }

  return {
    details: typeof value.details === "string" ? value.details : undefined,
    error: typeof value.error === "string" ? value.error : undefined,
    type: typeof value.type === "string" ? value.type : undefined,
  };
};

const parseUploadResumeResponse = (
  value: unknown,
): null | UploadResumeResponse => {
  if (!isObjectRecord(value)) {
    return null;
  }

  const analysisResult = parseAnalysisResult(value.analysis_result);
  const jobId = isNonEmptyString(value.job_id) ? value.job_id : undefined;

  if (!analysisResult && !jobId) {
    return null;
  }

  const response: UploadResumeResponse = {};

  if (analysisResult !== null) {
    response.analysis_result = analysisResult;
  }

  if (jobId) {
    response.job_id = jobId;
  }

  return response;
};

const parsePresignedUploadResponse = (
  value: unknown,
): null | PresignedUploadResponse => {
  if (!isObjectRecord(value) || !isNonEmptyString(value.job_id)) {
    return null;
  }

  if (!isObjectRecord(value.upload) || !isNonEmptyString(value.upload.url)) {
    return null;
  }

  const { fields } = value.upload;
  if (!isStringRecord(fields)) {
    return null;
  }

  return {
    job_id: value.job_id,
    s3_url: isNonEmptyString(value.s3_url) ? value.s3_url : undefined,
    upload: {
      fields,
      url: value.upload.url,
    },
  };
};

const parseStatusResponse = (value: unknown): null | StatusResponseData => {
  if (!isObjectRecord(value)) {
    return null;
  }

  const analysisResult = parseAnalysisResult(value.analysis_result);
  const error = isNonEmptyString(value.error) ? value.error : undefined;
  const status = isNonEmptyString(value.status) ? value.status : undefined;

  if (!analysisResult && !error && !status) {
    return null;
  }

  return {
    analysis_result: analysisResult ?? undefined,
    error,
    status,
  };
};

const getPollDelayMs = (attempt: number): number =>
  POLL_DELAY_BY_ATTEMPT_MS[
    Math.min(attempt - 1, POLL_DELAY_BY_ATTEMPT_MS.length - 1)
  ] ?? 5000;

const sendUploadRequest = (
  requestBody: object,
  signal?: AbortSignal,
): Promise<Response> => postJson("/api/upload", requestBody, { signal });

const getUploadErrorMessage = (errorData: ApiErrorResponse) => {
  if (!errorData.error && !errorData.details) {
    return null;
  }

  if (errorData.error && errorData.details) {
    const separator = /[.!?]$/.test(errorData.error) ? " " : ": ";
    return `${errorData.error}${separator}${errorData.details}`.trim();
  }

  return errorData.error ?? errorData.details ?? null;
};

const isMetadataTooLargeError = (message: string): boolean =>
  /metadata(?:too| )large|metadata headers exceed/i.test(message);

const SERVICE_UNAVAILABLE_MESSAGE =
  "Analysis service is temporarily unavailable due to high demand. Please try again in a few minutes.";

const getErrorMessageFromError = (
  error: unknown,
  fallbackMessage: string,
): string => {
  if (error instanceof ApiClientError) {
    const errorData = parseApiErrorResponse(error.data);
    const message = getUploadErrorMessage(errorData);

    if (message) {
      return message;
    }

    if (error.status === 503 && errorData.type === "ServiceUnavailable") {
      return SERVICE_UNAVAILABLE_MESSAGE;
    }

    return error.message || fallbackMessage;
  }

  if (error instanceof Error && error.message.trim() !== "") {
    return error.message;
  }

  return fallbackMessage;
};

const getUploadFailureMessage = (error: unknown): string =>
  getErrorMessageFromError(
    error,
    error instanceof ApiClientError
      ? `Upload failed with status: ${error.status}`
      : "Upload failed.",
  );

const sendMetadataSafeLegacyUploadRequest = async (
  pdfBase64: string,
  signal?: AbortSignal,
): Promise<Response> => {
  const metadataSafeLegacyPayload: UploadRequestPayload = {
    filename: "resume.pdf",
    pdf_base64: pdfBase64,
  };

  try {
    return await sendUploadRequest(metadataSafeLegacyPayload, signal);
  } catch (error) {
    if (isAbortError(error)) {
      throw error;
    }

    throw new Error(getUploadFailureMessage(error), { cause: error });
  }
};

const sendLegacyUploadRequest = async (
  file: File,
  payload: UploadRequestPayload,
  truncatedDescription: string,
  signal?: AbortSignal,
): Promise<Response> => {
  const pdfBase64 = await convertFileToBase64(file);
  const legacyPayload: UploadRequestPayload = {
    ...payload,
    job_description: truncatedDescription.slice(
      0,
      LEGACY_SAFE_JOB_DESCRIPTION_LENGTH,
    ),
    pdf_base64: pdfBase64,
  };

  try {
    return await sendUploadRequest(legacyPayload, signal);
  } catch (error) {
    if (isAbortError(error)) {
      throw error;
    }

    const legacyErrorMessage = getUploadFailureMessage(error);

    if (!isMetadataTooLargeError(legacyErrorMessage)) {
      throw new Error(legacyErrorMessage, { cause: error });
    }

    return sendMetadataSafeLegacyUploadRequest(pdfBase64, signal);
  }
};

const getStatusResponse = async (
  statusUrl: string,
  signal?: AbortSignal,
): Promise<Response> => {
  try {
    return await getJson(statusUrl, { signal });
  } catch (error) {
    if (isAbortError(error)) {
      throw error;
    }

    throw new Error(
      getErrorMessageFromError(
        error,
        error instanceof ApiClientError
          ? `Status check failed with status: ${error.status}`
          : "Status check failed.",
      ),
      { cause: error },
    );
  }
};

const pollUntilComplete = async (
  statusUrl: string,
  onProgress: (message: string) => void,
  signal: AbortSignal | undefined,
  attempt: number,
  maxAttempts: number,
): Promise<AnalysisResultData> => {
  if (attempt > maxAttempts) {
    throw new Error("Request timed out.");
  }

  await sleep(getPollDelayMs(attempt), signal);
  throwIfAborted(signal);

  const statusResponse = await getStatusResponse(statusUrl, signal);
  const statusJson = await statusResponse.json().catch(() => null);
  const statusData = parseStatusResponse(statusJson);

  if (!statusData) {
    throw new Error("Unexpected response from status endpoint.");
  }

  const completedResult = getCompletedPollResult(statusData);
  if (completedResult !== null) {
    return completedResult;
  }

  if (statusData.status === "failed") {
    throw new Error(statusData.error || "Analysis failed on server.");
  }

  onProgress("Analyzing Resume...");

  return pollUntilComplete(
    statusUrl,
    onProgress,
    signal,
    attempt + 1,
    maxAttempts,
  );
};

const getCompletedPollResult = (
  statusData: StatusResponseData,
): AnalysisResultData | null => {
  const analysisResult = statusData.analysis_result;

  if (analysisResult !== undefined) {
    return analysisResult;
  }

  if (statusData.status !== "completed") {
    return null;
  }

  assertCompletedPollResult(analysisResult);
  return analysisResult;
};

/**
 * Uploads a PDF directly to S3 using a presigned URL.
 *
 * This avoids metadata size issues by using the presigned POST flow.
 *
 * @param {File} file - The resume PDF to upload.
 * @param {string} presignedUrl - The S3 presigned POST endpoint.
 * @param {PresignedUrlFields} fields - The S3 form fields required for the upload.
 * @param {AbortSignal | undefined} signal - Optional abort signal for cancelling the upload.
 * @returns {Promise<void>} A promise that resolves when the upload completes successfully.
 */
const uploadToS3 = async (
  file: File,
  presignedUrl: string,
  fields: PresignedUrlFields,
  signal?: AbortSignal,
): Promise<void> => {
  throwIfAborted(signal);

  const formData = new FormData();

  for (const [key, value] of Object.entries(fields)) {
    formData.append(key, value);
  }

  formData.append("file", file);

  const uploadUrl = new URL(
    presignedUrl,
    globalThis.location?.href ?? "http://localhost",
  );
  const requestMode: RequestMode =
    uploadUrl.origin === globalThis.location?.origin ? "cors" : "no-cors";

  const response = await fetch(presignedUrl, {
    body: formData,
    method: "POST",
    mode: requestMode,
    signal,
  });

  if (response.type === "opaque") {
    return;
  }

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

const triggerAnalysis = async (
  jobId: string,
  options?: {
    jobDescription?: string;
    s3Url?: string;
  },
  signal?: AbortSignal,
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

  throwIfAborted(signal);

  let response: Response;

  try {
    response = await postJson("/api/analyze", payload, { signal });
  } catch (error) {
    if (isAbortError(error)) {
      throw error;
    }

    throw new Error(
      getErrorMessageFromError(
        error,
        error instanceof ApiClientError
          ? `Analysis trigger failed with status: ${error.status}`
          : "Analysis trigger failed.",
      ),
      { cause: error },
    );
  }

  const contentType = response.headers?.get?.("content-type");
  if (!contentType?.includes("application/json")) {
    return null;
  }

  const responseData = await response.json().catch(() => null);
  return parseUploadResumeResponse(responseData);
};

const sendUploadRequestWithFallbacks = async (
  file: File,
  payload: UploadRequestPayload,
  truncatedDescription: string,
  signal?: AbortSignal,
): Promise<Response> => {
  throwIfAborted(signal);

  try {
    return await sendUploadRequest(payload, signal);
  } catch (error) {
    if (isAbortError(error)) {
      throw error;
    }

    const errorMessage = getUploadFailureMessage(error);

    if (!/pdf_base64/i.test(errorMessage)) {
      throw new Error(errorMessage, { cause: error });
    }

    throwIfAborted(signal);

    return sendLegacyUploadRequest(file, payload, truncatedDescription, signal);
  }
};

export const uploadResume = async (
  file: File,
  jobDescription: string,
  onProgress?: (message: string) => void,
  options?: UploadRequestOptions,
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
    options?.signal,
  );

  const uploadJson = await uploadResponse.json().catch(() => null);
  const uploadData = parsePresignedUploadResponse(uploadJson);

  if (uploadData) {
    onProgress?.("Uploading Resume...");
    await uploadToS3(
      file,
      uploadData.upload.url,
      uploadData.upload.fields,
      options?.signal,
    );

    onProgress?.("Analyzing Resume...");
    const analyzeResponse = await triggerAnalysis(
      uploadData.job_id,
      {
        jobDescription: truncatedDescription,
        s3Url: uploadData.s3_url,
      },
      options?.signal,
    );

    if (analyzeResponse?.analysis_result) {
      return {
        analysis_result: analyzeResponse.analysis_result,
        job_id: analyzeResponse.job_id ?? uploadData.job_id,
      };
    }

    return { job_id: uploadData.job_id };
  }

  const legacyData = parseUploadResumeResponse(uploadJson);
  if (legacyData) {
    return legacyData;
  }

  throw new Error("Unexpected response from upload endpoint.");
};

export const pollForResults = async (
  jobId: string,
  onProgress: (message: string) => void,
  options?: UploadRequestOptions,
): Promise<AnalysisResultData> => {
  const statusUrl = `/api/status/${jobId}`;
  const maxAttempts = 150;

  return pollUntilComplete(
    statusUrl,
    onProgress,
    options?.signal,
    1,
    maxAttempts,
  );
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
