import { describe, expect, it } from "vitest";
import { initialRoadSegments } from "../data/fixtures/networkScenario";
import { analyseRoadJourney } from "../features/routes/journeyAnalysis";
import { roadProjected } from "../features/routes/selectedRoadJourney";
import { routeRoadDisplay } from "./routeRoadDisplay";
describe("partial journey map geometry", () => {
  const a = { origin: roadProjected(21.77797, 104.03868), source: "map" },
    b = { origin: roadProjected(21.75074, 104.05062), source: "map" };
  const route = analyseRoadJourney(initialRoadSegments, a, b, true).route!;
  it("highlights the selected parts, retains their source links, and preserves warning status", () => {
    const display = routeRoadDisplay(initialRoadSegments, route, true),
      selected = display.filter((r) => r.routeSelected);
    expect(selected.map((r) => r.road.id).sort()).toEqual(
      route.segs.map((r) => r.id).sort(),
    );
    const first = selected.find((r) => r.road.sourceRoadId === "E13")!;
    expect(first.road.points[0]).toEqual(route.points[0]);
    expect(first.sourceId).toBe("E13");
    expect(first.road.status).toBe("uncertain");
    expect(display.find((r) => r.road.id === "E13")?.routeSelected).toBe(false);
  });
  it("keeps only contextual roads when the route layer is hidden", () => {
    const display = routeRoadDisplay(initialRoadSegments, route, false);
    expect(display).toHaveLength(initialRoadSegments.length);
    expect(display.every((r) => !r.routeSelected)).toBe(true);
  });
});
