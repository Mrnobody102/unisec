import { afterEach, describe, expect, it, vi } from 'vitest';
import { readResponse } from './readResponse';

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
