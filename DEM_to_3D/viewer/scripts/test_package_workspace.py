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
        folder = self.dist / 'scenarios/che-tao/v0.2'
        folder.mkdir(parents=True)
        payload = b'{"incident":{"id":"event"}}'
        asset = {'url': '/scenarios/che-tao/v0.2/incident.json', 'byteLength': len(payload), 'sha256': hashlib.sha256(payload).hexdigest()}
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
        (self.dist / 'scenarios/che-tao/v0.2/incident.json').write_text('corrupt')
        with self.assertRaisesRegex(ValueError, 'checksum'):
            package_workspace(self.dist, self.root / 'release.zip')
