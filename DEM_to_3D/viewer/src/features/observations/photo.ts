import { photoLimits, type FieldPhoto } from './model';

/** Read only uploaded bytes. EXIF is provenance, never an automatic change to the observed location. */
export async function readFieldPhoto(file: File): Promise<FieldPhoto> {
  if (
    !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) ||
    file.size <= 0 ||
    file.size > photoLimits.bytes
  )
    throw new Error('photo-file');
  const raw = new Uint8Array(await file.arrayBuffer());
  const signature = String.fromCharCode(...raw.slice(0, 12));
  const valid =
    file.type === 'image/jpeg'
      ? raw[0] === 255 && raw[1] === 216 && raw[2] === 255
      : file.type === 'image/png'
        ? raw[0] === 137 && signature.slice(1, 4) === 'PNG'
        : signature.slice(0, 4) === 'RIFF' && signature.slice(8, 12) === 'WEBP';
  if (!valid) throw new Error('photo-file');
  const hash = await crypto.subtle.digest('SHA-256', raw);
  const sha256 = Array.from(new Uint8Array(hash), (v) =>
    v.toString(16).padStart(2, '0')
  ).join('');
  const exif: Record<string, string | number> = {};
  try {
    const parser = await import('exifr');
    const tags = await parser.parse(file, {
      pick: [
        'Make',
        'Model',
        'DateTimeOriginal',
        'OffsetTimeOriginal',
        'FNumber',
        'ExposureTime',
        'ISO',
        'FocalLength',
        'GPSLatitude',
        'GPSLatitudeRef',
        'GPSLongitude',
        'GPSLongitudeRef',
        'GPSImgDirection',
        'GPSImgDirectionRef',
        'Orientation'
      ],
      reviveValues: false
    });
    for (const key of [
      'Make',
      'Model',
      'DateTimeOriginal',
      'OffsetTimeOriginal',
      'FNumber',
      'ExposureTime',
      'ISO',
      'FocalLength',
      'GPSImgDirection',
      'GPSImgDirectionRef',
      'Orientation',
      'latitude',
      'longitude'
    ]) {
      const value = tags?.[key];
      if (typeof value === 'string') exif[key] = value.slice(0, 200);
      else if (typeof value === 'number' && Number.isFinite(value))
        exif[key] = value;
    }
  } catch {
    /* A displayable photo may have no readable EXIF. */
  }
  const bitmap = await createImageBitmap(file);
  try {
    if (bitmap.width * bitmap.height > 40_000_000)
      throw new Error('photo-dimensions');
    const ratio = Math.min(1, 1280 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * ratio));
    canvas.height = Math.max(1, Math.round(bitmap.height * ratio));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('photo-decode');
    context.fillStyle = '#fff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    let preview = canvas.toDataURL('image/jpeg', 0.8);
    if (preview.length > photoLimits.previewChars)
      preview = canvas.toDataURL('image/jpeg', 0.55);
    if (preview.length > photoLimits.previewChars)
      throw new Error('photo-preview');
    return {
      id: crypto.randomUUID(),
      name: file.name.slice(0, 200),
      mime: file.type,
      bytes: file.size,
      width: bitmap.width,
      height: bitmap.height,
      preview,
      sha256,
      exif,
      addedAt: new Date().toISOString()
    };
  } finally {
    bitmap.close();
  }
}
