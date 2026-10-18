import "@testing-library/jest-dom/vitest";

import { server } from "@/testing/mocks/server";
import { cleanup } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, vi } from "vitest";

beforeAll(() => {
  server.listen({ onUnhandledFrame: "error" });
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});
