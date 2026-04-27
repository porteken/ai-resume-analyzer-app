/* eslint-disable jest/no-hooks, jest/require-top-level-describe */

import "@testing-library/jest-dom/vitest";

import { server } from "@/testing/mocks/server";
import { cleanup } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, vi } from "vitest";

import type * as NextNavigation from "next/navigation";

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

vi.mock<typeof NextNavigation>(import("next/navigation"), () => ({
  usePathname: () => "",
  useRouter: () => ({
    prefetch: vi.fn<() => Promise<void>>(),
    push: vi.fn<(href: string) => void>(),
    replace: vi.fn<(href: string) => void>(),
  }),
  useSearchParams: () => ({
    get: vi.fn<(key: string) => null | string>().mockReturnValue(null),
  }),
}));
