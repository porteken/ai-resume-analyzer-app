import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  expect: {
    timeout: 10_000,
  },

  forbidOnly: !!process.env.CI,

  fullyParallel: true,

  projects: [
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
  ],

  reporter: process.env.CI ? [["line"], ["github"]] : [["line"]],

  retries: process.env.CI ? 2 : 0,

  testDir: "./e2e",

  use: {
    actionTimeout: 10_000,

    baseURL: "http://localhost:3000",

    navigationTimeout: 15_000,

    screenshot: "only-on-failure",

    trace: "on-first-retry",

    video: process.env.CI ? "retain-on-failure" : "off",
  },

  webServer: {
    command: "npm run dev",
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
    url: "http://localhost:3000",
  },

  workers: process.env.CI ? 1 : undefined,
});
