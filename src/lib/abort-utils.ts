export const createAbortError = (): DOMException =>
  new DOMException("Request was aborted.", "AbortError");

export const throwIfAborted = (signal?: AbortSignal): void => {
  if (signal?.aborted) {
    throw createAbortError();
  }
};
