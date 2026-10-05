import { describe, expect, it } from 'vitest';
import { constrainPanel } from './useFloatingPanel';

describe('floating map panels', () => {
  it('keeps navigation and bottom credits accessible when dragged past an edge', () => {
    expect(constrainPanel({ x: -50, y: -20 }, 1000, 700, 280, 400)).toEqual({ x: 8, y: 64 });
    expect(constrainPanel({ x: 2000, y: 2000 }, 1000, 700, 280, 400)).toEqual({ x: 656, y: 268 });
  });
  it('repositions a tool when the viewport becomes smaller', () => {
    expect(constrainPanel({ x: 600, y: 250 }, 640, 600, 280, 400)).toEqual({ x: 296, y: 168 });
  });
});
