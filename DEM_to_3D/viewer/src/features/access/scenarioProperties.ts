import type { HazardKind, ResponseSite } from '../../types/dear';
import type { ScenarioTargetType } from './scenarioEdits';
export type LabelMode = 'auto' | 'show' | 'hide';
export type ScenarioProperties = {
  names: [string, string];
  labelMode: LabelMode;
  hazardKind?: HazardKind;
  siteAssessment?: ResponseSite['assessment'];
  /** Hazards only: a suspected hazard becomes reported once confirmed on site. */
  observation?: 'suspected' | 'reported';
};
export function scenarioProperties(feature: { name: string | [string, string]; labelMode?: LabelMode; kind?: string; assessment?: ResponseSite['assessment']; observation?: 'suspected' | 'reported' }): ScenarioProperties {
  return { names: typeof feature.name === 'string' ? [feature.name, feature.name] : [...feature.name],
    labelMode: feature.labelMode ?? 'auto',
    ...(['landslide','flood','bridge','crossing'].includes(feature.kind ?? '') ? { hazardKind: feature.kind as HazardKind } : {}),
    ...(feature.assessment ? { siteAssessment: feature.assessment } : {}),
    ...(feature.observation ? { observation: feature.observation } : {}) };
}
export function validProperties(type: ScenarioTargetType, value: unknown): value is ScenarioProperties {
  if (!value || typeof value !== 'object') return false;
  const p = value as ScenarioProperties;
  return Array.isArray(p.names) && p.names.length === 2 && p.names.every(n => typeof n === 'string' && n.trim().length > 0 && n.length <= 160)
    && ['auto','show','hide'].includes(p.labelMode)
    && (p.hazardKind === undefined || (type === 'hazard' && ['landslide','flood','bridge','crossing'].includes(p.hazardKind)))
    && (p.siteAssessment === undefined || (type === 'site' && ['candidate','assessed','unavailable'].includes(p.siteAssessment)))
    && (p.observation === undefined || (type === 'hazard' && ['suspected','reported'].includes(p.observation)))
    && Object.keys(p).every(key => ['names','labelMode','hazardKind','siteAssessment','observation'].includes(key));
}
