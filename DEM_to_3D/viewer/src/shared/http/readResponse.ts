/** Bound both the connection and body read, and cancel work when its owner closes. */
export async function readResponse(url: string, signal?: AbortSignal, timeoutMs = 10000): Promise<Response> {
  const controller = new AbortController();
  const abort = () => controller.abort(signal?.reason);
  signal?.addEventListener('abort', abort, { once: true });
  if (signal?.aborted) abort();
  const timeout = setTimeout(() => controller.abort(new Error('Data request timed out')), timeoutMs);
  try {
    controller.signal.throwIfAborted();
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error(`Data request failed (${response.status}): ${url}`);
    const bytes = await response.arrayBuffer();
    controller.signal.throwIfAborted();
    return new Response(bytes, { status: response.status, headers: response.headers });
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener('abort', abort);
  }
}
