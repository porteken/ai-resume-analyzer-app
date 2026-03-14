import { describe, expect, it, vi } from "vitest";

import {
  handleNonJsonResponse,
  parseRequestBody,
} from "@/lib/server/request-utils";

const createRequest = (json: () => Promise<unknown>) =>
  ({
    json,
  }) as Parameters<typeof parseRequestBody>[0];

describe("request-utils", () => {
  it("parses object request bodies", async () => {
    const result = await parseRequestBody(
      createRequest(async () => ({ job_description: "Engineer" })),
    );

    expect(result).toEqual({
      body: { job_description: "Engineer" },
      error: null,
    });
  });

  it("returns a 400 response for invalid JSON", async () => {
    const result = await parseRequestBody(
      createRequest(async () => {
        throw new SyntaxError("Unexpected token");
      }),
    );

    expect(result.body).toBeNull();
    expect(result.error?.status).toBe(400);
    await expect(result.error?.json()).resolves.toEqual({
      details: "Request body must be valid JSON.",
      error: "Invalid request body",
    });
  });

  it("returns a 400 response when the parsed body is not an object", async () => {
    const result = await parseRequestBody(createRequest(async () => ["oops"]));

    expect(result.body).toBeNull();
    expect(result.error?.status).toBe(400);
    await expect(result.error?.json()).resolves.toEqual({
      details: "Request body must be a JSON object.",
      error: "Invalid request body",
    });
  });

  it("rethrows unexpected request parsing errors", async () => {
    await expect(
      parseRequestBody(
        createRequest(async () => {
          throw new TypeError("Body stream failed");
        }),
      ),
    ).rejects.toThrow("Body stream failed");
  });

  it("logs and wraps non-JSON upstream responses", async () => {
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    const response = new Response("x".repeat(250), {
      headers: { "content-type": "text/html" },
      status: 502,
    });

    const result = await handleNonJsonResponse(
      response,
      "Non-JSON response from analyze",
    );

    expect(result.status).toBe(502);
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "Non-JSON response from analyze",
      {
        contentType: "text/html",
        preview: "x".repeat(200),
        status: 502,
      },
    );
    await expect(result.json()).resolves.toEqual({
      details: "x".repeat(200),
      error:
        "External API returned non-JSON response (502). Check API_ENDPOINT / API_KEY server env vars",
    });
  });
});
