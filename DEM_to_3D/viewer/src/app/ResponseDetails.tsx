import { useLayoutEffect, useRef } from 'react';
import { CommunityDetailView } from '../components/dear/CommunityDetailView';
import { ObjectDetailView } from '../components/dear/ObjectDetailView';
import { usePanelScroll } from '../shared/hooks/usePanelScroll';
import { selectedMapObject } from './workspaceNavigation';
import type { ResponsePanelProps } from './responsePanelTypes';
import './response-details.css';

type Props = Pick<
  ResponsePanelProps,
  | 'locale'
  | 'navigation'
  | 'onNavigate'
  | 'snapshot'
  | 'aoi'
  | 'ready'
  | 'community'
  | 'routePair'
  | 'terrainCoverage'
  | 'hasTerrainProfile'
  | 'profileOpen'
  | 'onToggleProfile'
  | 'onChangeRoute'
  | 'onSelectRouteSection'
  | 'onSelectCommunity'
  | 'onInspectObject'
  | 'onRevealPanel'
  | 'onResetTools'
  | 'onOpenDialog'
  | 'onOpenEvidence'
  | 'onExport'
  | 'onRename'
  | 'scenarioEdits'
> & { visible: boolean; onReturnFocus: () => void };

/** One detail surface: map dock on wide screens, the information pane on compact screens. */
export function ResponseDetails({
  locale,
  navigation,
  onNavigate,
  snapshot,
  aoi,
  ready,
  community,
  routePair,
  terrainCoverage,
  hasTerrainProfile,
  profileOpen,
  onToggleProfile,
  onChangeRoute,
  onSelectRouteSection,
  onSelectCommunity,
  onInspectObject,
  onRevealPanel,
  onResetTools,
  onOpenDialog,
  onOpenEvidence,
  onExport,
  onRename,
  scenarioEdits,
  visible,
  onReturnFocus
}: Props): JSX.Element | null {
  const { view, selectedRouteType, detailTab } = navigation;
  const {
    roads,
    hazards,
    evidence,
    routes,
    assessments,
    communities,
    responseSites
  } = snapshot;
  const objectId = selectedMapObject(navigation);
  const panelRef = useRef<HTMLElement>(null);
  const focusedDetail = useRef('');
  const detailKey =
    view === 'priority' && community
      ? `community:${community.id}`
      : objectId
        ? `object:${objectId}`
        : '';
  usePanelScroll(panelRef, `${detailKey}:${detailTab}`);
  useLayoutEffect(() => {
    if (!detailKey) {
      focusedDetail.current = '';
      return;
    }
    if (!visible || focusedDetail.current === detailKey) return;
    const heading = panelRef.current?.querySelector<HTMLElement>('h1');
    if (heading) {
      heading.tabIndex = -1;
      heading.focus({ preventScroll: true });
      focusedDetail.current = detailKey;
    }
  }, [detailKey, visible]);

  const openCommunities = () => {
    onNavigate({
      type: 'filters',
      values: { communityFilter: 'all', communityQuery: '' }
    });
    onNavigate({ type: 'view', view: 'priority', list: true });
    onRevealPanel();
    onReturnFocus();
  };

  let content: JSX.Element;
  if (!ready) return null;
  if (view === 'priority' && community && routePair) {
    content = (
      <CommunityDetailView
        community={community}
        terrainCovered={terrainCoverage?.get(community.id) ?? null}
        assessment={assessments.get(community.id)!}
        hazards={hazards}
        evidence={evidence}
        locale={locale}
        detailTab={detailTab}
        onChangeDetailTab={(detailTab) =>
          onNavigate({ type: 'filters', values: { detailTab } })
        }
        onBack={() => {
          onNavigate({ type: 'close-community' });
          onResetTools();
          onReturnFocus();
        }}
        candidateRoute={routePair.candidate}
        directRoute={routePair.direct}
        selectedRouteType={selectedRouteType}
        onChangeRouteType={onChangeRoute}
        sectionId={navigation.routeSectionId}
        onSelectSection={onSelectRouteSection}
        hasTerrainProfile={hasTerrainProfile}
        onToggleProfile={onToggleProfile}
        onOpenSources={() => onOpenDialog('data')}
        onOpenEvidence={onOpenEvidence}
        onExport={onExport}
        onRename={
          onRename && ((names) => onRename('community', community.id, names))
        }
      />
    );
  } else if (view !== 'priority' && objectId) {
    content = (
      <ObjectDetailView
        objectId={objectId}
        parentName={
          navigation.objectOrigins[view] === 'priority'
            ? community?.name
            : undefined
        }
        aoi={aoi}
        locale={locale}
        roads={roads}
        hazards={hazards}
        evidence={evidence}
        communities={communities}
        responseSites={responseSites}
        routes={routes}
        hasTerrainProfile={hasTerrainProfile}
        profileOpen={profileOpen}
        onToggleProfile={onToggleProfile}
        onBack={() => {
          onNavigate({ type: 'close-object' });
          onResetTools();
          onReturnFocus();
        }}
        onSelectCommunity={onSelectCommunity}
        onSelectObject={onInspectObject}
        onOpenEvidence={onOpenEvidence}
        onOpenPriority={openCommunities}
        onRenameRoad={onRename && ((id, names) => onRename('road', id, names))}
        scenarioEdits={scenarioEdits}
      />
    );
  } else return null;

  return (
    <aside
      id="response-details"
      ref={panelRef}
      className="response-detail-dock"
      hidden={!visible}
      aria-label={locale === 'vi' ? 'Chi tiết đang chọn' : 'Selected details'}
    >
      {content}
    </aside>
  );
}
