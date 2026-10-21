import { afterEach, expect, it, vi } from 'vitest';
import { renderOnDemand } from './renderOnDemand';
afterEach(() => vi.unstubAllGlobals());
it('coalesces updates, continues only through motion and resumes after a hidden tab', () => {
  const queue = new Map<number, FrameRequestCallback>();let id = 0, hidden = false, moving = false;
  vi.stubGlobal('requestAnimationFrame',(callback: FrameRequestCallback) => {queue.set(++id,callback);return id;});
  vi.stubGlobal('cancelAnimationFrame',(id: number) => queue.delete(id));
  const draw = vi.fn(() => moving), loop = renderOnDemand(draw,() => hidden);
  const step = () => {const next = queue.entries().next().value!;queue.delete(next[0]);next[1](16);};
  loop.invalidate();loop.invalidate();expect(queue.size).toBe(1);step();expect(draw).toHaveBeenCalledTimes(1);expect(queue.size).toBe(0);
  moving = true;loop.invalidate();step();expect(queue.size).toBe(1);
  hidden = true;step();expect(draw).toHaveBeenCalledTimes(2);expect(queue.size).toBe(0);
  loop.invalidate();expect(queue.size).toBe(0);
  hidden = false;moving = false;loop.invalidate();step();expect(draw).toHaveBeenCalledTimes(3);
  loop.invalidate();loop.dispose();expect(queue.size).toBe(0);loop.invalidate();expect(queue.size).toBe(0);
});
