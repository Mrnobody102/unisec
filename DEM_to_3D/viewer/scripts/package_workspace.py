"""Package a built workspace, local server and checksums. No downloads at runtime."""
import argparse
import hashlib
import json
import subprocess
import zipfile
from datetime import datetime, timezone
from pathlib import Path
from workspace_configuration import workspace_manifest_path

ROOT = Path(__file__).resolve().parents[1]


def package_workspace(dist, destination, local_map=None, runtime=None):
    dist, destination = Path(dist).resolve(), Path(destination).resolve()
    if destination.is_relative_to(dist):
        raise ValueError('Package output must be outside build')
    required = ['index.html', 'scenarios/incident-v1.schema.json']
    for relative in required:
        if not (dist / relative).is_file():
            raise ValueError(f'Missing build asset: {relative}')
    manifest_path, _ = workspace_manifest_path(dist)
    manifest = json.loads(manifest_path.read_text(encoding='utf-8'))
    checked = {}

    def validate_assets(value, folder=dist):
        if isinstance(value, list):
            for item in value:
                validate_assets(item, folder)
        elif isinstance(value, dict):
            if {'url', 'byteLength', 'sha256'}.issubset(value):
                path = (dist / value['url'].lstrip('/') if value['url'].startswith('/') else folder / value['url']).resolve()
                if not path.is_relative_to(dist):
                    raise ValueError('Asset path outside build')
                if path in checked:
                    if checked[path] != (value['byteLength'], value['sha256']):
                        raise ValueError(f'Conflicting asset checksum: {value["url"]}')
                    return
                content = path.read_bytes()
                if len(content) != value['byteLength'] or hashlib.sha256(content).hexdigest() != value['sha256']:
                    raise ValueError(f'Asset checksum mismatch: {value["url"]}')
                checked[path] = (value['byteLength'], value['sha256'])
                if path.suffix == '.json':
                    validate_assets(json.loads(content), path.parent)
            else:
                for item in value.values():
                    validate_assets(item, folder)

    validate_assets(manifest)
    files = {}
    for path in sorted(dist.rglob('*')):
        if path.is_file():
            if not path.resolve().is_relative_to(dist):
                raise ValueError('Build symlink outside package')
            files['dist/' + path.relative_to(dist).as_posix()] = path.read_bytes()
    if local_map:
        local_map = Path(local_map).resolve()
        catalog = json.loads((local_map / 'map.json').read_text(encoding='utf8'))
        if catalog.get('schemaVersion') != 1 or not catalog.get('files'):
            raise ValueError('Invalid offline map catalog')
        for name, asset in catalog['files'].items():
            path = (local_map / name).resolve()
            if not path.is_relative_to(local_map):
                raise ValueError('Unsafe local map file')
            data = path.read_bytes()
            if len(data) != asset['byteLength'] or hashlib.sha256(data).hexdigest() != asset['sha256']:
                raise ValueError('Offline map checksum mismatch: ' + name)
            files['dist/offline-map/' + name] = data
        files['dist/offline-map/map.json'] = (local_map / 'map.json').read_bytes()
        configuration = json.loads(files.get('dist/workspace-config.json', b'{"dataSource":"prepared"}'))
        files['dist/workspace-config.json'] = json.dumps({
            **configuration, 'offline': True, 'dataSource': 'prepared', 'localMap': '/offline-map/map.json'
        }).encode()
    if runtime:
        runtime = Path(runtime)
        record = json.loads(runtime.with_suffix('.source.json').read_text(encoding='utf8'))
        if hashlib.sha256(runtime.read_bytes()).hexdigest() != record['hash']['sha256']:
            raise ValueError('Runtime checksum mismatch')
        with zipfile.ZipFile(runtime) as embedded:
            required_runtime = {'python.exe', 'python313.zip', 'python313.dll', 'python313._pth'}
            if not required_runtime.issubset(embedded.namelist()):
                raise ValueError('Wrong embedded Python package')
            for name in embedded.namelist():
                if name.endswith('/'):
                    continue
                if Path(name).is_absolute() or '..' in Path(name).parts or '\\' in name:
                    raise ValueError('Unsafe runtime path')
                data = embedded.read(name)
                if name.endswith('._pth'):
                    data = data.replace(b'#import site', b'../scripts\n#import site')
                files['runtime/' + name] = data
        files['runtime/source.json'] = json.dumps(record, indent=2).encode()
    files['scripts/start_demo.py'] = (ROOT / 'scripts/start_demo.py').read_bytes()
    files['Start-DEAR.cmd']=b'@echo off\r\nsetlocal\r\nif exist "%~dp0runtime\\python.exe" (\r\n  "%~dp0runtime\\python.exe" "%~dp0scripts\\start_demo.py" --offline\r\n) else (\r\n  powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0Start.ps1"\r\n)\r\nif errorlevel 1 pause\r\n'
    files['scripts/serve_workspace.py'] = (ROOT / 'scripts/serve_workspace.py').read_bytes()
    files['scripts/workspace_configuration.py'] = (ROOT / 'scripts/workspace_configuration.py').read_bytes()
    files['Start.ps1'] = b'''param([int]$Port = 5212)
$ErrorActionPreference = 'Stop'
$launcher = Join-Path $PSScriptRoot 'scripts/start_demo.py'
$bundled = Join-Path $PSScriptRoot 'runtime/python.exe'
if (Test-Path -LiteralPath $bundled) {
    & $bundled $launcher --offline --port $Port
} elseif (Get-Command py -ErrorAction SilentlyContinue) {
    & py -3 $launcher --offline --port $Port
} elseif (Get-Command python -ErrorAction SilentlyContinue) {
    & python $launcher --offline --port $Port
} else { throw 'Python 3.11+ is required for this non-portable package.' }
exit $LASTEXITCODE
'''
    files['README.md'] = ("""# DEAR — bản demo offline

Giải nén toàn bộ vào thư mục có quyền ghi, rồi mở Start-DEAR.cmd.
Giữ cửa sổ server đang chạy; Ctrl+C để dừng. Không mở dist/index.html trực tiếp.
Mở http://127.0.0.1:5212 nếu trình duyệt không tự mở.

""" + ('Gói Windows x64 đã kèm Python; không cần cài Python hoặc Node.js.\n' if runtime else 'Gói này cần Python 3.11 trở lên.\n') + """
Cần Chrome hoặc Edge trên máy, bật tăng tốc đồ họa để xem 3D và xuất MP4.
Lần mở đầu kiểm tra SHA-256 của toàn bộ gói; nếu báo thiếu tệp, giải nén lại.
Nếu cổng bận, đóng server DEAR cũ hoặc chạy Start.ps1 -Port 5213.

Dữ liệu, Planet, ảnh hiện trường, DEM và font đều có sẵn.
""" + ('Nền Sentinel-2 và địa hình bao quanh được lưu cục bộ; phạm vi, nguồn và độ phân giải ở dist/offline-map/map.json. Ngoài phạm vi đóng gói là nền trung tính.\n' if local_map else 'Nền trực tuyến bị tắt khi offline; chỉ có nền khu vực cục bộ.\n') + """
Nền bối cảnh không thay thế ảnh Planet dùng đối chiếu hoặc DEM dùng đo đạc.
Ghi nhận/GIS lưu trên trình duyệt của máy này; không tự gửi tới máy khác.
Trước khi xóa phiên, xuất dữ liệu cần giữ. PDF dùng In / lưu PDF của trình duyệt.
Mang bản sao gói trên USB; thử trước trên đúng laptop, màn chiếu và chế độ ngắt mạng.

Dữ liệu nghiệp vụ demo có phần mô phỏng/chưa duyệt; xem nguồn trong ứng dụng.
Phiên bản, trạng thái nguồn và checksum từng tệp: release.json.
Giấy phép: licenses/ và runtime/LICENSE.txt.
""").encode('utf8')
    files['licenses/lucide.txt'] = (ROOT / 'vendor/lucide/LICENSE').read_bytes()
    lock = json.loads((ROOT / 'package-lock.json').read_text(encoding='utf-8'))
    for package_path, metadata in lock['packages'].items():
        if not package_path.startswith('node_modules/') or metadata.get('dev'):
            continue
        package = package_path.removeprefix('node_modules/')
        directory = ROOT / package_path
        for license_path in directory.glob('*'):
            if license_path.is_file() and license_path.name.lower().startswith(('license', 'copying', 'notice')):
                files['licenses/' + package + '/' + license_path.name] = license_path.read_bytes()
    revision = subprocess.run(['git', 'rev-parse', 'HEAD'], cwd=ROOT, capture_output=True, text=True, check=True).stdout.strip()
    dirty = subprocess.run(['git', 'status', '--porcelain', '--', '.'], cwd=ROOT,
                           capture_output=True, text=True, check=True).stdout.strip()
    release = {'createdAt': datetime.now(timezone.utc).isoformat(), 'sourceCommit': revision, 'sourceTreeDirty': bool(dirty), 'portableWindowsX64': bool(runtime), 'localMap': bool(local_map),
               'datasetVersion': manifest['datasetVersion'], 'dataKind': manifest['dataKind'], 'reviewStatus': manifest['reviewStatus'],
               'files': {name: hashlib.sha256(content).hexdigest() for name, content in files.items()}}
    files['release.json'] = json.dumps(release, indent=2).encode()
    destination.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(destination, 'w', zipfile.ZIP_DEFLATED) as archive:
        for name, content in files.items():
            archive.writestr(name, content)
    return release


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--dist', type=Path, default=ROOT / 'dist')
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--local-map', type=Path)
    parser.add_argument('--runtime', type=Path)
    args = parser.parse_args()
    result = package_workspace(args.dist, args.output, args.local_map, args.runtime)
    print(f'Packaged {len(result["files"])} files: {args.output}')
