import { useLayoutEffect, useReducer, useState } from 'react';
import { initialMeasurementSession, measurementSessionReducer } from './measurementSession';

/** Closing a tool preserves a drawing and restores any uncommitted edit. */
export function useMeasurementSession(mapMode: '2d' | '3d') {
  const [open, setOpen] = useState(false);
  const [session, dispatch] = useReducer(measurementSessionReducer, initialMeasurementSession);

  useLayoutEffect(() => {
    if (mapMode === '3d' && open) setOpen(false);
    if (!open || mapMode === '3d') dispatch({ type: 'pause' });
  }, [open, mapMode]);

  return { open, setOpen, session, dispatch };
}
