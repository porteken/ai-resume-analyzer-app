declare namespace NodeJS {
  interface ProcessEnv {
    readonly API_ENDPOINT?: string;
    readonly API_KEY?: string;
    readonly NEXT_PUBLIC_API_ENDPOINT?: string;

    readonly NEXT_PUBLIC_SITE_URL?: string;
    readonly VERCEL_PROJECT_PRODUCTION_URL?: string;
    readonly VERCEL_URL?: string;

    readonly CI?: string;
    readonly PLAYWRIGHT_BASE_URL?: string;
    readonly PLAYWRIGHT_TEST_PORT?: string;
  }
}
