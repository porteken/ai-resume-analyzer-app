import "@testing-library/jest-dom/vitest";

import { server } from "@/testing/mocks/server";
import { cleanup } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, vi } from "vitest";

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
});

afterEach(() => {
  cleanup();
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});

vi.mock("next/navigation", () =>
  Object.fromEntries([
    ["usePathname", () => ""],
    [
      "useRouter",
      () =>
        Object.fromEntries([
          ["back", vi.fn<() => void>()],
          ["forward", vi.fn<() => void>()],
          ["prefetch", vi.fn<() => Promise<void>>()],
          ["push", vi.fn<(href: string) => void>()],
          ["refresh", vi.fn<() => void>()],
          ["replace", vi.fn<(href: string) => void>()],
        ]),
    ],
    ["useSearchParams", () => new URLSearchParams()],
  ]),
);
