/* eslint-disable vitest/require-top-level-describe */
// eslint-disable-next-line import/no-unassigned-import
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

vi.mock<typeof NextNavigation>(import("next/navigation"), () => {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-type-assertion
  const searchParams = new URLSearchParams() as unknown as ReturnType<
    typeof NextNavigation.useSearchParams
  >;

  return {
    usePathname: () => "",
    useRouter: () => ({
      back: vi.fn<() => void>(),
      forward: vi.fn<() => void>(),
      prefetch: vi.fn<() => Promise<void>>(),
      push: vi.fn<(href: string) => void>(),
      refresh: vi.fn<() => void>(),
      replace: vi.fn<(href: string) => void>(),
    }),
    useSearchParams: () => searchParams,
  };
});
