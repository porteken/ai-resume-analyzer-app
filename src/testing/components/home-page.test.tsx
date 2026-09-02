import { MAX_JOB_DESCRIPTION_CHARS } from "@/features/resume-analysis/utils/job-description";
import {
  fillResumeAnalysisForm,
  getAnalyzeButton,
  renderHomePage,
  submitResumeAnalysis,
} from "@/testing/home-page";
import { MOCK_RESPONSES } from "@/testing/mocks/api";
import {
  createMockFile,
  createMockLargePDFFile,
  createMockPDFFile,
} from "@/testing/mocks/file";
import { server } from "@/testing/mocks/server";
import { screen, waitFor } from "@testing-library/react";
import { HttpResponse, delay, http } from "msw";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockImmediateSuccess = () => {
  server.use(
    http.post("*/api/upload", () =>
      HttpResponse.json(MOCK_RESPONSES.immediateSuccess),
    ),
  );
};

const mockAsyncJob = () => {
  let pollCount = 0;

  server.use(
    http.post("*/api/upload", () =>
      HttpResponse.json(MOCK_RESPONSES.asyncJobInitial),
    ),
    http.get("*/api/status/:jobId", () => {
      pollCount += 1;
      if (pollCount >= 2) {
        return HttpResponse.json(MOCK_RESPONSES.asyncJobComplete);
      }

      return HttpResponse.json(MOCK_RESPONSES.asyncJobProcessing);
    }),
  );
};

const mockAnalyze503 = () => {
  server.use(
    http.post("*/api/upload", () =>
      HttpResponse.json({
        job_id: "job-503",
        s3_url: "s3://bucket/uploads/job-503/resume.pdf",
        upload: {
          fields: {
            "Content-Type": "application/pdf",
            key: "uploads/job-503/resume.pdf",
            policy: "policy",
            signature: "signature",
            "x-amz-meta-filename": "resume.pdf",
            "x-amz-meta-job_id": "job-503",
          },
          url: "https://bucket.s3.amazonaws.com",
        },
      }),
    ),
    http.post(
      "https://bucket.s3.amazonaws.com",
      () => new HttpResponse(null, { status: 204, statusText: "No Content" }),
    ),
    http.post("*/api/analyze", () =>
      HttpResponse.json(
        {
          error:
            "Analysis service is temporarily unavailable due to high demand.\nPlease try again in a few minutes.",
          type: "ServiceUnavailable",
        },
        { status: 503 },
      ),
    ),
  );
};

