import { expect } from "@playwright/test";

import { test } from "./helpers/fixtures";

test.describe("Accessibility", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("should have proper ARIA labels on form elements", async ({ page }) => {
    const fileInput = page.getByLabel(/resume \(pdf\)/i);
    await expect(fileInput).toBeVisible();

    const textarea = page.getByLabel(/job description/i);
    await expect(textarea).toBeVisible();

    const button = page.getByRole("button", { name: /analyze resume/i });
    await expect(button).toBeVisible();
  });

  test("should have main heading as h1", async ({ page }) => {
    const heading = page.getByRole("heading", {
      level: 1,
      name: /ai resume analyzer/i,
    });
    await expect(heading).toBeVisible();
  });

  test.skip("should be keyboard navigable", async ({ page }) => {
    await page.keyboard.press("Tab");
    const fileInput = page.locator('input[type="file"]');
    await expect(fileInput).toBeFocused();

    await page.keyboard.press("Tab");
    const textarea = page.getByLabel(/job description/i);
    await expect(textarea).toBeFocused();

    await page.keyboard.press("Tab");
    const button = page.getByRole("button", { name: /analyze resume/i });
    await expect(button).toBeFocused();
  });

  test("should show error messages with proper semantics", async ({ page }) => {
    const largePdfContent = Buffer.alloc(6 * 1024 * 1024);

    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      buffer: largePdfContent,
      mimeType: "application/pdf",
      name: "large.pdf",
    });

    const textarea = page.getByLabel(/job description/i);
    await textarea.fill("Test job");

    const button = page.getByRole("button", { name: /analyze resume/i });
    await button.click();

    const errorMessage = page.locator('[role="alert"], .bg-red-50').first();
    await expect(errorMessage).toBeVisible();
  });
});

test.describe("Accessibility - About Page", () => {
  test("should have accessible links with proper attributes", async ({
    page,
  }) => {
    await page.goto("/about");

    const frontendLink = page.getByText("Frontend App on GitHub");
    await expect(frontendLink).toHaveAttribute(
      "href",
      "https://github.com/porteken/ai-resume-analyzer-app",
    );
    await expect(frontendLink).toHaveAttribute("target", "_blank");

    const backendLink = page.getByText("Backend API on GitHub");
    await expect(backendLink).toHaveAttribute(
      "href",
      "https://github.com/porteken/ai-resume-analyzer-sam",
    );
    await expect(backendLink).toHaveAttribute("target", "_blank");

    const emailLink = page.getByText("porteken@gmail.com");
    await expect(emailLink).toHaveAttribute(
      "href",
      "mailto:porteken@gmail.com",
    );
  });
});
