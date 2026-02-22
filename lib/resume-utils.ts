export { validateJobDescription } from "@/lib/job-description";

export const sleep = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

export const convertFileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.addEventListener("load", () => {
      if (typeof reader.result !== "string") {
        reject(new Error("File reading failed"));
        return;
      }

      const base64Content = reader.result.split(",")[1];
      if (!base64Content) {
        reject(new Error("File reading failed"));
        return;
      }

      resolve(base64Content);
    });

    reader.addEventListener("error", () => {
      reject(new Error("File reading failed"));
    });

    reader.readAsDataURL(file);
  });

// Maximum allowed size for job description to prevent metadata issues
// S3 metadata has a 2KB limit, but job_description is stored in DynamoDB
// This limit ensures reasonable payload sizes
const MAX_JOB_DESCRIPTION_LENGTH = 10_000;
const LEGACY_SAFE_JOB_DESCRIPTION_LENGTH = 500;

// Maximum filename length to prevent S3 metadata issues
const MAX_FILENAME_LENGTH = 200;

export const sanitizeFilename = (filename: string): string => {
  // Get just the filename without path
  const base =
    filename.split("/").pop() || filename.split("\\").pop() || filename;

  // Remove or replace problematic characters, keep alphanumeric, dots, underscores, hyphens
  let safe = base.replaceAll(/[^\w.-]/g, "_");

  // Ensure it ends with .pdf
  if (!safe.toLowerCase().endsWith(".pdf")) {
    safe += ".pdf";
  }

  // Limit length to prevent S3 metadata size issues
  if (safe.length > MAX_FILENAME_LENGTH) {
    const ext = ".pdf";
    safe = safe.slice(0, MAX_FILENAME_LENGTH - ext.length) + ext;
  }

  return safe;
};

export const truncateJobDescription = (description: string): string => {
  if (description.length <= MAX_JOB_DESCRIPTION_LENGTH) {
    return description;
  }
  return description.slice(0, MAX_JOB_DESCRIPTION_LENGTH) + "... [truncated]";
};

export const validateFile = (file: File | null): null | string => {
  if (!file) return "Please provide both a PDF resume and a Job Description.";

  const hasPdfExtension = file.name.toLowerCase().endsWith(".pdf");
  if (!hasPdfExtension) {
    return "Please upload a PDF file.";
  }

  const hasPdfMimeType = file.type === "application/pdf";
  if (file.type && !hasPdfMimeType) {
    return "Please upload a PDF file.";
  }

  const maxSizeBytes = 5 * 1024 * 1024;
  if (file.size > maxSizeBytes) {
    return `File too large (${(file.size / 1024 / 1024).toFixed(2)}MB). Please use a PDF smaller than 5MB.`;
  }

  return null;
};

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

interface UploadResumeResponse {
  analysis_result?: string;
  job_id?: string;
}

const sendUploadRequest = async (requestBody: object): Promise<Response> =>
  fetch("/api/upload", {
    body: JSON.stringify(requestBody),
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  });

