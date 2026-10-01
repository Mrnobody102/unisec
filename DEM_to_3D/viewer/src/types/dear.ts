export type Locale = 'vi' | 'en';

export type IncidentTimelineItem = [
  time: string,
  viTitle: string,
  enTitle: string,
  viDesc: string,
  enDesc: string
];

export type IncidentSource = {
  id: string;
  name: [vi: string, en: string];
  observedAt: string;
  time: string;
  note: [vi: string, en: string];
};

export type IncidentModel = {
  id: string;
  mode: string;
  schemaVersion: string;
  triggeredAt: string;
  asOf: string;
  asOfUpdated: string;
  areaKm2: number;
  timeline: IncidentTimelineItem[];
  sources: IncidentSource[];
};

export type Community = {
  id: string;
  name: string;
  commune: string;
  prio: 1 | 2 | 3;
  pop: number;
  hh: number;
  desc: [vi: string, en: string];
  facts: Array<[viFact: string, enFact: string, viSource: string, enSource: string]>;
  projected: { x: number; y: number };
};

export type RoadStatus = 'open' | 'blocked' | 'uncertain';

export type RoadSegment = {
  id: string;
  ref: [vi: string, en: string];
  cls: 'primary' | 'secondary' | 'track';
  len: number;
  status: RoadStatus;
  hz?: string;
  note?: [vi: string, en: string];
  fromKm?: number;
  toKm?: number;
  points: Array<{ x: number; y: number }>;
};

export type HazardKind = 'landslide' | 'flood' | 'bridge';

export type Hazard = {
  id: string;
  kind: HazardKind;
  area?: number;
  src: [vi: string, en: string];
  detected: string;
  projected: { x: number; y: number };
};

export type ScenarioRoute = {
  id: string;
  type: 'candidate' | 'direct';
  communityId: string;
  name: [vi: string, en: string];
  lengthKm: number;
  status: RoadStatus;
  segs: RoadSegment[];
  points: Array<{ x: number; y: number }>;
};

export type WorkspaceView = 'incident' | 'impact' | 'priority';
export type DetailTab = 'decision' | 'route' | 'evidence';
export type RoadFilter = 'all' | 'blocked' | 'uncertain';
export type ImpactTab = 'roads' | 'hazards';
export type CommunityFilter = 'all' | 'priority' | 'uncertain';

export type ActiveDialog =
  | null
  | 'timeline'
  | 'freshness'
  | 'data'
  | 'layers'
  | 'alerts'
  | 'sources'
  | 'evidence'
  | 'segmentAnalysis'
  | 'uploadModel';
