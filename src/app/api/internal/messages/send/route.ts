import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { apiKeys, apiKeyLineAccounts, lineAccounts, usageLogs } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { hashApiKey } from "@/lib/hash";

const sendPayloadSchema = z.object({
  lineAccountId: z.string().uuid(),
  to: z.string().min(1),
  messages: z.array(z.record(z.any())).min(1),
});

export async function POST(request: NextRequest) {
  let apiKeyId: string | null = null;
  let targetLineAccountId: string | null = null;

  try {
    // 1. Authenticate calling sub-app
    const authHeader = request.headers.get("x-educ-hub-token");
    if (!authHeader) {
      return Response.json({ error: "Unauthorized: Missing X-EDUC-Hub-Token header" }, { status: 401 });
    }

    const hashedKey = hashApiKey(authHeader);

    // Start fetching key record and reading request body in parallel (async-parallel)
    const keyPromise = db
      .select()
      .from(apiKeys)
      .where(eq(apiKeys.keyHash, hashedKey))
      .limit(1);

    const bodyPromise = request.json();

    const [keyRecords, body] = await Promise.all([keyPromise, bodyPromise]);
    const keyRecord = keyRecords[0];

    if (!keyRecord) {
      return Response.json({ error: "Unauthorized: Invalid API Key" }, { status: 401 });
    }
    apiKeyId = keyRecord.id;

    if (!keyRecord.isActive) {
      return Response.json({ error: "Unauthorized: API Key is suspended" }, { status: 401 });
    }

    // 2. Parse and validate body
    const result = sendPayloadSchema.safeParse(body);
    if (!result.success) {
      return Response.json({ error: "Bad Request: Invalid payload schema", details: result.error.format() }, { status: 400 });
    }

    const { lineAccountId, to, messages } = result.data;
    targetLineAccountId = lineAccountId;

    // 3. Verify access control and fetch LINE Account credentials in parallel (async-parallel)
    const mappingPromise = db
      .select()
      .from(apiKeyLineAccounts)
      .where(
        and(
          eq(apiKeyLineAccounts.apiKeyId, apiKeyId),
          eq(apiKeyLineAccounts.lineAccountId, targetLineAccountId)
        )
      )
      .limit(1);

    const accountPromise = db
      .select()
      .from(lineAccounts)
      .where(eq(lineAccounts.id, targetLineAccountId))
      .limit(1);

    const [[authMapping], [account]] = await Promise.all([mappingPromise, accountPromise]);

    if (!authMapping) {
      // Log failed access attempt
      await db.insert(usageLogs).values({
        apiKeyId,
        lineAccountId: targetLineAccountId,
        endpoint: "/api/internal/messages/send",
        statusCode: 403,
      });

      return Response.json({ error: "Forbidden: API Key does not have access to this LINE Account" }, { status: 403 });
    }


    if (!account) {
      return Response.json({ error: "Bad Request: LINE Account not found in system" }, { status: 400 });
    }

    if (!account.isActive) {
      return Response.json({ error: "Forbidden: LINE Account is suspended" }, { status: 403 });
    }

    // 5. Send message to LINE Messaging API
    const lineResponse = await fetch("https://api.line.me/v2/bot/message/push", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${account.channelAccessToken}`,
      },
      body: JSON.stringify({
        to,
        messages,
      }),
    });

    const lineData = await lineResponse.json();
    const statusCode = lineResponse.status;

    // 6. Log the API call
    await db.insert(usageLogs).values({
      apiKeyId,
      lineAccountId: targetLineAccountId,
      endpoint: "/api/internal/messages/send",
      statusCode,
    });

    if (statusCode !== 200) {
      return Response.json({ error: "LINE API Error", details: lineData }, { status: statusCode });
    }

    return Response.json({ status: "success", data: lineData });
  } catch (error: any) {
    console.error("[Internal Message API] Error:", error);

    // Attempt logging internal error if API Key was identified
    if (apiKeyId) {
      try {
        await db.insert(usageLogs).values({
          apiKeyId,
          lineAccountId: targetLineAccountId,
          endpoint: "/api/internal/messages/send",
          statusCode: 500,
        });
      } catch (logError) {
        console.error("Failed to log internal error:", logError);
      }
    }

    return Response.json({ error: "Internal Server Error", message: error.message }, { status: 500 });
  }
}
