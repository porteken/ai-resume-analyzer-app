import { Page } from '@playwright/test';

/**
 * Creates a large PDF file (> 5MB) for testing file size validation
 */
export function createLargePDF(): Buffer {
  const basePDF = createTestPDF();
  const padding = Buffer.alloc(6 * 1024 * 1024); 
  return Buffer.concat([basePDF, padding]);
}

/**
 * Creates a mock PDF file for testing
 */
export function createTestPDF(): Buffer {
  
  const pdfContent = `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj
2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
/MediaBox [0 0 612 792]
>>
endobj
3 0 obj
<<
/Type /Page
/Parent 2 0 R
/Resources <<
/Font <<
/F1 4 0 R
>>
>>
/Contents 5 0 R
>>
endobj
4 0 obj
<<
/Type /Font
/Subtype /Type1
/BaseFont /Times-Roman
>>
endobj
5 0 obj
<<
/Length 44
>>
stream
BT
/F1 24 Tf
100 700 Td
(Test Resume) Tj
ET
endstream
endobj
xref
0 6
0000000000 65535 f
0000000010 00000 n
0000000059 00000 n
0000000146 00000 n
0000000273 00000 n
0000000361 00000 n
trailer
<<
/Size 6
/Root 1 0 R
>>
startxref
454
%%EOF`;

  return Buffer.from(pdfContent);
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
  const button = page.getByRole('button', { name: /analyze resume/i });
  await button.click();
}

/**
 * Helper to upload a file to the page
 */
export async function uploadFile(page: Page, fileContent: Buffer, fileName: string = 'resume.pdf') {
  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles({
    buffer: fileContent,
    mimeType: 'application/pdf',
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
  async mockAsyncJob(page: Page, jobId: string = 'test-job-123') {
    let pollCount = 0;

    await page.route('**/api/upload', async (route) => {
      await route.fulfill({
        body: JSON.stringify({ job_id: jobId }),
        contentType: 'application/json',
        status: 200,
      });
    });

    await page.route(`**/api/status/${jobId}`, async (route) => {
      pollCount++;

      await (pollCount >= 3 ? route.fulfill({
          body: JSON.stringify({
            analysis_result: '## Match Score\n90% match',
            status: 'completed',
          }),
          contentType: 'application/json',
          status: 200,
        }) : route.fulfill({
          body: JSON.stringify({
            status: 'processing',
          }),
          contentType: 'application/json',
          status: 200,
        }));
    });
  },

  /**
   * Mock failed job
   */
  async mockFailedJob(page: Page, jobId: string = 'test-job-failed') {
    await page.route('**/api/upload', async (route) => {
      await route.fulfill({
        body: JSON.stringify({ job_id: jobId }),
        contentType: 'application/json',
        status: 200,
      });
    });

    await page.route(`**/api/status/${jobId}`, async (route) => {
      await route.fulfill({
        body: JSON.stringify({
          error: 'PDF parsing failed',
          status: 'failed',
        }),
        contentType: 'application/json',
        status: 200,
      });
    });
  },

  /**
   * Mock successful immediate response
   */
  async mockImmediateSuccess(page: Page) {
    await page.route('**/api/upload', async (route) => {
      await route.fulfill({
        body: JSON.stringify({
          analysis_result: `## Match Score
85% match to job requirements

## Strengths
- Strong technical background in relevant technologies
- Excellent problem-solving skills

## Gaps
- Limited cloud platform experience

## Recommendations
- Consider obtaining AWS or Azure certification
- Add cloud-based projects to portfolio`,
        }),
        contentType: 'application/json',
        status: 200,
      });
    });
  },

  /**
   * Mock network error
   */
  async mockNetworkError(page: Page) {
    await page.route('**/api/upload', async (route) => {
      await route.abort('failed');
    });
  },

  /**
   * Mock server error
   */
  async mockServerError(page: Page) {
    await page.route('**/api/upload', async (route) => {
      await route.fulfill({
        body: JSON.stringify({
          details: 'Internal server error',
          error: 'Server error',
        }),
        contentType: 'application/json',
        status: 500,
      });
    });
  },
};
