import json
import sys
import unittest
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).parents[1]))

from terrain_contract import (  # noqa: E402
    AssetContractError,
    affine_pixel_to_world,
    affine_world_to_pixel,
    projected_to_scene,
    scene_to_projected,
    validate_metadata,
)


def metadata(shape=(2, 3)):
    rows, cols = shape
    return {
        "schema_version": 1,
        "asset_id": "test",
        "crs": {"authority": "EPSG", "code": 32648, "proj4": "+proj=utm +zone=48 +units=m", "linear_unit": "metre"},
        "scene_axes": {"x": "east", "y": "up", "z": "negative_north"},
        "world_origin": {"x": 1000.0, "y": 2000.0},
        "grid": {"file": "test.grid.bin", "shape": [rows, cols], "shape_order": "rows_cols", "dtype": "float32", "byte_order": "little_endian", "layout": "row_major", "nodata_encoding": "nan", "elevation_unit": "metre", "sampling_method": "nearest_subsample", "source_step": 2, "byte_length": rows * cols * 4},
        "grid_transform": {"a": 2.0, "b": 0.25, "c": 100.0, "d": 0.1, "e": -3.0, "f": 200.0, "convention": "rasterio_affine", "pixel_reference": "center"},
        "elevation": {"base_elevation": 10.0, "exaggeration": 2.0, "normalize_base": True, "min": 10.0, "max": 20.0},
        "analysis_supported": True,
    }


class TerrainContractTests(unittest.TestCase):
    def test_affine_round_trip_with_rotation_and_pixel_centres(self):
        transform = metadata()["grid_transform"]
        for point in [(0, 0), (2.5, 1.25), (-.2, 3.4)]:
            self.assertTrue(np.allclose(affine_world_to_pixel(transform, *affine_pixel_to_world(transform, *point)), point))


    def test_scene_round_trip(self):
        value = (1234.5, 2345.5, 843.25)
        self.assertTrue(np.allclose(scene_to_projected(*projected_to_scene(*value, metadata()), metadata()), value))


    def test_validator_rejects_wrong_byte_length_and_origin_z(self):
        value = metadata()
        value["grid"]["byte_length"] = 1
        value["world_origin"]["z"] = 0
        with self.assertRaises(AssetContractError):
            validate_metadata(value)


    def test_validator_accepts_nan_contract_values_are_described_not_embedded(self):
        value = metadata((1, 1))
        self.assertEqual(validate_metadata(value)["grid"]["nodata_encoding"], "nan")
