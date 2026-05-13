import { MOCK_RESPONSES } from "@/testing/mocks/api";
import {
  createExactSizePDF as createExactSizePDFBuffer,
  createLargePDF as createLargePDFBuffer,
  createTestPDF as createTestPDFBuffer,
} from "@/testing/mocks/file";
import { type Page, test as base } from "@playwright/test";

export const test = base.extend({
  page: async ({ page }, runPage) => {
    await runPage(page);
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

export async function fillJobDescription(
  page: Page,
  description: string,
): Promise<void> {
  const textarea = page.getByLabel(/job description/iu);
  await textarea.fill(description);
}

export async function submitForm(page: Page): Promise<void> {
  const button = page.getByRole("button", { name: /analyze resume/iu });
  await button.click();
}

export async function uploadFile(
  page: Page,
  fileContent: Buffer,
  fileName = "resume.pdf",
): Promise<void> {
  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles({
    buffer: fileContent,
    mimeType: "application/pdf",
    name: fileName,
  });
}

export const mockAPIResponses = {
  async mockAsyncJob(
    page: Page,
    jobId: string = MOCK_RESPONSES.asyncJobInitial.job_id,
  ): Promise<void> {
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
      const REQUIRED_POLLS_FOR_SUCCESS = 3;

      await (pollCount >= REQUIRED_POLLS_FOR_SUCCESS
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

  async mockFailedJob(
    page: Page,
    jobId: string = MOCK_RESPONSES.failedJobInitial.job_id,
  ): Promise<void> {
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

  async mockImmediateSuccess(page: Page): Promise<void> {
    await page.route("**/api/upload", async (route) => {
      await route.fulfill({
        body: JSON.stringify(MOCK_RESPONSES.immediateSuccess),
        contentType: "application/json",
        status: 200,
      });
    });
  },

  async mockNetworkError(page: Page): Promise<void> {
    await page.route("**/api/upload", async (route) => {
      await route.abort("failed");
    });
  },

  async mockServerError(page: Page): Promise<void> {
    await page.route("**/api/upload", async (route) => {
      await route.fulfill({
        body: JSON.stringify(MOCK_RESPONSES.serverError),
        contentType: "application/json",
        status: 500,
      });
    });
  },
};
