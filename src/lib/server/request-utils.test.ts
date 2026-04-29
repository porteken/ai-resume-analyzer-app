import {
  handleNonJsonResponse,
  parseRequestBody,
} from "@/lib/server/request-utils";
import { describe, expect, it } from "vitest";

const createRequest = (json: () => Promise<unknown>) =>
  ({
    json,
  }) as Parameters<typeof parseRequestBody>[0];

describe("request-utils", () => {
  it("parses object request bodies", async () => {
    const result = await parseRequestBody(
      createRequest(async () =>
        Promise.resolve({ job_description: "Engineer" }),
      ),
    );

    expect(result).toStrictEqual({
      body: { job_description: "Engineer" },
      error: null,
    });
  });

  it("returns a 400 response for invalid JSON", async () => {
    const result = await parseRequestBody(
      createRequest(async () =>
        Promise.reject(new SyntaxError("Unexpected token")),
      ),
    );

    expect(result.body).toBeNull();
    expect(result.error?.status).toBe(400);
    await expect(result.error?.json()).resolves.toStrictEqual({
      details: "Request body must be valid JSON.",
      error: "Invalid request body",
    });
  });

  it("returns a 400 response when the parsed body is not an object", async () => {
    const result = await parseRequestBody(
      createRequest(async () => Promise.resolve(["oops"])),
    );

    expect(result.body).toBeNull();
    expect(result.error?.status).toBe(400);
    await expect(result.error?.json()).resolves.toStrictEqual({
      details: "Request body must be a JSON object.",
      error: "Invalid request body",
    });
  });

  it("rethrows unexpected request parsing errors", async () => {
    await expect(
      parseRequestBody(
        createRequest(async () =>
          Promise.reject(new TypeError("Body stream failed")),
        ),
      ),
    ).rejects.toThrow("Body stream failed");
  });

  it("wraps non-JSON upstream responses", async () => {
    const response = new Response("x".repeat(250), {
      headers: { "content-type": "text/html" },
      status: 502,
    });

    const result = await handleNonJsonResponse(response);

    expect(result.status).toBe(502);
    await expect(result.json()).resolves.toStrictEqual({
      details: "x".repeat(200),
      error:
        "External API returned non-JSON response (502). Check API_ENDPOINT / API_KEY server env vars",
    });
  });
});
