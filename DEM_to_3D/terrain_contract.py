#!/usr/bin/env python3
"""Asset contract v1 helpers shared by the exporter and tests.

The contract deliberately has no dependency on :mod:`jsonschema`; this keeps the
exporter usable in a small Python environment while still providing strict,
actionable validation for the JSON/BIN pair.
"""

from __future__ import annotations

import json
import math
import os
from pathlib import Path
from typing import Any, Mapping

import numpy as np

SCHEMA_VERSION = 1
SCENE_AXES = {"x": "east", "y": "up", "z": "negative_north"}
GRID_DTYPE = "float32"
GRID_BYTE_ORDER = "little_endian"
GRID_LAYOUT = "row_major"
GRID_NODATA = "nan"


class AssetContractError(ValueError):
    """Raised when an asset does not satisfy contract v1."""


def _require(condition: bool, message: str, errors: list[str]) -> None:
    if not condition:
        errors.append(message)


def _finite_number(value: Any) -> bool:
    return isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(float(value))


def _safe_asset_filename(value: Any) -> bool:
    """Asset v1 sidecars must be single filenames in the asset directory."""
    return (
        isinstance(value, str)
        and bool(value)
        and value not in {".", ".."}
        and "/" not in value
        and "\\" not in value
        and "\x00" not in value
    )


def _as_shape(value: Any, errors: list[str]) -> tuple[int, int] | None:
    if not isinstance(value, list) or len(value) != 2 or any(isinstance(v, bool) or not isinstance(v, int) for v in value):
        errors.append("grid.shape must be [rows, cols] with two integers")
        return None
    rows, cols = value
    _require(rows > 0 and cols > 0, "grid.shape values must be positive", errors)
    return rows, cols


def _validate_crs(crs: Any, analysis_supported: Any, errors: list[str]) -> None:
    _require(isinstance(crs, dict), "crs must be an object", errors)
    if not isinstance(crs, dict):
        return
    authority = crs.get("authority")
    code = crs.get("code")
    _require(isinstance(authority, str) and bool(authority.strip()), "crs.authority must be a non-empty string", errors)
    _require(isinstance(code, int) and not isinstance(code, bool) and code >= (1 if analysis_supported is True else 0),
             "crs.code must be a positive integer for analysis assets (or 0 for unknown visual-only CRS)", errors)
    _require(bool(crs.get("proj4") or crs.get("wkt")), "crs.proj4 or crs.wkt is required", errors)
    unit = crs.get("linear_unit")
    _require(isinstance(unit, str) and bool(unit.strip()), "crs.linear_unit must be a non-empty string", errors)
    if analysis_supported is True:
        _require(str(unit).lower() in {"m", "metre", "meter", "metres", "meters"},
                 "analysis_supported=true requires a metre linear_unit", errors)
    # Visual-only assets may retain geographic, feet-based, or custom units;
    # they are explicitly excluded from metre-based analysis.


