import { type NextRequest, NextResponse } from "next/server";

import { createErrorResponse } from "@/lib/server/api-utils";

export const parseRequestBody = async (
  request: NextRequest
): Promise<{
  body: null | Record<string, unknown>;
  error: NextResponse | null;
}> => {
  let body: unknown;

  try {
    body = await request.json();
  } catch (error) {
    if (error instanceof SyntaxError) {
      return {
        body: null,
        error: createErrorResponse("Invalid request body", 400, "Request body must be valid JSON."),
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
        "Request body must be a JSON object."
      ),
    };
  }

  return { body: body as Record<string, unknown>, error: null };
};

export const handleNonJsonResponse = async (
  response: Response,
  logContext = "Non-JSON response"
): Promise<NextResponse> => {
  const text = await response.text();

  console.error(logContext, {
    contentType: response.headers.get("content-type"),
    preview: text.slice(0, 200),
    status: response.status,
  });

  return createErrorResponse(
    `External API returned non-JSON response (${response.status}). Check API_ENDPOINT / API_KEY server env vars`,
    502,
    text.slice(0, 200)
  );
};
