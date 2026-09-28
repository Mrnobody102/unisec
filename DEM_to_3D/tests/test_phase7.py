"""Deterministic Phase 7 fixtures and exporter/contract regression tests."""

from __future__ import annotations

import math
import json
import sys
import tempfile
import unittest
from pathlib import Path

import numpy as np
from affine import Affine

ROOT = Path(__file__).parents[1]
sys.path.insert(0, str(ROOT))

from dem_to_3d import (  # noqa: E402
    build_mesh,
    crop_to_valid_bbox,
    downsample,
    fill_small_voids,
    rasterize_commune_geometries,
    write_contract_grid,
)
from terrain_contract import (  # noqa: E402
    AssetContractError,
    affine_pixel_to_world,
    affine_world_to_pixel,
    validate_metadata,
)


def plane_grid(
    rows: int = 9,
    cols: int = 11,
    transform: Affine | None = None,
    coefficients: tuple[float, float, float] = (0.2, -0.35, 120.0),
) -> tuple[np.ndarray, Affine]:
    transform = transform or Affine(7.0, 1.25, 400_000.0, -0.75, -9.0, 2_100_000.0)
    a, b, c = coefficients
    columns, row_indices = np.meshgrid(np.arange(cols), np.arange(rows))
    x = transform.c + transform.a * (columns + 0.5) + transform.b * (row_indices + 0.5)
    y = transform.f + transform.d * (columns + 0.5) + transform.e * (row_indices + 0.5)
    return (a * x + b * y + c).astype(np.float64), transform


def valid_metadata(shape: tuple[int, int] = (2, 3)) -> dict:
    rows, cols = shape
    return {
        "schema_version": 1,
        "asset_id": "phase7-plane",
        "crs": {
            "authority": "EPSG",
            "code": 32648,
            "proj4": "+proj=utm +zone=48 +datum=WGS84 +units=m +no_defs",
            "linear_unit": "metre",
        },
        "scene_axes": {"x": "east", "y": "up", "z": "negative_north"},
        "world_origin": {"x": 400000.0, "y": 2100000.0},
        "grid": {
            "file": "phase7.grid.bin",
            "shape": [rows, cols],
            "shape_order": "rows_cols",
            "dtype": "float32",
            "byte_order": "little_endian",
            "layout": "row_major",
            "nodata_encoding": "nan",
            "elevation_unit": "metre",
            "sampling_method": "nearest_subsample",
            "source_step": 1,
            "byte_length": rows * cols * 4,
        },
        "grid_transform": {
            "a": 7.0,
            "b": 1.25,
            "c": 400000.0,
            "d": -0.75,
            "e": -9.0,
            "f": 2100000.0,
            "convention": "rasterio_affine",
            "pixel_reference": "center",
        },
        "elevation": {
            "base_elevation": 100.0,
            "exaggeration": 1.5,
            "normalize_base": True,
            "min": 100.0,
            "max": 200.0,
        },
        "analysis_supported": True,
    }


