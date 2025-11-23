import { expect } from "@playwright/test";

import { test } from "./helpers/fixtures";

test.describe("About Page", () => {
  test("should display the about page with title and description", async ({
    page,
  }) => {
    await page.goto("/about");

    await expect(
      page.getByRole("heading", { name: /about ai resume analyzer/i }),
    ).toBeVisible();

    await expect(
      page.getByText(/ai resume analyzer is a web application/i),
    ).toBeVisible();
  });

  test("should display GitHub links", async ({ page }) => {
    await page.goto("/about");

    const frontendLink = page.getByText("Frontend App on GitHub");
    await expect(frontendLink).toBeVisible();
    await expect(frontendLink).toHaveAttribute(
      "href",
      "https://github.com/porteken/ai-resume-analyzer-app",
    );
    await expect(frontendLink).toHaveAttribute("target", "_blank");

    const backendLink = page.getByText("Backend API on GitHub");
    await expect(backendLink).toBeVisible();
    await expect(backendLink).toHaveAttribute(
      "href",
      "https://github.com/porteken/ai-resume-analyzer-sam",
    );
    await expect(backendLink).toHaveAttribute("target", "_blank");
  });

  test("should display contact email link", async ({ page }) => {
    await page.goto("/about");

    const emailLink = page.getByText("porteken@gmail.com");
    await expect(emailLink).toBeVisible();
    await expect(emailLink).toHaveAttribute(
      "href",
      "mailto:porteken@gmail.com",
    );
  });

  test("should display project links and contact sections", async ({
    page,
  }) => {
    await page.goto("/about");

    await expect(page.getByText("Project Links")).toBeVisible();
    await expect(page.getByText("Contact")).toBeVisible();
  });
});
