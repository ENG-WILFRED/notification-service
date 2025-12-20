import { Kafka, Producer } from 'kafkajs';
import config from '../config';

let kafka: Kafka | null = null;
let producer: Producer | null = null;
const mockQueue: NotificationPayload[] = [];

async function initProducer(): Promise<Producer | null> {
  if (config.mockMode) {
    console.log('[KAFKA] Running in mock mode (no Kafka broker)');
    return null;
  }
  
  if (!kafka) {
    kafka = new Kafka({
      clientId: config.kafka.clientId,
      brokers: config.kafka.brokers
    });
  }
  if (!producer) {
    producer = kafka.producer();
    await producer.connect();
  }
  return producer;
}

interface NotificationPayload {
  id: string;
  to: string;
  channel: 'email' | 'sms';
  template: string;
  data: Record<string, unknown>;
  timestamp: number;
}

async function publishNotification(payload: NotificationPayload): Promise<void> {
  if (config.mockMode) {
    mockQueue.push(payload);
    console.log(`[KAFKA] (Mock) Queued: ${payload.id} → ${payload.to}`);
    return;
  }

  const p = await initProducer();
  if (p) {
    await p.send({
      topic: config.kafka.topic,
      messages: [{ key: payload.id, value: JSON.stringify(payload) }]
    });
  }
}

async function closeProducer(): Promise<void> {
  if (producer) await producer.disconnect();
}

function getMockQueue(): NotificationPayload[] {
  return mockQueue;
}

export { initProducer, publishNotification, closeProducer, NotificationPayload, getMockQueue };

