import { expect, mockAPIResponses, test } from "./helpers/fixtures";

test.describe("Accessibility", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("should be keyboard navigable @smoke", async ({ page }) => {
    // Selecting a file now prefetches the presigned upload in the background;
    // mock it so this purely keyboard-navigation test doesn't hit a real backend.
    await mockAPIResponses.mockImmediateSuccess(page);

    await page.keyboard.press("Tab");
    const aboutLink = page.getByRole("link", { name: /about/iu });
    await expect(aboutLink).toBeFocused();

    const uploadButton = page.getByRole("button", {
      name: /choose file/iu,
    });
    const fileInput = page.locator('input[type="file"]');

    await uploadButton.focus();
    await expect(uploadButton).toBeFocused();

    await page.keyboard.press("Tab");
    const textarea = page.getByLabel(/job description/iu);
    await expect(textarea).toBeFocused();

    await fileInput.setInputFiles({
      buffer: Buffer.from("test pdf content"),
      mimeType: "application/pdf",
      name: "test.pdf",
    });
    await textarea.fill("Test job description");

    await textarea.focus();

    await page.keyboard.press("Tab");
    const button = page.getByRole("button", { name: /analyze resume/iu });
    await expect(button).toBeFocused();
  });
});
