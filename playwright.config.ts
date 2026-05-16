import { defineConfig, devices } from "@playwright/test";

const E2E_PORT = Number.parseInt(
  process.env.PLAYWRIGHT_TEST_PORT ?? "3100",
  10,
);
const E2E_BASE_URL =
  process.env.PLAYWRIGHT_BASE_URL ?? `http://localhost:${E2E_PORT}`;
const isLocalLinux = process.platform === "linux" && !process.env.CI;

const projects = [
  {
    name: "chromium",
    use: { ...devices["Desktop Chrome"] },
  },
  {
    name: "firefox",
    use: { ...devices["Desktop Firefox"] },
  },
  {
    name: "webkit",
    use: { ...devices["Desktop Safari"] },
  },
  {
    name: "Mobile Chrome",
    use: { ...devices["Pixel 5"] },
  },
  {
    name: "Mobile Safari",
    use: { ...devices["iPhone 12"] },
  },
].filter(
  (project) =>
    !isLocalLinux ||
    (project.name !== "webkit" && project.name !== "Mobile Safari"),
);

export default defineConfig({
  expect: {
    timeout: 10_000,
  },

  forbidOnly: Boolean(process.env.CI),

  fullyParallel: true,

  projects,

  reporter: process.env.CI ? [["line"], ["github"]] : [["line"]],

  retries: process.env.CI ? 2 : 0,

  testDir: "./e2e",

  use: {
    actionTimeout: 10_000,

    baseURL: E2E_BASE_URL,

    navigationTimeout: 15_000,

    screenshot: "only-on-failure",

    trace: "on-first-retry",

    video: process.env.CI ? "retain-on-failure" : "off",
  },

  webServer: {
    command: `env NEXT_PUBLIC_E2E_TEST=1 NEXT_PUBLIC_SITE_URL=${E2E_BASE_URL} NODE_ENV=test pnpm exec next dev --turbopack --port ${E2E_PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    url: E2E_BASE_URL,
  },

  workers: process.env.CI ? 1 : undefined,
});
