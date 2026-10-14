import { afterEach, describe, expect, it, vi } from 'vitest';
import { readBinary, readResponse } from './readResponse';

afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

describe('bounded data loading', () => {
  it('reads the complete body and preserves its content type', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{"ready":true}', {
      headers: { 'Content-Type': 'application/json' }
    })));
    const response = await readResponse('/manifest.json');
    expect(response.headers.get('Content-Type')).toBe('application/json');
    expect(await response.json()).toEqual({ ready: true });
  });

  it('rejects HTTP failures instead of passing an error page to the decoder', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('missing', { status: 404 })));
    await expect(readResponse('/terrain/missing.glb')).rejects.toThrow('404');
  });

  it.each(['connection', 'body'])('times out a stalled %s', async phase => {
    vi.useFakeTimers();
    vi.stubGlobal('fetch', vi.fn((_url: string, options: RequestInit) => {
      const pending = () => new Promise<never>((_resolve, reject) => {
        options.signal!.addEventListener('abort', () => reject(options.signal!.reason), { once: true });
      });
      return phase === 'connection' ? pending() : Promise.resolve({ ok: true, arrayBuffer: pending });
    }));
    const assertion = expect(readResponse('/terrain/grid.bin', undefined, 25)).rejects.toThrow('timed out');
    await vi.advanceTimersByTimeAsync(25);
    await assertion;
    expect(vi.getTimerCount()).toBe(0);
  });

  it('cancels the fetch when its owner closes and removes its listener', async () => {
    const owner = new AbortController(), removed = vi.spyOn(owner.signal, 'removeEventListener');
    vi.stubGlobal('fetch', vi.fn((_url: string, options: RequestInit) => new Promise<never>((_resolve, reject) => {
      options.signal!.addEventListener('abort', () => reject(options.signal!.reason), { once: true });
    })));
    const assertion = expect(readResponse('/terrain/model.glb', owner.signal)).rejects.toThrow('Closed');
    owner.abort(new Error('Closed'));
    await assertion;
    expect(removed).toHaveBeenCalledWith('abort', expect.any(Function));
  });

  it('does not start a fetch for an already closed owner', async () => {
    const owner = new AbortController(); owner.abort(new Error('Closed'));
    const fetch = vi.fn(); vi.stubGlobal('fetch', fetch);
    await expect(readResponse('/manifest.json', owner.signal)).rejects.toThrow('Closed');
    expect(fetch).not.toHaveBeenCalled();
  });
});

describe('large binary loading', () => {
  const stream = (parts: number[]) => new ReadableStream<Uint8Array>({
    start(controller) {
      for (const size of parts) controller.enqueue(new Uint8Array(size).fill(7));
      controller.close();
    }
  });

  it('reports progress against the manifest size and returns the whole body', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(stream([4, 4, 2]))));
    const progress: number[] = [];
    const bytes = await readBinary('/terrain/model.glb', { expectedBytes: 10, onProgress: value => progress.push(value) });
    expect(bytes.byteLength).toBe(10);
    expect(new Uint8Array(bytes)[9]).toBe(7);
    expect(progress).toEqual([0.4, 0.8, 1, 1]);
  });

  it('cancels a stalled transfer but not a slow one that keeps receiving data', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('fetch', vi.fn((_url: string, options: RequestInit) => new Promise<never>((_resolve, reject) => {
      options.signal!.addEventListener('abort', () => reject(options.signal!.reason), { once: true });
    })));
    const assertion = expect(readBinary('/terrain/model.glb', { idleMs: 25 })).rejects.toThrow('stalled');
    await vi.advanceTimersByTimeAsync(25);
    await assertion;
    expect(vi.getTimerCount()).toBe(0);
  });
});
