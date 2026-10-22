import io
import json
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import numpy as np
import rasterio
from rasterio.transform import from_bounds

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'tools'))
from prepare_context_imagery import CogReader, prepare
from prepare_offline_map import prepare as prepare_map, tile_range
from PIL import Image


class ContextTests(unittest.TestCase):
    def test_cog_ranges_seek_cache_and_end_of_file(self):
        payload = bytes(range(256)) * 1100
        calls = []
        def request(req, timeout):
            start, end = map(int, req.get_header('Range').removeprefix('bytes=').split('-'))
            end = min(end, len(payload)-1)
            calls.append((start, end))
            response = io.BytesIO(payload[start:end+1])
            response.status = 206
            response.headers = {'Content-Range': f'bytes {start}-{end}/{len(payload)}', 'ETag': 'source-v1'}
            return response
        with tempfile.TemporaryDirectory() as directory, patch('urllib.request.urlopen', side_effect=request):
            reader = CogReader('https://test/source.tif', Path(directory))
            reader.seek(65000)
            self.assertEqual(reader.read(100000), payload[65000:165000])
            count = len(calls)
            reader.seek(65000)
            self.assertEqual(reader.read(100000), payload[65000:165000])
            self.assertEqual(len(calls), count)
            reader.seek(-10, 2)
            self.assertEqual(reader.read(100), payload[-10:])
            self.assertEqual(reader.read(1), b'')
            with self.assertRaises(ValueError): reader.seek(-1)

    def test_rejects_cached_proxy_response_for_the_wrong_interval(self):
        def wrong_interval(*args, **kwargs):
            response = io.BytesIO(b'bad')
            response.status = 206
            response.headers = {'Content-Range': 'bytes 10-12/100', 'ETag': 'source'}
            return response
        with tempfile.TemporaryDirectory() as directory, patch('urllib.request.urlopen', side_effect=wrong_interval), patch('time.sleep'):
            with self.assertRaisesRegex(ValueError, 'incorrect COG byte range'):
                CogReader('https://test/source.tif', Path(directory))

    def source(self, folder, nodata=False):
        path = folder / 'source.tif'
        with rasterio.open(path, 'w', driver='GTiff', width=100, height=100, count=4, dtype='uint16',
                           crs='EPSG:4326', transform=from_bounds(104,21,105,22,100,100), nodata=0) as dataset:
            dataset.write(np.stack([np.full((100,100), 0 if nodata else value, np.uint16) for value in [500,1000,1500,2000]]))
        class LocalReader(io.BufferedReader):
            def __init__(self, url, cache):
                super().__init__(path.open('rb'))
                self.record = {'url': url, 'etag': 'fixture'}
        return LocalReader

    def test_output_preserves_extent_rgb_band_order_and_historical_source(self):
        with tempfile.TemporaryDirectory() as directory:
            folder = Path(directory)
            output = folder/'context.tif'
            bounds = [104.2,21.2,104.8,21.8]
            with patch('prepare_context_imagery.CogReader', self.source(folder)):
                prepare(bounds, output, folder/'cache', step=.01)
            with rasterio.open(output) as dataset:
                np.testing.assert_allclose(dataset.bounds, bounds)
                expected = np.rint(255*(np.array([1500,1000,500])/3000)**(1/1.4))
                np.testing.assert_allclose(dataset.read()[:,20,20], expected)
            record = json.loads(output.with_suffix('.source.json').read_text())
            self.assertEqual(record['bandOrder'], ['B04','B03','B02'])
            self.assertEqual(record['observationPeriod'], ['2021-01-01','2021-12-31'])
            self.assertEqual(record['license'], 'CC-BY-4.0')

    def test_a_zero_channel_in_a_valid_dark_rgb_pixel_is_not_a_coverage_hole(self):
        with tempfile.TemporaryDirectory() as directory:
            folder = Path(directory)
            reader = self.source(folder)
            with rasterio.open(folder/'source.tif','r+') as source:
                source.write(np.zeros((100,100),dtype=np.uint16),1)
            output = folder/'context.tif'
            with patch('prepare_context_imagery.CogReader',reader):
                prepare([104.2,21.2,104.8,21.8],output,folder/'cache',step=.01)
            self.assertTrue(output.exists())

    def test_missing_pixels_cannot_be_published_as_a_complete_basemap(self):
        with tempfile.TemporaryDirectory() as directory:
            folder = Path(directory)
            output = folder/'context.tif'
            with patch('prepare_context_imagery.CogReader', self.source(folder, nodata=True)):
                with self.assertRaisesRegex(ValueError, 'Incomplete satellite coverage'):
                    prepare([104.2,21.2,104.8,21.8], output, folder/'cache', step=.01)
            self.assertFalse(output.exists())


class OfflineCoverageTests(unittest.TestCase):
    def setup_map(self, folder, hole=False):
        source = folder/'rgb.tif'
        bounds = [104.002,21.002,104.008,21.008]
        data = np.full((3,100,100), 90, dtype=np.uint8)
        if hole: data[:,30:70,30:70] = 0
        with rasterio.open(source, 'w', driver='GTiff', width=100, height=100, count=3,
                           dtype='uint8', crs='EPSG:4326', transform=from_bounds(104,21,104.01,21.01,100,100)) as dataset:
            dataset.write(data)
        cache = folder/'cache'
        cache.mkdir()
        x0,y0,x1,y1 = tile_range(bounds,11)
        for x in range(x0,x1+1):
            for y in range(y0,y1+1): Image.new('RGB',(256,256),(128,0,0)).save(cache/f'11-{x}-{y}.png')
        return source, bounds, cache

    def test_packaging_rejects_an_imagery_hole_inside_declared_bounds(self):
        with tempfile.TemporaryDirectory() as directory:
            folder = Path(directory)
            source,bounds,cache = self.setup_map(folder, hole=True)
            with self.assertRaisesRegex(ValueError, 'Missing imagery'):
                prepare_map([source],folder/'map',cache,bounds=bounds,require_coverage=True)
            self.assertFalse((folder/'map/map.json').exists())

    def test_complete_rectangle_includes_coverage_record_and_verified_assets(self):
        import hashlib
        with tempfile.TemporaryDirectory() as directory:
            folder = Path(directory)
            source,bounds,cache = self.setup_map(folder)
            catalog = prepare_map([source],folder/'map',cache,bounds=bounds,require_coverage=True)
            self.assertTrue(catalog['provenance']['completeImageryCoverage'])
            for name,record in catalog['files'].items():
                self.assertEqual(hashlib.sha256((folder/'map'/name).read_bytes()).hexdigest(), record['sha256'])


if __name__ == '__main__': unittest.main()