describe("home Page Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("should render the main heading", () => {
    renderHomePage();
    expect(screen.getByText("AI Resume Analyzer")).toBeInTheDocument();
  });

  it("should render file input and job description textarea", () => {
    renderHomePage();
    expect(screen.getByLabelText(/resume \(pdf\)/iu)).toBeInTheDocument();
    expect(screen.getByLabelText(/job description/iu)).toBeInTheDocument();
  });

  it("should expose an accessible browse button label for the resume uploader", () => {
    renderHomePage();

    expect(
      screen.getByRole("button", { name: /choose file/iu }),
    ).toBeInTheDocument();
  });

  it("should have analyze button disabled initially", () => {
    renderHomePage();
    expect(getAnalyzeButton()).toBeDisabled();
  });

  it("should enable button when file and job description are provided", async () => {
    const form = renderHomePage();

    await fillResumeAnalysisForm(form, {
      jobDescription: "Software Engineer position",
    });

    expect(form.analyzeButton()).toBeEnabled();
  });

  it("should keep button disabled for whitespace-only job description", async () => {
    const form = renderHomePage();

    await fillResumeAnalysisForm(form, { jobDescription: "   " });

    expect(form.analyzeButton()).toBeDisabled();
  });

  it("should show a live character count for the job description", async () => {
    const form = renderHomePage();

    expect(
      screen.getByText(`0 / ${MAX_JOB_DESCRIPTION_CHARS.toLocaleString()}`),
    ).toBeInTheDocument();

    await form.user.type(form.textarea, "AI");

    expect(
      screen.getByText(`2 / ${MAX_JOB_DESCRIPTION_CHARS.toLocaleString()}`),
    ).toBeInTheDocument();
  });

  it("should show the selected filename and allow removing it", async () => {
    const form = renderHomePage();
    const file = createMockPDFFile();

    await form.user.upload(form.fileInput, file);

    expect(screen.getByText(file.name)).toBeInTheDocument();

    await form.user.click(
      screen.getByRole("button", { name: /remove selected resume/iu }),
    );

    expect(screen.queryByText(file.name)).not.toBeInTheDocument();
    expect(form.analyzeButton()).toBeDisabled();
  });

  it("should show error when file is too large", async () => {
    const form = renderHomePage();

    await submitResumeAnalysis(form, { file: createMockLargePDFFile() });

    await waitFor(() => {
      expect(screen.getByText(/file too large/iu)).toBeInTheDocument();
    });
  });

  it("clears a previous result when a later submission fails validation", async () => {
    mockImmediateSuccess();

    const form = renderHomePage();

    await fillResumeAnalysisForm(form);
    await form.user.click(form.analyzeButton());

    await waitFor(() => {
      expect(screen.getByText(/analysis complete/iu)).toBeInTheDocument();
    });

    await form.user.upload(form.fileInput, createMockLargePDFFile());
    await form.user.click(form.analyzeButton());

    await waitFor(() => {
      expect(screen.getByText(/file too large/iu)).toBeInTheDocument();
    });

    expect(screen.queryByText(/analysis complete/iu)).not.toBeInTheDocument();
  });

  it("should show error when uploaded file is not a PDF", async () => {
    const form = renderHomePage();
    const textFile = createMockFile("plain text", "resume.pdf", "text/plain");

    await form.user.upload(form.fileInput, textFile);

    await waitFor(() => {
      expect(
        screen.getByText(/please upload a pdf file/iu),
      ).toBeInTheDocument();
    });

    expect(screen.queryByText(/resume.pdf/iu)).not.toBeInTheDocument();
    expect(getAnalyzeButton()).toBeDisabled();
  });

  it("should show error when job description is missing", async () => {
    const form = renderHomePage();

    await form.user.upload(form.fileInput, createMockPDFFile());

    expect(form.analyzeButton()).toBeDisabled();
  });

  it("should handle successful upload with immediate result", async () => {
    mockImmediateSuccess();

    const form = renderHomePage();

    await submitResumeAnalysis(form, {
      jobDescription: "Software Engineer position",
    });

    await waitFor(() => {
      expect(screen.getByText(/analysis complete/iu)).toBeInTheDocument();
    });

    expect(screen.queryByText(/match score/iu)).not.toBeInTheDocument();
    expect(screen.getByText(/strengths/iu)).toBeInTheDocument();
    expect(screen.getByText(/^gaps$/iu)).toBeInTheDocument();
    expect(screen.getByText(/recommendations/iu)).toBeInTheDocument();
  });

  it("should render structured JSON analysis results", async () => {
    server.use(
      http.post("*/api/upload", () =>
        HttpResponse.json({
          analysis_result: {
            contact_info: {
              email: "porteken@gmail.com",
              location: "Orlando, Florida",
              phone: "(832)948-3211",
            },
            experience: [
              {
                company: "Lockheed Martin",
                duration: "September 2021-Present",
                highlights: ["Architected Next.js/Fastify replacement"],
                role: "Senior Systems Engineer",
              },
            ],
            gaps: ["Example gap"],
            name: "Kenneth J. Porter",
            recommendations: ["Example recommendation"],
            skills: ["TypeScript", "Next.js"],
            strengths: ["Example strength"],
            summary: "Senior engineer focused on web and analytics systems.",
          },
        }),
      ),
    );

    const form = renderHomePage();

    await submitResumeAnalysis(form, {
      jobDescription: "Software Engineer position",
    });

    await waitFor(() => {
      expect(screen.getByText(/analysis complete/iu)).toBeInTheDocument();
    });

    expect(screen.queryByText("Kenneth J. Porter")).not.toBeInTheDocument();
    expect(screen.queryByText("TypeScript")).not.toBeInTheDocument();
    expect(
      screen.queryByText(/senior systems engineer/iu),
    ).not.toBeInTheDocument();
    expect(screen.getByText(/^strengths$/iu)).toBeInTheDocument();
    expect(screen.getByText(/^gaps$/iu)).toBeInTheDocument();
    expect(screen.getByText(/^recommendations$/iu)).toBeInTheDocument();
    expect(screen.getByText(/example strength/iu)).toBeInTheDocument();
    expect(screen.getByText(/example gap/iu)).toBeInTheDocument();
    expect(screen.getByText(/example recommendation/iu)).toBeInTheDocument();
  });

  it("should handle async job with polling", async () => {
    mockAsyncJob();

    await submitResumeAnalysis(renderHomePage());

    await waitFor(
      () => {
        expect(screen.getByText(/analysis complete/iu)).toBeInTheDocument();
      },
      { timeout: 10_000 },
    );
  });

  it("should handle upload errors", async () => {
    server.use(
      http.post("*/api/upload", () =>
        HttpResponse.json(MOCK_RESPONSES.serverError, { status: 500 }),
      ),
    );

    await submitResumeAnalysis(renderHomePage());

    await waitFor(() => {
      expect(screen.getByText(/server error/iu)).toBeInTheDocument();
    });
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("should display analyze 503 service unavailable message", async () => {
    mockAnalyze503();

    await submitResumeAnalysis(renderHomePage());

    await waitFor(() => {
      expect(
        screen.getByText(/analysis service is temporarily unavailable/iu),
      ).toBeInTheDocument();
    });
    expect(
      screen.getByText(/please try again in a few minutes/iu),
    ).toBeInTheDocument();
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("should handle network errors", async () => {
    server.use(http.post("*/api/upload", () => HttpResponse.error()));

    await submitResumeAnalysis(renderHomePage());

    await waitFor(() => {
      expect(screen.getByText(/failed to upload resume/iu)).toBeInTheDocument();
    });
  });

  it("should preserve server-side upstream network errors", async () => {
    server.use(
      http.post("*/api/upload", () =>
        HttpResponse.json(
          {
            details: "Network error",
            error: "Failed to upload resume",
          },
          { status: 500 },
        ),
      ),
    );

    await submitResumeAnalysis(renderHomePage());

    await waitFor(() => {
      expect(
        screen.getByText(/failed to upload resume: network error/iu),
      ).toBeInTheDocument();
    });
    expect(
      screen.queryByText(
        /failed to upload resume\. please check your connection and try again\./iu,
      ),
    ).not.toBeInTheDocument();
  });

  it("should disable inputs during loading", async () => {
    server.use(
      http.post("*/api/upload", async () => {
        await delay(5000);
        return HttpResponse.json(MOCK_RESPONSES.immediateSuccess);
      }),
    );

    const form = renderHomePage();

    await fillResumeAnalysisForm(form);
    await form.user.click(form.analyzeButton());

    await waitFor(() => {
      expect(form.fileInput).toBeDisabled();
      expect(form.textarea).toBeDisabled();
      expect(
        screen.getByRole("button", { name: /cancel analysis/iu }),
      ).toBeEnabled();
      expect(screen.getAllByText("Uploading Resume...").length).toBeGreaterThan(
        0,
      );
    });
  });

  it("should cancel an in-flight analysis request", async () => {
    server.use(
      http.post("*/api/upload", async () => {
        await delay(5000);
        return HttpResponse.json(MOCK_RESPONSES.immediateSuccess);
      }),
    );

    const form = renderHomePage();

    await fillResumeAnalysisForm(form);
    await form.user.click(form.analyzeButton());

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: /cancel analysis/iu }),
      ).toBeInTheDocument();
    });

    await form.user.click(
      screen.getByRole("button", { name: /cancel analysis/iu }),
    );

    await waitFor(() => {
      expect(form.analyzeButton()).toBeInTheDocument();
      expect(screen.queryByText("Uploading Resume...")).not.toBeInTheDocument();
    });

    expect(screen.queryByText(/analysis complete/iu)).not.toBeInTheDocument();
  });

  it("should handle failed job status", async () => {
    server.use(
      http.post("*/api/upload", () =>
        HttpResponse.json(MOCK_RESPONSES.failedJobInitial),
      ),
      http.get("*/api/status/:jobId", () =>
        HttpResponse.json(MOCK_RESPONSES.failedJobStatus),
      ),
    );

    await submitResumeAnalysis(renderHomePage());

    await waitFor(
      () => {
        expect(screen.getByText(/pdf parsing failed/iu)).toBeInTheDocument();
      },
      { timeout: 5000 },
    );
  });
});
