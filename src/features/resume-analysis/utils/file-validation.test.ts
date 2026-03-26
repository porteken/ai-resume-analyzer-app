import { describe, expect, it } from "vitest";

import {
  sanitizeFilename,
  truncateJobDescription,
  validateFile,
} from "@/features/resume-analysis/utils/file-validation";

describe("file-validation utilities", () => {
  it("sanitizes filenames and appends a pdf extension when needed", () => {
    expect(sanitizeFilename("resume (final) v2")).toBe("resume__final__v2.pdf");
  });

  it("truncates long filenames while keeping a pdf extension", () => {
    const sanitized = sanitizeFilename(`${"a".repeat(250)}.txt`);

    expect(sanitized).toHaveLength(200);
    expect(sanitized.endsWith(".pdf")).toBe(true);
  });

  it("truncates long job descriptions for legacy fallback payloads", () => {
    const description = "a".repeat(10_001);
    const truncated = truncateJobDescription(description);

    expect(truncated).toHaveLength(10_015);
    expect(truncated.endsWith("... [truncated]")).toBe(true);
  });

  it("allows pdf files without a declared mime type", () => {
    const file = new File(["pdf-content"], "resume.pdf");

    expect(validateFile(file)).toBeNull();
  });

  it("rejects missing, non-pdf, and oversized files", () => {
    const nonPdfFile = new File(["text"], "resume.txt", {
      type: "text/plain",
    });
    const oversizedFile = new File(["pdf-content"], "resume.pdf", {
      type: "application/pdf",
    });

    Object.defineProperty(oversizedFile, "size", {
      value: 6 * 1024 * 1024,
    });

    expect(validateFile(null)).toBe("Please provide both a PDF resume and a Job Description.");
    expect(validateFile(nonPdfFile)).toBe("Please upload a PDF file.");
    expect(validateFile(oversizedFile)).toBe(
      "File too large (6.00MB). Please use a PDF smaller than 5MB."
    );
  });
});