def validate_metadata(
    metadata: Mapping[str, Any],
    *,
    grid_path: str | os.PathLike[str] | None = None,
    require_mesh: bool = False,
) -> dict[str, Any]:
    """Validate and return metadata as a normal dictionary.

    ``grid_path`` is optional so metadata can be validated independently (for
    example in a browser before the binary request completes).  When supplied,
    the exact byte length is checked against both the metadata and shape.
    """

    if not isinstance(metadata, Mapping):
        raise AssetContractError("metadata must be a JSON object")
    data = dict(metadata)
    errors: list[str] = []

    _require(data.get("schema_version") == SCHEMA_VERSION, "schema_version must be 1", errors)
    _require(isinstance(data.get("asset_id"), str) and bool(data["asset_id"].strip()),
             "asset_id must be a non-empty string", errors)

    axes = data.get("scene_axes")
    _require(axes == SCENE_AXES, "scene_axes must be X=east, Y=up, Z=negative_north", errors)
    origin = data.get("world_origin")
    _require(isinstance(origin, dict), "world_origin must be an object", errors)
    if isinstance(origin, dict):
        _require(_finite_number(origin.get("x")) and _finite_number(origin.get("y")),
                 "world_origin.x and world_origin.y must be finite numbers", errors)
        _require("z" not in origin and "origin_z" not in data, "world_origin must not contain a z/origin_z", errors)

    analysis_supported = data.get("analysis_supported")
    _require(isinstance(analysis_supported, bool), "analysis_supported must be boolean", errors)
    _validate_crs(data.get("crs"), analysis_supported, errors)

    grid = data.get("grid")
    _require(isinstance(grid, dict), "grid must be an object", errors)
    shape: tuple[int, int] | None = None
    if isinstance(grid, dict):
        shape = _as_shape(grid.get("shape"), errors)
        expected = {
            "shape_order": "rows_cols",
            "dtype": GRID_DTYPE,
            "byte_order": GRID_BYTE_ORDER,
            "layout": GRID_LAYOUT,
            "nodata_encoding": GRID_NODATA,
            "elevation_unit": "metre",
            "sampling_method": "nearest_subsample",
        }
        for key, wanted in expected.items():
            _require(grid.get(key) == wanted, f"grid.{key} must be {wanted!r}", errors)
        _require(_safe_asset_filename(grid.get("file")), "grid.file must be a safe asset filename", errors)
        _require(isinstance(grid.get("source_step"), int) and grid.get("source_step", 0) >= 1,
                 "grid.source_step must be an integer >= 1", errors)
        _require(isinstance(grid.get("byte_length"), int) and grid.get("byte_length", -1) >= 0,
                 "grid.byte_length must be a non-negative integer", errors)
        if shape is not None:
            expected_bytes = shape[0] * shape[1] * 4
            _require(grid.get("byte_length") == expected_bytes,
                     f"grid.byte_length must equal rows*cols*4 ({expected_bytes})", errors)

    transform = data.get("grid_transform")
    _require(isinstance(transform, dict), "grid_transform must be an object", errors)
    if isinstance(transform, dict):
        for key in ("a", "b", "c", "d", "e", "f"):
            _require(_finite_number(transform.get(key)), f"grid_transform.{key} must be finite", errors)
        _require(transform.get("convention") == "rasterio_affine",
                 "grid_transform.convention must be rasterio_affine", errors)
        _require(transform.get("pixel_reference") == "center",
                 "grid_transform.pixel_reference must be center", errors)
        if all(_finite_number(transform.get(k)) for k in ("a", "b", "d", "e")):
            _require(abs(float(transform["a"]) * float(transform["e"]) -
                         float(transform["b"]) * float(transform["d"])) > 1e-15,
                     "grid_transform matrix must be invertible", errors)

    elevation = data.get("elevation")
    _require(isinstance(elevation, dict), "elevation must be an object", errors)
    if isinstance(elevation, dict):
        _require(_finite_number(elevation.get("base_elevation")), "elevation.base_elevation must be finite", errors)
        _require(_finite_number(elevation.get("exaggeration")) and float(elevation.get("exaggeration", 0)) > 0,
                 "elevation.exaggeration must be > 0", errors)
        _require(isinstance(elevation.get("normalize_base"), bool), "elevation.normalize_base must be boolean", errors)
        for key in ("min", "max"):
            _require(_finite_number(elevation.get(key)), f"elevation.{key} must be finite", errors)
        if _finite_number(elevation.get("min")) and _finite_number(elevation.get("max")):
            _require(float(elevation["min"]) <= float(elevation["max"]),
                     "elevation.min must be <= elevation.max", errors)

    if "sampling_method" in data:
        _require(data["sampling_method"] == "nearest_subsample", "sampling_method must be nearest_subsample", errors)
    if "hole_mode" in data:
        _require(data["hole_mode"] in {"mask", "fill"}, "hole_mode must be mask or fill", errors)

    mesh = data.get("mesh")
    if require_mesh:
        _require(isinstance(mesh, dict), "mesh metadata is required", errors)
    if isinstance(mesh, dict):
        _require(_safe_asset_filename(mesh.get("file")), "mesh.file must be a safe asset filename", errors)
        for key in ("vertex_count", "triangle_count"):
            _require(isinstance(mesh.get(key), int) and mesh[key] >= 0, f"mesh.{key} must be a non-negative integer", errors)

    if grid_path is not None and isinstance(grid, dict) and shape is not None:
        try:
            actual_bytes = os.path.getsize(grid_path)
        except OSError as exc:
            errors.append(f"grid file cannot be read: {exc}")
        else:
            _require(actual_bytes == shape[0] * shape[1] * 4,
                     f"grid file has {actual_bytes} bytes; expected {shape[0] * shape[1] * 4}", errors)
            _require(actual_bytes == grid.get("byte_length"), "grid file byte length does not match metadata", errors)

    if errors:
        raise AssetContractError("Asset contract validation failed:\n- " + "\n- ".join(errors))
    return data


def read_metadata(path: str | os.PathLike[str], *, grid_path: str | os.PathLike[str] | None = None) -> dict[str, Any]:
    path = Path(path)
    with path.open("r", encoding="utf-8") as handle:
        metadata = json.load(handle)
    return validate_metadata(metadata, grid_path=grid_path)


def affine_pixel_to_world(transform: Mapping[str, float], col: float, row: float) -> tuple[float, float]:
    """Map a pixel index to projected coordinates using its pixel centre."""
    col_center = float(col) + 0.5
    row_center = float(row) + 0.5
    return (
        float(transform["a"]) * col_center + float(transform["b"]) * row_center + float(transform["c"]),
        float(transform["d"]) * col_center + float(transform["e"]) * row_center + float(transform["f"]),
    )


