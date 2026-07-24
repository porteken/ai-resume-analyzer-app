// Declares the environment variables this app reads so that dotted access
// (process.env.API_KEY) is typed and resolves in editors that only see the
// index signature from @types/node. Values stay `string | undefined`.
declare namespace NodeJS {
  interface ProcessEnv {
    // API proxy configuration (src/config/env.ts)
    readonly API_ENDPOINT?: string;
    readonly API_KEY?: string;
    readonly NEXT_PUBLIC_API_ENDPOINT?: string;

    // Canonical site URL resolution (src/lib/site-url.ts)
    readonly NEXT_PUBLIC_SITE_URL?: string;
    readonly VERCEL_PROJECT_PRODUCTION_URL?: string;
    readonly VERCEL_URL?: string;

    // End-to-end test runner (playwright.config.ts)
    readonly CI?: string;
    readonly PLAYWRIGHT_BASE_URL?: string;
    readonly PLAYWRIGHT_TEST_PORT?: string;
  }
}
