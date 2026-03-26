const MAX_FILENAME_LENGTH = 200;
const MAX_JOB_DESCRIPTION_LENGTH = 10_000;

export const sanitizeFilename = (filename: string): string => {
  const base = filename.split("/").pop() || filename.split("\\").pop() || filename;

  let safe = base.replaceAll(/[^\w.-]/g, "_");

  if (!safe.toLowerCase().endsWith(".pdf")) {
    safe += ".pdf";
  }

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
