const JSON_HEADERS = {
  "Content-Type": "application/json",
} as const;

export const postJson = (url: string, payload: unknown): Promise<Response> =>
  fetch(url, {
    body: JSON.stringify(payload),
    headers: JSON_HEADERS,
    method: "POST",
  });

export const getJson = (url: string): Promise<Response> =>
  fetch(url, {
    method: "GET",
  });
