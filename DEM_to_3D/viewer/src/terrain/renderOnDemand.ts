/** Coalesce scene changes and stop work while idle or in a hidden tab. */
export function renderOnDemand(draw: (time: number) => boolean, hidden: () => boolean = () => document.hidden) {
  let frame = 0, disposed = false;
  const invalidate = () => {
    if (disposed || frame || hidden()) return;
    frame = requestAnimationFrame(time => {
      frame = 0;
      if (!disposed && !hidden() && draw(time)) invalidate();
    });
  };
  return { invalidate, dispose: () => {disposed = true;cancelAnimationFrame(frame);frame = 0;} };
}
