import { expect } from "@playwright/test";

import {
  createTestPDF,
  fillJobDescription,
  mockAPIResponses,
  submitForm,
  test,
  uploadFile,
} from "./helpers/fixtures";

test.describe("Page Display and Initial State", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("should display the main page with title and form", async ({ page }) => {
    await expect(
      page.getByRole("heading", { name: /ai resume analyzer/iu }),
    ).toBeVisible();

    await expect(page.getByLabel(/resume \(pdf\)/iu)).toBeVisible();
    await expect(page.getByLabel(/job description/iu)).toBeVisible();
    await expect(
      page.getByRole("button", { name: /analyze resume/iu }),
    ).toBeVisible();
  });

  test("should have submit button disabled initially", async ({ page }) => {
    const button = page.getByRole("button", { name: /analyze resume/iu });
    await expect(button).toBeDisabled();
  });

  test("should work on mobile viewport", async ({ page }) => {
    await page.setViewportSize({ height: 667, width: 375 });
    await mockAPIResponses.mockImmediateSuccess(page);

    await expect(
      page.getByRole("heading", { name: /ai resume analyzer/iu }),
    ).toBeVisible();

    const pdfFile = createTestPDF();
    await uploadFile(page, pdfFile);
    await fillJobDescription(page, "Mobile test job");

    const button = page.getByRole("button", { name: /analyze resume/iu });
    await expect(button).toBeEnabled();
  });
});

test.describe("Resume Analysis Flow", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("should enable submit button when both file and description are provided", async ({
    page,
  }) => {
    const pdfFile = createTestPDF();
    const button = page.getByRole("button", { name: /analyze resume/iu });

    await expect(button).toBeDisabled();

    await uploadFile(page, pdfFile);

    await expect(button).toBeDisabled();

    await fillJobDescription(page, "Software Engineer with React experience");

    await expect(button).toBeEnabled();
  });

  test("should successfully upload and analyze resume with immediate result", async ({
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

  test("should handle async job processing with polling", async ({ page }) => {
    await mockAPIResponses.mockAsyncJob(page);

    const pdfFile = createTestPDF();

    await uploadFile(page, pdfFile);
    await fillJobDescription(page, "Senior Developer position");
    await submitForm(page);

    await expect(page.getByText(/analyzing/iu).first()).toBeVisible();

    await expect(page.getByText(/analysis complete/iu)).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText(/strengths/iu)).toBeVisible();
  });

  test("should display all result sections with proper formatting", async ({
    page,
  }) => {
    await mockAPIResponses.mockImmediateSuccess(page);

    const pdfFile = createTestPDF();
    await uploadFile(page, pdfFile);
    await fillJobDescription(page, "Test job description");
    await submitForm(page);

    await expect(page.getByText(/analysis complete/iu)).toBeVisible({
      timeout: 10_000,
    });

    const sections = [
      { emoji: "✨", heading: /strengths/iu },
      { emoji: "⚠️", heading: /gaps/iu },
      { emoji: "💡", heading: /recommendations/iu },
    ];

    await Promise.all(
      sections.map(async (section) =>
        expect(page.getByText(section.heading)).toBeVisible(),
      ),
    );
  });

  test("should disable form inputs during processing", async ({ page }) => {
    await mockAPIResponses.mockAsyncJob(page);

    const pdfFile = createTestPDF();
    await uploadFile(page, pdfFile);
    await fillJobDescription(page, "Test job");
    await submitForm(page);

    const fileInput = page.locator('input[type="file"]');
    const textarea = page.getByLabel(/job description/iu);
    const cancelButton = page.getByRole("button", {
      name: /cancel analysis/iu,
    });

    await expect(fileInput).toBeDisabled();
    await expect(textarea).toBeDisabled();
    await expect(cancelButton).toBeVisible();
    await expect(cancelButton).toBeEnabled();
  });

  test("should show progress messages during analysis", async ({ page }) => {
    await mockAPIResponses.mockAsyncJob(page);

    const pdfFile = createTestPDF();
    await uploadFile(page, pdfFile);
    await fillJobDescription(page, "Test position");
    await submitForm(page);

    await expect(page.getByText(/analyzing/iu).first()).toBeVisible();
  });
});
