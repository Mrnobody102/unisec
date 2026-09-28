"""Smoke tests for the reproducible Phase 7 benchmark report."""

from __future__ import annotations

import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).parents[1]


class Phase7BenchmarkTests(unittest.TestCase):
    def test_benchmark_emits_required_measurements_and_explicit_fps_status(self):
        with tempfile.TemporaryDirectory() as directory:
            output = Path(directory) / "phase7-benchmark.json"
            result = subprocess.run(
                [sys.executable, str(ROOT / "tools" / "phase7_benchmark.py"), "--output", str(output)],
                cwd=ROOT,
                check=False,
                capture_output=True,
                text=True,
            )
            self.assertEqual(result.returncode, 0, result.stderr)
            report = json.loads(output.read_text(encoding="utf-8"))
            self.assertEqual(report["schema"], "terrain-phase7-benchmark-v1")
            self.assertGreaterEqual(report["profile_ms"], 0)
            self.assertGreaterEqual(report["metadata_validation_ms"], 0)
            self.assertGreaterEqual(report["asset_load_ms"], 0)
            self.assertGreater(report["asset_bytes"]["total"], 0)
            self.assertEqual(report["browser_hover_fps"]["status"], "NOT_MEASURED")
            self.assertIsNone(report["browser_hover_fps"]["value"])
            self.assertIn("environment", report)


if __name__ == "__main__":
    unittest.main()
