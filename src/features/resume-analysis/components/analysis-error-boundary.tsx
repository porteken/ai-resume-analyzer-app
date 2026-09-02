import { AlertCircle } from "lucide-react";
import { Component } from "react";

import type { JSX, ReactNode } from "react";

interface AnalysisErrorBoundaryProperties {
  children: ReactNode;
}

interface AnalysisErrorBoundaryState {
  hasError: boolean;
}

export class AnalysisErrorBoundary extends Component<
  AnalysisErrorBoundaryProperties,
  AnalysisErrorBoundaryState
> {
  public constructor(props: AnalysisErrorBoundaryProperties) {
    super(props);
    this.state = { hasError: false };
  }

  public static getDerivedStateFromError(): AnalysisErrorBoundaryState {
    return { hasError: true };
  }

  public componentDidCatch(error: unknown): void {
    console.error("Failed to render analysis result", error);
  }

  public render(): JSX.Element | ReactNode {
    if (this.state.hasError) {
      return (
        <div
          aria-live="assertive"
          className="flex animate-in items-start gap-3 rounded-xl border border-red-200/50 bg-red-50/80 p-4 text-sm text-red-600 backdrop-blur-sm duration-500 fade-in slide-in-from-bottom-4"
          role="alert"
        >
          <AlertCircle className="mt-0.5 size-5 shrink-0" />
          <span>
            Couldn&apos;t display the analysis. Reload the page to try again.
          </span>
        </div>
      );
    }

    return this.props.children;
  }
}
