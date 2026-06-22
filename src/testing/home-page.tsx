import Home from "@/app/page";
import { createMockPDFFile } from "@/testing/mocks/file";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const DEFAULT_JOB_DESCRIPTION = "Software Engineer";

export function getAnalyzeButton(): HTMLElement {
  return screen.getByRole("button", { name: /analyze resume/iu });
}

export function renderHomePage() {
  const user = userEvent.setup();
  render(<Home />);

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
}

export async function submitResumeAnalysis(
  form: ReturnType<typeof renderHomePage>,
  options?: Parameters<typeof fillResumeAnalysisForm>[1],
) {
  await fillResumeAnalysisForm(form, options);
  await form.user.click(form.analyzeButton());
}
