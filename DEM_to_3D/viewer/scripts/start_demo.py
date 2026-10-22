"""Launch a verified, self-contained demo on loopback; no install or network."""
import argparse
import hashlib
import json
import os
import subprocess
import urllib.request
import webbrowser
from pathlib import Path
from serve_workspace import create_server

ROOT = Path(__file__).resolve().parents[1]


def verify_package(root):
    root = Path(root).resolve()
    release = json.loads((root / 'release.json').read_text(encoding='utf8'))
    for name, digest in release['files'].items():
        path = (root / name).resolve()
        if not path.is_relative_to(root) or not path.is_file():
            raise ValueError('Package missing or changed: ' + name)
        with path.open('rb') as handle:
            actual = hashlib.file_digest(handle, 'sha256').hexdigest()
        if actual != digest:
            raise ValueError('Package missing or changed: ' + name)
    return release


def open_demo(url, root):
    if os.name == 'nt':
        candidates = [
            Path(os.environ.get('PROGRAMFILES', '')) / 'Google/Chrome/Application/chrome.exe',
            Path(os.environ.get('LOCALAPPDATA', '')) / 'Google/Chrome/Application/chrome.exe',
            Path(os.environ.get('PROGRAMFILES(X86)', '')) / 'Microsoft/Edge/Application/msedge.exe',
            Path(os.environ.get('PROGRAMFILES', '')) / 'Microsoft/Edge/Application/msedge.exe'
        ]
        browser = next((path for path in candidates if path.is_file()), None)
        if browser:
            profile = root / 'user-data/browser'
            profile.mkdir(parents=True, exist_ok=True)
            subprocess.Popen([
                str(browser), '--user-data-dir=' + str(profile), '--no-first-run',
                '--no-default-browser-check', '--app=' + url
            ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            return
    webbrowser.open(url)


def start(root=ROOT, port=5212, browser=True):
    print('Checking DEAR package...', flush=True)
    verify_package(root)
    url = f'http://127.0.0.1:{port}'
    try:
        server = create_server(root / 'dist', port=port, offline=True)
    except OSError:
        try:
            with urllib.request.urlopen(url + '/api/health', timeout=2) as response:
                health = json.load(response)
            expected = hashlib.sha256((root / 'release.json').read_bytes()).hexdigest()
            if health.get('packageId') != expected:
                raise ValueError('Different server')
        except Exception as error:
            raise RuntimeError(
                f'Port {port} is in use. Close the other DEAR server or run Start.ps1 -Port 5213.'
            ) from error
        if browser:
            open_demo(url, root)
        print('This DEAR package is already running: ' + url, flush=True)
        return
    with server:
        url = f'http://127.0.0.1:{server.server_port}'
        if browser:
            open_demo(url, root)
        print('DEAR offline ready: ' + url + ' | Stop: Ctrl+C', flush=True)
        try:
            server.serve_forever()
        except KeyboardInterrupt:
            pass


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--port', type=int, default=5212)
    parser.add_argument('--offline', action='store_true', help='Compatibility flag; this launcher always uses offline mode')
    parser.add_argument('--no-browser', action='store_true')
    args = parser.parse_args()
    try:
        start(port=args.port, browser=not args.no_browser)
    except Exception as error:
        print('DEAR could not start: ' + str(error), flush=True)
        raise SystemExit(1)
