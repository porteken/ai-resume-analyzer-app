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
    const longDescription = "A".repeat(10_000);

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
    const fileName = await fileInput.evaluate((el: HTMLInputElement) => {
      return el.files?.[0]?.name || "";
    });

    expect(fileName).toBe("resume.pdf");
  });

  test("should handle file at boundary (4.99 MB)", async ({ page }) => {
    await mockAPIResponses.mockImmediateSuccess(page);

    const boundaryPDF = createExactSizePDF(4.99);

    await uploadFile(page, boundaryPDF);
    await fillJobDescription(page, "Test job");
    await submitForm(page);

    await expect(page.getByText(/file too large/i)).not.toBeVisible();
    await expect(page.getByText(/analysis complete/i)).toBeVisible({
      timeout: 10_000,
    });
  });

  test("should handle file just over limit (5.01 MB)", async ({ page }) => {
    const overLimitPDF = createExactSizePDF(5.01);

    await uploadFile(page, overLimitPDF);
    await fillJobDescription(page, "Test job");
    await submitForm(page);

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

      await (pollCount >= 10
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

    await expect(
      page.getByText(/no result was returned|unexpected|error/i),
    ).toBeVisible({
      timeout: 10_000,
    });
  });
});
