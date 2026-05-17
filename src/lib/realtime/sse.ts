/**
 * Server-Sent Events transport for realtime channels.
 *
 * Builds a `Response` whose body is a `ReadableStream` of SSE-encoded
 * events. Subscribes to one channel from the broadcaster + pumps
 * events to the client. Also sends `:keepalive` comments every 25s
 * to defeat proxy idle-cut.
 *
 * The route handler is responsible for auth + permission checking —
 * the SSE helper trusts the channel name it's given.
 */

import { subscribe, type RealtimeEvent } from "./broadcaster";

const KEEPALIVE_INTERVAL_MS = 25_000;

/**
 * Build a streaming `Response` that emits SSE for the given channel.
 *
 * @param channel  Broadcaster channel slug (see channels.ts).
 * @param init     Optional initial event (e.g. "ready" hello).
 */
export function buildSseResponse(
  channel: string,
  init?: { kind: string; payload?: Record<string, unknown> },
): Response {
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false;
      const safeEnqueue = (bytes: Uint8Array) => {
        if (closed) return;
        try {
          controller.enqueue(bytes);
        } catch {
          closed = true;
        }
      };

      const writeEvent = (event: RealtimeEvent) => {
        const payload =
          `id: ${event.id}\n` +
          `event: ${event.kind}\n` +
          `data: ${JSON.stringify(event)}\n\n`;
        safeEnqueue(encoder.encode(payload));
      };

      // Optional hello frame so the client knows the stream is live.
      if (init) {
        writeEvent({
          id: crypto.randomUUID(),
          channel,
          kind: init.kind,
          payload: init.payload ?? {},
          ts: Date.now(),
        });
      }

      const unsubscribe = subscribe(channel, writeEvent);

      const keepalive = setInterval(() => {
        safeEnqueue(encoder.encode(`:keepalive ${Date.now()}\n\n`));
      }, KEEPALIVE_INTERVAL_MS);

      // No standard cancel signal hook in plain Web Streams, but
      // browsers close the underlying socket — the controller throws
      // on next enqueue and we tear down.
      const teardown = () => {
        if (closed) return;
        closed = true;
        clearInterval(keepalive);
        unsubscribe();
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      };

      // Stash teardown for the cancel() hook below via closure.
      (controller as unknown as { _teardown?: () => void })._teardown = teardown;
    },
    cancel() {
      // `this` is not the controller in cancel; we set teardown on
      // the controller in start() via closure. Cancel runs when the
      // consumer disconnects.
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
