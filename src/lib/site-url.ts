export const SITE_NAME = "AI Resume Analyzer";
export const SITE_DESCRIPTION =
  "Upload your resume to match against any job description using Gemini 3 Flash AI.";

const DEFAULT_SITE_URL = "http://localhost:3000";

const normalizeSiteUrl = (value?: null | string): null | string => {
  if (typeof value !== "string" || value.trim() === "") {
    return null;
  }

  const candidate = /^https?:\/\//i.test(value) ? value : `https://${value}`;

  try {
    const url = new URL(candidate);
    url.pathname = "";
    url.search = "";
    url.hash = "";
    return url.toString().replace(/\/$/, "");
  } catch {
    return null;
  }
};

export const getSiteUrl = (): string =>
  normalizeSiteUrl(process.env.NEXT_PUBLIC_SITE_URL) ??
  normalizeSiteUrl(process.env.VERCEL_PROJECT_PRODUCTION_URL) ??
  normalizeSiteUrl(process.env.VERCEL_URL) ??
  DEFAULT_SITE_URL;
