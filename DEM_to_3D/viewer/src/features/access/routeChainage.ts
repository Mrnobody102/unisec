import type { Locale, ScenarioRoute } from '../../types/dear';

/** Where each section of a route lies, in km from the route's start: what a resident can find on the road. */
export function routeChainage(route: ScenarioRoute | null | undefined): Map<string, [from: number, to: number]> {
  const out = new Map<string, [number, number]>();
  let km = 0;
  for (const road of route?.segs ?? []) { out.set(road.id, [km, km + road.len]); km += road.len; }
  return out;
}

export function kmRange([from, to]: [number, number], locale: Locale): string {
  const f = (value: number) => value.toLocaleString(locale === 'en' ? 'en-GB' : 'vi-VN', { maximumFractionDigits: 1 });
  return `Km ${f(from)}–${f(to)}`;
}
