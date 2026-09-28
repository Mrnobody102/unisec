import json
import subprocess
import sys
import unittest
from pathlib import Path

import numpy as np

ROOT = Path(__file__).parents[1]


def write_dem_in_child(path: Path, values: np.ndarray, *, crs: str, transform: tuple[float, float, float, float, float, float], nodata: float | None = None) -> None:
    """Create a GeoTIFF in a fresh interpreter.

    Rasterio's Windows GDAL DLL can remain locked when the parent test process
    imports it before launching the exporter. Keeping rasterio entirely in this
    short-lived helper makes the CLI integration test deterministic.
    """
    code = """
import sys
from pathlib import Path
import numpy as np
import rasterio
from rasterio.transform import Affine
path = Path(sys.argv[1])
values = np.asarray(__import__('json').loads(sys.argv[2]), dtype='float32')
crs = sys.argv[3]
transform = Affine(*map(float, __import__('json').loads(sys.argv[4])))
nodata_text = sys.argv[5]
nodata = None if nodata_text == 'NONE' else float(nodata_text)
kwargs = dict(driver='GTiff', height=values.shape[0], width=values.shape[1], count=1, dtype='float32', crs=crs, transform=transform)
if nodata is not None:
    kwargs['nodata'] = nodata
with rasterio.open(path, 'w', **kwargs) as dataset:
    dataset.write(values, 1)
"""
    args = [
        sys.executable, '-c', code, str(path), json.dumps(values.tolist()), crs,
        json.dumps(transform), 'NONE' if nodata is None else str(nodata),
    ]
    last_error = b''
    for _ in range(3):
        result = subprocess.run(args, cwd=ROOT, check=False, capture_output=True, close_fds=True)
        if result.returncode == 0:
            return
        last_error = result.stderr
    raise AssertionError(last_error.decode('utf-8', errors='replace'))


class ExporterTests(unittest.TestCase):
    def test_exporter_contract_and_recenter(self):
        import tempfile
        with tempfile.TemporaryDirectory() as temporary:
            tmp_path = Path(temporary)
            dem = tmp_path / "plane.tif"
            output = tmp_path / "terrain"
            values = np.arange(30, dtype="float32").reshape(5, 6) + 100
            values[0, 0] = -9999
            write_dem_in_child(dem, values, crs="EPSG:32648", transform=(10, 0, 412000, 0, -10, 2498050), nodata=-9999)
            result = subprocess.run([sys.executable, str(ROOT / "dem_to_3d.py"), "--input", str(dem), "--output", str(output), "--formats", "glb", "--step", "2"], check=False, capture_output=True, text=True, encoding="utf-8")
            self.assertEqual(result.returncode, 0, result.stderr)
            metadata = json.loads((tmp_path / "terrain.terrain.json").read_text(encoding="utf-8"))
            self.assertEqual(metadata["scene_axes"], {"x": "east", "y": "up", "z": "negative_north"})
            self.assertEqual(metadata["grid"]["byte_length"], (tmp_path / "terrain.grid.bin").stat().st_size)
            self.assertEqual(metadata["grid_transform"]["c"], 411995.0)
            self.assertEqual(metadata["grid_transform"]["f"], 2498055.0)
            self.assertEqual(metadata["world_origin"]["x"], 412025.0)
            self.assertEqual(metadata["world_origin"]["y"], 2498025.0)
            glb = tmp_path / "terrain.glb"
            self.assertTrue(glb.exists())
            import trimesh
            mesh = trimesh.load(glb, force="mesh")
            self.assertLess(float(np.max(np.abs(mesh.vertices[:, 0]))), 100.0)
            self.assertLess(float(np.max(np.abs(mesh.vertices[:, 2]))), 100.0)
            grid = np.fromfile(tmp_path / "terrain.grid.bin", dtype="<f4").reshape(3, 3)
            self.assertTrue(np.isnan(grid[0, 0]))
            self.assertTrue(np.isfinite(grid[1:, 1:]).all())

    def test_keep_geographic_marks_visual_only(self):
        import tempfile
        with tempfile.TemporaryDirectory() as temporary:
            tmp_path = Path(temporary)
            dem = tmp_path / "geographic.tif"
            output = tmp_path / "visual"
            values = np.arange(4, dtype="float32").reshape(2, 2) + 50
            write_dem_in_child(dem, values, crs="EPSG:4326", transform=(.01, 0, 103, 0, -.01, 22))
            result = subprocess.run([
                sys.executable, str(ROOT / "dem_to_3d.py"), "--input", str(dem), "--output", str(output),
                "--formats", "glb", "--step", "1", "--keep-geographic",
            ], check=False, capture_output=True, text=True, encoding="utf-8")
            self.assertEqual(result.returncode, 0, result.stderr)
            metadata = json.loads((tmp_path / "visual.terrain.json").read_text(encoding="utf-8"))
            self.assertFalse(metadata["analysis_supported"])
            self.assertEqual(metadata["crs"]["code"], 4326)
            self.assertEqual(metadata["crs"]["linear_unit"], "degree")
