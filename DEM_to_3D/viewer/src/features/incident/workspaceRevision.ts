export type WorkspaceRevision = { applied: boolean; historical: boolean };

/** A past map is a view of an immutable revision, never an undo of received news. */
export function effectiveRevision(state: WorkspaceRevision): boolean {
  return state.applied && !state.historical;
}
