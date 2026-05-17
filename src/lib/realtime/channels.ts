/**
 * Channel naming convention.
 *
 * Channel slug: `run:<runId>` — per-run event firehose used by the
 * SSE bridge and orchestrator publishers.
 *
 * Additional channel kinds (automation-level, user-level) will be
 * added as consumers land; keeping the registry lean prevents dead
 * scaffolding.
 */

export function runChannel(runId: string): string {
  return `run:${runId}`;
}
