export const sleep = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

export const convertFileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);

    reader.addEventListener("load", () => {
      const result = reader.result as string;
      const base64String = result.split(",")[1];
      resolve(base64String);
    });

    reader.addEventListener("error", () => {
      reject(
        new Error(
          `File reading failed: ${reader.error?.message || "Unknown error"}`,
        ),
      );
    });
  });
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

export const validateJobDescription = (
  jobDescription: string,
): null | string =>
  jobDescription.trim()
    ? null
    : "Please provide both a PDF resume and a Job Description.";

interface UploadResumeResponse {
  analysis_result?: string;
  job_id?: string;
}

export const uploadResume = async (
  file: File,
  jobDescription: string,
): Promise<UploadResumeResponse> => {
  const pdfBase64 = await convertFileToBase64(file);

  const payload = {
    filename: file.name,
    job_description: jobDescription,
    pdf_base64: pdfBase64,
  };

  const uploadResponse = await fetch("/api/upload", {
    body: JSON.stringify(payload),
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  if (!uploadResponse.ok) {
    const errorData = (await uploadResponse.json().catch(() => ({}))) as {
      details?: string;
      error?: string;
    };

    throw new Error(
      errorData.error ||
        errorData.details ||
        `Upload failed with status: ${uploadResponse.status}`,
    );
  }

  return uploadResponse.json();
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
    if (!statusResponse.ok) throw new Error("Status check failed.");

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

    onProgress(`Analyzing... (Attempt ${attempts})`);
  }

  throw new Error("Request timed out.");
};
