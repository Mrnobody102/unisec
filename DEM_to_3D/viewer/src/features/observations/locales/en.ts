import type { vi } from './vi';
export const en: Record<keyof typeof vi, string> = {
  viewPhoto: 'View photo',
  removePhoto: 'Remove photo',
  capturedAt: 'Captured at',
  camera: 'Camera',
  cameraGps: 'Photo GPS',
  metadata: 'File and camera details',
  dimensions: 'Image dimensions',
  fileSize: 'File size',
  noExif: 'No readable EXIF metadata.',
  differentTime:
    'Photo time differs from the report time, or timezone information is insufficient to compare them.',
  differentLocation: 'Photo GPS differs from the reported location.'
};
