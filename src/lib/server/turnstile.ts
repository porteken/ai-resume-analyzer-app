import { createErrorResponse, HTTP_STATUS } from "./api-utils.ts";

import type { ApiEnvironment } from "../../config/env.ts";

const TURNSTILE_VERIFY_URL =
  "https://challenges.cloudflare.com/turnstile/v0/siteverify";

const getTurnstileSecret = (environment?: ApiEnvironment): null | string => {
  const fromEnv =
    environment?.TURNSTILE_SECRET_KEY ?? process.env.TURNSTILE_SECRET_KEY;
  if (typeof fromEnv === "string" && fromEnv.trim() !== "") {
    return fromEnv.trim();
  }
  return null;
};

const getRemoteIp = (request: Request): string | undefined =>
  request.headers.get("cf-connecting-ip") ??
  request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
  undefined;

const verifyTurnstileToken = async (
  token: string,
  secret: string,
  remoteip?: string,
): Promise<boolean> => {
  try {
    const form = new URLSearchParams();
    form.set("secret", secret);
    form.set("response", token);
    if (remoteip) {
      form.set("remoteip", remoteip);
    }

    const response = await fetch(TURNSTILE_VERIFY_URL, {
      body: form.toString(),
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      method: "POST",
    });

    const data: unknown = await response.json().catch(() => null);
    return (
      typeof data === "object" &&
      data !== null &&
      (data as { success?: unknown }).success === true
    );
  } catch {
    return false;
  }
};

/**
 * Optional Turnstile verification. Fails open when no secret is configured
 * (dev / Pages preview without bot protection) so existing flows keep working.
 * Returns an error Response on failure, otherwise null. Mutates `body` to
 * strip `turnstileToken` so it is never proxied to AWS.
 */
export const verifyTurnstileRequest = async (
  body: Record<string, unknown>,
  request: Request,
  environment?: ApiEnvironment,
): Promise<null | Response> => {
  const secret = getTurnstileSecret(environment);
  if (!secret) {
    // Fail open: no secret configured (e.g. local dev). Still strip any
    // token the client sent so it never reaches the upstream API.
    delete body.turnstileToken;
    return null;
  }

  const token = body.turnstileToken;
  delete body.turnstileToken;

  if (typeof token !== "string" || token.trim() === "") {
    return createErrorResponse(
      "Bot verification required",
      HTTP_STATUS.FORBIDDEN,
      "Missing turnstileToken. Please complete the verification challenge and try again.",
    );
  }

  const ok = await verifyTurnstileToken(token, secret, getRemoteIp(request));
  if (!ok) {
    return createErrorResponse(
      "Bot verification failed",
      HTTP_STATUS.FORBIDDEN,
      "Turnstile verification failed. Please try again.",
    );
  }

  return null;
};
