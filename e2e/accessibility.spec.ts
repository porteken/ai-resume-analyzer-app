import { expect } from "@playwright/test";

import { test } from "./helpers/fixtures";

test.describe("Accessibility", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("should be keyboard navigable @smoke", async ({ page }) => {
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
});
