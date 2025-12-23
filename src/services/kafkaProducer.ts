import config from '../config';

export interface NotificationPayload {
  id: string;
  to: string;
  channel: 'email' | 'sms';
  template: string;
  data: Record<string, unknown>;
  timestamp: number;
}

let producer: any | null = null;

function buildProducerConfig(): Record<string, unknown> {
  const base: Record<string, unknown> = {
    'metadata.broker.list': (config.kafka.brokers || []).join(','),
    'security.protocol': 'sasl_ssl',
    'sasl.mechanism': config.kafka.saslMechanism || 'SCRAM-SHA-256',
    'sasl.username': config.kafka.saslUsername,
    'sasl.password': config.kafka.saslPassword,
    'ssl.ca.location': config.kafka.sslCaLocation || 'ca.pem',
    'dr_cb': true
  };

  return base;
}

export async function createProducer(): Promise<any | null> {
  // Create and return a node-rdkafka Producer instance

  if (producer) return producer;

  const Kafka = (await import('node-rdkafka')) as any;
  const conf = buildProducerConfig();
  console.log(`[KAFKA-PRODUCER] Connecting with config: broker=${conf['metadata.broker.list']}, user=${conf['sasl.username']}, mech=${conf['sasl.mechanism']}, ca=${conf['ssl.ca.location']}`);
  producer = new Kafka.Producer(conf);

  return new Promise((resolve, reject) => {
    producer.on('ready', () => {
      console.log('[KAFKA-PRODUCER] ✓ Producer ready');
         resolve(producer);
    });
    producer.on('event.error', (err: unknown) => {
      console.error('[KAFKA-PRODUCER] ✗ Producer error', err);
      reject(err);
    });
    producer.connect();
  });
}

// Backwards-compatible alias used by other modules in the project
export const initProducer = createProducer;

export async function publishNotification(payload: NotificationPayload): Promise<void> {

  const p = await createProducer();
  if (!p) return;

  try {
    p.produce(
      config.kafka.topic,
      null,
      Buffer.from(JSON.stringify(payload)),
      payload.id,
      Date.now()
    );
    // Poll to handle delivery reports and internal events
    p.poll();
    console.log(`[KAFKA] Message produced: ${payload.id}`);
  } catch (err) {
    console.error('[KAFKA] Produce failed', err);
    throw err;
  }
}

export async function closeProducer(): Promise<void> {
  if (!producer) return;
  return new Promise((resolve) => {
    try {
      producer.disconnect(() => {
        producer = null;
        resolve();
      });
    } catch (_e) {
      producer = null;
      resolve();
    }
  });
}


export default { createProducer, publishNotification, closeProducer };

