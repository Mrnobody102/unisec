import {describe,it,expect} from 'vitest';
import {tonedChannel,basemapTones,contextBasemapTone} from './basemapTone';
import profile from './basemap-tone.json';
describe('basemap presentation colours',()=>{
  it('uses monotone curves without clipping forest detail or changing black/white endpoints',()=>{
    for(const gamma of [...basemapTones.online,...basemapTones.prepared]){
      expect(tonedChannel(0,gamma)).toBe(0);expect(tonedChannel(255,gamma)).toBe(255);
      for(let value=1;value<=255;value++)expect(tonedChannel(value,gamma)).toBeGreaterThan(tonedChannel(value-1,gamma));
    }
  });
  it('fits only paired canopy samples and reduces their median colour difference',()=>{
    for(const fit of [profile.esri,profile.prepared,profile.context]){
      expect(fit.samples).toBeGreaterThan(500);
      expect(fit.medianCanopyDifferenceAfter).toBeLessThan(fit.medianCanopyDifferenceBefore);
    }
    expect(profile.planetSha256).toMatch(/^[a-f0-9]{64}$/);
  });
});

it('applies a context fit only to its matching raster, leaving uncalibrated sources neutral',()=>{
 const source={provenance:{context:{sha256:profile.context.sourceSha256}}} as Parameters<typeof contextBasemapTone>[0];
 expect(contextBasemapTone(source)).toEqual(profile.context.gamma);
 expect(contextBasemapTone({} as NonNullable<typeof source>)).toEqual([1,1,1]);
 expect(contextBasemapTone(null)).toEqual(basemapTones.online);
});
