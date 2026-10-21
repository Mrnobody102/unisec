"""Prepare the field photos of the main landslide points for DEAR.

Each phone photo becomes a web image and a thumbnail (orientation applied, metadata stripped from
the file). Capture time, camera position, accuracy and heading stay in photos.json as provenance.

  python tools/prepare_field_photos.py "<resources/dear/Ảnh điểm sạt chính>" viewer/public/scenarios/che-tao/field-photos

Needs Pillow and pillow-heif. Update the manifest checksum of photos.json afterwards.
"""
import argparse
import hashlib
import json
from pathlib import Path

import pillow_heif
from PIL import Image, ImageOps
from PIL.ExifTags import GPSTAGS, TAGS

pillow_heif.register_heif_opener()

# Folder -> incident hazard and the survey point name in resources/dear/CheTao-Landslide-Scars.kml.
POINTS = {
    'Scar 1': ('scar-1', 'LS-01', 'Scar 1 [0830]'),
    'Scar 2': ('scar-2', 'LS-02', 'Scar 2 [0850]'),
    'Scar 3': ('scar-3', 'LS-03', 'Scar 3 [0926]'),
}
SIZES = {'image': (1280, 70), 'thumb': (320, 68)}


def degrees(value, ref):
    result = float(value[0]) + float(value[1]) / 60 + float(value[2]) / 3600
    return -result if ref in ('S', 'W') else result


def write(image: Image.Image, path: Path, size: int, quality: int) -> dict:
    copy = image.copy()
    copy.thumbnail((size, size), Image.LANCZOS)
    copy.save(path, 'WEBP', quality=quality, method=6)  # no exif= argument: metadata is not copied
    data = path.read_bytes()
    return {'url': path.name, 'byteLength': len(data), 'sha256': hashlib.sha256(data).hexdigest(), 'width': copy.width, 'height': copy.height}


def main(source: Path, out: Path) -> None:
    out.mkdir(parents=True, exist_ok=True)
    points = []
    for folder, (point_id, hazard_id, survey_name) in POINTS.items():
        photos = []
        for path in sorted((source / folder).glob('*.HEIC')):
            raw = Image.open(path)
            exif = raw.getexif()
            camera = {TAGS.get(k, k): v for k, v in exif.items()}
            capture = {TAGS.get(k, k): v for k, v in exif.get_ifd(0x8769).items()}
            gps = {GPSTAGS.get(k, k): v for k, v in exif.get_ifd(0x8825).items()}
            image = ImageOps.exif_transpose(raw).convert('RGB')
            stem = f'{point_id}-{path.stem.lower()}'
            date, clock = str(capture['DateTimeOriginal']).split(' ')
            photos.append({
                'name': path.stem,
                'capturedAt': f"{date.replace(':', '-')}T{clock}{capture.get('OffsetTimeOriginal', '+07:00')}",
                'latitude': round(degrees(gps['GPSLatitude'], gps['GPSLatitudeRef']), 6),
                'longitude': round(degrees(gps['GPSLongitude'], gps['GPSLongitudeRef']), 6),
                'accuracyM': round(float(gps['GPSHPositioningError']), 1) if 'GPSHPositioningError' in gps else None,
                'headingDeg': round(float(gps['GPSImgDirection'])) % 360 if 'GPSImgDirection' in gps else None,
                'camera': ' '.join(str(v) for v in (camera.get('Make'), camera.get('Model')) if v),
                **{key: write(image, out / f'{stem}.{key}.webp', *SIZES[key]) for key in SIZES},
            })
            print(stem, photos[-1]['image']['byteLength'] // 1024, 'KB')
        points.append({'id': point_id, 'hazardId': hazard_id, 'surveyName': survey_name, 'photos': photos})
    # LF on every OS: the manifest checksum must match a Linux checkout (.gitattributes eol=lf).
    (out / 'photos.json').write_bytes((json.dumps({'points': points}, ensure_ascii=False, indent=1) + '\n').encode('utf-8'))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument('source', type=Path)
    parser.add_argument('out', type=Path)
    arguments = parser.parse_args()
    main(arguments.source, arguments.out)
