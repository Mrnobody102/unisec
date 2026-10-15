import { describe, expect, it } from 'vitest';
import { parseCoordinatePair } from './coordinatePair';

describe('WGS84 coordinate paste', () => {
  it('reads latitude, longitude in common decimal pair formats', () => {
    expect(parseCoordinatePair('21.67150, 104.00252')).toEqual({ latitude: 21.6715, longitude: 104.00252 });
    expect(parseCoordinatePair('21.67150°; 104.00252°')).toEqual({ latitude: 21.6715, longitude: 104.00252 });
    expect(parseCoordinatePair('-21.5 104.25')).toEqual({ latitude: -21.5, longitude: 104.25 });
  });
  it('reads WKT POINT in x y (longitude latitude) order', () => {
    expect(parseCoordinatePair('POINT(104.00252 21.67150)')).toEqual({ latitude: 21.6715, longitude: 104.00252 });
  });
  it('rejects ambiguous decimals, extra values and positions outside WGS84 map limits', () => {
    for (const value of ['21,6715, 104,0025', '21, 104, 7', '90, 104', '21, 181', '', 'POINT(21 104)']) {
      expect(parseCoordinatePair(value)).toBeNull();
    }
  });
});
