import { describe, it, expect } from "vitest";
import { readFieldVoice, validVoice, voiceLimit } from "./voice";
import { validateObservation, annotateRecord, observationOf } from "./model";
import { restoreGeometryRecords } from "../geodata/geometrySession";
describe("field voice", () => {
  it("retains an audio-only observation through storage without changing its location or status", async () => {
    const bytes = new Uint8Array([0x1a, 0x45, 0xdf, 0xa3, 0, 1, 2, 3]);
    const voice = await readFieldVoice(
      new Blob([bytes], { type: "audio/webm;codecs=opus" }),
      2,
    );
    expect(validVoice(voice)).toBe(true);
    expect(voice.mime).toBe("audio/webm");
    expect(
      (await readFieldVoice(new Blob([bytes], { type: "video/webm" }), 2)).mime,
    ).toBe("audio/webm");
    const observation = validateObservation({
      schema: "field-observation/v1",
      kind: "other",
      note: "",
      observedAt: "",
      observer: "A",
      accuracyM: null,
      status: "unreviewed",
      updatedAt: "2026-10-14T00:00:00Z",
      photos: [],
      voice,
    });
    const record = annotateRecord(
      {
        id: "report",
        name: "Report",
        visible: true,
        role: "reference",
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
      },
      observation,
    );
    expect(observationOf(restoreGeometryRecords([record])[0])?.voice).toEqual(
      voice,
    );
    expect(record.feature.geometry).toEqual({
      type: "Point",
      coordinates: [104, 21],
    });
    expect(record.role).toBe("reference");
  });
  it("rejects remote URLs, mismatched byte counts, long clips and oversized content", async () => {
    const voice = await readFieldVoice(
      new Blob([new Uint8Array([0x1a, 0x45, 0xdf, 0xa3])], {
        type: "audio/webm",
      }),
      1,
    );
    for (const invalid of [
      { ...voice, data: "https://example.com/audio.webm" },
      { ...voice, bytes: voice.bytes + 1 },
      { ...voice, duration: 61 },
      { ...voice, bytes: voiceLimit.bytes + 1 },
      { ...voice, mime: "text/html" },
    ])
      expect(validVoice(invalid)).toBe(false);
  });
  it("checks media signatures and refuses active or unbounded uploads", async () => {
    await expect(
      readFieldVoice(new Blob(["<script>"], { type: "audio/webm" }), 1),
    ).rejects.toThrow();
    await expect(
      readFieldVoice(
        new Blob([new Uint8Array(voiceLimit.bytes + 1)], { type: "audio/wav" }),
        1,
      ),
    ).rejects.toThrow();
  });
});
