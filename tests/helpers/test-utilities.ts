import type { Page } from "@playwright/test";

import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

/**
 * Common test selectors
 */
export const selectors = {
  analysisComplete: /analysis complete/i,
  analyzeButton: /analyze resume/i,
  analyzing: /analyzing/i,
  fileInput: /resume \(pdf\)/i,
  fileTooLarge: /file too large/i,
  gaps: /gaps/i,
  heading: /ai resume analyzer/i,
  jobDescription: /job description/i,
  matchScore: /match score/i,
  networkError: /failed to upload resume|network error|fetch failed/i,
  pdfParsingFailed: /pdf parsing failed|analysis failed/i,
  recommendations: /recommendations/i,
  serverError: /server error/i,
  strengths: /strengths/i,
} as const;

/**
 * Common test data
 */
export const testData = {
  files: {
    largePdf: "large.pdf",
    resumePdf: "resume.pdf",
  },
  jobDescriptions: {
    detailed: "Senior Software Engineer with 5+ years experience",
    short: "Test job",
    standard: "Software Engineer position",
  },
} as const;

/**
 * Vitest helper to fill and submit the resume form
 */
export async function fillAndSubmitForm(options: {
  file: File;
  jobDescription: string;
}) {
  const user = userEvent.setup();

  const fileInput = screen.getByLabelText(selectors.fileInput);
  const textarea = screen.getByLabelText(selectors.jobDescription);
  const button = screen.getByRole("button", { name: selectors.analyzeButton });

  await user.upload(fileInput, options.file);
  await user.type(textarea, options.jobDescription);
  await user.click(button);
}

/**
 * Playwright helper to fill and submit the resume form
 */
export async function fillAndSubmitFormPlaywright(
  page: Page,
  options: {
    fileBuffer: Buffer;
    fileName?: string;
    jobDescription: string;
  },
) {
  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles({
    buffer: options.fileBuffer,
    mimeType: "application/pdf",
    name: options.fileName || "resume.pdf",
  });

  const textarea = page.getByLabel(selectors.jobDescription);
  await textarea.fill(options.jobDescription);

  const button = page.getByRole("button", { name: selectors.analyzeButton });
  await button.click();
}
