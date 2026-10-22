"""Download and verify the official Windows x64 embedded Python release once."""
import argparse
import hashlib
import json
import urllib.request
import concurrent.futures
import re
from pathlib import Path

VERSION = '3.13.17'


def download_archive(url):
    # Bounded range requests also work behind proxies that time out on a full ZIP.
    chunk_size = 1024 * 1024

    def chunk(start, total=None):
        end = min(start + chunk_size, total) - 1 if total else start + chunk_size - 1
        for attempt in range(3):
            try:
                request = urllib.request.Request(url + f'?dear-range={start}-{end}-{attempt}', headers={'Range': f'bytes={start}-{end}'})
                with urllib.request.urlopen(request, timeout=20) as response:
                    data = response.read()
                    if response.status == 200:
                        return data, len(data)
                    match = re.fullmatch(r'bytes (\d+)-(\d+)/(\d+)', response.headers.get('Content-Range', ''))
                    if not match or int(match[1]) != start or int(match[2]) != end or len(data) != end-start+1:
                        raise ValueError('Incomplete Python runtime download')
                    return data, int(match[3])
            except (OSError, ValueError):
                if attempt == 2:
                    raise

    first, total = chunk(0)
    if len(first) == total:
        return first
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        rest = list(pool.map(lambda start: chunk(start, total)[0], range(len(first), total, chunk_size)))
    return first + b''.join(rest)


def prepare(destination):
    base = f'https://www.python.org/ftp/python/{VERSION}/'
    name = f'python-{VERSION}-embed-amd64.zip'
    url = base + name
    # The SPDX record describes the exact archive, including its SHA-256.
    with urllib.request.urlopen(url + '.spdx.json', timeout=30) as response:
        manifest = json.load(response)
    package = next(p for p in manifest['packages'] if p.get('downloadLocation') == url)
    digest = next(c['checksumValue'] for c in package['checksums'] if c['algorithm'] == 'SHA256')
    destination = Path(destination)
    destination.parent.mkdir(parents=True, exist_ok=True)
    if destination.exists():
        data = destination.read_bytes()
    else:
        data = download_archive(url)
    if hashlib.sha256(data).hexdigest() != digest:
        raise ValueError('Python runtime checksum mismatch')
    destination.write_bytes(data)
    record = {'url': url, 'version': VERSION, 'hash': {'sha256': digest}, 'provenance': url + '.spdx.json'}
    destination.with_suffix('.source.json').write_text(json.dumps(record, indent=2) + '\n', encoding='utf8')
    print('Verified official embedded Python ' + VERSION + ': ' + str(destination))
    return destination


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, required=True)
    prepare(parser.parse_args().output)
