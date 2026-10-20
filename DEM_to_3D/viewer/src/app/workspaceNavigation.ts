import type { CommunityFilter, DetailTab, ImpactTab, RoadFilter, WorkspaceView } from '../types/dear';

type ObjectView = Exclude<WorkspaceView, 'priority'>;
type DetailLocation = Pick<WorkspaceNavigation, 'view' | 'selectedCommunityId' | 'communityOrigin' | 'selectedRouteType' | 'routeSectionId' | 'objectIds' | 'objectOrigins' | 'detailTab'>;
export type WorkspaceNavigation = {
  detailHistory: DetailLocation[];
  view: WorkspaceView;
  selectedCommunityId: string | null;
  communityOrigin: WorkspaceView;
  selectedRouteType: 'candidate' | 'direct';
  routeSectionId: string | null;
  objectIds: Record<ObjectView, string | null>;
  objectOrigins: Record<ObjectView, WorkspaceView | null>;
  detailTab: DetailTab;
  roadFilter: RoadFilter;
  communityFilter: CommunityFilter;
  roadQuery: string;
  communityQuery: string;
  impactTab: ImpactTab;
};

export const initialWorkspaceNavigation: WorkspaceNavigation = {
  detailHistory: [],
  view: 'incident', selectedCommunityId: null, communityOrigin: 'priority', selectedRouteType: 'candidate', routeSectionId: null,
  objectIds: { incident: null, impact: null }, objectOrigins: { incident: null, impact: null },
  detailTab: 'decision', roadFilter: 'all', communityFilter: 'all', roadQuery: '', communityQuery: '', impactTab: 'roads'
};

type Filters = Pick<WorkspaceNavigation, 'roadFilter' | 'communityFilter' | 'roadQuery' | 'communityQuery' | 'impactTab' | 'detailTab' | 'selectedRouteType'>;
export type NavigationAction =
  | { type: 'select-community'; id: string }
  | { type: 'inspect-object'; id: string }
  | { type: 'route-section'; id: string | null }
  | { type: 'view'; view: WorkspaceView; list?: boolean }
  | { type: 'close-community' }
  | { type: 'close-object' }
  | { type: 'filters'; values: Partial<Filters> }
  | { type: 'road-list'; filter: RoadFilter }
  | { type: 'reset' };

export function selectedMapObject(state: WorkspaceNavigation): string | null {
  return state.view === 'priority'
    ? state.selectedCommunityId && state.detailTab === 'decision' && state.routeSectionId ? `road:${state.routeSectionId}` : null
    : state.objectIds[state.view];
}

function clearDetail(state: WorkspaceNavigation, view: WorkspaceView): WorkspaceNavigation {
  return view === 'priority' ? { ...state, selectedCommunityId: null, routeSectionId: null }
    : { ...state, objectIds: { ...state.objectIds, [view]: null }, objectOrigins: { ...state.objectOrigins, [view]: null } };
}

function rememberDetail(state: WorkspaceNavigation): DetailLocation[] {
  const selected = state.view === 'priority' ? state.selectedCommunityId : selectedMapObject(state);
  if (!selected) return state.detailHistory;
  const { view, selectedCommunityId, communityOrigin, selectedRouteType, routeSectionId, objectIds, objectOrigins, detailTab } = state;
  return [...state.detailHistory.slice(-19), { view, selectedCommunityId, communityOrigin, selectedRouteType, routeSectionId, objectIds, objectOrigins, detailTab }];
}

function previousDetail(state: WorkspaceNavigation): WorkspaceNavigation | null {
  const previous = state.detailHistory.at(-1);
  return previous ? { ...state, ...previous, detailHistory: state.detailHistory.slice(0, -1) } : null;
}

/** Navigation keeps each tab's detail. Only explicit list/back actions clear it. */
export function workspaceNavigationReducer(state: WorkspaceNavigation, action: NavigationAction): WorkspaceNavigation {
  switch (action.type) {
    case 'select-community': {
      const origin = state.view !== 'priority' ? state.view : state.selectedCommunityId ? state.communityOrigin : 'priority';
      if (state.selectedCommunityId === action.id) return { ...state, view: 'priority', communityOrigin: origin,
        detailHistory: state.view === 'priority' ? state.detailHistory : rememberDetail(state) };
      return { ...state, view: 'priority', selectedCommunityId: action.id, communityOrigin: origin,
        detailHistory: rememberDetail(state),
        selectedRouteType: 'candidate', detailTab: 'decision', routeSectionId: null };
    }
    case 'inspect-object': {
      // Roads and hazards belong to the road tab. Other places open where the user already is,
      // so picking a staging or landing site from the road tab does not switch tabs.
      const owner: ObjectView = action.id.startsWith('road:') || action.id.startsWith('hazard:') || state.view === 'impact' ? 'impact' : 'incident';
      const origin = owner !== state.view ? state.view : state.objectIds[owner] ? state.objectOrigins[owner] : null;
      return { ...state, view: owner, objectIds: { ...state.objectIds, [owner]: action.id },
        detailHistory: state.view === owner && selectedMapObject(state) === action.id ? state.detailHistory : rememberDetail(state),
        objectOrigins: { ...state.objectOrigins, [owner]: origin } };
    }
    case 'view': {
      const next = action.list || action.view === state.view ? clearDetail(state, action.view) : state;
      return { ...next, view: action.view, detailHistory: [],
        objectOrigins: { ...next.objectOrigins, ...(action.view !== 'priority' ? { [action.view]: null } : {}) } };
    }
    case 'route-section': return state.selectedCommunityId ? { ...state, view: 'priority', detailTab: 'decision', routeSectionId: action.id } : state;
    case 'close-community': return previousDetail(state) ?? { ...state, selectedCommunityId: null, routeSectionId: null, view: state.communityOrigin };
    case 'close-object': return state.view === 'priority' ? state : previousDetail(state) ?? {
      ...clearDetail(state, state.view), view: state.objectOrigins[state.view] ?? state.view
    };
    case 'filters': return { ...state, ...action.values,
      routeSectionId: action.values.selectedRouteType !== undefined && action.values.selectedRouteType !== state.selectedRouteType
        ? null : state.routeSectionId };
    case 'road-list': return { ...clearDetail(state, 'impact'), detailHistory: [], view: 'impact', impactTab: 'roads', roadFilter: action.filter, roadQuery: '' };
    case 'reset': return initialWorkspaceNavigation;
  }
}
