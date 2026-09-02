import { handleAnalyze } from "../../src/server/handlers/analyze";

import type { ApiEnvironment } from "../../src/config/env";

interface FunctionContext {
  env: ApiEnvironment;
  request: Request;
}

export const onRequestPost = (context: FunctionContext): Promise<Response> =>
  handleAnalyze(context.request, context.env);
