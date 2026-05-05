import { expect } from "@playwright/test";

import {
  createExactSizePDF,
  createTestPDF,
  fillJobDescription,
  mockAPIResponses,
  submitForm,
  test,
  uploadFile,
} from "./helpers/fixtures";

test.describe("Job Description Edge Cases", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("should handle empty job description with whitespace only", async ({
    page,
  }) => {
    const pdfFile = createTestPDF();
    await uploadFile(page, pdfFile);
    await fillJobDescription(page, "   ");

    const button = page.getByRole("button", { name: /analyze resume/i });
    await expect(button).toBeDisabled();
  });

  test("should handle very long job description", async ({ page }) => {
    await mockAPIResponses.mockImmediateSuccess(page);

    const pdfFile = createTestPDF();
    const LONG_DESCRIPTION_LENGTH = 10_000;
    const longDescription = "A".repeat(LONG_DESCRIPTION_LENGTH);

    await uploadFile(page, pdfFile);
    await fillJobDescription(page, longDescription);
    await submitForm(page);

    await expect(page.getByText(/analysis complete/i)).toBeVisible({
      timeout: 10_000,
    });
  });

  test("should handle special characters in job description", async ({
    page,
  }) => {
    await mockAPIResponses.mockImmediateSuccess(page);

    const pdfFile = createTestPDF();
    const specialChars = "Software Engineer <>&\"'`!@#$%^&*()[]{}";

    await uploadFile(page, pdfFile);
    await fillJobDescription(page, specialChars);
    await submitForm(page);

    await expect(page.getByText(/analysis complete/i)).toBeVisible({
      timeout: 10_000,
    });
  });
});

test.describe("File Upload Edge Cases", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("should handle multiple rapid file uploads", async ({ page }) => {
    const pdfFile1 = createTestPDF();
    const pdfFile2 = createTestPDF();

    await uploadFile(page, pdfFile1);
    await uploadFile(page, pdfFile2);

    const fileInput = page.locator('input[type="file"]');
    await expect(fileInput).toHaveValue(/resume\.pdf$/);
  });

  test("should handle file at boundary (4.99 MB)", async ({ page }) => {
    await mockAPIResponses.mockImmediateSuccess(page);

    const BOUNDARY_SIZE_MB = 4.99;
    const boundaryPDF = createExactSizePDF(BOUNDARY_SIZE_MB);

    await uploadFile(page, boundaryPDF);
    await fillJobDescription(page, "Test job");
    await submitForm(page);

    await expect(page.getByText(/file too large/i)).toBeHidden();
    await expect(page.getByText(/analysis complete/i)).toBeVisible({
      timeout: 10_000,
    });
  });

  test("should handle file just over limit (5.01 MB)", async ({ page }) => {
    const OVER_LIMIT_SIZE_MB = 5.01;
    const overLimitPDF = createExactSizePDF(OVER_LIMIT_SIZE_MB);

    await uploadFile(page, overLimitPDF);
    await fillJobDescription(page, "Test job");

    await expect(page.getByText(/file too large/i)).toBeVisible();
  });
});

test.describe("Analysis and Processing Edge Cases", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("should handle analysis result with empty sections", async ({
    page,
  }) => {
    await page.route("**/api/upload", async (route) => {
      await route.fulfill({
        body: JSON.stringify({
          analysis_result:
            "## Match Score\n\n## Strengths\n\n## Gaps\n\n## Recommendations\n",
        }),
        contentType: "application/json",
        status: 200,
      });
    });

    const pdfFile = createTestPDF();
    await uploadFile(page, pdfFile);
    await fillJobDescription(page, "Test job");
    await submitForm(page);

    await expect(page.getByText(/analysis complete/i)).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByText(/strengths/i)).toBeVisible();
    await expect(page.getByText(/gaps/i)).toBeVisible();
    await expect(page.getByText(/recommendations/i)).toBeVisible();
  });

  test("should handle analysis result with only match score", async ({
    page,
  }) => {
    await page.route("**/api/upload", async (route) => {
      await route.fulfill({
        body: JSON.stringify({
          analysis_result: "## Match Score\n75% match",
        }),
        contentType: "application/json",
        status: 200,
      });
    });

    const pdfFile = createTestPDF();
    await uploadFile(page, pdfFile);
    await fillJobDescription(page, "Test job");
    await submitForm(page);

    await expect(page.getByText(/analysis complete/i)).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByText(/75% match/i)).toBeVisible();
  });

  test("should handle malformed markdown in analysis result", async ({
    page,
  }) => {
    await page.route("**/api/upload", async (route) => {
      await route.fulfill({
        body: JSON.stringify({
          analysis_result:
            "### Wrong Header Level\nSome content\n\n**Bold *italic** mismatch",
        }),
        contentType: "application/json",
        status: 200,
      });
    });

    const pdfFile = createTestPDF();
    await uploadFile(page, pdfFile);
    await fillJobDescription(page, "Test job");
    await submitForm(page);

    await expect(page.getByText(/analysis complete/i)).toBeVisible({
      timeout: 10_000,
    });
  });

  test("should handle slow polling responses", async ({ page }) => {
    const jobId = "slow-job-123";
    let pollCount = 0;

    await page.route("**/api/upload", async (route) => {
      await route.fulfill({
        body: JSON.stringify({ job_id: jobId }),
        contentType: "application/json",
        status: 200,
      });
    });

    await page.route(`**/api/status/${jobId}`, async (route) => {
      pollCount++;

      const REQUIRED_POLL_COUNT = 6;
      // eslint-disable-next-line vitest/no-conditional-in-test
      await (pollCount >= REQUIRED_POLL_COUNT
        ? route.fulfill({
            body: JSON.stringify({
              analysis_result: "## Match Score\n80% match",
              status: "completed",
            }),
            contentType: "application/json",
            status: 200,
          })
        : route.fulfill({
            body: JSON.stringify({ status: "processing" }),
            contentType: "application/json",
            status: 200,
          }));
    });

    const pdfFile = createTestPDF();
    await uploadFile(page, pdfFile);
    await fillJobDescription(page, "Test job");
    await submitForm(page);

    await expect(page.getByText(/analyzing/i).first()).toBeVisible();
    await expect(page.getByText(/analysis complete/i)).toBeVisible({
      timeout: 30_000,
    });
  });

  test("should handle missing analysis_result in completed status", async ({
    page,
  }) => {
    const jobId = "incomplete-job-123";

    await page.route("**/api/upload", async (route) => {
      await route.fulfill({
        body: JSON.stringify({ job_id: jobId }),
        contentType: "application/json",
        status: 200,
      });
    });

    await page.route(`**/api/status/${jobId}`, async (route) => {
      await route.fulfill({
        body: JSON.stringify({ status: "completed" }),
        contentType: "application/json",
        status: 200,
      });
    });

    const pdfFile = createTestPDF();
    await uploadFile(page, pdfFile);
    await fillJobDescription(page, "Test job");
    await submitForm(page);

    await expect(page.getByTestId("analysis-error")).toContainText(
      /no result was returned|unexpected|error/i,
      { timeout: 10_000 },
    );
  });
});
