"""Prepare a rectangular Sentinel-2 context from public ESA WorldCover COGs.

Preparation needs rasterio >= 1.4, numpy and Internet. The resulting RGB and its
source record are local inputs to prepare_offline_map, never an analysis grid.
"""
import argparse
import hashlib
import io
import json
import math
import time
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import numpy as np
import rasterio
from rasterio.enums import Resampling
from rasterio.transform import from_bounds
from rasterio.windows import from_bounds as window_from_bounds
from rasterio.warp import reproject

SOURCE = 'https://esa-worldcover-s2.s3.eu-central-1.amazonaws.com/'
CREDIT = 'ESA WorldCover 2021 / Contains modified Copernicus Sentinel data (2021)'


class CogReader(io.RawIOBase):
    """Seekable HTTP ranges with a disk cache, including range-aware proxy keys."""
    block_size = 65536

    def __init__(self, url, cache):
        self.url, self.position = url, 0
        self.cache = cache / hashlib.sha256(url.encode()).hexdigest()
        self.cache.mkdir(parents=True, exist_ok=True)
        metadata = self.cache / 'source.json'
        if metadata.exists():
            self.record = json.loads(metadata.read_text())
        else:
            data, headers = self.fetch(0, self.block_size - 1)
            self.record = {'url': url, 'size': int(headers['Content-Range'].split('/')[-1]), 'etag': headers.get('ETag')}
            (self.cache / '0.bin').write_bytes(data)
            metadata.write_text(json.dumps(self.record))
        self.size = self.record['size']

    def fetch(self, start, end):
        # Some intermediary caches ignore Range in their cache key. Giving each
        # byte interval its own URL avoids accepting a cached, unrelated interval.
        request = urllib.request.Request(self.url + f'?range={start}-{end}', headers={'Range': f'bytes={start}-{end}'})
        print(f'Reading source bytes {start}-{end}', flush=True)
        for attempt in range(3):
            try:
                with urllib.request.urlopen(request, timeout=30) as response:
                    data, headers = response.read(), response.headers
                    if response.status != 206 or not headers.get('Content-Range', '').startswith(f'bytes {start}-{end}/') or len(data) != end-start+1:
                        raise ValueError('Incomplete or incorrect COG byte range')
                    if hasattr(self, 'record') and headers.get('ETag') != self.record['etag']:
                        raise ValueError('COG changed during preparation')
                    return data, headers
            except Exception:
                if attempt == 2:
                    raise
                time.sleep(attempt + 1)

    def readable(self): return True
    def seekable(self): return True
    def writable(self): return False
    def tell(self): return self.position

    def seek(self, offset, whence=0):
        if whence not in (0,1,2): raise ValueError('Invalid seek mode')
        position = offset if whence == 0 else self.position + offset if whence == 1 else self.size + offset
        if position < 0: raise ValueError('Negative seek')
        self.position = position
        return position

    def read(self, size=-1):
        end = min(self.size, self.position + size if size >= 0 else self.size)
        if end <= self.position: return b''
        first, last = self.position // self.block_size, (end - 1) // self.block_size
        missing = [block for block in range(first, last + 1) if not (self.cache / f'{block}.bin').exists()]
        if missing:
            def download(first_block):
                last_block = min(missing[-1], first_block + 7)
                start, stop = first_block*self.block_size, min(self.size, (last_block+1)*self.block_size)
                data, _ = self.fetch(start, stop-1)
                for block in range(first_block, last_block+1):
                    offset = block*self.block_size-start
                    (self.cache/f'{block}.bin').write_bytes(data[offset:offset+self.block_size])
            with ThreadPoolExecutor(max_workers=4) as pool:
                list(pool.map(download, range(missing[0], missing[-1]+1, 8)))
        data = b''.join((self.cache / f'{block}.bin').read_bytes() for block in range(first, last + 1))
        result = data[self.position-first*self.block_size:end-first*self.block_size]
        self.position = end
        return result


