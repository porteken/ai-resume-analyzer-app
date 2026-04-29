import { HTTP_STATUS, createErrorResponse } from "@/lib/server/api-utils";
import { isObjectRecord } from "@/lib/type-guards";

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
          HTTP_STATUS.BAD_REQUEST,
          "Request body must be valid JSON.",
        ),
      };
    }

    throw error;
  }

  if (!isObjectRecord(body)) {
    return {
      body: null,
      error: createErrorResponse(
        "Invalid request body",
        HTTP_STATUS.BAD_REQUEST,
        "Request body must be a JSON object.",
      ),
    };
  }

  return { body, error: null };
};

export const handleNonJsonResponse = async (
  response: Response,
): Promise<NextResponse> => {
  const text = await response.text();

  const MAX_LOG_LENGTH = 200;
  return createErrorResponse(
    `External API returned non-JSON response (${response.status}). Check API_ENDPOINT / API_KEY server env vars`,
    HTTP_STATUS.BAD_GATEWAY,
    text.slice(0, MAX_LOG_LENGTH),
  );
};
