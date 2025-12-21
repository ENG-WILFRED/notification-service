import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { publishNotification, NotificationPayload } from '../services/kafkaProducer';

/**
 * @swagger
 * /notify:
 *   post:
 *     summary: Queue a notification
 *     description: Publish a notification event to Kafka
 *     tags:
 *       - Notifications
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - to
 *               - channel
 *               - template
 *             properties:
 *               to:
 *                 type: string
 *                 example: "user@example.com"
 *               channel:
 *                 type: string
 *                 enum: [email, sms]
 *               template:
 *                 type: string
 *                 example: "welcome_email"
 *               data:
 *                 type: object
 *                 example: { "name": "Alice", "message": "Welcome" }
 *               idempotency_key:
 *                 type: string
 *                 description: Optional unique key for request deduplication
 *     responses:
 *       202:
 *         description: Notification queued successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                 id:
 *                   type: string
 *       400:
 *         description: Missing required fields
 *       500:
 *         description: Failed to publish
 */
async function notifyRoute(req: Request, res: Response): Promise<void> {
  const startTime = Date.now();
  const requestId = req.headers['x-request-id'] as string || uuidv4();
  const { to, channel, template, data, idempotency_key } = req.body;

  console.log(`[NOTIFY] POST /notify received (request_id: ${requestId}, ip: ${req.ip}, timestamp: ${new Date().toISOString()})`);
  console.log(`[NOTIFY] Request body: to=${to}, channel=${channel}, template=${template}, data_keys=${Object.keys(data || {}).join(',')}`);
  // Validation
  if (!to || !channel || !template) {
    const missingFields: string[] = [];
    if (!to) missingFields.push('to');
    if (!channel) missingFields.push('channel');
    if (!template) missingFields.push('template');
    const errMsg = `missing required fields: ${missingFields.join(', ')}`;
    console.warn(`[NOTIFY] Validation failed (request_id: ${requestId}): ${errMsg}`);
    const duration = Date.now() - startTime;
    console.log(`[NOTIFY] POST /notify response (request_id: ${requestId}): 400 Bad Request (${duration}ms)`);
    res.status(400).json({ error: errMsg, request_id: requestId });
    return;
  }

  if (!['email', 'sms'].includes(channel)) {
    const errMsg = `channel must be email or sms (got: ${channel})`;
    console.warn(`[NOTIFY] Validation failed (request_id: ${requestId}): ${errMsg}`);
    const duration = Date.now() - startTime;
    console.log(`[NOTIFY] POST /notify response (request_id: ${requestId}): 400 Bad Request (${duration}ms)`);
    res.status(400).json({ error: errMsg, request_id: requestId });
    return;
  }

  const payload: NotificationPayload = {
    id: idempotency_key || uuidv4(),
    to,
    channel,
    template,
    data: data || {},
    timestamp: Date.now()
  };

  console.log(`[NOTIFY] Validation passed (request_id: ${requestId}): channel=${channel}, template=${template}, to=${to}, payload_id=${payload.id}`);

  try {
    console.log(`[NOTIFY] Publishing to Kafka (request_id: ${requestId}, payload_id: ${payload.id})...`);
    await publishNotification(payload);
    const duration = Date.now() - startTime;
    console.log(`[NOTIFY] ✓ Notification published (request_id: ${requestId}, payload_id: ${payload.id}, duration: ${duration}ms)`);
    console.log(`[NOTIFY] POST /notify response (request_id: ${requestId}): 202 Accepted (${duration}ms)`);
    res.status(202).json({ status: 'queued', id: payload.id, request_id: requestId });
  } catch (err) {
    const duration = Date.now() - startTime;
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error(`[NOTIFY] ✗ Publish failed (request_id: ${requestId}, payload_id: ${payload.id}, error: ${errMsg}, stack: ${err instanceof Error ? err.stack : 'N/A'})`);
    console.log(`[NOTIFY] POST /notify response (request_id: ${requestId}): 500 Internal Server Error (${duration}ms)`);
    res.status(500).json({ error: 'failed to publish', request_id: requestId });
  }
}

export { notifyRoute };