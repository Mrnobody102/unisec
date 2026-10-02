import type { ProfileSample, SurfaceProfile } from './profile';

const measured = (sample: ProfileSample): boolean => sample.elevation !== undefined && Number.isFinite(sample.elevation) && !sample.gapFilled;

export function nearestProfileSample(profile: SurfaceProfile, distance: number): ProfileSample {
  return profile.samples.reduce((nearest, sample) => Math.abs(sample.distance - distance) < Math.abs(nearest.distance - distance) ? sample : nearest);
}

/** Signed rise/run from adjacent valid DEM samples, never across a missing run. */
export function profileGrade(profile: SurfaceProfile, index: number): number | undefined {
  const a = profile.samples[index === profile.samples.length - 1 ? index - 1 : index];
  const b = profile.samples[index === profile.samples.length - 1 ? index : index + 1];
  if (!a || !b || !measured(a) || !measured(b) || b.distance <= a.distance) return undefined;
  return 100 * (b.elevation! - a.elevation!) / (b.distance - a.distance);
}

export function profileMetrics(profile: SurfaceProfile) {
  const elevations = profile.samples.filter(measured).map(s => s.elevation!);
  let ascent = 0, descent = 0, coveredLength = 0, maxGrade = 0;
  for (let i = 1; i < profile.samples.length; i++) {
    const a = profile.samples[i - 1], b = profile.samples[i];
    if (!measured(a) || !measured(b)) continue;
    const length = b.distance - a.distance;
    if (length <= 0) continue;
    const delta = b.elevation! - a.elevation!;
    coveredLength += length;
    ascent += Math.max(delta, 0);
    descent += Math.max(-delta, 0);
    maxGrade = Math.max(maxGrade, Math.abs(100 * delta / length));
  }
  return {
    min: elevations.length ? Math.min(...elevations) : undefined,
    max: elevations.length ? Math.max(...elevations) : undefined,
    ascent, descent, maxGrade, complete: profile.samples.every(measured),
    coverage: profile.length > 0 ? coveredLength / profile.length : (elevations.length ? 1 : 0),
  };
}