const getUploadErrorMessage = (errorData: {
  details?: string;
  error?: string;
}) =>
  errorData.error || errorData.details
    ? `${errorData.error ?? ""} ${errorData.details ?? ""}`.trim()
    : null;

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

  // Add all fields from the presigned URL (these include the metadata)
  for (const [key, value] of Object.entries(fields)) {
    formData.append(key, value);
  }

  // Add the file last (required by S3 presigned POST)
  formData.append("file", file);

  const response = await fetch(presignedUrl, {
    body: formData,
    method: "POST",
  });

  if (!response.ok) {
    const errorText = await response.text();
    // Check for S3 metadata size error
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
): Promise<void> => {
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

  const response = await fetch("/api/analyze", {
    body: JSON.stringify(payload),
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  if (!response.ok) {
    throw new Error(
      await getErrorMessageFromResponse(
        response,
        `Analysis trigger failed with status: ${response.status}`,
      ),
    );
  }
};

export const uploadResume = async (
  file: File,
  jobDescription: string,
): Promise<UploadResumeResponse> => {
  // Sanitize inputs to prevent metadata issues
  const sanitizedFilename = sanitizeFilename(file.name);
  const truncatedDescription = truncateJobDescription(jobDescription);

  // Step 1: Request a presigned URL from the backend
  const payload = {
    filename: sanitizedFilename,
    job_description: truncatedDescription,
  };

  let uploadResponse = await sendUploadRequest(payload);

  if (!uploadResponse.ok) {
    const errorData = (await uploadResponse.json().catch(() => ({}))) as {
      details?: string;
      error?: string;
    };
    const errorMessage =
      getUploadErrorMessage(errorData) ||
      `Upload failed with status: ${uploadResponse.status}`;
    const requiresLegacyBase64 = /pdf_base64/i.test(errorMessage);

    if (!requiresLegacyBase64) {
      throw new Error(errorMessage);
    }

    const pdfBase64 = await convertFileToBase64(file);
    const legacyPayload = {
      ...payload,
      job_description: truncatedDescription.slice(
        0,
        LEGACY_SAFE_JOB_DESCRIPTION_LENGTH,
      ),
      pdf_base64: pdfBase64,
    };
    uploadResponse = await sendUploadRequest(legacyPayload);

    if (!uploadResponse.ok) {
      const legacyErrorData = (await uploadResponse
        .json()
        .catch(() => ({}))) as {
        details?: string;
        error?: string;
      };
      const legacyErrorMessage =
        getUploadErrorMessage(legacyErrorData) ||
        `Upload failed with status: ${uploadResponse.status}`;

      if (!isMetadataTooLargeError(legacyErrorMessage)) {
        throw new Error(legacyErrorMessage);
      }

      // Final fallback for legacy backends that write request fields into S3 metadata.
      const metadataSafeLegacyPayload = {
        filename: "resume.pdf",
        pdf_base64: pdfBase64,
      };
      uploadResponse = await sendUploadRequest(metadataSafeLegacyPayload);

      if (!uploadResponse.ok) {
        const metadataSafeErrorData = (await uploadResponse
          .json()
          .catch(() => ({}))) as {
          details?: string;
          error?: string;
        };
        throw new Error(
          getUploadErrorMessage(metadataSafeErrorData) ||
            `Upload failed with status: ${uploadResponse.status}`,
        );
      }
    }
  }

  const uploadData = (await uploadResponse.json()) as PresignedUploadResponse;

  // Check if we got a presigned URL (expected flow)
  if (uploadData.upload?.url && uploadData.upload?.fields) {
    // Step 2: Upload PDF directly to S3 using presigned URL
    await uploadToS3(file, uploadData.upload.url, uploadData.upload.fields);

    // Step 3: Trigger analysis on the backend
    await triggerAnalysis(uploadData.job_id, {
      jobDescription: truncatedDescription,
      s3Url: uploadData.s3_url,
    });

    return { job_id: uploadData.job_id };
  }

  // Fallback: if response already has analysis_result (legacy/synchronous mode)
  const legacyData = uploadData as unknown as UploadResumeResponse;
  if (legacyData.analysis_result || legacyData.job_id) {
    return legacyData;
  }

  throw new Error("Unexpected response from upload endpoint");
};

export const pollForResults = async (
  jobId: string,
  onProgress: (message: string) => void,
): Promise<string> => {
  const statusUrl = `/api/status/${jobId}`;
  const maxAttempts = 150;
  let attempts = 0;

  while (attempts < maxAttempts) {
    attempts++;
    await sleep(2000);

    const statusResponse = await fetch(statusUrl);
    if (!statusResponse.ok) {
      throw new Error(
        await getErrorMessageFromResponse(
          statusResponse,
          "Status check failed.",
        ),
      );
    }

    const statusData = (await statusResponse.json()) as {
      analysis_result?: string;
      error?: string;
      status?: string;
    };

    if (statusData.status === "completed") {
      if (
        typeof statusData.analysis_result !== "string" ||
        !statusData.analysis_result.trim()
      ) {
        throw new Error("Analysis completed, but no result was returned.");
      }

      return statusData.analysis_result;
    }

    if (statusData.status === "failed") {
      throw new Error(statusData.error || "Analysis failed on server.");
    }

    onProgress("Analyzing...");
  }

  throw new Error("Request timed out.");
};
