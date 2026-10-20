import area from '@turf/area';
import { areaNameIncludesState } from './areaLabels';
import type { GeometryRecord } from '../../geo/vector/types';
import type { Locale } from '../../types/dear';
import { formatArea } from '../geodata/geometryPresentation';
import { landslideAreaOf } from './landslideAreas';

/** A mapped extent has an area; a source/capture point never inherits an invented footprint. */
export function areaMapLabel(record: GeometryRecord, locale: Locale): HTMLSpanElement {
  const label = document.createElement('span');label.className = 'landslide-map-label';
  const title = document.createElement('strong');title.textContent = record.name;label.append(title);
  const mapped = landslideAreaOf(record);
  if (mapped) {
    const facts = document.createElement('small');
    const kind = mapped.state === 'potential' ? locale === 'vi' ? 'Vùng nguy cơ' : 'Potential extent' : locale === 'vi' ? 'Vết sạt lở' : 'Observed extent';
    facts.textContent = `${areaNameIncludesState(record.name,mapped.state,locale) ? '' : kind + ' · '}≈ ${formatArea(area(record.feature),locale)}`;label.append(facts);
  }
  return label;
}
