"""Check the prepared scenario package before building or handing it over."""

import argparse
import hashlib
import json
import re
import shutil
from datetime import datetime
from pathlib import Path


PUBLIC = Path(__file__).resolve().parents[1] / "public"
MANIFEST = PUBLIC / "scenarios" / "che-tao" / "v0.1" / "manifest.json"


def fail(message: str) -> None:
    raise SystemExit(f"Dataset invalid: {message}")


def check_asset(path: Path, asset: dict) -> str | None:
    if not path.is_file():
        return f"missing file: {path}"
    if path.stat().st_size != asset["byteLength"]:
        return f"size mismatch: {path}"
    with path.open("rb") as source:
        digest = hashlib.file_digest(source, "sha256").hexdigest()
    if digest != asset["sha256"]:
        return f"checksum mismatch: {path}"
    return None


def main(prepare: bool = False) -> None:
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    if not isinstance(manifest, dict):
        fail("manifest must be an object")
    if type(manifest.get("schemaVersion")) is not int or manifest["schemaVersion"] != 1:
        fail("unsupported manifest version")
    if manifest.get("dataKind") not in {"synthetic", "historical", "operational"}:
        fail("invalid data kind")
    if manifest.get("reviewStatus") not in {"draft", "reviewed", "published"}:
        fail("invalid review status")
    for key in ("datasetVersion", "incidentId", "snapshotAt", "crs"):
        if not isinstance(manifest.get(key), str) or not manifest[key].strip():
            fail(f"missing {key}")
    if not re.fullmatch(r"EPSG:\d+", manifest["crs"]):
        fail("invalid CRS")
    try:
        if not re.fullmatch(r"\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}", manifest["snapshotAt"]):
            fail("invalid snapshotAt")
        datetime.fromisoformat(manifest["snapshotAt"])
    except ValueError:
        fail("invalid snapshotAt")
    if not isinstance(manifest.get("counts"), dict) or not isinstance(manifest.get("terrain"), dict):
        fail("counts and terrain must be objects")
    for key in ("communities", "roads", "hazards"):
        value = manifest.get("counts", {}).get(key)
        if type(value) is not int or value < 0:
            fail(f"invalid count: {key}")

    paths = set()
    assets = {}
    copies = []
    for key in ("glb", "grid", "metadata"):
        asset = manifest.get("terrain", {}).get(key)
        if not isinstance(asset, dict):
            fail(f"missing terrain asset: {key}")
        url = asset.get("url")
        if not isinstance(url, str) or not re.fullmatch(r"/terrain/[A-Za-z0-9._-]+", url) or ".." in url:
            fail(f"invalid asset path: {key}")
        if url in paths:
            fail(f"duplicate asset path: {url}")
        paths.add(url)
        if type(asset.get("byteLength")) is not int or asset["byteLength"] <= 0:
            fail(f"invalid asset size: {key}")
        if not isinstance(asset.get("sha256"), str) or not re.fullmatch(r"[0-9a-f]{64}", asset["sha256"]):
            fail(f"invalid asset checksum: {key}")
        path = PUBLIC / url.lstrip("/")
        if prepare:
            canonical = PUBLIC.parents[1] / path.name
            error = check_asset(canonical, asset)
            if error:
                fail(error)
            if check_asset(path, asset):
                copies.append((canonical, path))
        else:
            error = check_asset(path, asset)
            if error:
                fail(error)
        assets[key] = path

    # Verify every canonical source before changing generated public files.
    for source, destination in copies:
        destination.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(source, destination)

    metadata = json.loads(assets["metadata"].read_text(encoding="utf-8"))
    if manifest["crs"] != f"{metadata['crs']['authority']}:{metadata['crs']['code']}":
        fail("terrain CRS mismatch")
    if metadata["mesh"]["file"] != assets["glb"].name:
        fail("mesh reference mismatch")
    if metadata["grid"]["file"] != assets["grid"].name:
        fail("grid reference mismatch")

    print(f"Dataset valid: {manifest['datasetVersion']} ({len(assets)} verified assets, {len(copies)} copied)")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--prepare", action="store_true", help="Copy verified canonical assets into public/terrain")
    main(prepare=parser.parse_args().prepare)