class Phase7PythonTests(unittest.TestCase):
    def test_rasterize_commune_geometry_uses_pixel_centres(self):
        from rasterio.crs import CRS

        polygon = {
            "type": "Polygon",
            "coordinates": [[(1.0, 1.0), (3.0, 1.0), (3.0, 3.0), (1.0, 3.0), (1.0, 1.0)]],
        }
        mask = rasterize_commune_geometries(
            [polygon],
            Affine(1.0, 0.0, 0.0, 0.0, -1.0, 4.0),
            CRS.from_epsg(4326),
            (4, 4),
            buffer_m=0,
        )
        expected = np.zeros((4, 4), dtype=bool)
        expected[1:3, 1:3] = True
        np.testing.assert_array_equal(mask, expected)

    def test_adjacent_commune_meshes_have_a_shared_boundary_band(self):
        from rasterio.crs import CRS

        transform = Affine(1.0, 0.0, 0.0, 0.0, -1.0, 6.0)
        left = {
            "type": "Polygon",
            "coordinates": [[(0.0, 0.0), (3.0, 0.0), (3.0, 6.0), (0.0, 6.0), (0.0, 0.0)]],
        }
        right = {
            "type": "Polygon",
            "coordinates": [[(3.0, 0.0), (6.0, 0.0), (6.0, 6.0), (3.0, 6.0), (3.0, 0.0)]],
        }
        source = np.full((6, 6), 100.0, dtype=np.float64)

        meshes = []
        for geometry in (left, right):
            inside = rasterize_commune_geometries(
                [geometry], transform, CRS.from_epsg(4326), source.shape, buffer_m=0,
                boundary_pixels=1,
            )
            vertices, _, _, _ = build_mesh(source, transform, ~inside, 1.0, False, "mask", False)
            meshes.append(vertices)

        self.assertGreaterEqual(meshes[0][:, 0].max(), meshes[1][:, 0].min())

    def test_json_schema_declares_safe_sidecar_names_and_mesh_counts(self):
        schema = json.loads((ROOT / "terrain.schema.json").read_text(encoding="utf-8"))
        self.assertIn("mesh", schema["properties"])
        self.assertEqual(schema["properties"]["mesh"]["required"], ["file", "vertex_count", "triangle_count"])
        self.assertIn("pattern", schema["properties"]["grid"]["properties"]["file"])

    def test_synthetic_plane_affine_round_trip_stays_below_quarter_pixel(self):
        _, transform = plane_grid()
        transform_dict = {
            "a": transform.a,
            "b": transform.b,
            "c": transform.c,
            "d": transform.d,
            "e": transform.e,
            "f": transform.f,
        }
        for column, row in ((0.0, 0.0), (2.25, 3.75), (8.5, 6.125), (-0.2, 4.4)):
            projected = affine_pixel_to_world(transform_dict, column, row)
            recovered = affine_world_to_pixel(transform_dict, *projected)
            self.assertLess(math.hypot(recovered[0] - column, recovered[1] - row), 0.25)

    def test_nearest_downsample_preserves_source_centres_and_affine_shift_for_steps(self):
        source, transform = plane_grid(rows=12, cols=14)
        mask = np.zeros(source.shape, dtype=bool)
        for step in (1, 2, 4):
            sampled, shifted, sampled_mask = downsample(source, transform, mask, step, verbose=False)
            np.testing.assert_array_equal(sampled, source[::step, ::step])
            np.testing.assert_array_equal(sampled_mask, mask[::step, ::step])
            for row, column in ((0, 0), (min(2, sampled.shape[0] - 1), min(3, sampled.shape[1] - 1))):
                source_xy = transform @ (column * step + 0.5, row * step + 0.5)
                sampled_xy = shifted @ (column + 0.5, row + 0.5)
                self.assertTrue(np.allclose(source_xy, sampled_xy, atol=1e-9), (step, row, column, source_xy, sampled_xy))

    def test_masked_mesh_does_not_create_faces_across_a_hole_and_grid_writes_nan(self):
        source, transform = plane_grid(rows=5, cols=5)
        mask = np.zeros(source.shape, dtype=bool)
        mask[2, 2] = True
        vertices, faces, used, shape = build_mesh(source, transform, mask, 1.0, False, "mask", False)
        self.assertEqual(shape, source.shape)
        self.assertLess(faces.shape[0], 2 * (source.shape[0] - 1) * (source.shape[1] - 1))
        self.assertTrue(np.isfinite(vertices).all())
        self.assertNotIn(12, used.tolist())
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "phase7.grid.bin"
            grid = write_contract_grid(source, mask, path)
            self.assertTrue(np.isnan(grid[2, 2]))
            self.assertEqual(path.stat().st_size, source.size * 4)

    def test_fill_mode_replaces_small_voids_but_preserves_distant_holes(self):
        source, _ = plane_grid(rows=60, cols=60)
        mask = np.zeros(source.shape, dtype=bool)
        mask[30, 30] = True
        mask[0:40, 0:40] = True
        mask[30, 30] = True
        source[mask] = -9999.0
        filled, remaining = fill_small_voids(source, mask, verbose=False)
        self.assertFalse(remaining[30, 30])
        self.assertTrue(np.isfinite(filled[30, 30]))
        self.assertTrue(remaining[0, 0])

    def test_crop_valid_bbox_shifts_affine_and_preserves_pixel_centres(self):
        source, transform = plane_grid(rows=8, cols=9)
        mask = np.ones(source.shape, dtype=bool)
        mask[2:6, 3:8] = False
        cropped, shifted, cropped_mask = crop_to_valid_bbox(source, transform, mask)
        self.assertEqual(cropped.shape, (4, 5))
        self.assertFalse(cropped_mask.any())
        expected_origin = transform @ (3, 2)
        actual_origin = shifted @ (0, 0)
        self.assertTrue(np.allclose(expected_origin, actual_origin))
        np.testing.assert_array_equal(cropped, source[2:6, 3:8])

    def test_contract_rejects_binary_length_and_mesh_mismatches(self):
        metadata = valid_metadata()
        with tempfile.TemporaryDirectory() as directory:
            grid_path = Path(directory) / "phase7.grid.bin"
            grid_path.write_bytes(b"bad")
            with self.assertRaises(AssetContractError):
                validate_metadata(metadata, grid_path=grid_path)
        with self.assertRaises(AssetContractError):
            validate_metadata({**metadata, "mesh": {"file": "wrong.glb", "vertex_count": -1, "triangle_count": 2}}, require_mesh=True)
        with self.assertRaises(AssetContractError):
            validate_metadata({**metadata, "grid": {**metadata["grid"], "file": "../outside.bin"}})


if __name__ == "__main__":
    unittest.main()
