import { useCallback, useReducer } from 'react';
import { initialWorkspaceInteraction, workspaceInteractionReducer } from './workspaceInteraction';
import { defaultMapMode } from './defaultMapMode';
import type { WorkspaceDialog } from './workspaceInteraction';

export function useWorkspaceInteraction() {
  const [state, dispatch] = useReducer(workspaceInteractionReducer, initialWorkspaceInteraction, initial => {
    const mapMode = defaultMapMode();
    return { ...initial, mapMode, homeMapMode: mapMode };
  });
  const recover2D = useCallback(() => dispatch({ type: 'fallback-2d' }), []);
  const setActiveDialog = useCallback((dialog: WorkspaceDialog) => dispatch({ type: 'dialog', dialog }), []);
  const setMapMode = useCallback((mode: '2d' | '3d') => dispatch({ type: 'map-mode', mode }), []);
  const setFocusDistance = useCallback((distance: number | null) => dispatch({ type: 'focus-distance', distance }), []);
  const resetTools = useCallback(() => dispatch({ type: 'navigate' }), []);
  return { ...state, dispatch, recover2D, setActiveDialog, setMapMode, setFocusDistance, resetTools,
    measurementOpen: state.tool === 'measure', drawOpen: state.tool === 'draw', locationOpen: state.tool === 'location', showProfile: state.tool === 'profile',
    activeDialog: state.dialog === 'upload' ? null : state.dialog, showCustomUploadModal: state.dialog === 'upload'
  };
}
