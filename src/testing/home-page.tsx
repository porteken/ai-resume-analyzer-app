import { HomePage } from "@/pages/home-page";
import { createMockPDFFile } from "@/testing/mocks/file";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { expect, vi } from "vitest";

const DEFAULT_JOB_DESCRIPTION = "Software Engineer";

export function getAnalyzeButton(): HTMLElement {
  return screen.getByRole("button", { name: /analyze resume/iu });
}

const mockTurnstileForTests = (): void => {
  (window as unknown as { turnstile: unknown }).turnstile = {
    remove: vi.fn<() => void>(),
    render: (
      _container: HTMLElement,
      options: { callback?: (token: string) => void },
    ): string => {
      queueMicrotask(() => {
        options.callback?.("test-turnstile-token");
      });
      return "test-widget-id";
    },
    reset: vi.fn<() => void>(),
  };
};

export function renderHomePage() {
  mockTurnstileForTests();
  const user = userEvent.setup();
  render(
    <MemoryRouter>
      <HomePage />
    </MemoryRouter>,
  );

  return {
    analyzeButton: getAnalyzeButton,
    fileInput: screen.getByLabelText(/resume \(pdf\)/iu),
    textarea: screen.getByLabelText(/job description/iu),
    user,
  };
}

export async function fillResumeAnalysisForm(
  form: ReturnType<typeof renderHomePage>,
  options: {
    file?: File;
    jobDescription?: string;
  } = {},
) {
  await form.user.upload(form.fileInput, options.file ?? createMockPDFFile());
  await form.user.type(
    form.textarea,
    options.jobDescription ?? DEFAULT_JOB_DESCRIPTION,
  );
  // Fail-loud Turnstile requires a token when siteKey is configured.
  // Wait for the mocked challenge to resolve (hidden input populated),
  // without requiring the Analyze button itself to become enabled —
  // validation (e.g. whitespace JD, oversized file) may still keep it disabled.
  await waitFor(() => {
    const hidden = document.querySelector<HTMLInputElement>(
      'input[name="cf-turnstile-response"]',
    );
    expect(hidden?.value ?? "").not.toBe("");
  });
}

export async function submitResumeAnalysis(
  form: ReturnType<typeof renderHomePage>,
  options?: Parameters<typeof fillResumeAnalysisForm>[1],
) {
  await fillResumeAnalysisForm(form, options);
  await form.user.click(form.analyzeButton());
}
