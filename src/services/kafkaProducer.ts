import { Kafka, Producer } from 'kafkajs';
import config from '../config';

let kafka: Kafka | null = null;
let producer: Producer | null = null;

async function initProducer(): Promise<Producer> {
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
  const p = await initProducer();
  await p.send({
    topic: config.kafka.topic,
    messages: [{ key: payload.id, value: JSON.stringify(payload) }]
  });
}

async function closeProducer(): Promise<void> {
  if (producer) await producer.disconnect();
}

export { initProducer, publishNotification, closeProducer, NotificationPayload };
