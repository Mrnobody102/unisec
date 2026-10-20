import { expect, it } from 'vitest';
import { validAdministrativeMetadata } from './administrativeMetadata';

it('accepts optional source attributes and multiple commune records', () => {
  expect(validAdministrativeMetadata({source:'communes.shp', units:[{commune_name:'Chế Tạo', population:0}]})).toBe(true);
  expect(validAdministrativeMetadata({commune_code:'123',area_km2:10})).toBe(true);
});

it.each([null, [], {units:[]}, {units:'not an array'}, {units:[null]}, {population:-1}, {area_km2:Infinity}, {commune_name:42}, {units:[{source:'unexpected'}]}])('rejects malformed administrative data: %j', value => {
  expect(validAdministrativeMetadata(value)).toBe(false);
});
