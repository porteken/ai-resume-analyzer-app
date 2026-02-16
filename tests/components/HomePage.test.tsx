import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import Home from "@/app/page";
import { MOCK_RESPONSES } from "@/tests/mocks/api";
import {
  createMockFile,
  createMockLargePDFFile,
  createMockPDFFile,
} from "@/tests/mocks/file";

describe("Home Page Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    globalThis.fetch = vi.fn();
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

  it("should have analyze button disabled initially", async () => {
    render(<Home />);
    const button = screen.getByRole("button", { name: /analyze resume/i });
    await expect(button).toBeDisabled();
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
    await expect(button).toBeEnabled();
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
    await expect(button).toBeDisabled();
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

    await expect(button).toBeDisabled();
  });

  it("should handle successful upload with immediate result", async () => {
    const user = userEvent.setup();

    globalThis.fetch = vi.fn().mockResolvedValue({
      json: async () => MOCK_RESPONSES.immediateSuccess,
      ok: true,
    });

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

    expect(screen.getByText(/match score/i)).toBeInTheDocument();
  });

  it("should handle async job with polling", async () => {
    const user = userEvent.setup();

    let pollCount = 0;
    globalThis.fetch = vi.fn().mockImplementation((url) => {
      if (url.includes("/api/upload")) {
        return Promise.resolve({
          json: async () => MOCK_RESPONSES.asyncJobInitial,
          ok: true,
        });
      }
      if (url.includes("/api/status")) {
        pollCount++;
        if (pollCount >= 2) {
          return Promise.resolve({
            json: async () => MOCK_RESPONSES.asyncJobComplete,
            ok: true,
          });
        }
        return Promise.resolve({
          json: async () => MOCK_RESPONSES.asyncJobProcessing,
          ok: true,
        });
      }
      return Promise.reject(new Error("Unknown URL"));
    });

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

    globalThis.fetch = vi.fn().mockResolvedValue({
      json: async () => MOCK_RESPONSES.serverError,
      ok: false,
      status: 500,
    });

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

  it("should handle network errors", async () => {
    const user = userEvent.setup();

    globalThis.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

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

    globalThis.fetch = vi.fn().mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(
            () =>
              resolve({
                json: async () => MOCK_RESPONSES.immediateSuccess,
                ok: true,
              }),
            5000,
          ),
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

    await waitFor(async () => {
      await expect(fileInput).toBeDisabled();
      await expect(textarea).toBeDisabled();
      await expect(button).toBeDisabled();
    });
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("should display markdown sections correctly", async () => {
    const user = userEvent.setup();

    globalThis.fetch = vi.fn().mockResolvedValue({
      json: async () => MOCK_RESPONSES.immediateSuccess,
      ok: true,
    });

    render(<Home />);

    const file = createMockPDFFile();
    const fileInput = screen.getByLabelText(/resume \(pdf\)/i);
    const textarea = screen.getByLabelText(/job description/i);

    await user.upload(fileInput, file);
    await user.type(textarea, "Software Engineer");

    const button = screen.getByRole("button", { name: /analyze resume/i });
    await user.click(button);

    await waitFor(() => {
      expect(screen.getByText(/match score/i)).toBeInTheDocument();
      expect(screen.getByText(/strengths/i)).toBeInTheDocument();
      expect(screen.getByText(/gaps/i)).toBeInTheDocument();
      expect(screen.getByText(/recommendations/i)).toBeInTheDocument();
    });
  });

  it("should handle failed job status", async () => {
    const user = userEvent.setup();

    globalThis.fetch = vi.fn().mockImplementation((url) => {
      if (url.includes("/api/upload")) {
        return Promise.resolve({
          json: async () => MOCK_RESPONSES.failedJobInitial,
          ok: true,
        });
      }
      if (url.includes("/api/status")) {
        return Promise.resolve({
          json: async () => MOCK_RESPONSES.failedJobStatus,
          ok: true,
        });
      }
      return Promise.reject(new Error("Unknown URL"));
    });

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
