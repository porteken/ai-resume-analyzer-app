import { expect } from "@playwright/test";

import {
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

    await expect(page.getByTestId("analysis-error")).toContainText(
      /file too large/iu,
    );
    await expect(page.getByTestId("analysis-error")).toContainText(
      /please use a pdf smaller than 5mb/iu,
    );
  });

  test("should handle server errors gracefully @smoke", async ({ page }) => {
    await mockAPIResponses.mockServerError(page);

    const pdfFile = createTestPDF();
    await uploadFile(page, pdfFile);
    await fillJobDescription(page, "Test job");
    await submitForm(page);

    await expect(page.getByTestId("analysis-error")).toContainText(
      /server error/iu,
      {
        timeout: 10_000,
      },
    );
    await expect(page.getByTestId("analysis-error")).toContainText(
      /internal server error/iu,
    );

    const button = page.getByRole("button", { name: /analyze resume/iu });
    await expect(button).toBeEnabled();
  });
});
