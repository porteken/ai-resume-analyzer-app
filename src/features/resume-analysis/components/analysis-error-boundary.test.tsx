import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AnalysisErrorBoundary } from "./analysis-error-boundary";

const ThrowingChild = (): never => {
  throw new Error("boom");
};

describe("analysisErrorBoundary", () => {
  it("renders children when there is no error", () => {
    render(
      <AnalysisErrorBoundary>
        <p>content</p>
      </AnalysisErrorBoundary>,
    );

    expect(screen.getByText("content")).toBeInTheDocument();
  });

  it("renders a fallback alert when a child throws", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});

    render(
      <AnalysisErrorBoundary>
        <ThrowingChild />
      </AnalysisErrorBoundary>,
    );

    expect(screen.getByRole("alert")).toHaveTextContent(
      /couldn't display the analysis/iu,
    );

    vi.restoreAllMocks();
  });
});
