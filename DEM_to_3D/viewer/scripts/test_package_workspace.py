import hashlib
import json
import tempfile
import unittest
import zipfile
from pathlib import Path
from package_workspace import package_workspace


class PackageTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.dist = self.root / 'dist'
        folder = self.dist / 'scenarios/che-tao/v0.3'
        folder.mkdir(parents=True)
        payload = b'{"incident":{"id":"event"}}'
        asset = {'url': '/scenarios/che-tao/v0.3/incident.json', 'byteLength': len(payload), 'sha256': hashlib.sha256(payload).hexdigest()}
        (folder / 'incident.json').write_bytes(payload)
        (folder / 'manifest.json').write_text(json.dumps({'incidentId': 'event', 'datasetVersion': 'v1', 'dataKind': 'synthetic', 'reviewStatus': 'draft', 'workspace': asset, 'terrain': {}}))
        (self.dist / 'index.html').write_text('<html></html>')
        (self.dist / 'scenarios/incident-v1.schema.json').write_text('{}')

    def test_zip_is_self_contained_and_every_file_matches_its_checksum(self):
        archive = self.root / 'release.zip'
        package_workspace(self.dist, archive)
        with zipfile.ZipFile(archive) as package:
            release = json.loads(package.read('release.json'))
            self.assertEqual(release['reviewStatus'], 'draft')
            self.assertIn('scripts/serve_workspace.py', release['files'])
            self.assertIn(b'--offline', package.read('Start.ps1'))
            for name, digest in release['files'].items():
                self.assertNotIn('..', Path(name).parts)
                self.assertEqual(hashlib.sha256(package.read(name)).hexdigest(), digest)

    def test_corrupt_dataset_prevents_packaging(self):
        (self.dist / 'scenarios/che-tao/v0.3/incident.json').write_text('corrupt')
        with self.assertRaisesRegex(ValueError, 'checksum'):
            package_workspace(self.dist, self.root / 'release.zip')

    def test_nested_catalog_asset_cannot_be_corrupt(self):
        folder = self.dist / 'scenarios/che-tao/v0.3'
        photo = {'url': 'photo.webp', 'byteLength': 5, 'sha256': hashlib.sha256(b'photo').hexdigest()}
        (folder / 'photo.webp').write_bytes(b'wrong')
        content = json.dumps({'points': [{'photos': [{'image': photo}]}]}).encode()
        (folder / 'photos.json').write_bytes(content)
        manifest_path = folder / 'manifest.json'
        manifest = json.loads(manifest_path.read_bytes())
        manifest['fieldPhotos'] = {'url': '/scenarios/che-tao/v0.3/photos.json', 'byteLength': len(content), 'sha256': hashlib.sha256(content).hexdigest()}
        manifest_path.write_text(json.dumps(manifest))
        with self.assertRaisesRegex(ValueError, 'checksum'):
            package_workspace(self.dist, self.root / 'release.zip')

    def test_rejects_output_inside_build(self):
        with self.assertRaisesRegex(ValueError, 'outside build'):
            package_workspace(self.dist, self.dist / 'release.zip')

    def test_local_map_is_validated_and_preserved_in_server_configuration(self):
        from workspace_configuration import workspace_manifest_path
        local = self.root / 'map'
        local.mkdir()
        (local / 'blank.webp').write_bytes(b'blank')
        (local / 'map.json').write_text(json.dumps({'schemaVersion': 1, 'files': {'blank.webp': {'byteLength': 5, 'sha256': hashlib.sha256(b'blank').hexdigest()}}}))
        archive = self.root / 'release.zip'
        package_workspace(self.dist, archive, local_map=local)
        with zipfile.ZipFile(archive) as package:
            package.extractall(self.root / 'extracted')
            self.assertTrue(json.loads(package.read('release.json'))['localMap'])
        config = workspace_manifest_path(self.root / 'extracted/dist')[1]
        self.assertEqual(config['localMap'], '/offline-map/map.json')
        self.assertTrue(config['offline'])
        (local / 'blank.webp').write_bytes(b'wrong')
        with self.assertRaisesRegex(ValueError, 'checksum'):
            package_workspace(self.dist, archive, local_map=local)

    def test_launcher_rejects_changed_or_missing_files(self):
        from start_demo import verify_package
        archive = self.root / 'release.zip'
        package_workspace(self.dist, archive)
        extracted = self.root / 'extracted'
        with zipfile.ZipFile(archive) as package:
            package.extractall(extracted)
        verify_package(extracted)
        (extracted / 'dist/index.html').write_text('changed')
        with self.assertRaisesRegex(ValueError, 'missing or changed'):
            verify_package(extracted)
        (extracted / 'dist/index.html').unlink()
        with self.assertRaisesRegex(ValueError, 'missing or changed'):
            verify_package(extracted)

    def test_launcher_refuses_a_different_server_on_the_requested_port(self):
        from io import BytesIO
        from unittest.mock import patch
        from start_demo import start
        archive = self.root / 'release.zip'
        package_workspace(self.dist, archive)
        extracted = self.root / 'extracted'
        with zipfile.ZipFile(archive) as package:
            package.extractall(extracted)
        with patch('start_demo.create_server', side_effect=OSError('occupied')), \
             patch('start_demo.urllib.request.urlopen', return_value=BytesIO(b'{"packageId":"different"}')), \
             patch('start_demo.open_demo') as browser:
            with self.assertRaisesRegex(RuntimeError, 'Port 5212 is in use'):
                start(extracted, browser=True)
            browser.assert_not_called()

    def test_launcher_uses_the_normal_app_entry_to_preserve_language_choice(self):
        from start_demo import presentation_url
        self.assertEqual(presentation_url('http://127.0.0.1:5212'), 'http://127.0.0.1:5212/')

    def test_desktop_entry_uses_windowless_runtime_and_keeps_diagnostics(self):
        archive = self.root / 'release.zip'
        package_workspace(self.dist, archive)
        with zipfile.ZipFile(archive) as package:
            self.assertIn(b'pythonw.exe', package.read('Start-DEAR.cmd'))
            self.assertIn(b'--desktop', package.read('Start-DEAR.cmd'))
            self.assertIn('Start-Diagnostics.cmd', package.namelist())
        from start_demo import launch
        from unittest.mock import patch
        with patch('start_demo.start', side_effect=lambda *args: print('ready')) as start:
            self.assertEqual(launch(self.root, 5321, browser=False, desktop=True), 0)
            start.assert_called_once_with(self.root, 5321, False)
        self.assertIn('ready', (self.root / 'user-data/launcher.log').read_text(encoding='utf8'))
