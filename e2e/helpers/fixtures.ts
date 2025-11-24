import { test as base, Page } from "@playwright/test";

import { MOCK_RESPONSES } from "@/tests/mocks/api";
import {
  createExactSizePDF as createExactSizePDFBuffer,
  createLargePDF as createLargePDFBuffer,
  createTestPDF as createTestPDFBuffer,
} from "@/tests/mocks/file";

/**
 * Extended test with console error suppression
 */
export const test = base.extend({
  page: async ({ page }, use) => {
    page.on("console", (message) => {
      if (message.type() === "error") {
        return;
      }
    });
    await use(page);
  },
});

export function createExactSizePDF(sizeMB: number): Buffer {
  return createExactSizePDFBuffer(sizeMB);
}

export function createLargePDF(): Buffer {
  return createLargePDFBuffer();
}

export function createTestPDF(): Buffer {
  return createTestPDFBuffer();
}

/**
 * Helper to fill in the job description
 */
export async function fillJobDescription(page: Page, description: string) {
  const textarea = page.getByLabel(/job description/i);
  await textarea.fill(description);
}

/**
 * Helper to submit the form
 */
export async function submitForm(page: Page) {
  const button = page.getByRole("button", { name: /analyze resume/i });
  await button.click();
}

/**
 * Helper to upload a file to the page
 */
export async function uploadFile(
  page: Page,
  fileContent: Buffer,
  fileName: string = "resume.pdf",
) {
  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles({
    buffer: fileContent,
    mimeType: "application/pdf",
    name: fileName,
  });
}

/**
 * Mock API responses for testing
 */
export const mockAPIResponses = {
  /**
   * Mock async job response with polling
   */
  async mockAsyncJob(
    page: Page,
    jobId: string = MOCK_RESPONSES.asyncJobInitial.job_id,
  ) {
    let pollCount = 0;

    await page.route("**/api/upload", async (route) => {
      await route.fulfill({
        body: JSON.stringify(MOCK_RESPONSES.asyncJobInitial),
        contentType: "application/json",
        status: 200,
      });
    });

    await page.route(`**/api/status/${jobId}`, async (route) => {
      pollCount++;

      await (pollCount >= 3
        ? route.fulfill({
            body: JSON.stringify(MOCK_RESPONSES.asyncJobComplete),
            contentType: "application/json",
            status: 200,
          })
        : route.fulfill({
            body: JSON.stringify(MOCK_RESPONSES.asyncJobProcessing),
            contentType: "application/json",
            status: 200,
          }));
    });
  },

  /**
   * Mock failed job
   */
  async mockFailedJob(
    page: Page,
    jobId: string = MOCK_RESPONSES.failedJobInitial.job_id,
  ) {
    await page.route("**/api/upload", async (route) => {
      await route.fulfill({
        body: JSON.stringify(MOCK_RESPONSES.failedJobInitial),
        contentType: "application/json",
        status: 200,
      });
    });

    await page.route(`**/api/status/${jobId}`, async (route) => {
      await route.fulfill({
        body: JSON.stringify(MOCK_RESPONSES.failedJobStatus),
        contentType: "application/json",
        status: 200,
      });
    });
  },

  /**
   * Mock successful immediate response
   */
  async mockImmediateSuccess(page: Page) {
    await page.route("**/api/upload", async (route) => {
      await route.fulfill({
        body: JSON.stringify(MOCK_RESPONSES.immediateSuccess),
        contentType: "application/json",
        status: 200,
      });
    });
  },

  /**
   * Mock network error
   */
  async mockNetworkError(page: Page) {
    await page.route("**/api/upload", async (route) => {
      await route.abort("failed");
    });
  },

  /**
   * Mock server error
   */
  async mockServerError(page: Page) {
    await page.route("**/api/upload", async (route) => {
      await route.fulfill({
        body: JSON.stringify(MOCK_RESPONSES.serverError),
        contentType: "application/json",
        status: 500,
      });
    });
  },
};
