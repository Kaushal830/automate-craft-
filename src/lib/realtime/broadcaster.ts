/**
 * In-process pub/sub broadcaster with Postgres LISTEN/NOTIFY hook.
 *
 * Phase 4 ships in-process EventEmitter — works for a single Next.js
 * server instance. The interface is shaped so Phase 5 can swap in a
 * Postgres LISTEN/NOTIFY bridge (or Redis pub/sub) without changing
 * publishers or subscribers.
 *
 * Wire format (`RealtimeEvent`):
 *   { id, channel, kind, payload, ts }
 *
 *   id      — UUID, used for SSE `id:` header so clients can resume.
 *   channel — see `channels.ts`.
 *   kind    — application-defined event type ("step.started", etc.).
 *   payload — JSON-serializable body.
 *   ts      — epoch ms.
 */

import { EventEmitter } from "node:events";
import { createLogger } from "@/lib/logger";

const log = createLogger("realtime/broadcaster");

export type RealtimeEvent = {
  id: string;
  channel: string;
  kind: string;
  payload: Record<string, unknown>;
  ts: number;
};

export type RealtimeSubscriber = (event: RealtimeEvent) => void;

/**
 * Singleton EventEmitter — one per process. Survives across HMR
 * because we cache it on `globalThis`.
 */
const GLOBAL_KEY = "__automatecraft_realtime_broadcaster__";

type GlobalBag = typeof globalThis & {
  [GLOBAL_KEY]?: EventEmitter;
};

function getEmitter(): EventEmitter {
  const bag = globalThis as GlobalBag;
  if (!bag[GLOBAL_KEY]) {
    const emitter = new EventEmitter();
    emitter.setMaxListeners(1000); // many concurrent SSE clients
    bag[GLOBAL_KEY] = emitter;
  }
  return bag[GLOBAL_KEY]!;
}

/* ─── Publish ────────────────────────────────────────────────────── */

export type PublishInput = {
  channel: string;
  kind: string;
  payload: Record<string, unknown>;
};

export function publish(input: PublishInput): RealtimeEvent {
  const event: RealtimeEvent = {
    id: crypto.randomUUID(),
    channel: input.channel,
    kind: input.kind,
    payload: input.payload,
    ts: Date.now(),
  };
  log.debug("publish", { channel: event.channel, kind: event.kind });
  getEmitter().emit(event.channel, event);
  return event;
}

/* ─── Subscribe ──────────────────────────────────────────────────── */

export function subscribe(channel: string, handler: RealtimeSubscriber): () => void {
  const emitter = getEmitter();
  emitter.on(channel, handler);
  return () => {
    emitter.off(channel, handler);
  };
}

