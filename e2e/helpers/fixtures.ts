import { MOCK_RESPONSES } from "@/testing/mocks/api";
import {
  createLargePDF as createLargePDFBuffer,
  createTestPDF as createTestPDFBuffer,
} from "@/testing/mocks/file";
import { test as base } from "@playwright/test";

import type {
  ConsoleMessage,
  Page,
  Response,
  WebError,
} from "@playwright/test";

export { expect } from "@playwright/test";

const GLOBAL_ALLOWED_CONSOLE_ERRORS: RegExp[] = [
  /\[Turnstile\]/u,
  /turnstile/iu,
  /cf-turnstile-response/u,
  /challenges\.cloudflare\.com/u,
];

const GLOBAL_ALLOWED_RESPONSE_ERRORS: RegExp[] = [];

type BrowserErrorSource = "console" | "pageerror" | "response" | "weberror";

interface BrowserError {
  location?: string;
  message: string;
  source: BrowserErrorSource;
}

interface BrowserErrorFixtures {
  allowedConsoleErrors: RegExp[];
  allowedResponseErrors: RegExp[];
}

const formatConsoleLocation = (
  location: ReturnType<ConsoleMessage["location"]>,
): string | undefined =>
  location.url
    ? `${location.url}:${location.line}:${location.column}`
    : undefined;

const isSameOrigin = (url: string, baseURL: string | undefined): boolean => {
  if (!baseURL) {
    return false;
  }

  try {
    return new URL(url).origin === new URL(baseURL).origin;
  } catch {
    return false;
  }
};

const isWebKitRscPrefetchAbort = (message: string): boolean =>
  message.endsWith("due to access control checks.") &&
  /[?&]_rsc=/u.test(message);

const formatErrors = (errors: BrowserError[]): string =>
  errors
    .map((error) => {
      const location = error.location ? ` (${error.location})` : "";
      return `  [${error.source}] ${error.message}${location}`;
    })
    .join("\n");

export const test = base.extend<BrowserErrorFixtures>({
  allowedConsoleErrors: [[], { option: true }],
  allowedResponseErrors: [[], { option: true }],

  page: async (
    { page, baseURL, allowedConsoleErrors, allowedResponseErrors },
    use,
    testInfo,
  ) => {
    const errors: BrowserError[] = [];
    const seenExceptionMessages = new Set<string>();

    const isAllowedConsoleError = (
      text: string,
      locationUrl: string,
    ): boolean =>
      GLOBAL_ALLOWED_CONSOLE_ERRORS.some(
        (pattern) => pattern.test(text) || pattern.test(locationUrl),
      ) ||
      allowedConsoleErrors.some(
        (pattern) => pattern.test(text) || pattern.test(locationUrl),
      );

    const isAllowedResponseError = (url: string): boolean =>
      GLOBAL_ALLOWED_RESPONSE_ERRORS.some((pattern) => pattern.test(url)) ||
      allowedResponseErrors.some((pattern) => pattern.test(url));

    page.on("pageerror", (error: Error) => {
      if (isWebKitRscPrefetchAbort(error.message)) {
        return;
      }

      if (seenExceptionMessages.has(error.message)) {
        return;
      }

      seenExceptionMessages.add(error.message);
      errors.push({ message: error.message, source: "pageerror" });
    });

    page.on("console", (message: ConsoleMessage) => {
      if (message.type() !== "error") {
        return;
      }

      const text = message.text();
      const location = message.location();
      if (isAllowedConsoleError(text, location.url)) {
        return;
      }

      errors.push({
        location: formatConsoleLocation(location),
        message: text,
        source: "console",
      });
    });

    page.context().on("weberror", (webError: WebError) => {
      const error = webError.error();
      if (isWebKitRscPrefetchAbort(error.message)) {
        return;
      }

      if (seenExceptionMessages.has(error.message)) {
        return;
      }

      seenExceptionMessages.add(error.message);
      errors.push({ message: error.message, source: "weberror" });
    });

    page.on("response", (response: Response) => {
      if (
        response.status() >= 500 &&
        isSameOrigin(response.url(), baseURL) &&
        !isAllowedResponseError(response.url())
      ) {
        errors.push({
          message: `${response.status()} ${response.statusText()} — ${response.url()}`,
          source: "response",
        });
      }
    });

    await use(page);

    if (errors.length > 0) {
      await testInfo.attach("browser-errors", {
        body: JSON.stringify(errors, null, 2),
        contentType: "application/json",
      });
    }

    if (errors.length > 0 && testInfo.status === testInfo.expectedStatus) {
      throw new Error(
        `Detected ${errors.length} unexpected browser error(s):\n${formatErrors(errors)}`,
      );
    }
  },
});

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

  async mockImmediateSuccess(page: Page): Promise<void> {
    await page.route("**/api/upload", async (route) => {
      await route.fulfill({
        body: JSON.stringify(MOCK_RESPONSES.immediateSuccess),
        contentType: "application/json",
        status: 200,
      });
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
