import { ResumeUploader } from "@/features/resume-analysis/components/resume-uploader";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const createProps = (
  overrides: Partial<Parameters<typeof ResumeUploader>[0]> = {},
) => ({
  isLoading: false,
  onCancel: vi.fn<() => void>(),
  onFileSelected: vi.fn<(file: File | null) => void>(),
  onFileSelectionError: vi.fn<(message: string) => void>(),
  onFileSelectionSuccess: vi.fn<() => void>(),
  onSubmit: vi
    .fn<
      (
        file: File | null,
        jobDescription: string,
        options?: { turnstileToken?: string },
      ) => Promise<void>
    >()
    .mockResolvedValue(),
  statusMessage: "",
  ...overrides,
});

const selectFileViaInput = (file: File) => {
  const input = document.getElementById("resume") as HTMLInputElement;
  fireEvent.change(input, { target: { files: [file] } });
};

const pdfFile = (name = "resume.pdf", size = 1024) =>
  new File(["a".repeat(Math.min(size, 1024))], name, {
    type: "application/pdf",
  });

describe("ResumeUploader", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete (window as unknown as { turnstile?: unknown }).turnstile;
    delete (window as unknown as { onTurnstileVerify?: unknown })
      .onTurnstileVerify;
  });

  it("disables Analyze until file and description are present", () => {
    render(<ResumeUploader {...createProps()} />);
    const button = screen.getByRole("button", { name: /analyze resume/iu });
    expect(button).toBeDisabled();
  });

  it("enables Analyze after file selection and job description", () => {
    render(<ResumeUploader {...createProps()} />);
    selectFileViaInput(pdfFile());

    fireEvent.change(screen.getByLabelText(/job description/iu), {
      target: { value: "Software Engineer" },
    });

    expect(
      screen.getByRole("button", { name: /analyze resume/iu }),
    ).not.toBeDisabled();
  });

  it("shows validation error for non-PDF file", () => {
    const properties = createProps();
    render(<ResumeUploader {...properties} />);

    const bad = new File(["x"], "notes.txt", { type: "text/plain" });
    selectFileViaInput(bad);

    expect(properties.onFileSelectionError).toHaveBeenCalledWith(
      "Please upload a PDF file.",
    );
    expect(properties.onFileSelected).toHaveBeenCalledWith(null);
  });

  it("formats KB file size and allows removal", () => {
    const properties = createProps();
    render(<ResumeUploader {...properties} />);
    selectFileViaInput(pdfFile("resume.pdf"));

    expect(screen.getByText(/1 KB • PDF document/iu)).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: /remove selected resume/iu }),
    );
    expect(properties.onFileSelected).toHaveBeenLastCalledWith(null);
  });

  it("formats MB file size for large files", () => {
    render(<ResumeUploader {...createProps()} />);
    const bigContent = "a".repeat(1024);
    const bigFile = new File([bigContent], "big.pdf", {
      type: "application/pdf",
    });
    Object.defineProperty(bigFile, "size", { value: 2.5 * 1024 * 1024 });
    selectFileViaInput(bigFile);

    expect(screen.getByText(/2\.5 MB • PDF document/iu)).toBeInTheDocument();
  });

  it("handles drag enter/over/drop and browse click", () => {
    const properties = createProps();
    render(<ResumeUploader {...properties} />);

    const dropzone = screen
      .getByRole("button", { name: /choose file/iu })
      .closest("button");
    expect(dropzone).toBeTruthy();

    fireEvent.dragEnter(dropzone!, { dataTransfer: { files: [] } });
    fireEvent.dragOver(dropzone!, {
      dataTransfer: { dropEffect: "" as string, files: [] },
    });
    fireEvent.drop(dropzone!, {
      dataTransfer: { files: [pdfFile()] },
    });

    expect(properties.onFileSelected).toHaveBeenCalledWith(
      expect.objectContaining({ name: "resume.pdf" }),
    );

    fireEvent.dragEnter(dropzone!);
    fireEvent.dragLeave(dropzone!, { relatedTarget: document.body });
  });

  it("submits cleaned description with turnstile token", async () => {
    const properties = createProps({ turnstileToken: "ts-abc" });
    render(<ResumeUploader {...properties} />);
    selectFileViaInput(pdfFile());
    fireEvent.change(screen.getByLabelText(/job description/iu), {
      target: { value: "  Senior   Engineer\n" },
    });

    fireEvent.click(screen.getByRole("button", { name: /analyze resume/iu }));

    await waitFor(() => {
      expect(properties.onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ name: "resume.pdf" }),
        "Senior Engineer",
        { turnstileToken: "ts-abc" },
      );
    });
  });

  it("shows uploading and analyzing progress steps", () => {
    const { rerender } = render(
      <ResumeUploader
        {...createProps({
          isLoading: true,
          statusMessage: "Uploading Resume...",
        })}
      />,
    );
    expect(screen.getAllByText("Uploading Resume...").length).toBeGreaterThan(
      0,
    );
    expect(screen.getByText("Uploading resume")).toBeInTheDocument();

    rerender(
      <ResumeUploader
        {...createProps({
          isLoading: true,
          statusMessage: "Analyzing Resume...",
        })}
      />,
    );
    expect(screen.getAllByText("Analyzing Resume...").length).toBeGreaterThan(
      0,
    );

    rerender(
      <ResumeUploader
        {...createProps({ isLoading: true, statusMessage: "Something else" })}
      />,
    );
    expect(screen.getAllByText("Something else").length).toBeGreaterThan(0);
  });

  it("shows cancel button while loading and calls onCancel", () => {
    const properties = createProps({
      isLoading: true,
      statusMessage: "Working",
    });
    render(<ResumeUploader {...properties} />);

    fireEvent.click(screen.getByRole("button", { name: /cancel analysis/iu }));
    expect(properties.onCancel).toHaveBeenCalledOnce();
  });

  it("renders turnstile widget and hidden input when site key provided", async () => {
    (window as unknown as { turnstile: unknown }).turnstile = {
      remove: vi.fn<() => void>(),
      render: vi.fn<() => string>().mockReturnValue("widget-1"),
      reset: vi.fn<() => void>(),
    };
    const onTokenChange = vi.fn<(token: null | string) => void>();
    render(
      <ResumeUploader
        {...createProps({
          onTurnstileTokenChange: onTokenChange,
          turnstileSiteKey: "site-123",
        })}
      />,
    );

    await waitFor(() => {
      expect(
        (
          window as unknown as {
            turnstile: { render: ReturnType<typeof vi.fn> };
          }
        ).turnstile.render,
      ).toHaveBeenCalled();
    });

    const hidden = document.querySelector(
      'input[name="cf-turnstile-response"]',
    );
    expect(hidden).toBeTruthy();

    // Simulate widget verify callback
    (
      window as unknown as { onTurnstileVerify: (token: string) => void }
    ).onTurnstileVerify("tok-1");
    expect(onTokenChange).toHaveBeenCalledWith("tok-1");
  });

  it("shows character count and flags overlong descriptions", () => {
    render(<ResumeUploader {...createProps()} />);
    const long = "a".repeat(6000);
    fireEvent.change(screen.getByLabelText(/job description/iu), {
      target: { value: long },
    });

    expect(screen.getByText(/6,000/u)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /analyze resume/iu }),
    ).toBeDisabled();
  });
});
