import { expect, it, vi } from 'vitest';
import { fromBlob } from 'geotiff';
import { readSarRaster } from './sarOverlay';

vi.mock('geotiff', () => ({ fromBlob: vi.fn() }));

function imageFixture(overrides = {}) {
  return {
    getGeoKeys: () => ({ ProjectedCSTypeGeoKey: 32648, GTRasterTypeGeoKey: 1 }),
    getFileDirectory: () => ({ getValue: () => undefined }),
    getOrigin: () => [100, 200, 0], getResolution: () => [2, -3, 0],
    getWidth: () => 4096, getHeight: () => 2048, getBoundingBox: () => [100, -5944, 8292, 200],
    getGDALNoData: () => -9999, getSamplesPerPixel: () => 2,
    getBytesPerPixel: () => 8,
    getGDALMetadata: async (index: number) => ({ DESCRIPTION: ['VV', 'VH'][index] }),
    readRasters: vi.fn(async () => [new Float32Array([1, 2])]), ...overrides
  };
}

it('awaits band descriptions and keeps the full footprint when display samples are bounded', async () => {
  const image = imageFixture(); vi.mocked(fromBlob).mockResolvedValue({ getImage: async () => image } as never);
  const raster = await readSarRaster(new File(['fixture'], 'sar.tif'));
  expect(raster.bands.map(band => band.label)).toEqual(['VV','VH']);
  expect([raster.width, raster.height]).toEqual([2048, 1024]);
  expect(raster.transform).toEqual({a:4,b:0,c:100,d:0,e:-6,f:200});
  await raster.readBand(1);
  expect(image.readRasters).toHaveBeenCalledWith({samples:[1],interleave:false,width:2048,height:1024,resampleMethod:'nearest'});
  await expect(raster.readBand(1.5)).rejects.toThrow('band');
});

it('reads rotated transforms from the installed GeoTIFF directory API', async () => {
  const image = imageFixture({ getWidth: () => 2, getHeight: () => 2, getGeoKeys: () => ({ProjectedCSTypeGeoKey:32648,GTRasterTypeGeoKey:2}),
    getFileDirectory: () => ({getValue: () => [0,2,0,100,-3,0,0,200,0,0,1,0,0,0,0,1]}) });
  vi.mocked(fromBlob).mockResolvedValue({getImage:async()=>image} as never);
  expect((await readSarRaster(new File(['fixture'],'rotated.tif'))).transform).toEqual({a:0,b:2,c:99,d:-3,e:0,f:201.5});
});

it('rejects missing CRS before reading a raster band', async () => {
  const image = imageFixture({getGeoKeys:()=>({})});
  vi.mocked(fromBlob).mockResolvedValue({getImage:async()=>image} as never);
  await expect(readSarRaster(new File(['fixture'],'missing-crs.tif'))).rejects.toThrow('EPSG');
  expect(image.readRasters).not.toHaveBeenCalled();
});

it('rejects oversized decoded rasters even when a TIFF is highly compressed', async () => {
  const image = imageFixture({getWidth:()=>20000,getHeight:()=>20000});
  vi.mocked(fromBlob).mockResolvedValue({getImage:async()=>image} as never);
  await expect(readSarRaster(new File(['compressed'],'large.tif'))).rejects.toThrow('budget');
  expect(image.readRasters).not.toHaveBeenCalled();
});
