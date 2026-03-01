const JSON_HEADERS = {
  "Content-Type": "application/json",
} as const;

interface RequestOptions {
  signal?: AbortSignal;
}

export const postJson = (
  url: string,
  payload: unknown,
  options?: RequestOptions,
): Promise<Response> =>
  fetch(url, {
    body: JSON.stringify(payload),
    headers: JSON_HEADERS,
    method: "POST",
    signal: options?.signal,
  });

export const getJson = (
  url: string,
  options?: RequestOptions,
): Promise<Response> =>
  fetch(url, {
    method: "GET",
    signal: options?.signal,
  });
