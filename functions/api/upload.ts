import { handleUpload } from "../../src/server/handlers/upload";

import type { ApiEnvironment } from "../../src/config/env";

interface FunctionContext {
  env: ApiEnvironment;
  request: Request;
}

export const onRequestPost = (context: FunctionContext): Promise<Response> =>
  handleUpload(context.request, context.env);
