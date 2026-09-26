import {
  createTestPDF,
  expect,
  mockAPIResponses,
  test,
  uploadFile,
} from "./helpers/fixtures";

for (const width of [375, 759, 1440]) {
  test(`selected resume stays inside the form at ${width}px @smoke`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await mockAPIResponses.mockImmediateSuccess(page);
    await page.goto("/");
    await uploadFile(
      page,
      createTestPDF(),
      "2002 Chevrolet Silverado Owners Manual.pdf",
    );

    const upload = page.getByRole("button", {
      name: "Choose file",
      exact: true,
    });
    await expect(upload).toBeVisible();
    await expect(async () => {
      const layout = await upload.evaluate((element) => {
        const form = element.parentElement!.parentElement!;
        return {
          availableWidth: form.clientWidth,
          contentWidth: form.scrollWidth,
          uploadWidth: element.getBoundingClientRect().width,
        };
      });
      expect(layout.contentWidth).toBeLessThanOrEqual(layout.availableWidth);
      expect(layout.uploadWidth).toBeLessThanOrEqual(layout.availableWidth);
    }).toPass();
    await expect(
      page.getByRole("button", { name: "Remove selected resume" }),
    ).toBeInViewport();
  });
}
