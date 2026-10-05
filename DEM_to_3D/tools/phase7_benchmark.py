#!/usr/bin/env python3
"""Run reproducible, browser-independent Phase 7 measurements.

The browser FPS criterion is intentionally reported as ``NOT_MEASURED`` here:
this command has no WebGL context and must not turn a CPU benchmark into a
false claim about interactive rendering.
"""

from __future__ import annotations

import argparse
import json
import math
import platform
import sys
import tempfile
import time
from pathlib import Path

import numpy as np
from affine import Affine

ROOT = Path(__file__).parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from dem_to_3d import build_mesh, serialize_transform, write_contract_grid  # noqa: E402
from terrain_contract import validate_metadata  # noqa: E402


def build_plane(rows: int, columns: int) -> tuple[np.ndarray, Affine]:
    transform = Affine(8.0, 0.75, 412000.0, -0.25, -8.0, 2498000.0)
    column_grid, row_grid = np.meshgrid(np.arange(columns), np.arange(rows))
    x = transform.c + transform.a * (column_grid + 0.5) + transform.b * (row_grid + 0.5)
    y = transform.f + transform.d * (column_grid + 0.5) + transform.e * (row_grid + 0.5)
    values = (0.12 * x - 0.08 * y + 450.0).astype(np.float64)
    return values, transform


def reference_profile(grid: np.ndarray, transform: Affine, sample_count: int) -> list[float]:
    """Sample a line with the same inverse-affine/bilinear semantics as the viewer."""
    rows, columns = grid.shape
    start = transform @ (2.5, 3.5)
    end = transform @ (columns - 3.5, rows - 4.5)
    values: list[float] = []
    matrix = np.array([[transform.a, transform.b], [transform.d, transform.e]], dtype=np.float64)
    inverse = np.linalg.inv(matrix)
    for ratio in np.linspace(0.0, 1.0, sample_count):
        x = start[0] + (end[0] - start[0]) * float(ratio)
        y = start[1] + (end[1] - start[1]) * float(ratio)
        pixel = inverse @ np.array([x - transform.c, y - transform.f], dtype=np.float64)
        column = pixel[0] - 0.5
        row = pixel[1] - 0.5
        base_column = math.floor(column)
        base_row = math.floor(row)
        fx = column - base_column
        fy = row - base_row
        if base_column < 0 or base_row < 0 or base_column >= columns - 1 or base_row >= rows - 1:
            values.append(float(grid[min(max(round(row), 0), rows - 1), min(max(round(column), 0), columns - 1)]))
            continue
        v00 = grid[base_row, base_column]
        v10 = grid[base_row, base_column + 1]
        v01 = grid[base_row + 1, base_column]
        v11 = grid[base_row + 1, base_column + 1]
        values.append(float((1 - fy) * ((1 - fx) * v00 + fx * v10) + fy * ((1 - fx) * v01 + fx * v11)))
    return values


def make_report(profile_samples: int) -> dict:
    grid, transform = build_plane(128, 160)
    nodata = np.zeros(grid.shape, dtype=bool)
    profile_start = time.perf_counter()
    profile_values = reference_profile(grid, transform, profile_samples)
    profile_ms = (time.perf_counter() - profile_start) * 1000.0

    with tempfile.TemporaryDirectory(prefix="terrain-phase7-") as directory:
        root = Path(directory)
        grid_path = root / "phase7.grid.bin"
        grid_written = write_contract_grid(grid, nodata, grid_path)
        vertices, faces, used, shape = build_mesh(grid, transform, nodata, 1.0, False, "mask", False)
        import trimesh

        mesh = trimesh.Trimesh(vertices=vertices, faces=faces, process=False)
        glb_path = root / "phase7.glb"
        mesh.export(glb_path)
        metadata = {
            "schema_version": 1,
            "asset_id": "phase7-benchmark",
            "crs": {"authority": "EPSG", "code": 32648, "proj4": "+proj=utm +zone=48 +units=m", "linear_unit": "metre"},
            "scene_axes": {"x": "east", "y": "up", "z": "negative_north"},
            "world_origin": {"x": 412000.0, "y": 2498000.0},
            "grid": {"file": grid_path.name, "shape": [shape[0], shape[1]], "shape_order": "rows_cols", "dtype": "float32", "byte_order": "little_endian", "layout": "row_major", "nodata_encoding": "nan", "elevation_unit": "metre", "sampling_method": "nearest_subsample", "source_step": 1, "byte_length": grid_written.nbytes},
            "grid_transform": serialize_transform(transform),
            "elevation": {"base_elevation": 0.0, "exaggeration": 1.0, "normalize_base": False, "min": float(np.min(grid)), "max": float(np.max(grid))},
            "analysis_supported": True,
            "mesh": {"file": glb_path.name, "vertex_count": int(vertices.shape[0]), "triangle_count": int(faces.shape[0])},
        }
        validation_start = time.perf_counter()
        validate_metadata(metadata, grid_path=grid_path, require_mesh=True)
        metadata_validation_ms = (time.perf_counter() - validation_start) * 1000.0
        load_start = time.perf_counter()
        loaded_metadata = json.loads(json.dumps(metadata))
        loaded_grid = np.fromfile(grid_path, dtype="<f4").reshape(shape)
        loaded_mesh = trimesh.load(glb_path, force="mesh", process=False)
        asset_load_ms = (time.perf_counter() - load_start) * 1000.0
        if loaded_metadata["grid"]["shape"] != [shape[0], shape[1]] or loaded_grid.size != shape[0] * shape[1] or len(loaded_mesh.faces) != faces.shape[0]:
            raise RuntimeError("offline asset load produced inconsistent metadata/grid/mesh")
        metadata_bytes = len(json.dumps(metadata, separators=(",", ":")).encode("utf-8"))
        asset_bytes = {
            "glb": glb_path.stat().st_size,
            "grid": grid_path.stat().st_size,
            "metadata": metadata_bytes,
        }

    asset_bytes["total"] = sum(asset_bytes.values())
    return {
        "schema": "terrain-phase7-benchmark-v1",
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "profile_samples": profile_samples,
        "profile_ms": round(profile_ms, 4),
        "profile_finite_samples": len(profile_values),
        "metadata_validation_ms": round(metadata_validation_ms, 4),
        "asset_load_ms": round(asset_load_ms, 4),
        "asset_bytes": asset_bytes,
        "thresholds": {
            "profile_target_ms": 200.0,
            "profile_status": "PASS" if profile_ms < 200.0 else "MEASURED_OVER_TARGET",
            "browser_hover_fps_target": 30.0,
        },
        "browser_hover_fps": {"status": "NOT_MEASURED", "value": None, "reason": "No browser/WebGL harness is part of this offline command."},
        "environment": {
            "python": platform.python_version(),
            "numpy": np.__version__,
            "platform": platform.platform(),
            "processor": platform.processor(),
        },
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", type=Path, help="optional JSON report path")
    parser.add_argument("--profile-samples", type=int, default=2000)
    args = parser.parse_args()
    if args.profile_samples < 2:
        parser.error("--profile-samples must be >= 2")
    report = make_report(args.profile_samples)
    payload = json.dumps(report, ensure_ascii=False, indent=2) + "\n"
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(payload, encoding="utf-8")
    print(payload, end="")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
