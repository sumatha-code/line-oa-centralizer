import dotenv from "dotenv";
import path from "path";

// Load environment variables from .env file at the project root
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

import Redis from "ioredis";
import { db } from "../db";
import { lineAccounts, lineAccountForwardUrls, users, groups } from "../db/schema";
import { eq } from "drizzle-orm";
import { generateSignature } from "../lib/line-crypto";

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

async function enrichUserProfile(userId: string, channelAccessToken: string) {
  try {
    // Check cache
    const [existing] = await db
      .select()
      .from(users)
      .where(eq(users.lineUserId, userId))
      .limit(1);

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    if (existing && existing.updatedAt > sevenDaysAgo) {
      return;
    }

    console.log(`[Worker] Fetching profile for user: ${userId}`);
    const res = await fetch(`https://api.line.me/v2/bot/profile/${userId}`, {
      headers: {
        Authorization: `Bearer ${channelAccessToken}`,
      },
    });

    if (!res.ok) {
      console.warn(`[Worker] Failed to fetch LINE user profile. Status: ${res.status}`);
      return;
    }

    const data = await res.json();
    if (data.displayName) {
      await db
        .insert(users)
        .values({
          lineUserId: userId,
          displayName: data.displayName,
          pictureUrl: data.pictureUrl || null,
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: users.lineUserId,
          set: {
            displayName: data.displayName,
            pictureUrl: data.pictureUrl || null,
            updatedAt: new Date(),
          },
        });
      console.log(`[Worker] Cached profile for user: ${data.displayName}`);
    }
  } catch (error) {
    console.error(`[Worker] Error in enrichUserProfile for ${userId}:`, error);
  }
}

async function enrichGroupProfile(groupId: string, channelAccessToken: string) {
  try {
    // Check cache
    const [existing] = await db
      .select()
      .from(groups)
      .where(eq(groups.lineGroupId, groupId))
      .limit(1);

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    if (existing && existing.updatedAt > sevenDaysAgo) {
      return;
    }

    console.log(`[Worker] Fetching summary for group: ${groupId}`);
    const res = await fetch(`https://api.line.me/v2/bot/group/${groupId}/summary`, {
      headers: {
        Authorization: `Bearer ${channelAccessToken}`,
      },
    });

    if (!res.ok) {
      console.warn(`[Worker] Failed to fetch LINE group summary. Status: ${res.status}`);
      return;
    }

    const data = await res.json();
    if (data.groupName) {
      await db
        .insert(groups)
        .values({
          lineGroupId: groupId,
          groupName: data.groupName,
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: groups.lineGroupId,
          set: {
            groupName: data.groupName,
            updatedAt: new Date(),
          },
        });
      console.log(`[Worker] Cached group summary for: ${data.groupName}`);
    }
  } catch (error) {
    console.error(`[Worker] Error in enrichGroupProfile for ${groupId}:`, error);
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

    // Background async profile enrichment (non-blocking)
    const source = event.source || {};
    if (source.userId) {
      enrichUserProfile(source.userId, account.channelAccessToken).catch((err) =>
        console.error(`[Worker] Error in background user enrichment:`, err)
      );
    }
    if (source.groupId) {
      enrichGroupProfile(source.groupId, account.channelAccessToken).catch((err) =>
        console.error(`[Worker] Error in background group enrichment:`, err)
      );
    }

    // Fetch active forward URLs for this account
    const forwardUrls = await db
      .select()
      .from(lineAccountForwardUrls)
      .where(eq(lineAccountForwardUrls.lineAccountId, lineAccountId));

    const activeForwardUrls = forwardUrls
      .filter((f) => f.isActive)
      .map((f) => f.url);

    if (activeForwardUrls.length === 0) {
      console.log(`[Worker] Account "${account.name}" has no active Webhook Forward URLs. Event ${event.webhookEventId} skipped.`);
      return;
    }

    // 2. Prepare forward payload (standard LINE structure: { destination, events: [event] })
    const forwardPayload = {
      destination: account.channelId,
      events: [event],
    };
    const forwardBody = JSON.stringify(forwardPayload);

    // 3. Recalculate signature to make the forwarding transparent to the chatbot using the shared crypto utility
    const signature = generateSignature(forwardBody, account.channelSecret);

    console.log(`[Worker] Forwarding event ${event.webhookEventId} to ${activeForwardUrls.length} destination(s) in parallel`);

    // 4. Send POST request to all active chatbots in parallel using Promise.allSettled
    const forwardPromises = activeForwardUrls.map(async (url) => {
      try {
        console.log(`[Worker] [${url}] Sending event ${event.webhookEventId}...`);
        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Line-Signature": signature,
          },
          body: forwardBody,
        });

        if (response.ok) {
          console.log(`[Worker] [${url}] Successfully forwarded event ${event.webhookEventId}. Status: ${response.status}`);
        } else {
          console.error(`[Worker] [${url}] Failed to forward event ${event.webhookEventId}. Status: ${response.status}`);
          const text = await response.text();
          console.error(`[Worker] [${url}] Destination response body: ${text.substring(0, 500)}`);
        }
      } catch (err) {
        console.error(`[Worker] [${url}] Error forwarding event ${event.webhookEventId}:`, err);
      }
    });

    await Promise.allSettled(forwardPromises);
  } catch (error) {
    console.error(`[Worker] Error processing event ${event?.webhookEventId}:`, error);
  }
}

processQueue().catch((err) => {
  console.error("[Worker] Fatal error in processQueue:", err);
  process.exit(1);
});
