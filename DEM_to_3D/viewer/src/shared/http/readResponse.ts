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

/**
 * Download a large binary (terrain meshes) with byte progress. Slow links may take longer than
 * any fixed budget, so the request is cancelled only when the transfer stalls.
 */
export async function readBinary(
  url: string,
  options: {
    signal?: AbortSignal;
    expectedBytes?: number;
    idleMs?: number;
    onProgress?: (fraction: number) => void;
  } = {}
): Promise<ArrayBuffer> {
  const { signal, expectedBytes = 0, idleMs = 20000, onProgress } = options;
  const controller = new AbortController();
  const abort = () => controller.abort(signal?.reason);
  signal?.addEventListener('abort', abort, { once: true });
  if (signal?.aborted) abort();
  let timer: ReturnType<typeof setTimeout> | undefined;
  const arm = () => {
    clearTimeout(timer);
    timer = setTimeout(() => controller.abort(new Error('Data request stalled')), idleMs);
  };
  try {
    controller.signal.throwIfAborted();
    arm();
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error(`Data request failed (${response.status}): ${url}`);
    // The manifest size is the decoded size; Content-Length may describe a compressed body.
    const total = expectedBytes || Number(response.headers.get('Content-Length')) || 0;
    if (!response.body) {
      const bytes = await response.arrayBuffer();
      onProgress?.(1);
      return bytes;
    }
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let loaded = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      loaded += value.byteLength;
      arm();
      if (total) onProgress?.(Math.min(1, loaded / total));
    }
    controller.signal.throwIfAborted();
    const bytes = new Uint8Array(loaded);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    onProgress?.(1);
    return bytes.buffer;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', abort);
  }
}
