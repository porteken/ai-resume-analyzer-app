import { expect } from "@playwright/test";

import { test } from "./helpers/fixtures";

test.describe("Accessibility", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("should have proper ARIA labels on form elements", async ({ page }) => {
    const fileInput = page.getByLabel(/resume \(pdf\)/iu);
    await expect(fileInput).toBeVisible();

    const textarea = page.getByLabel(/job description/iu);
    await expect(textarea).toBeVisible();

    const button = page.getByRole("button", { name: /analyze resume/iu });
    await expect(button).toBeVisible();
  });

  test("should have main heading as h1", async ({ page }) => {
    const heading = page.getByRole("heading", {
      level: 1,
      name: /ai resume analyzer/iu,
    });
    await expect(heading).toBeVisible();
  });

  test("should be keyboard navigable", async ({ page }) => {
    // Tab to 'About' link
    await page.keyboard.press("Tab");
    const aboutLink = page.getByRole("link", { name: /about/iu });
    await expect(aboutLink).toBeFocused();

    const uploadButton = page.getByRole("button", {
      name: /choose file/iu,
    });
    const fileInput = page.locator('input[type="file"]');

    // Focus the upload button to start sequential navigation from it
    await uploadButton.focus();
    await expect(uploadButton).toBeFocused();

    await page.keyboard.press("Tab");
    const textarea = page.getByLabel(/job description/iu);
    await expect(textarea).toBeFocused();

    // Fill fields to enable the button
    await fileInput.setInputFiles({
      buffer: Buffer.from("test pdf content"),
      mimeType: "application/pdf",
      name: "test.pdf",
    });
    await textarea.fill("Test job description");

    // Refocus textarea so we can tab to button
    await textarea.focus();

    await page.keyboard.press("Tab");
    const button = page.getByRole("button", { name: /analyze resume/iu });
    await expect(button).toBeFocused();
  });

  test("should show error messages with proper semantics", async ({ page }) => {
    const BYTES_PER_KB = 1024;
    const KB_PER_MB = 1024;
    const BYTES_PER_MB = BYTES_PER_KB * KB_PER_MB;
    const LARGE_PDF_SIZE_MB = 6;
    const largePdfContent = Buffer.alloc(LARGE_PDF_SIZE_MB * BYTES_PER_MB);

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      buffer: largePdfContent,
      mimeType: "application/pdf",
      name: "large.pdf",
    });

    const textarea = page.getByLabel(/job description/iu);
    await textarea.fill("Test job");

    const errorMessage = page.locator('[role="alert"], .bg-red-50').first();
    await expect(errorMessage).toBeVisible();
  });
});
