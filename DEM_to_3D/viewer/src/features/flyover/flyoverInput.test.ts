import { createLandslideArea } from '../landslides/landslideAreas';
import { describe, expect, it } from 'vitest';
import catalog from '../../../public/scenarios/che-tao/imagery/imagery.json';
import {validateImageryCatalog} from '../imagery/analysisImagery';
import { buildScenarioRoutes, initialCommunities, initialHazards, initialResponseSites, initialRoadSegments } from '../../data/cheTaoScenario';
import { buildFlyoverInput, referencePhoto } from './flyoverInput';
import type { PreparedPhotoPoint } from '../fieldPhotos/preparedPhotos';

const photo = (name: string) => ({ name, capturedAt: '2026-10-08T08:30:00+07:00', latitude: 21, longitude: 104, accuracyM: 4, headingDeg: 0, camera: 'x',
  image: { url: `/${name}.webp`, byteLength: 1, sha256: name.padEnd(64, '0'), width: 1, height: 1 }, thumb: { url: `/${name}.t.webp`, byteLength: 1, sha256: name.padEnd(64, '1'), width: 1, height: 1 } });

describe('flyover input', () => {
  const routes = buildScenarioRoutes(initialRoadSegments);
  const point: PreparedPhotoPoint = { id: 'scar-2', hazardId: 'LS-02', surveyName: 'Scar 2 [0850]', photos: [photo('IMG_0846'), photo('IMG_0850')] } as PreparedPhotoPoint;

  it('flies the only road from Mù Cang Chải to Chế Tạo with every landslide on it', () => {
    const input = buildFlyoverInput({ communities: initialCommunities, routes, hazards: initialHazards, responseSites: initialResponseSites,
      fieldPhotos: new Map([['LS-02', point]]), imageryLayers: [] })!;
    expect(input.start[0]).toBe('Mù Cang Chải');
    expect(input.end[0]).toBe('Chế Tạo');
    expect(input.stops.map(stop => stop.id).sort()).toEqual(['LS-01', 'LS-02', 'LS-03']);
    expect(input.stops.find(stop => stop.id === 'LS-02')?.photo?.name).toBe('IMG_0850');
    expect(input.imageryLabel[0]).toBe('ảnh vệ tinh');
  });

  it('changes its key when a stop changes status, so a replay is re-prepared', () => {
    const base = { communities: initialCommunities, routes, responseSites: initialResponseSites, imageryLayers: [] };
    const before = buildFlyoverInput({ ...base, hazards: initialHazards })!;
    const after = buildFlyoverInput({ ...base, hazards: initialHazards.map(h => h.id === 'LS-02' ? { ...h, observation: 'reported' as const } : h) })!;
    expect(after.key).not.toBe(before.key);
  });

  it('refreshes an edited route even when its number of vertices is unchanged', () => {
    const base={communities:initialCommunities,routes,hazards:initialHazards,responseSites:initialResponseSites,imageryLayers:[]};
    const before=buildFlyoverInput(base)!;
    const edited=new Map(routes), pair=edited.get('CT')!, selected=pair.candidate ?? pair.direct!;
    const changed={...selected,points:selected.points.map((point,i)=>i===1?{...point,x:point.x+5}:point)};
    edited.set('CT',{...pair,...(pair.candidate?{candidate:changed}:{direct:changed})});
    expect(buildFlyoverInput({...base,routes:edited})!.key).not.toBe(before.key);
  });

  it('uses the same prepared mosaic and acquisition dates as the map', () => {
    const input=buildFlyoverInput({communities:initialCommunities,routes,hazards:initialHazards,responseSites:initialResponseSites,
      imageryLayers:validateImageryCatalog(catalog,'/scenarios/che-tao/imagery/imagery.json')})!;
    expect(input.imagery).toHaveLength(1);
    expect(input.imagery[0].terrain.url).toContain('mosaic');
    expect(input.imageryLabel[0]).toContain('1/9, 12/9/2026');
    expect(input.stops[0].name).toEqual(initialHazards[0].name);
  });

  it('refreshes prepared photos when the survey image or capture date changes', () => {
    const options={communities:initialCommunities,routes,hazards:initialHazards,responseSites:initialResponseSites,
      fieldPhotos:new Map([['LS-02',point]]),imageryLayers:[]};
    const before=buildFlyoverInput(options)!;
    const changed={...point,photos:point.photos.map(p=>({...p,capturedAt:'2026-10-09T08:30:00+07:00',image:{...p.image,sha256:'a'.repeat(64)}}))};
    const after=buildFlyoverInput({...options,fieldPhotos:new Map([['LS-02',changed]])})!;
    expect(after.key).not.toBe(before.key);
    expect(after.stops.find(s=>s.id==='LS-02')?.photoCaption?.[0]).toContain('9/10/2026');
  });

  it('keeps the selected map source instead of silently adding post-event Planet imagery',()=>{
    const base={communities:initialCommunities,routes,hazards:initialHazards,responseSites:initialResponseSites,
      imageryLayers:validateImageryCatalog(catalog,'/scenarios/che-tao/imagery/imagery.json')};
    expect(buildFlyoverInput({...base,imagerySelection:{layer:null,sarMode:'vv',opacity:1}})?.imagery).toEqual([]);
    const before=buildFlyoverInput({...base,imagerySelection:{layer:'planet-pre',sarMode:'vv',opacity:1}})!;
    expect(before.imagery[0].terrain.url).toContain('planet-pre-mosaic');
    expect(before.imageryLabel[0]).toContain('12/4/2026');
  });

  it('frames real mapped neighbouring extents and waits for a selected imagery catalog', () => {
    const base={communities:initialCommunities,routes,hazards:initialHazards,responseSites:initialResponseSites,imageryLayers:[]};
    const area=createLandslideArea({type:'Polygon',coordinates:[[[104.05,21.78],[104.051,21.78],[104.05,21.781],[104.05,21.78]]]},'occurred','Survey scar');
    const input=buildFlyoverInput({...base,mappedAreas:[area]})!;
    expect(input.areas).toHaveLength(1);
    expect(input.areas[0].radius).toBeGreaterThan(50);
    expect(buildFlyoverInput({...base,mappedAreas:[{...area,visible:false}]})?.areas).toEqual([]);
    expect(buildFlyoverInput(base)?.key).not.toBe(input.key);
    expect(buildFlyoverInput({...base,imagerySelection:{layer:'planet-post',sarMode:'vv',opacity:1}})).toBeNull();
  });

  it('uses the survey reference photo, else the first', () => {
    expect(referencePhoto(point)?.name).toBe('IMG_0850');
    expect(referencePhoto({ ...point, surveyName: 'Scar 2' })?.name).toBe('IMG_0846');
  });
});
