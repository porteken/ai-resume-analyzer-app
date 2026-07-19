import { expect, test } from "./helpers/fixtures";

test("should display the about page with title and description @smoke", async ({
  page,
}) => {
  await page.goto("/about");

  await expect(
    page.getByRole("heading", { name: /about ai resume analyzer/iu }),
  ).toBeVisible();

  await expect(
    page.getByText(/ai resume analyzer is a web application/iu),
  ).toBeVisible();
});
