import type { ProfileSample } from './profile';

export type SegmentSlope = {
  fromIndex: number;
  toIndex: number;
  distance: number;
  deltaElevation: number;
  percent: number;
  angle: number;
};

export type RegressionSlope = { percent: number; angle: number; sampleCount: number };

export function calculateSegmentSlopes(samples: ProfileSample[], epsilon = 1e-9): SegmentSlope[] {
  const slopes: SegmentSlope[] = [];
  for (let index = 0; index < samples.length - 1; index += 1) {
    const left = samples[index];
    const right = samples[index + 1];
    if (left.elevation === undefined || right.elevation === undefined) continue;
    const distance = right.distance - left.distance;
    if (distance <= epsilon) continue;
    const deltaElevation = right.elevation - left.elevation;
    const percent = deltaElevation / distance * 100;
    slopes.push({ fromIndex: left.index, toIndex: right.index, distance, deltaElevation, percent, angle: Math.atan2(deltaElevation, distance) * 180 / Math.PI });
  }
  return slopes;
}

function validWindow(samples: ProfileSample[], start: number, end: number): ProfileSample[] {
  return samples.filter((sample) => sample.elevation !== undefined && sample.distance >= start && sample.distance <= end);
}

function regression(points: ProfileSample[], epsilon: number): RegressionSlope | null {
  if (points.length < 2) return null;
  const meanX = points.reduce((sum, point) => sum + point.distance, 0) / points.length;
  const meanY = points.reduce((sum, point) => sum + point.elevation!, 0) / points.length;
  const numerator = points.reduce((sum, point) => sum + (point.distance - meanX) * (point.elevation! - meanY), 0);
  const denominator = points.reduce((sum, point) => sum + (point.distance - meanX) ** 2, 0);
  if (denominator <= epsilon) return null;
  const slope = numerator / denominator;
  return { percent: slope * 100, angle: Math.atan(slope) * 180 / Math.PI, sampleCount: points.length };
}

export function regressionSlopeAt(
  samples: ProfileSample[],
  distance: number,
  windowM: number,
  side: 'approach' | 'departure',
  epsilon = 1e-9,
): RegressionSlope | null {
  if (!Number.isFinite(windowM) || windowM <= 0) return null;
  const start = side === 'approach' ? distance - windowM : distance;
  const end = side === 'approach' ? distance : distance + windowM;
  const points = validWindow(samples, start, end);
  // A window must be contiguous: don't regress across a nodata gap.
  if (!points.length || points.some((point, index) => index > 0 && point.index !== points[index - 1].index + 1)) return null;
  return regression(points, epsilon);
}