def prepare(bounds, output, cache, step=4/12000):
    west, south, east, north = bounds
    if not (100 <= west < east <= 110 and 15 <= south < north <= 25) or (east-west)*(north-south) > 2:
        raise ValueError('Expected a bounded northern Vietnam context, at most two square degrees')
    if output.exists(): raise ValueError('Use a new output path')
    output.parent.mkdir(parents=True, exist_ok=True)
    width, height = math.ceil((east-west)/step), math.ceil((north-south)/step)
    transform = from_bounds(*bounds, width, height)
    mosaic = np.zeros((3, height, width), dtype=np.uint16)
    records = []
    for latitude in range(math.floor(south), math.ceil(north)):
        for longitude in range(math.floor(west), math.ceil(east)):
            name = f'ESA_WorldCover_10m_2021_v200_N{latitude:02}E{longitude:03}_S2RGBNIR.tif'
            url = SOURCE + f'rgbnir/2021/N{latitude:02}/' + name
            with CogReader(url, cache) as reader:
                record = reader.record
            def opener(path, mode='rb'):
                if path != name: raise FileNotFoundError(path)
                return CogReader(url, cache)
            with rasterio.Env(GDAL_DISABLE_READDIR_ON_OPEN='EMPTY_DIR'):
                with rasterio.open(name, opener=opener) as source:
                    subset = (max(west, longitude), max(south, latitude), min(east, longitude+1), min(north, latitude+1))
                    window = window_from_bounds(*subset, source.transform)
                    rows, cols = math.ceil((subset[3]-subset[1])/step), math.ceil((subset[2]-subset[0])/step)
                    # Source order is B02, B03, B04, B08; output is true-colour RGB.
                    rgb = source.read([3, 2, 1], window=window, out_shape=(3, rows, cols), resampling=Resampling.bilinear)
                    source_transform = from_bounds(*subset, cols, rows)
                    for band in range(3):
                        reproject(rgb[band], mosaic[band], src_transform=source_transform, src_crs=source.crs,
                                  dst_transform=transform, dst_crs='EPSG:4326', src_nodata=0, dst_nodata=0,
                                  init_dest_nodata=False, resampling=Resampling.bilinear)
            records.append(record)
            print('Prepared context', name, flush=True)
    if np.any(np.any(mosaic == 0, axis=0)):
        raise ValueError('Incomplete satellite coverage; refusing a context with missing pixels')
    # A fixed reflectance stretch for the whole region. No per-tile contrast or
    # invented detail, and never applied to the independent Planet evidence.
    rgb = np.maximum(1, np.rint(255 * np.clip(mosaic.astype(np.float32)/3000, 0, 1)**(1/1.4))).astype(np.uint8)
    with rasterio.open(output, 'w', driver='GTiff', width=width, height=height, count=3,
                       dtype='uint8', crs='EPSG:4326', transform=transform, compress='deflate', tiled=True) as target:
        target.write(rgb)
    metadata = dict(name='Sentinel-2 context (2021)', credit=CREDIT, license='CC-BY-4.0',
        licenseUrl='https://creativecommons.org/licenses/by/4.0/',
        documentation='https://registry.opendata.aws/esa-worldcover-vito-composites/',
        observationPeriod=['2021-01-01','2021-12-31'], sourceResolutionMetres=10,
        displayPixelArcSeconds=step*3600, bounds=bounds, bandOrder=['B04','B03','B02'],
        display=dict(reflectanceRange=[0,0.3], gamma=1.4), sources=records,
        sha256=hashlib.sha256(output.read_bytes()).hexdigest(),
        interpretation='Historical annual median context only; not current landslide evidence or an analysis DEM.')
    output.with_suffix('.source.json').write_text(json.dumps(metadata, indent=2)+'\n', encoding='utf8')
    print('Prepared complete rectangular context:', output, flush=True)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--bounds', type=float, nargs=4, required=True, metavar=('WEST','SOUTH','EAST','NORTH'))
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--cache', type=Path, required=True)
    args = parser.parse_args()
    prepare(args.bounds, args.output, args.cache)
