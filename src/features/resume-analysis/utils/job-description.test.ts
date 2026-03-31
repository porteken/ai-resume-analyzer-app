import { describe, expect, it } from "vitest";

import {
  MAX_JOB_DESCRIPTION_CHARS,
  validateJobDescription,
} from "@/features/resume-analysis/utils/job-description";

describe("validateJobDescription", () => {
  it("returns error for empty or whitespace-only input", () => {
    expect(validateJobDescription("   ")).toBe(
      "Please provide both a PDF resume and a Job Description.",
    );
  });

  it("returns null for valid job description", () => {
    expect(validateJobDescription("Software Engineer position")).toBeNull();
  });

  it("returns error for descriptions that exceed the character limit", () => {
    const tooLongDescription = "a".repeat(MAX_JOB_DESCRIPTION_CHARS + 1);
    const result = validateJobDescription(tooLongDescription);
    expect(result).toContain("Job description is too long");
    expect(result).toContain(`${MAX_JOB_DESCRIPTION_CHARS}`);
  });
});
