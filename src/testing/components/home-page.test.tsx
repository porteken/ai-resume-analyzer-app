/* eslint-disable sort-imports */

import Home from "@/app/page";
import { MAX_JOB_DESCRIPTION_CHARS } from "@/features/resume-analysis/utils/job-description";
import { MOCK_RESPONSES } from "@/testing/mocks/api";
import {
  createMockFile,
  createMockLargePDFFile,
  createMockPDFFile,
} from "@/testing/mocks/file";
import { server } from "@/testing/mocks/server";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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
    render(<Home />);
    expect(screen.getByText("AI Resume Analyzer")).toBeInTheDocument();
  });

  it("should render file input and job description textarea", () => {
    render(<Home />);
    expect(screen.getByLabelText(/resume \(pdf\)/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/job description/i)).toBeInTheDocument();
  });

  it("should have analyze button disabled initially", () => {
    render(<Home />);
    const button = screen.getByRole("button", { name: /analyze resume/i });
    expect(button).toBeDisabled();
  });

  it("should enable button when file and job description are provided", async () => {
    const user = userEvent.setup();
    render(<Home />);

    const file = createMockPDFFile();
    const fileInput = screen.getByLabelText(/resume \(pdf\)/i);
    const textarea = screen.getByLabelText(/job description/i);

    await user.upload(fileInput, file);
    await user.type(textarea, "Software Engineer position");

    const button = screen.getByRole("button", { name: /analyze resume/i });
    expect(button).toBeEnabled();
  });

  it("should keep button disabled for whitespace-only job description", async () => {
    const user = userEvent.setup();
    render(<Home />);

    const file = createMockPDFFile();
    const fileInput = screen.getByLabelText(/resume \(pdf\)/i);
    const textarea = screen.getByLabelText(/job description/i);

    await user.upload(fileInput, file);
    await user.type(textarea, "   ");

    const button = screen.getByRole("button", { name: /analyze resume/i });
    expect(button).toBeDisabled();
  });

  it("should show a live character count for the job description", async () => {
    const user = userEvent.setup();
    render(<Home />);

    const textarea = screen.getByLabelText(/job description/i);
    expect(
      screen.getByText(`0 / ${MAX_JOB_DESCRIPTION_CHARS.toLocaleString()}`),
    ).toBeInTheDocument();

    await user.type(textarea, "AI");

    expect(
      screen.getByText(`2 / ${MAX_JOB_DESCRIPTION_CHARS.toLocaleString()}`),
    ).toBeInTheDocument();
  });

  it("should show the selected filename and allow removing it", async () => {
    const user = userEvent.setup();
    render(<Home />);

    const file = createMockPDFFile();
    const fileInput = screen.getByLabelText(/resume \(pdf\)/i);

    await user.upload(fileInput, file);

    expect(screen.getByText(file.name)).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: /remove selected resume/i }),
    );

    expect(screen.queryByText(file.name)).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /analyze resume/i }),
    ).toBeDisabled();
  });

  it("should show error when file is too large", async () => {
    const user = userEvent.setup();
    render(<Home />);

    const largeFile = createMockLargePDFFile();
    const fileInput = screen.getByLabelText(/resume \(pdf\)/i);
    const textarea = screen.getByLabelText(/job description/i);

    await user.upload(fileInput, largeFile);
    await user.type(textarea, "Software Engineer");

    const button = screen.getByRole("button", { name: /analyze resume/i });
    await user.click(button);

    await waitFor(() => {
      expect(screen.getByText(/file too large/i)).toBeInTheDocument();
    });
  });

  it("clears a previous result when a later submission fails validation", async () => {
    const user = userEvent.setup();
    mockImmediateSuccess();

    render(<Home />);

    const validFile = createMockPDFFile();
    const fileInput = screen.getByLabelText(/resume \(pdf\)/i);
    const textarea = screen.getByLabelText(/job description/i);

    await user.upload(fileInput, validFile);
    await user.type(textarea, "Software Engineer");
    await user.click(screen.getByRole("button", { name: /analyze resume/i }));

    await waitFor(() => {
      expect(screen.getByText(/analysis complete/i)).toBeInTheDocument();
    });

    await user.upload(fileInput, createMockLargePDFFile());
    await user.click(screen.getByRole("button", { name: /analyze resume/i }));

    await waitFor(() => {
      expect(screen.getByText(/file too large/i)).toBeInTheDocument();
    });

    expect(screen.queryByText(/analysis complete/i)).not.toBeInTheDocument();
  });

  it("should show error when uploaded file is not a PDF", async () => {
    const user = userEvent.setup();
    render(<Home />);

    const textFile = createMockFile("plain text", "resume.pdf", "text/plain");
    const fileInput = screen.getByLabelText(/resume \(pdf\)/i);
    const textarea = screen.getByLabelText(/job description/i);

    await user.upload(fileInput, textFile);
    await user.type(textarea, "Software Engineer");

    const button = screen.getByRole("button", { name: /analyze resume/i });
    await user.click(button);

    await waitFor(() => {
      expect(screen.getByText(/please upload a pdf file/i)).toBeInTheDocument();
    });
  });

  it("should show error when job description is missing", async () => {
    const user = userEvent.setup();
    render(<Home />);

    const file = createMockPDFFile();
    const fileInput = screen.getByLabelText(/resume \(pdf\)/i);

    await user.upload(fileInput, file);

    const button = screen.getByRole("button", { name: /analyze resume/i });

    expect(button).toBeDisabled();
  });

  it("should handle successful upload with immediate result", async () => {
    const user = userEvent.setup();
    mockImmediateSuccess();

    render(<Home />);

    const file = createMockPDFFile();
    const fileInput = screen.getByLabelText(/resume \(pdf\)/i);
    const textarea = screen.getByLabelText(/job description/i);

    await user.upload(fileInput, file);
    await user.type(textarea, "Software Engineer position");

    const button = screen.getByRole("button", { name: /analyze resume/i });
    await user.click(button);

    await waitFor(() => {
      expect(screen.getByText(/analysis complete/i)).toBeInTheDocument();
    });

    expect(screen.queryByText(/match score/i)).not.toBeInTheDocument();
    expect(screen.getByText(/strengths/i)).toBeInTheDocument();
    expect(screen.getByText(/^gaps$/i)).toBeInTheDocument();
    expect(screen.getByText(/recommendations/i)).toBeInTheDocument();
  });

  it("should render structured JSON analysis results", async () => {
    const user = userEvent.setup();

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

    render(<Home />);

    const file = createMockPDFFile();
    const fileInput = screen.getByLabelText(/resume \(pdf\)/i);
    const textarea = screen.getByLabelText(/job description/i);

    await user.upload(fileInput, file);
    await user.type(textarea, "Software Engineer position");

    const button = screen.getByRole("button", { name: /analyze resume/i });
    await user.click(button);

    await waitFor(() => {
      expect(screen.getByText(/analysis complete/i)).toBeInTheDocument();
    });

    expect(screen.queryByText("Kenneth J. Porter")).not.toBeInTheDocument();
    expect(screen.queryByText("TypeScript")).not.toBeInTheDocument();
    expect(
      screen.queryByText(/senior systems engineer/i),
    ).not.toBeInTheDocument();
    expect(screen.getByText(/^strengths$/i)).toBeInTheDocument();
    expect(screen.getByText(/^gaps$/i)).toBeInTheDocument();
    expect(screen.getByText(/^recommendations$/i)).toBeInTheDocument();
    expect(screen.getByText(/example strength/i)).toBeInTheDocument();
    expect(screen.getByText(/example gap/i)).toBeInTheDocument();
    expect(screen.getByText(/example recommendation/i)).toBeInTheDocument();
  });

  it("should handle async job with polling", async () => {
    const user = userEvent.setup();
    mockAsyncJob();

    render(<Home />);

    const file = createMockPDFFile();
    const fileInput = screen.getByLabelText(/resume \(pdf\)/i);
    const textarea = screen.getByLabelText(/job description/i);

    await user.upload(fileInput, file);
    await user.type(textarea, "Software Engineer");

    const button = screen.getByRole("button", { name: /analyze resume/i });
    await user.click(button);

    await waitFor(
      () => {
        expect(screen.getByText(/analysis complete/i)).toBeInTheDocument();
      },
      { timeout: 10_000 },
    );
  });

  it("should handle upload errors", async () => {
    const user = userEvent.setup();

    server.use(
      http.post("*/api/upload", () =>
        HttpResponse.json(MOCK_RESPONSES.serverError, { status: 500 }),
      ),
    );

    render(<Home />);

    const file = createMockPDFFile();
    const fileInput = screen.getByLabelText(/resume \(pdf\)/i);
    const textarea = screen.getByLabelText(/job description/i);

    await user.upload(fileInput, file);
    await user.type(textarea, "Software Engineer");

    const button = screen.getByRole("button", { name: /analyze resume/i });
    await user.click(button);

    await waitFor(() => {
      expect(screen.getByText(/server error/i)).toBeInTheDocument();
    });
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("should display analyze 503 service unavailable message", async () => {
    const user = userEvent.setup();
    mockAnalyze503();

    render(<Home />);

    const file = createMockPDFFile();
    const fileInput = screen.getByLabelText(/resume \(pdf\)/i);
    const textarea = screen.getByLabelText(/job description/i);

    await user.upload(fileInput, file);
    await user.type(textarea, "Software Engineer");

    const button = screen.getByRole("button", { name: /analyze resume/i });
    await user.click(button);

    await waitFor(() => {
      expect(
        screen.getByText(/analysis service is temporarily unavailable/i),
      ).toBeInTheDocument();
    });
    expect(
      screen.getByText(/please try again in a few minutes/i),
    ).toBeInTheDocument();
    expect(screen.getByRole("alert")).toBeInTheDocument();
  });

  it("should handle network errors", async () => {
    const user = userEvent.setup();

    server.use(http.post("*/api/upload", () => HttpResponse.error()));

    render(<Home />);

    const file = createMockPDFFile();
    const fileInput = screen.getByLabelText(/resume \(pdf\)/i);
    const textarea = screen.getByLabelText(/job description/i);

    await user.upload(fileInput, file);
    await user.type(textarea, "Software Engineer");

    const button = screen.getByRole("button", { name: /analyze resume/i });
    await user.click(button);

    await waitFor(() => {
      expect(screen.getByText(/failed to upload resume/i)).toBeInTheDocument();
    });
  });

  it("should disable inputs during loading", async () => {
    const user = userEvent.setup();

    server.use(
      http.post("*/api/upload", async () => {
        await delay(5000);
        return HttpResponse.json(MOCK_RESPONSES.immediateSuccess);
      }),
    );

    render(<Home />);

    const file = createMockPDFFile();
    const fileInput = screen.getByLabelText(/resume \(pdf\)/i);
    const textarea = screen.getByLabelText(/job description/i);

    await user.upload(fileInput, file);
    await user.type(textarea, "Software Engineer");

    const button = screen.getByRole("button", { name: /analyze resume/i });
    await user.click(button);

    await waitFor(() => {
      expect(fileInput).toBeDisabled();
      expect(textarea).toBeDisabled();
      expect(button).toBeDisabled();
      expect(button).toHaveTextContent(/uploading resume|analyzing resume/i);
    });
  });

  it("should handle failed job status", async () => {
    const user = userEvent.setup();

    server.use(
      http.post("*/api/upload", () =>
        HttpResponse.json(MOCK_RESPONSES.failedJobInitial),
      ),
      http.get("*/api/status/:jobId", () =>
        HttpResponse.json(MOCK_RESPONSES.failedJobStatus),
      ),
    );

    render(<Home />);

    const file = createMockPDFFile();
    const fileInput = screen.getByLabelText(/resume \(pdf\)/i);
    const textarea = screen.getByLabelText(/job description/i);

    await user.upload(fileInput, file);
    await user.type(textarea, "Software Engineer");

    const button = screen.getByRole("button", { name: /analyze resume/i });
    await user.click(button);

    await waitFor(
      () => {
        expect(screen.getByText(/pdf parsing failed/i)).toBeInTheDocument();
      },
      { timeout: 5000 },
    );
  });
});
