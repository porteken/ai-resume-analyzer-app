export interface MockAnalysisResult {
  gaps?: string;
  matchScore?: string;
  recommendations?: string;
  strengths?: string;
}

export function createMockAnalysisResult(
  overrides?: MockAnalysisResult,
): string {
  const defaults = {
    gaps: "- Limited cloud platform experience",
    matchScore: "85% match to job requirements",
    recommendations:
      "- Consider obtaining AWS or Azure certification\n- Add cloud-based projects to portfolio",
    strengths:
      "- Strong technical background in relevant technologies\n- Excellent problem-solving skills",
  };

  const result = { ...defaults, ...overrides };

  return `## Match Score
${result.matchScore}

## Strengths
${result.strengths}

## Gaps
${result.gaps}

## Recommendations
${result.recommendations}`;
}

export const MOCK_JOB_IDS = {
  async: "test-job-async-123",
  failed: "test-job-failed-456",
  success: "test-job-success-789",
} as const;

export const MOCK_RESPONSES = {
  asyncJobComplete: {
    analysis_result: createMockAnalysisResult({ matchScore: "90% match" }),
    status: "completed",
  },
  asyncJobInitial: {
    job_id: MOCK_JOB_IDS.async,
  },
  asyncJobProcessing: {
    status: "processing",
  },
  emptyResponse: {},
  failedJobInitial: {
    job_id: MOCK_JOB_IDS.failed,
  },
  failedJobStatus: {
    error: "PDF parsing failed",
    status: "failed",
  },
  immediateSuccess: {
    analysis_result: createMockAnalysisResult(),
  },
  serverError: {
    details: "Internal server error",
    error: "Server error",
  },
} as const;
