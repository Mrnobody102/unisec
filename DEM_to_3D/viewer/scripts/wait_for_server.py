"""Wait for a successful HTTP response before starting browser checks."""
import argparse
import time
from urllib.error import URLError
from urllib.request import urlopen


def wait_for_server(url: str, timeout: float = 15) -> None:
    deadline = time.monotonic() + timeout
    while True:
        try:
            with urlopen(url, timeout=min(2, max(.1, deadline - time.monotonic()))) as response:
                if response.status == 200:
                    return
        except (URLError, TimeoutError, OSError):
            pass
        if time.monotonic() >= deadline:
            raise TimeoutError(f'Static server did not become ready within {timeout:g}s: {url}')
        time.sleep(.1)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('url')
    parser.add_argument('--timeout', type=float, default=15)
    args = parser.parse_args()
    wait_for_server(args.url, args.timeout)
