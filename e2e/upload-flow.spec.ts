import { expect } from "@playwright/test";

import {
  createTestPDF,
  fillJobDescription,
  mockAPIResponses,
  submitForm,
  test,
  uploadFile,
} from "./helpers/fixtures";

test.describe("Resume Analysis Flow", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("should successfully upload and analyze resume with immediate result @smoke", async ({
    page,
  }) => {
    await mockAPIResponses.mockImmediateSuccess(page);

    const pdfFile = createTestPDF();

    await uploadFile(page, pdfFile);
    await fillJobDescription(page, "Software Engineer with React experience");

    await submitForm(page);

    await expect(page.getByText(/analysis complete/iu)).toBeVisible({
      timeout: 10_000,
    });

    await expect(page.getByText(/strengths/iu)).toBeVisible();
    await expect(page.getByText(/gaps/iu)).toBeVisible();
    await expect(page.getByText(/recommendations/iu)).toBeVisible();
  });

  test("should complete async job processing while inputs stay disabled @smoke", async ({
    page,
  }) => {
    await mockAPIResponses.mockAsyncJob(page);

    const pdfFile = createTestPDF();

    await uploadFile(page, pdfFile);
    await fillJobDescription(page, "Senior Developer position");
    await submitForm(page);

    const fileInput = page.locator('input[type="file"]');
    const textarea = page.getByLabel(/job description/iu);
    const cancelButton = page.getByRole("button", {
      name: /cancel analysis/iu,
    });

    await expect(page.getByText(/analyzing/iu).first()).toBeVisible();
    await expect(fileInput).toBeDisabled();
    await expect(textarea).toBeDisabled();
    await expect(cancelButton).toBeVisible();
    await expect(cancelButton).toBeEnabled();

    await expect(page.getByText(/analysis complete/iu)).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText(/strengths/iu)).toBeVisible();
  });
});
