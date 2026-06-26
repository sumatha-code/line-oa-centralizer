import { NextRequest } from "next/server";
import crypto from "crypto";
import { db } from "@/db";
import { lineAccounts, webhookEvents } from "@/db/schema";
import { eq } from "drizzle-orm";
import { redis } from "@/lib/redis";

export async function POST(
  request: NextRequest,
  { params }: { params: { accountId: string } }
) {
  const accountId = params.accountId;

  try {
    // 1. Fetch LINE Account config from database
    const [account] = await db
      .select()
      .from(lineAccounts)
      .where(eq(lineAccounts.id, accountId))
      .limit(1);

    if (!account) {
      console.error(`[Webhook] LINE Account not found: ${accountId}`);
      return new Response("LINE Account not found", { status: 404 });
    }

    if (!account.isActive) {
      console.warn(`[Webhook] LINE Account is suspended: ${account.name} (${accountId})`);
      return new Response("LINE Account is suspended", { status: 403 });
    }

    // 2. Read raw request body
    const rawBody = await request.text();

    // 3. Verify Signature
    const xLineSignature = request.headers.get("x-line-signature");
    if (!xLineSignature) {
      console.error(`[Webhook] Missing x-line-signature header`);
      return new Response("Missing signature", { status: 401 });
    }

    const calculatedSignature = crypto
      .createHmac("sha256", account.channelSecret)
      .update(rawBody)
      .digest("base64");

    if (calculatedSignature !== xLineSignature) {
      console.error(`[Webhook] Signature verification failed`);
      return new Response("Signature verification failed", { status: 403 });
    }

    // 4. Parse events
    const body = JSON.parse(rawBody);
    const events = body.events || [];

    for (const event of events) {
      const eventId = event.webhookEventId;
      if (!eventId) {
        console.warn("[Webhook] Event is missing webhookEventId, skipping", event);
        continue;
      }

      try {
        // Check duplicate and save in database
        await db.insert(webhookEvents).values({
          webhookEventId: eventId,
          lineAccountId: accountId,
          eventType: event.type,
        });

        // Push event to Redis queue for worker processing
        const queuePayload = {
          lineAccountId: accountId,
          event,
        };

        await redis.rpush("educ_line_events", JSON.stringify(queuePayload));
      } catch (dbError: any) {
        // Handle duplicate primary key error (event already processed)
        if (dbError.code === "23505" || dbError.message?.includes("unique constraint")) {
          console.log(`[Webhook] Duplicate event detected and skipped: ${eventId}`);
          continue;
        }
        console.error(`[Webhook] Database error processing event ${eventId}:`, dbError);
      }
    }

    // 5. Respond 200 OK immediately within 2 seconds
    return Response.json({ status: "ok" });
  } catch (error) {
    console.error(`[Webhook] Error in webhook handler:`, error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
