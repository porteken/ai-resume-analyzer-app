import { expect } from "@playwright/test";

import {
  createExactSizePDF,
  createLargePDF,
  createTestPDF,
  fillJobDescription,
  mockAPIResponses,
  submitForm,
  test,
  uploadFile,
} from "./helpers/fixtures";

test.describe("Error Handling", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("should show error for file larger than 5MB", async ({ page }) => {
    const largePDF = createLargePDF();

    await uploadFile(page, largePDF);
    await fillJobDescription(page, "Test job description");
    await submitForm(page);

    await expect(page.getByText(/file too large/i)).toBeVisible();
    await expect(page.getByText(/please use a pdf smaller than 5mb/i)).toBeVisible();
  });

  test("should not allow submission without file", async ({ page }) => {
    await fillJobDescription(page, "Test job description");

    const button = page.getByRole("button", { name: /analyze resume/i });
    await expect(button).toBeDisabled();
  });

  test("should not allow submission without job description", async ({ page }) => {
    const pdfFile = createTestPDF();
    await uploadFile(page, pdfFile);

    const button = page.getByRole("button", { name: /analyze resume/i });
    await expect(button).toBeDisabled();
  });

  test("should handle server errors gracefully", async ({ page }) => {
    await mockAPIResponses.mockServerError(page);

    const pdfFile = createTestPDF();
    await uploadFile(page, pdfFile);
    await fillJobDescription(page, "Test job");
    await submitForm(page);

    await expect(page.getByText(/server error/i)).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByText(/internal server error/i)).toBeVisible();

    const button = page.getByRole("button", { name: /analyze resume/i });
    await expect(button).toBeEnabled();
  });

  test("should handle network errors", async ({ page }) => {
    await mockAPIResponses.mockNetworkError(page);

    const pdfFile = createTestPDF();
    await uploadFile(page, pdfFile);
    await fillJobDescription(page, "Test job");
    await submitForm(page);

    await expect(page.getByText(/failed to upload resume|network error|fetch failed/i)).toBeVisible(
      {
        timeout: 10_000,
      }
    );
  });

  test("should handle failed job analysis", async ({ page }) => {
    await mockAPIResponses.mockFailedJob(page);

    const pdfFile = createTestPDF();
    await uploadFile(page, pdfFile);
    await fillJobDescription(page, "Test job");
    await submitForm(page);

    await expect(page.getByText(/pdf parsing failed|analysis failed/i)).toBeVisible({
      timeout: 10_000,
    });
  });

  test("should clear previous errors when submitting again", async ({ page }) => {
    await mockAPIResponses.mockServerError(page);

    const pdfFile = createTestPDF();
    await uploadFile(page, pdfFile);
    await fillJobDescription(page, "Test job");
    await submitForm(page);

    await expect(page.getByText(/server error/i)).toBeVisible({
      timeout: 10_000,
    });

    await mockAPIResponses.mockImmediateSuccess(page);

    await submitForm(page);

    await expect(page.getByText(/server error/i)).toBeHidden();
    await expect(page.getByText(/analysis complete/i)).toBeVisible({
      timeout: 10_000,
    });
  });

  test("should display error icon with error messages", async ({ page }) => {
    await mockAPIResponses.mockServerError(page);

    const pdfFile = createTestPDF();
    await uploadFile(page, pdfFile);
    await fillJobDescription(page, "Test job");
    await submitForm(page);

    const errorMessage = page.locator('.bg-red-50, [role="alert"]').first();
    await expect(errorMessage).toBeVisible({ timeout: 10_000 });
  });

  test("should handle empty API response gracefully", async ({ page }) => {
    await page.route("**/api/upload", async (route) => {
      await route.fulfill({
        body: JSON.stringify({}),
        contentType: "application/json",
        status: 200,
      });
    });

    const pdfFile = createTestPDF();
    await uploadFile(page, pdfFile);
    await fillJobDescription(page, "Test job");
    await submitForm(page);

    await expect(
      page.getByText(/unexpected response|no job_id or analysis_result found/i)
    ).toBeVisible({ timeout: 10_000 });
  });

  test("should preserve form data after error", async ({ page }) => {
    await mockAPIResponses.mockServerError(page);

    const jobDescription = "Senior Software Engineer with 5+ years experience";

    const pdfFile = createTestPDF();
    await uploadFile(page, pdfFile);
    await fillJobDescription(page, jobDescription);
    await submitForm(page);

    await expect(page.getByText(/server error/i)).toBeVisible({
      timeout: 10_000,
    });

    const textarea = page.getByLabel(/job description/i);
    await expect(textarea).toHaveValue(jobDescription);
  });

  test("should show appropriate error for oversized file", async ({ page }) => {
    const largePDF = createLargePDF();
    await uploadFile(page, largePDF);
    await fillJobDescription(page, "Test");
    await submitForm(page);

    const errorText = await page.getByText(/file too large/i).textContent();

    expect(errorText).toContain("MB");
    expect(errorText).toMatch(/\d/);
  });

  test("should accept file at exactly 5MB limit", async ({ page }) => {
    const exactSizePDF = createExactSizePDF(5);

    await mockAPIResponses.mockImmediateSuccess(page);

    await uploadFile(page, exactSizePDF);
    await fillJobDescription(page, "Test job");
    await submitForm(page);

    await expect(page.getByText(/file too large/i)).toBeHidden();

    await expect(page.getByText(/analysis complete/i)).toBeVisible({
      timeout: 10_000,
    });
  });
});
