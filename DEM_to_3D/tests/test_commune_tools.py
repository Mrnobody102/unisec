import json
import sys
import tempfile
import unittest
from pathlib import Path

import numpy as np
import rasterio
from rasterio.transform import from_origin
import shapefile

ROOT = Path(__file__).parents[1]
sys.path.insert(0, str(ROOT))
from dem_to_3d import load_commune_mask
from split_dem_by_commune import split_dem


class CommuneToolsTests(unittest.TestCase):
    def fixture(self, root, district=False):
        root.mkdir(parents=True, exist_ok=True)
        path = root / 'boundaries.shp'
        with shapefile.Writer(str(path)) as writer:
            writer.field('ma_huyen' if district else 'ma_xa', 'C')
            writer.field('ten_huyen' if district else 'ten_xa', 'C')
            writer.field('ten_tinh', 'C'); writer.field('tru_so', 'C')
            writer.field('dan_so', 'N', decimal=0)
            writer.poly([[(100, 20), (100, 21), (101, 21), (101, 20), (100, 20)]])
            writer.record('001', 'Test commune', 'Test province', 'Test HQ', 123)
        path.with_suffix('.prj').write_text(rasterio.crs.CRS.from_epsg(4326).to_wkt(), encoding='utf-8')
        return path

    def test_mask_compatibility_and_optional_source_metadata(self):
        with tempfile.TemporaryDirectory() as temp:
            path = self.fixture(Path(temp)); args = (str(path), '001', from_origin(99.5, 21.5, .25, .25), rasterio.crs.CRS.from_epsg(4326), (8, 8), 0, False)
            mask = load_commune_mask(*args)
            mask_with_metadata, units = load_commune_mask(*args, return_metadata=True)
            np.testing.assert_array_equal(mask, mask_with_metadata)
            self.assertTrue(mask.any()); self.assertTrue((~mask).any())
            self.assertEqual(units, [{'commune_code':'001', 'commune_name':'Test commune', 'province_name':'Test province', 'headquarters':'Test HQ', 'population':123}])

    def test_split_uses_commune_fields_preserves_nodata_and_existing_files(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp); path = self.fixture(root)
            dem = root / 'dem.tif'
            values = np.arange(64, dtype='float32').reshape(8, 8); values[3, 3] = -9999
            with rasterio.open(dem, 'w', driver='GTiff', width=8, height=8, count=1, dtype='float32', crs='EPSG:4326', transform=from_origin(99.5, 21.5, .25, .25), nodata=-9999) as target:
                target.write(values, 1)
            output = root / 'output'; split_dem(dem, path, output, code='001')
            outputs = list(output.glob('*.tif')); self.assertEqual(len(outputs), 1)
            with rasterio.open(outputs[0]) as result:
                self.assertEqual(result.crs.to_epsg(), 4326)
                self.assertEqual(result.nodata, -9999)
                self.assertTrue(result.read(1, masked=True).mask.any())
            original = outputs[0].read_bytes(); split_dem(dem, path, output, code='001')
            self.assertEqual(original, outputs[0].read_bytes())
            district = self.fixture(root / 'district', district=True)
            with self.assertRaisesRegex(ValueError, 'ma_xa'):
                split_dem(dem, district, output)


if __name__ == '__main__':
    unittest.main()
