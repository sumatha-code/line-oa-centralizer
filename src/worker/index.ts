import dotenv from "dotenv";
import path from "path";

// Load environment variables from .env file at the project root
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

import Redis from "ioredis";
import { db } from "../db";
import { lineAccounts } from "../db/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";

const redisUrl = process.env.REDIS_URL;
if (!redisUrl) {
  console.error("[Worker] Error: REDIS_URL is not defined in the environment variables.");
  process.exit(1);
}

const redis = new Redis(redisUrl);

console.log("[Worker] Starting Queue Worker...");
console.log(`[Worker] Connected to Redis at: ${redisUrl}`);

async function processQueue() {
  while (true) {
    try {
      // BLPOP blocks until an event is pushed into the list
      // Output format: [key, value]
      const result = await redis.blpop("educ_line_events", 0);
      if (!result) continue;

      const [_, payloadStr] = result;
      const payload = JSON.parse(payloadStr);

      const { lineAccountId, event } = payload;
      if (!lineAccountId || !event) {
        console.error("[Worker] Invalid payload popped from queue:", payload);
        continue;
      }

      await handleEvent(lineAccountId, event);
    } catch (error) {
      console.error("[Worker] Error in queue polling loop:", error);
      // Wait 5 seconds before retrying to prevent hot loop
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }
}

async function handleEvent(lineAccountId: string, event: any) {
  try {
    // 1. Fetch LINE Account configuration
    const [account] = await db
      .select()
      .from(lineAccounts)
      .where(eq(lineAccounts.id, lineAccountId))
      .limit(1);

    if (!account) {
      console.error(`[Worker] LINE Account not found for ID: ${lineAccountId}`);
      return;
    }

    if (!account.webhookForwardUrl) {
      console.log(`[Worker] Account "${account.name}" has no webhookForwardUrl configured. Event ${event.webhookEventId} skipped.`);
      return;
    }

    // 2. Prepare forward payload (standard LINE structure: { destination, events: [event] })
    const forwardPayload = {
      destination: account.channelId,
      events: [event],
    };
    const forwardBody = JSON.stringify(forwardPayload);

    // 3. Recalculate signature to make the forwarding transparent to the chatbot
    const signature = crypto
      .createHmac("sha256", account.channelSecret)
      .update(forwardBody)
      .digest("base64");

    console.log(`[Worker] Forwarding event ${event.webhookEventId} to: ${account.webhookForwardUrl}`);

    // 4. Send POST request to the chatbot
    const response = await fetch(account.webhookForwardUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Line-Signature": signature,
      },
      body: forwardBody,
    });

    if (response.ok) {
      console.log(`[Worker] Successfully forwarded event ${event.webhookEventId}. Status: ${response.status}`);
    } else {
      console.error(`[Worker] Failed to forward event ${event.webhookEventId}. Status: ${response.status}`);
      const text = await response.text();
      console.error(`[Worker] Destination response body: ${text.substring(0, 500)}`);
    }
  } catch (error) {
    console.error(`[Worker] Error processing event ${event?.webhookEventId}:`, error);
  }
}

processQueue().catch((err) => {
  console.error("[Worker] Fatal error in processQueue:", err);
  process.exit(1);
});