def affine_world_to_pixel(transform: Mapping[str, float], x: float, y: float) -> tuple[float, float]:
    """Inverse of :func:`affine_pixel_to_world`, including rotation/shear."""
    a, b, c = (float(transform[k]) for k in ("a", "b", "c"))
    d, e, f = (float(transform[k]) for k in ("d", "e", "f"))
    det = a * e - b * d
    if abs(det) <= 1e-15:
        raise AssetContractError("grid_transform is not invertible")
    col_center = (e * (x - c) - b * (y - f)) / det
    row_center = (-d * (x - c) + a * (y - f)) / det
    return col_center - 0.5, row_center - 0.5


def projected_to_scene(x: float, y: float, elevation: float, metadata: Mapping[str, Any]) -> tuple[float, float, float]:
    origin = metadata["world_origin"]
    elev = metadata["elevation"]
    return (
        float(x) - float(origin["x"]),
        (float(elevation) - float(elev["base_elevation"])) * float(elev["exaggeration"]),
        -(float(y) - float(origin["y"])),
    )


def scene_to_projected(scene_x: float, scene_y: float, scene_z: float, metadata: Mapping[str, Any]) -> tuple[float, float, float]:
    origin = metadata["world_origin"]
    elev = metadata["elevation"]
    exaggeration = float(elev["exaggeration"])
    if exaggeration == 0:
        raise AssetContractError("elevation.exaggeration cannot be zero")
    return (
        float(scene_x) + float(origin["x"]),
        -float(scene_z) + float(origin["y"]),
        float(scene_y) / exaggeration + float(elev["base_elevation"]),
    )


def crs_metadata(crs: Any) -> dict[str, Any]:
    """Serialize the relevant CRS fields without requiring pyproj directly."""
    if crs is None:
        return {"authority": "UNKNOWN", "code": 0, "wkt": "unknown", "linear_unit": "unknown"}
    authority = "UNKNOWN"
    code = 0
    try:
        authority_code = crs.to_authority()
        if authority_code:
            authority, code_text = authority_code
            code = int(code_text)
    except Exception:
        pass
    try:
        proj4 = crs.to_proj4() or ""
    except Exception:
        proj4 = ""
    try:
        wkt = crs.to_wkt() or ""
    except Exception:
        wkt = ""
    unit = getattr(crs, "linear_units", None) or "unknown"
    try:
        if bool(crs.is_geographic) and str(unit).lower() == "unknown":
            unit = "degree"
    except Exception:
        pass
    return {"authority": authority, "code": code, "proj4": proj4, "wkt": wkt, "linear_unit": str(unit)}


def crs_is_projected_metre(crs: Any) -> bool:
    if crs is None:
        return False
    try:
        projected = bool(crs.is_projected)
    except Exception:
        projected = False
    unit = str(getattr(crs, "linear_units", "") or "").lower()
    if not unit:
        try:
            unit = str(crs.to_dict().get("units", "")).lower()
        except Exception:
            pass
    return projected and unit in {"m", "metre", "meter", "metres", "meters"}


def dump_metadata(metadata: Mapping[str, Any], path: str | os.PathLike[str]) -> None:
    """Validate and write deterministic UTF-8 JSON."""
    validate_metadata(metadata)
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="\n") as handle:
        json.dump(metadata, handle, ensure_ascii=False, indent=2, sort_keys=False)
        handle.write("\n")


def load_grid(path: str | os.PathLike[str], metadata: Mapping[str, Any]) -> np.ndarray:
    """Read a contract grid as float32 and enforce its declared dimensions."""
    validate_metadata(metadata, grid_path=path)
    shape = tuple(int(v) for v in metadata["grid"]["shape"])
    values = np.fromfile(path, dtype="<f4")
    if values.size != shape[0] * shape[1]:
        raise AssetContractError("grid element count does not match metadata shape")
    return values.reshape(shape)


__all__ = [
    "AssetContractError", "SCHEMA_VERSION", "SCENE_AXES", "validate_metadata", "read_metadata",
    "dump_metadata", "load_grid", "affine_pixel_to_world", "affine_world_to_pixel",
    "projected_to_scene", "scene_to_projected", "crs_metadata", "crs_is_projected_metre",
]


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Validate a Terrain 3D asset contract v1 JSON/BIN pair")
    parser.add_argument("metadata", help="path to *.terrain.json")
    parser.add_argument("--grid", help="optional path to *.grid.bin (defaults to metadata grid.file)")
    args = parser.parse_args()
    metadata_path = Path(args.metadata)
    grid_path = Path(args.grid) if args.grid else metadata_path.parent / json.loads(metadata_path.read_text(encoding="utf-8"))["grid"]["file"]
    try:
        result = read_metadata(metadata_path, grid_path=grid_path)
    except (OSError, json.JSONDecodeError, AssetContractError) as exc:
        parser.error(str(exc))
    print(f"OK: asset_id={result['asset_id']} shape={result['grid']['shape']} bytes={result['grid']['byte_length']}")
