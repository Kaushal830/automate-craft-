/**
 * Adapter registry.
 *
 * Maps adapter name → concrete `ExecutionAdapter` instance. Registration
 * is lazy (singleton per name) so we don't initialize n8n / future
 * adapters until they're needed.
 *
 * The registry is the only place that knows ALL adapters. Callers ask
 * for one by name (or `default`) and stay agnostic.
 *
 * Selection order:
 *   1. Explicit name passed by caller.
 *   2. `EXECUTION_ADAPTER` env var.
 *   3. `"n8n"` default.
 *
 * Adding a new adapter:
 *   1. Implement `ExecutionAdapter` in `adapters/<name>/`.
 *   2. Add a case in `instantiateAdapter()`.
 *   3. Document the env value in env.ts.
 */

import type { ExecutionAdapter } from "./types";
import { env } from "@/lib/env";
import { N8nAdapter } from "./n8n";

export type AdapterName = "n8n" | "temporal" | "inngest";

const cache = new Map<AdapterName, ExecutionAdapter>();

function instantiateAdapter(name: AdapterName): ExecutionAdapter {
  switch (name) {
    case "n8n":
      return new N8nAdapter();
    case "temporal":
      throw new Error("Temporal adapter not implemented yet.");
    case "inngest":
      throw new Error("Inngest adapter not implemented yet.");
  }
}

function getOrCreate(name: AdapterName): ExecutionAdapter {
  let adapter = cache.get(name);
  if (adapter) return adapter;
  adapter = instantiateAdapter(name);
  cache.set(name, adapter);
  return adapter;
}

/**
 * Return the configured adapter (env-driven). Falls back to `"n8n"`.
 */
export function getDefaultAdapter(): ExecutionAdapter {
  const requested = (env.executionAdapter ?? "n8n") as AdapterName;
  return getOrCreate(requested);
}

/** Return a specific adapter by name. Throws for unknown names. */
export function getAdapter(name: AdapterName): ExecutionAdapter {
  return getOrCreate(name);
}
