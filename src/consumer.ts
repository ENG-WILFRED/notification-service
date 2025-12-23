import dotenv from 'dotenv';
import http from 'http';
import { createConsumer } from './services/kafkaConsumer';
import * as emailProvider from './providers/email';
import * as smsProvider from './providers/sms';
import { render } from './utils/templateRenderer';
import config from './config';
import { NotificationPayload } from './services/kafkaProducer';

dotenv.config();

let kafkaConsumerInstance: any = null;
let httpServer: any = null;

// If Render (or another platform) provides a PORT, bind a tiny HTTP listener
// so the platform detects an open port for web services. When running as a
// background worker this can be omitted by not setting `PORT` in the env.
const port = process.env.PORT ? parseInt(process.env.PORT, 10) : undefined;
if (port) {
  httpServer = http.createServer((_req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('ok');
  }).listen(port, () => console.log(`[CONSUMER] HTTP health listener bound on port ${port}`));
}

async function run(): Promise<void> {
  const consumer = await createConsumer();
  kafkaConsumerInstance = consumer;
  await consumer.subscribe({ topic: config.kafka.topic, fromBeginning: false });

  console.log('[CONSUMER] Connected and subscribed to notifications topic');

  await consumer.run({
    eachMessage: async ({ message }: { message: any }) => {
      try {
        const payload: NotificationPayload = JSON.parse(message.value!.toString());
        console.log(`[CONSUMER] Received notification ${payload.id} (${payload.channel} → ${payload.to})`);

        const rendered = render(payload.template, payload.data || {});

        if (payload.channel === 'email') {
          await sendWithRetry(() => emailProvider.send(payload.to, payload.template, rendered), payload);
        } else if (payload.channel === 'sms') {
          await sendWithRetry(() => smsProvider.send(payload.to, payload.template, rendered), payload);
        } else {
          console.warn(`[CONSUMER] Unknown channel: ${payload.channel}`);
        }
      } catch (err) {
        console.error('[CONSUMER] Message processing error:', (err as Error).message || err);
      }
    }
  });
}

async function sendWithRetry(
  fn: () => Promise<void>,
  payload: NotificationPayload,
  maxAttempts: number = 5
): Promise<void> {
  let attempt = 0;
  while (attempt < maxAttempts) {
    try {
      await fn();
      console.log(`[CONSUMER] ✓ Successfully sent ${payload.id}`);
      return;
    } catch (err) {
      attempt++;
      const backoff = Math.min(30000, 500 * 2 ** attempt);
      console.warn(
        `[CONSUMER] Attempt ${attempt}/${maxAttempts} failed for ${payload.id}, retrying in ${backoff}ms:`,
        (err as Error).message || err
      );
      await new Promise((r) => setTimeout(r, backoff));
    }
  }
  console.error(`[CONSUMER] ✗ Failed to send after ${maxAttempts} attempts: ${payload.id}`);
}

process.on('SIGTERM', async () => {
  console.log('[CONSUMER] SIGTERM received, shutting down...');
  try {
    if (httpServer) {
      await new Promise<void>((res) => httpServer.close(() => res()));
      console.log('[CONSUMER] HTTP server closed');
    }
  } catch (e) {
    console.warn('[CONSUMER] Error closing HTTP server', e);
  }

  try {
    if (kafkaConsumerInstance && typeof kafkaConsumerInstance.disconnect === 'function') {
      await kafkaConsumerInstance.disconnect();
      console.log('[CONSUMER] Kafka consumer disconnected');
    }
  } catch (e) {
    console.warn('[CONSUMER] Error disconnecting Kafka consumer', e);
  }

  process.exit(0);
});

run().catch((err) => {
  console.error('[CONSUMER] Fatal error:', err);
  process.exit(1);
});
