import { handleAnalyze } from "./handlers/analyze";
import { handleStatus } from "./handlers/status";
import { handleUpload } from "./handlers/upload";

import type { ApiEnvironment } from "../config/env";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { Plugin } from "vite";

async function readRequestBody(
  req: IncomingMessage,
): Promise<Uint8Array<ArrayBuffer>> {
  const chunks: Uint8Array[] = [];
  for await (const chunk of req) {
    if (typeof chunk === "string") {
      chunks.push(new TextEncoder().encode(chunk));
    } else if (chunk instanceof Uint8Array) {
      chunks.push(chunk);
    }
  }

  const totalLength = chunks.reduce((acc, c) => acc + c.byteLength, 0);
  const result = new Uint8Array(new ArrayBuffer(totalLength));
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return result;
}

function buildIncomingHeaders(req: IncomingMessage): Headers {
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (typeof value === "string") {
      headers.set(key, value);
    } else if (Array.isArray(value)) {
      for (const item of value) {
        headers.append(key, item);
      }
    }
  }
  return headers;
}

async function dispatchApiRoute(
  fullUrl: URL,
  method: string,
  request: Request,
  environment: ApiEnvironment,
): Promise<Response> {
  if (fullUrl.pathname === "/api/upload" && method === "POST") {
    return handleUpload(request, environment);
  }

  if (fullUrl.pathname === "/api/analyze" && method === "POST") {
    return handleAnalyze(request, environment);
  }

  if (fullUrl.pathname.startsWith("/api/status/") && method === "GET") {
    const jobId = fullUrl.pathname.replace("/api/status/", "");
    return handleStatus(request, jobId, environment);
  }

  return Response.json({ error: "Not found" }, { status: 404 });
}

async function handleApiMiddlewareRequest(
  req: IncomingMessage,
  res: ServerResponse,
  environment: ApiEnvironment,
): Promise<void> {
  const host = req.headers.host ?? "localhost:3000";
  const fullUrl = new URL(req.url ?? "", `http://${host}`);
  const method = req.method ?? "GET";

  const bodyBytes = await readRequestBody(req);
  const hasBody = method !== "GET" && method !== "HEAD" && bodyBytes.length > 0;

  const request = new Request(fullUrl.toString(), {
    body: hasBody ? new Blob([bodyBytes]) : undefined,
    headers: buildIncomingHeaders(req),
    method,
  });

  const response = await dispatchApiRoute(
    fullUrl,
    method,
    request,
    environment,
  );

  res.statusCode = response.status;
  response.headers.forEach((value, key) => {
    res.setHeader(key, value);
  });

  const arrayBuffer = await response.arrayBuffer();
  res.end(new Uint8Array(arrayBuffer));
}

export function apiDevPlugin(environment: ApiEnvironment): Plugin {
  return {
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url ?? "";
        if (!url.startsWith("/api/")) {
          next();
          return;
        }

        void handleApiMiddlewareRequest(req, res, environment).catch(
          (error: unknown) => {
            res.statusCode = 500;
            res.setHeader("Content-Type", "application/json");
            res.end(
              JSON.stringify({
                details:
                  error instanceof Error ? error.message : "Unknown error",
                error: "Dev API middleware error",
              }),
            );
          },
        );
      });
    },
    name: "api-dev-middleware",
  };
}
