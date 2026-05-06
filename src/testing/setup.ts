/* oxlint-disable vitest/require-top-level-describe, jest/no-hooks */
// oxlint-disable-next-line import/no-unassigned-import
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

vi.mock("next/navigation", () => ({
  usePathname: () => "",
  useRouter: () => ({
    back: vi.fn<() => void>(),
    forward: vi.fn<() => void>(),
    prefetch: vi.fn<() => Promise<void>>(),
    push: vi.fn<(href: string) => void>(),
    refresh: vi.fn<() => void>(),
    replace: vi.fn<(href: string) => void>(),
  }),
  useSearchParams: () => new URLSearchParams(),
}));
