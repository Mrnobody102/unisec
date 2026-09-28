import type { ProfileSample } from './profile';

export type ExtremaKind = 'peak' | 'valley';

export type ExtremaPoint = {
  kind: ExtremaKind;
  index: number;
  distance: number;
  elevation: number;
  smoothedElevation: number;
  approachSlope?: { percent: number; angle: number } | null;
  departureSlope?: { percent: number; angle: number } | null;
};

function contiguousSegments(samples: ProfileSample[]): number[][] {
  const result: number[][] = [];
  let current: number[] = [];
  samples.forEach((sample) => {
    if (sample.elevation === undefined) {
      if (current.length) result.push(current);
      current = [];
    } else {
      current.push(sample.index);
    }
  });
  if (current.length) result.push(current);
  return result;
}

function sameSegment(samples: ProfileSample[], left: number, right: number): boolean {
  return contiguousSegments(samples).some((segment) => segment.includes(left) && segment.includes(right));
}

/** Centered moving average. The half-window is measured in metres and never crosses nodata. */
export function smoothProfile(samples: ProfileSample[], windowM: number): Array<number | undefined> {
  if (!Number.isFinite(windowM) || windowM <= 0) return samples.map((sample) => sample.elevation);
  return samples.map((sample, index) => {
    if (sample.elevation === undefined) return undefined;
    const values = samples
      .filter((candidate) => candidate.elevation !== undefined)
      .filter((candidate) => Math.abs(candidate.distance - sample.distance) <= windowM / 2)
      .filter((candidate) => sameSegment(samples, candidate.index, index))
      .map((candidate) => candidate.elevation!);
    return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : undefined;
  });
}

function prominence(values: Array<number | undefined>, index: number, kind: ExtremaKind, segment: number[]): number {
  const position = segment.indexOf(index);
  if (position < 0) return 0;
  const left = segment.slice(0, position).map((item) => values[item]).filter((value): value is number => value !== undefined);
  const right = segment.slice(position + 1).map((item) => values[item]).filter((value): value is number => value !== undefined);
  if (!left.length || !right.length) return 0;
  return kind === 'peak'
    ? values[index]! - Math.max(Math.min(...left), Math.min(...right))
    : Math.min(Math.max(...left), Math.max(...right)) - values[index]!;
}

function refineRawIndex(samples: ProfileSample[], segment: number[], candidateIndex: number, kind: ExtremaKind, windowM: number): number {
  const candidateDistance = samples[candidateIndex].distance;
  const radius = Math.max(windowM / 2, 0);
  const nearby = segment.filter((index) => Math.abs(samples[index].distance - candidateDistance) <= radius);
  if (!nearby.length) return candidateIndex;
  const refined = nearby.reduce((best, index) => {
    const value = samples[index].elevation!;
    const bestValue = samples[best].elevation!;
    if (kind === 'peak' && value > bestValue) return index;
    if (kind === 'peak' && value < bestValue) return best;
    if (kind === 'valley' && value < bestValue) return index;
    if (kind === 'valley' && value > bestValue) return best;
    return Math.abs(samples[index].distance - candidateDistance) < Math.abs(samples[best].distance - candidateDistance) ? index : best;
  }, nearby[0]);
  return refined;
}

export function detectExtrema(
  samples: ProfileSample[],
  options: { smoothingWindowM: number; minProminenceM: number; minDistanceM: number },
): ExtremaPoint[] {
  const smoothed = smoothProfile(samples, options.smoothingWindowM);
  const result: ExtremaPoint[] = [];
  contiguousSegments(samples).forEach((segment) => {
    const segmentResult: ExtremaPoint[] = [];
    for (let position = 1; position < segment.length - 1; position += 1) {
      const index = segment[position];
      const before = smoothed[segment[position - 1]];
      const current = smoothed[index];
      const after = smoothed[segment[position + 1]];
      if (before === undefined || current === undefined || after === undefined) continue;
      const kind: ExtremaKind | undefined = before < current && current >= after
        ? 'peak'
        : before > current && current <= after
          ? 'valley'
          : undefined;
      if (!kind || prominence(smoothed, index, kind, segment) < options.minProminenceM) continue;
      const rawIndex = refineRawIndex(samples, segment, index, kind, options.smoothingWindowM);
      const candidate: ExtremaPoint = {
        kind,
        index: rawIndex,
        distance: samples[rawIndex].distance,
        elevation: samples[rawIndex].elevation!,
        smoothedElevation: current,
      };
      const previous = segmentResult[segmentResult.length - 1];
      if (previous && candidate.distance - previous.distance < options.minDistanceM) {
        const replace = kind === 'peak'
          ? candidate.smoothedElevation > previous.smoothedElevation
          : candidate.smoothedElevation < previous.smoothedElevation;
        if (replace) segmentResult[segmentResult.length - 1] = candidate;
      } else {
        segmentResult.push(candidate);
      }
    }
    result.push(...segmentResult);
  });
  return result;
}

export function extremaWithSlopes(
  extrema: ExtremaPoint[],
  slopeAt: (distance: number, side: 'approach' | 'departure') => { percent: number; angle: number } | null,
): ExtremaPoint[] {
  return extrema.map((item) => ({ ...item, approachSlope: slopeAt(item.distance, 'approach'), departureSlope: slopeAt(item.distance, 'departure') }));
}
