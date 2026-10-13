/** Short display code; the full UUID remains the persistent identifier. */
export function observationCode(id: string): string {
  return 'GN-' + id.replace(/[^a-z0-9]/gi, '').slice(0, 8).toUpperCase();
}
