export const MAX_JOB_DESCRIPTION_CHARS = 20_000;

const REQUIRED_JOB_DESCRIPTION_ERROR = "Please provide both a PDF resume and a Job Description.";

export const validateJobDescription = (jobDescription: string): null | string => {
  const trimmedDescription = jobDescription.trim();
  if (!trimmedDescription) {
    return REQUIRED_JOB_DESCRIPTION_ERROR;
  }

  const descriptionLength = trimmedDescription.length;
  if (descriptionLength > MAX_JOB_DESCRIPTION_CHARS) {
    return `Job description is too long (${descriptionLength} characters). Please keep it at ${MAX_JOB_DESCRIPTION_CHARS} characters or fewer.`;
  }

  return null;
};
