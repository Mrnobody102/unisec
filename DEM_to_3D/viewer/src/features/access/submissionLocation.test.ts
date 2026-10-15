import { describe, it, expect } from "vitest";
import {
  newSubmission,
  submissionOf,
  submissionKey,
  submissionLocationLabel,
} from "./submissions";
import type { GeometryRecord } from "../../geo/vector/types";
const identity = {
  id: "resident:a",
  name: "A",
  role: "resident" as const,
  communityId: null,
};
const record: GeometryRecord = {
  id: "a",
  name: "Report",
  role: "reference",
  visible: true,
  source: {
    name: "Resident",
    format: "coordinate",
    importedAt: "2026-10-14T00:00:00Z",
  },
  feature: {
    type: "Feature",
    geometry: { type: "Point", coordinates: [104, 21] },
    properties: {},
  },
};
describe("approximate report location", () => {
  it("requires an explicit village identifier and preserves the source after reload", () => {
    const submission = newSubmission(identity, "community");
    expect(
      submissionOf({
        ...record,
        feature: {
          ...record.feature,
          properties: { [submissionKey]: submission },
        },
      }),
    ).toBeNull();
    const approximate = {
      ...record,
      feature: {
        ...record.feature,
        properties: {
          [submissionKey]: { ...submission, locationCommunityId: "village-a" },
        },
      },
    };
    expect(
      submissionOf(JSON.parse(JSON.stringify(approximate)))?.locationSource,
    ).toBe("community");
    expect(submissionLocationLabel(approximate, "vi")).toContain("gần đúng");
  });
  it("never labels a GPS or map point as a village approximation", () => {
    const precise = {
      ...record,
      feature: {
        ...record.feature,
        properties: { [submissionKey]: newSubmission(identity, "device") },
      },
    };
    expect(submissionLocationLabel(precise, "vi")).toBe("");
  });
});
