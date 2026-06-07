import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createLogger } from "@/lib/logger";

const log = createLogger("api/feedback");

interface FeedbackPayload {
  messageId: string;
  rating: 1 | -1;
  chatId: string;
}

/**
 * POST /api/feedback
 *
 * Collects thumbs-up (+1) / thumbs-down (-1) ratings for AI messages.
 * Stored locally in the chat store; this endpoint is the server-side
 * collection point for future model improvement analytics.
 *
 * Returns 200 even on partial failures — the local store is the
 * source of truth and the client does not depend on this succeeding.
 */
export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    }

    const body = await req.json() as FeedbackPayload;
    const { messageId, rating, chatId } = body;

    if (!messageId || (rating !== 1 && rating !== -1) || !chatId) {
      return NextResponse.json({ error: "Invalid feedback payload." }, { status: 400 });
    }

    log.info("Feedback received", {
      userId: user.id,
      chatId,
      messageId,
      rating,
      timestamp: new Date().toISOString(),
    });

    // Future: store in Supabase for analytics
    // await supabase.from("message_feedback").upsert({ user_id: user.id, chat_id: chatId, message_id: messageId, rating });

    return NextResponse.json({ ok: true });
  } catch (error) {
    log.error("Feedback endpoint error", error);
    // Silently succeed — client doesn't depend on this
    return NextResponse.json({ ok: true });
  }
}
