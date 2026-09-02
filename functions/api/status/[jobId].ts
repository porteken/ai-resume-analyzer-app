import { handleStatus } from "../../../src/server/handlers/status";

import type { ApiEnvironment } from "../../../src/config/env";

interface FunctionContext {
  env: ApiEnvironment;
  params: { jobId: string };
  request: Request;
}

export const onRequestGet = (context: FunctionContext): Promise<Response> =>
  handleStatus(context.request, context.params.jobId, context.env);
