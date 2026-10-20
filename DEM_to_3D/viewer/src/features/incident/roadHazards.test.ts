import { describe, it, expect } from "vitest";
import {
  roadHazardIds,
  roadsForHazard,
  setRoadHazards,
  setHazardRoads,
} from "./roadHazards";
import {
  validEdit,
  applyScenarioEdits,
  type ScenarioEdit,
} from "../access/scenarioEdits";
import { validateIncidentPacket } from "../../data/incidentPacket";
import { deriveIncidentWorkspace } from "./deriveIncidentWorkspace";
import source from "../../data/fixtures/che-tao-network.json";
const packet = () => validateIncidentPacket(structuredClone(source));
const edit = (id: string, from: string[], to: string[]): ScenarioEdit => ({
  id: "edit-1",
  at: "2026-10-14T06:00:00Z",
  author: { id: "manager", name: "Coordinator" },
  target: { type: "hazard", id, name: "Hazard" },
  change: { kind: "links", from, to },
  note: "Field report",
});
describe("road hazard relationships", () => {
  it("retains legacy IDs and records multiple hazards without changing road status", () => {
    const p = packet(),
      r = p.roads.find((r) => r.hz && !r.hazardIds)!;
    const updated = setRoadHazards(p.roads, r.id, [
      r.hz!,
      p.hazards.find((h) => h.id !== r.hz)!.id,
    ]);
    expect(roadHazardIds(updated.find((v) => v.id === r.id)!)).toHaveLength(2);
    expect(updated.find((v) => v.id === r.id)?.status).toBe(r.status);
    expect(roadHazardIds(r)).toEqual([r.hz]);
  });
  it("removing one hazard never removes a different hazard on the same road", () => {
    const p = packet(),
      r = p.roads[0],
      h = p.hazards[0],
      other = p.hazards[1];
    const updated = setRoadHazards(p.roads, r.id, [h.id, other.id]);
    expect(
      roadHazardIds(
        setHazardRoads(updated, h.id, []).find((v) => v.id === r.id)!,
      ),
    ).toEqual([other.id]);
  });
  it("one hazard links to many roads and survives a prepared revision", () => {
    const p = packet(),
      h = p.hazards[0],
      ids = p.roads.slice(0, 2).map((r) => r.id);
    const e = edit(
      h.id,
      roadsForHazard(p.roads, h.id).map((r) => r.id),
      ids,
    );
    expect(validEdit(e)).toBe(true);
    const updated = deriveIncidentWorkspace(p, true, [e]);
    expect(roadsForHazard(updated.roads, h.id).map((r) => r.id)).toEqual(ids);
    expect(p.roads).toEqual(packet().roads);
  });
  it("rejects unknown road links as a whole and validates duplicate IDs", () => {
    const p = packet(),
      h = p.hazards[0],
      from = roadsForHazard(p.roads, h.id).map((r) => r.id);
    expect(
      applyScenarioEdits(p, [edit(h.id, from, ["missing"])]).roads,
    ).toEqual(p.roads);
    expect(validEdit(edit(h.id, from, [p.roads[0].id, p.roads[0].id]))).toBe(
      false,
    );
  });
  it("moving a linked hazard requests review while preserving reported road restrictions", () => {
    const p = packet(),
      h = p.hazards.find((h) => roadsForHazard(p.roads, h.id).length)!;
    const out = applyScenarioEdits(p, [
      {
        ...edit(h.id, [], []),
        change: {
          kind: "move",
          from: h.projected,
          to: { x: h.projected.x + 500, y: h.projected.y },
        },
      },
    ]);
    expect(out.hazards.find((v) => v.id === h.id)?.roadLinksNeedReview).toBe(
      true,
    );
    expect(out.roads).toEqual(p.roads);
  });
});
