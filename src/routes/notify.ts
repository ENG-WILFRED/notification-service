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
  const { to, channel, template, data, idempotency_key } = req.body;

  if (!to || !channel || !template) {
    res.status(400).json({ error: 'missing to, channel or template' });
    return;
  }

  if (!['email', 'sms'].includes(channel)) {
    res.status(400).json({ error: 'channel must be email or sms' });
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

  try {
    await publishNotification(payload);
    res.status(202).json({ status: 'queued', id: payload.id });
  } catch (err) {
    console.error('[NOTIFY] error:', err);
    res.status(500).json({ error: 'failed to publish' });
  }
}

export { notifyRoute };