import { redis } from "./redis";

export interface WebhookQueuePayload {
  lineAccountId: string;
  event: any;
}

/**
 * Publishes a LINE Webhook event to the Redis queue for asynchronous processing by worker replicas.
 * Encapsulates the serialization and the Redis list key "educ_line_events".
 * 
 * @param lineAccountId The UUID of the LINE account configuration.
 * @param event The raw LINE Webhook event object.
 */
export async function publishWebhookEvent(
  lineAccountId: string,
  event: any
): Promise<void> {
  const payload: WebhookQueuePayload = {
    lineAccountId,
    event,
  };

  try {
    await redis.rpush("educ_line_events", JSON.stringify(payload));
  } catch (error) {
    console.error(`[QueuePublisher] Failed to push event to Redis queue:`, error);
    throw error;
  }
}
