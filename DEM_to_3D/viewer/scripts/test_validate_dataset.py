import contextlib
import hashlib
import io
import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import validate_dataset as validator


class PreparedDatasetTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.canonical = Path(self.temp.name) / 'DEM_to_3D'
        self.canonical.mkdir()
        self.public = self.canonical / 'viewer' / 'public'
        self.manifest_path = self.public / 'scenarios' / 'manifest.json'
        self.manifest_path.parent.mkdir(parents=True)
        contents = {
            'glb': ('terrain.glb', b'mesh fixture'),
            'grid': ('terrain.grid.bin', b'grid fixture'),
            'metadata': ('terrain.terrain.json', json.dumps({
                'crs': {'authority': 'EPSG', 'code': 32648},
                'mesh': {'file': 'terrain.glb'},
                'grid': {'file': 'terrain.grid.bin'}
            }).encode())
        }
        self.manifest = {
            'schemaVersion': 1, 'datasetVersion': 'fixture-v1',
            'dataKind': 'synthetic', 'reviewStatus': 'draft',
            'incidentId': 'fixture', 'snapshotAt': '2026-09-29T09:31:00+07:00',
            'crs': 'EPSG:32648', 'counts': {'communities': 0, 'roads': 0, 'hazards': 0},
            'terrain': {}
        }
        for key, (name, content) in contents.items():
            (self.canonical / name).write_bytes(content)
            self.manifest['terrain'][key] = {
                'url': f'/terrain/{name}', 'byteLength': len(content),
                'sha256': hashlib.sha256(content).hexdigest()
            }
        for name, value in [('PUBLIC', self.public), ('MANIFEST', self.manifest_path)]:
            self.enterContext(patch.object(validator, name, value))

    def run_validator(self, prepare=False):
        self.manifest_path.write_text(json.dumps(self.manifest), encoding='utf-8')
        with contextlib.redirect_stdout(io.StringIO()):
            validator.main(prepare=prepare)

    def test_clean_checkout_prepares_verified_files(self):
        self.run_validator(prepare=True)
        self.run_validator()
        for asset in self.manifest['terrain'].values():
            name = Path(asset['url']).name
            self.assertEqual((self.public / 'terrain' / name).read_bytes(), (self.canonical / name).read_bytes())

    def test_prepare_restores_a_stale_generated_file(self):
        self.run_validator(prepare=True)
        grid = self.public / 'terrain' / 'terrain.grid.bin'
        grid.write_bytes(b'bad data here')
        with self.assertRaisesRegex(SystemExit, 'mismatch'):
            self.run_validator()
        self.run_validator(prepare=True)
        self.assertEqual(grid.read_bytes(), (self.canonical / grid.name).read_bytes())

    def test_bad_canonical_source_fails_before_any_copy(self):
        (self.canonical / 'terrain.grid.bin').write_bytes(b'bad source')
        with self.assertRaisesRegex(SystemExit, 'mismatch'):
            self.run_validator(prepare=True)
        self.assertFalse((self.public / 'terrain').exists())

    def test_invalid_date_and_parent_paths_are_rejected(self):
        self.manifest['snapshotAt'] = '2026-02-30T09:31:00+07:00'
        with self.assertRaisesRegex(SystemExit, 'snapshotAt'):
            self.run_validator(prepare=True)
        self.manifest['snapshotAt'] = '2026-09-29T09:31:00+07:00'
        self.manifest['terrain']['glb']['url'] = '/terrain/../outside.glb'
        with self.assertRaisesRegex(SystemExit, 'asset path'):
            self.run_validator(prepare=True)


if __name__ == '__main__':
    unittest.main()
