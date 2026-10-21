"""Generate a bounded WebP texture pyramid for a terrain model."""
from __future__ import annotations

import argparse
import json
import math
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import numpy as np
import rasterio
from affine import Affine
from PIL import Image
from rasterio.enums import Resampling
from rasterio.windows import Window, from_bounds
from rasterio.warp import reproject, transform_bounds

TILE_RE = re.compile(r"^z(\d+)/(\d+)_(\d+)\.webp$")

@dataclass(frozen=True)
class TileGenerationReport:
    metadata_path: Path
    output_dir: Path
    tile_count: int
    max_zoom: int
    width_px: int
    height_px: int

def _terrain_json(path: str | Path) -> dict[str, Any]:
    value = json.loads(Path(path).read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        raise ValueError("terrain metadata must be an object")
    return value

def terrain_outer_bounds(metadata: dict[str, Any]) -> dict[str, float]:
    transform = metadata["grid_transform"]
    rows, cols = metadata["grid"]["shape"]
    if abs(float(transform["b"])) > 1e-12 or abs(float(transform["d"])) > 1e-12:
        raise ValueError("rotated/sheared grid transforms are not supported")
    a, e, c, f = (float(transform[key]) for key in ("a", "e", "c", "f"))
    if a <= 0 or e >= 0 or transform.get('b', 0) != 0 or transform.get('d', 0) != 0:
        raise ValueError("terrain grid must be north-up")
    return {"min_x": c, "min_y": f + e * rows, "max_x": c + a * cols, "max_y": f}

def _level(width: int, height: int, zoom: int, tile_size: int, pixel_x: float, pixel_y: float, scale: int) -> dict[str, Any]:
    return {"zoom": zoom, "width_px": width, "height_px": height, "columns": math.ceil(width / tile_size), "rows": math.ceil(height / tile_size), "pixel_size_x": pixel_x * scale, "pixel_size_y": pixel_y * scale}

def build_tile_metadata(source_path: str | Path, terrain_json_path: str | Path, tile_size: int = 512, quality: int = 88) -> dict[str, Any]:
    if not isinstance(tile_size, int) or isinstance(tile_size, bool) or not 1 <= tile_size <= 2048:
        raise ValueError("tile_size must be an integer between 1 and 2048")
    if not 1 <= quality <= 100:
        raise ValueError("quality must be between 1 and 100")
    source_path, terrain = Path(source_path), _terrain_json(terrain_json_path)
    bounds = terrain_outer_bounds(terrain)
    target_crs = rasterio.crs.CRS.from_epsg(int(terrain["crs"]["code"]))
    with rasterio.open(source_path) as source:
        if source.crs is None:
            raise ValueError("source raster must have a CRS")
        if source.crs == target_crs:
            pixel_x, pixel_y = abs(float(source.transform.a)), abs(float(source.transform.e))
        else:
            source_bounds = transform_bounds(source.crs, target_crs, *source.bounds)
            pixel_x = abs((source_bounds[2] - source_bounds[0]) / source.width)
            pixel_y = abs((source_bounds[3] - source_bounds[1]) / source.height)
    native_width = max(1, math.ceil((bounds["max_x"] - bounds["min_x"]) / pixel_x))
    native_height = max(1, math.ceil((bounds["max_y"] - bounds["min_y"]) / pixel_y))
    max_zoom = max(0, math.ceil(math.log2(max(native_width, native_height) / tile_size)))
    max_width, max_height = native_width, native_height
    levels = []
    for zoom in range(max_zoom + 1):
        scale = 2 ** (max_zoom - zoom)
        width = max(1, math.ceil(max_width / scale))
        height = max(1, math.ceil(max_height / scale))
        levels.append(_level(width, height, zoom, tile_size, (bounds["max_x"] - bounds["min_x"]) / width, (bounds["max_y"] - bounds["min_y"]) / height, 1))
    return {"schema_version": 1, "asset_id": str(terrain["asset_id"]), "format": "webp", "quality": quality, "tile_size": tile_size, "gutter_px": 2, "min_zoom": 0, "max_zoom": max_zoom, "bounds_projected": bounds, "crs": {"authority": "EPSG", "code": int(terrain["crs"]["code"]), "linear_unit": terrain["crs"].get("linear_unit", "metre")}, "orientation": {"origin": "top_left", "x": "east", "y": "north_to_south"}, "levels": levels, "source": source_path.name}

def _add_gutter(image: Image.Image, gutter_px: int) -> Image.Image:
    pixels = np.asarray(image.convert("RGBA"))
    padded = np.pad(pixels, ((gutter_px, gutter_px), (gutter_px, gutter_px), (0, 0)), mode="edge")
    return Image.fromarray(padded)

def render_max_level_tile(source: Any, target_crs: Any, target_transform: Affine, tile_window: Window, gutter_px: int = 2) -> Image.Image:
    tile_size = int(tile_window.width)
    left, top = target_transform.c, target_transform.f
    right, bottom = left + target_transform.a * tile_size, top + target_transform.e * tile_size
    source_bounds = transform_bounds(target_crs, source.crs, left, bottom, right, top, densify_pts=2)
    raw = from_bounds(*source_bounds, transform=source.transform)
    raw_col0, raw_row0 = math.floor(raw.col_off) - 2, math.floor(raw.row_off) - 2
    raw_col1, raw_row1 = math.ceil(raw.col_off + raw.width) + 2, math.ceil(raw.row_off + raw.height) + 2
    if raw_col1 <= 0 or raw_row1 <= 0 or raw_col0 >= source.width or raw_row0 >= source.height:
        return Image.new("RGBA", (tile_size + gutter_px * 2, tile_size + gutter_px * 2), (0, 0, 0, 0))
    col0, row0 = max(0, raw_col0), max(0, raw_row0)
    col1, row1 = min(source.width, raw_col1), min(source.height, raw_row1)
    window = Window(col0, row0, max(1, col1 - col0), max(1, row1 - row0))
    indexes = [1, 2, 3] if source.count >= 3 else [1]
    if any(source.dtypes[index - 1] != 'uint8' for index in indexes):
        raise ValueError('tile imagery must be an 8-bit display raster; prepare a visualization first')
    data = source.read(indexes, window=window, boundless=False)
    if data.shape[0] == 1:
        data = np.repeat(data, 3, axis=0)
    destination = np.zeros((3, tile_size, tile_size), dtype=np.uint8)
    reproject(source=data, destination=destination, src_transform=source.window_transform(window), src_crs=source.crs, dst_transform=target_transform, dst_crs=target_crs, resampling=Resampling.bilinear, src_nodata=source.nodata, dst_nodata=0)
    alpha = np.zeros((tile_size, tile_size), dtype=np.uint8)
    reproject(source=source.dataset_mask(window=window), destination=alpha, src_transform=source.window_transform(window), src_crs=source.crs, dst_transform=target_transform, dst_crs=target_crs, resampling=Resampling.nearest, src_nodata=0, dst_nodata=0)
    rgba = np.concatenate([np.transpose(destination, (1, 2, 0)), alpha[:, :, None]], axis=2)
    return _add_gutter(Image.fromarray(rgba), gutter_px)

def _validate_output(metadata: dict[str, Any], output_dir: Path) -> int:
    count, expected = 0, metadata["tile_size"] + 2 * metadata["gutter_px"]
    for level in metadata["levels"]:
        paths = sorted((output_dir / f"z{level['zoom']}").glob("*.webp"))
        if len(paths) != level["columns"] * level["rows"]:
            raise ValueError(f"level {level['zoom']} has incomplete tile output")
        for path in paths:
            match = TILE_RE.match(path.relative_to(output_dir).as_posix())
            if not match or int(match.group(2)) >= level["columns"] or int(match.group(3)) >= level["rows"]:
                raise ValueError(f"unsafe tile path: {path}")
            with Image.open(path) as image:
                if image.size != (expected, expected):
                    raise ValueError(f"invalid tile dimensions: {path}")
                image.load()
            count += 1
    return count

def generate_pyramid(source_path: str | Path, terrain_json_path: str | Path, output_dir: str | Path, tile_size: int = 512, quality: int = 88) -> TileGenerationReport:
    metadata = build_tile_metadata(source_path, terrain_json_path, tile_size, quality)
    output_dir = Path(output_dir)
    output_dir = output_dir.resolve()
    if output_dir.exists() and any(output_dir.iterdir()):
        raise ValueError("output directory must be empty; existing tiles are never deleted")
    output_dir.mkdir(parents=True, exist_ok=True)
    bounds = metadata["bounds_projected"]
    target_crs = rasterio.crs.CRS.from_epsg(int(metadata["crs"]["code"]))
    max_level = metadata["levels"][-1]
    with rasterio.open(source_path) as source:
        for level in metadata["levels"]:
            level_dir = output_dir / f"z{level['zoom']}"
            level_dir.mkdir()
            for row in range(level["rows"]):
                for column in range(level["columns"]):
                    transform = Affine(level["pixel_size_x"], 0, bounds["min_x"] + column * tile_size * level["pixel_size_x"], 0, -level["pixel_size_y"], bounds["max_y"] - row * tile_size * level["pixel_size_y"])
                    render_max_level_tile(source, target_crs, transform, Window(0, 0, tile_size, tile_size), metadata["gutter_px"]).save(level_dir / f"{column}_{row}.webp", format="WEBP", quality=quality, method=4)
    count = _validate_output(metadata, output_dir)
    metadata_path = Path(terrain_json_path).with_name(f"{Path(terrain_json_path).name.removesuffix('.terrain.json')}.tiles.json")
    metadata_path.write_text(json.dumps(metadata, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return TileGenerationReport(metadata_path, output_dir, count, metadata["max_zoom"], max_level["width_px"], max_level["height_px"])

def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", required=True, type=Path)
    parser.add_argument("--terrain-json", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--tile-size", type=int, default=512)
    parser.add_argument("--format", choices=["webp"], default="webp")
    parser.add_argument("--quality", type=int, default=88)
    args = parser.parse_args()
    report = generate_pyramid(args.input, args.terrain_json, args.output, args.tile_size, args.quality)
    print(json.dumps({"metadata": str(report.metadata_path), "output": str(report.output_dir), "tiles": report.tile_count, "max_zoom": report.max_zoom}, ensure_ascii=False))
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
