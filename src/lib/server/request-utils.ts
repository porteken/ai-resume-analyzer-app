import { createErrorResponse } from "@/lib/server/api-utils";

import type { NextResponse } from "next/server";

type ParseRequestBodyResult =
  | {
      body: Record<string, unknown>;
      error: null;
    }
  | {
      body: null;
      error: NextResponse;
    };

export const parseRequestBody = async (
  request: Pick<Request, "json">,
): Promise<ParseRequestBodyResult> => {
  let body: unknown;

  try {
    body = await request.json();
  } catch (error) {
    if (error instanceof SyntaxError) {
      return {
        body: null,
        error: createErrorResponse(
          "Invalid request body",
          400,
          "Request body must be valid JSON.",
        ),
      };
    }

    throw error;
  }

  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return {
      body: null,
      error: createErrorResponse(
        "Invalid request body",
        400,
        "Request body must be a JSON object.",
      ),
    };
  }

  return { body: body as Record<string, unknown>, error: null };
};

export const handleNonJsonResponse = async (
  response: Response,
): Promise<NextResponse> => {
  const text = await response.text();

  return createErrorResponse(
    `External API returned non-JSON response (${response.status}). Check API_ENDPOINT / API_KEY server env vars`,
    502,
    text.slice(0, 200),
  );
};
