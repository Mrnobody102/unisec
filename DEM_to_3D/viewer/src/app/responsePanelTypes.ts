import type { Dispatch } from 'react';
import type { ScenarioEdit } from '../features/access/scenarioEdits';
import type { RenameScenario } from '../features/access/ScenarioLabels';
import type { IncidentPacket } from '../data/incidentPacket';
import type { IncidentWorkspaceSnapshot } from '../features/incident/deriveIncidentWorkspace';
import type { Community, Locale, ScenarioRoutePair } from '../types/dear';
import type {
  ResponseWork,
  WorkEntry
} from '../features/incident/responseWork';
import type {
  NavigationAction,
  WorkspaceNavigation
} from './workspaceNavigation';

export type ResponsePanelProps = {
  locale: Locale;
  navigation: WorkspaceNavigation;
  onNavigate: Dispatch<NavigationAction>;
  snapshot: IncidentWorkspaceSnapshot;
  aoi: IncidentPacket['aoi'];
  updated: boolean;
  workTasks: ResponseWork[];
  workEntries: WorkEntry[];
  reportPending: boolean;
  historical: boolean;
  onOpenWork: (id?: string) => void;
  onOpenReport: () => void;
  ready: boolean;
  unavailable: boolean;
  onRetry: () => void;
  community: Community | null;
  routePair: ScenarioRoutePair | null;
  terrainCoverage: Map<string, boolean> | null;
  hasTerrainProfile: boolean;
  profileOpen: boolean;
  onToggleProfile: () => void;
  onChangeRoute: (type: 'candidate' | 'direct') => void;
  onSelectRouteSection: (id: string | null) => void;
  onSelectCommunity: (
    id: string,
    routeType?: 'candidate' | 'direct',
    sectionId?: string
  ) => void;
  onInspectObject: (id: string) => void;
  onRevealPanel: () => void;
  onResetTools: () => void;
  onOpenDialog: (dialog: 'data' | 'timeline') => void;
  onOpenEvidence: (hazardId: string) => void;
  onExport: () => void;
  /** Managers rename scenario features where they read them. */
  onRename?: RenameScenario;
  scenarioEdits?: ScenarioEdit[];
};
