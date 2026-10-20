/** Browser workspace budgets; keep parser, session and UI limits in sync. */
export const GEOMETRY_LIMITS = {
  features: 1_000,
  verticesPerFeature: 10_000,
  verticesPerWorkspace: 50_000,
  inputBytes: 5_000_000,
  filesPerBatch: 10,
  batchBytes: 20_000_000,
  storageBytes: 4_000_000
} as const;

export const textBytes = (value: string): number => new TextEncoder().encode(value).byteLength;
