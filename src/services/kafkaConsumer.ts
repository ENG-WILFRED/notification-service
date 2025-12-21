import config from '../config';
import { NotificationPayload } from './kafkaProducer';

let consumerInstance: any | null = null;

function buildConsumerConfig(): { [k: string]: unknown } {
  const base: Record<string, unknown> = {
    'metadata.broker.list': (config.kafka.brokers || []).join(','),
    'group.id': process.env.KAFKA_CONSUMER_GROUP || 'notification-service-group',
    'security.protocol': 'sasl_ssl',
    'sasl.mechanism': config.kafka.saslMechanism || 'SCRAM-SHA-256',
    'sasl.username': config.kafka.saslUsername,
    'sasl.password': config.kafka.saslPassword,
    'ssl.ca.location': config.kafka.sslCaLocation || 'ca.pem'
  };

  return base;
}

export async function startConsumer(onMessage: (payload: NotificationPayload) => void): Promise<{ stop: () => Promise<void> }> {
  if (config.mockMode) {
    console.log('[KAFKA] Mock mode: consumer not started');
    return { stop: async () => {} };
  }

  if (consumerInstance) {
    return {
      stop: async () => {
        // already running
      }
    };
  }

  const Kafka = (await import('node-rdkafka')) as any;
  const conf = buildConsumerConfig();
  const topicConf = { 'auto.offset.reset': 'beginning' };
  console.log(`[KAFKA-CONSUMER] Connecting with config: broker=${conf['metadata.broker.list']}, group=${conf['group.id']}, user=${conf['sasl.username']}, mech=${conf['sasl.mechanism']}, ca=${conf['ssl.ca.location']}`);
  const consumer = new Kafka.KafkaConsumer(conf, topicConf);

  consumerInstance = consumer;

  return new Promise((resolve, reject) => {
    consumer.connect(null, (err: unknown) => {
      if (err) {
        console.error('[KAFKA-CONSUMER] ✗ Consumer connect error', err);
        reject(err);
        return;
      }

      console.log('[KAFKA-CONSUMER] ✓ Connected, subscribing to topic:', config.kafka.topic);
      consumer.subscribe([config.kafka.topic]);
      consumer.consume();

      consumer.on('data', (message: any) => {
        try {
          const value = message.value ? message.value.toString() : null;
          if (!value) return;
          const parsed = JSON.parse(value) as NotificationPayload;
          onMessage(parsed);
        } catch (e) {
          console.error('[KAFKA] Failed to parse message', e);
        }
      });

      resolve({
        stop: async () => {
          return new Promise<void>((res) => {
            try {
              consumer.disconnect(() => {
                consumerInstance = null;
                res();
              });
            } catch (_e) {
              consumerInstance = null;
              res();
            }
          });
        }
      });
    });
  });
}

export default { startConsumer };

// Compatibility shim for existing kafkajs-based consumer usage in the project.
// `createConsumer()` returns an object with `subscribe` and `run({ eachMessage })` methods.
export async function createConsumer(): Promise<any> {
  let stopped = false;
  let handler: any = null;

  const ctrl = await startConsumer((payload) => {
    if (stopped) return;
    if (handler) {
      try {
        handler({ message: { value: Buffer.from(JSON.stringify(payload)) } });
      } catch (e) {
        console.error('[KAFKA] Shim handler error', e);
      }
    }
  });

  return {
    subscribe: async (_opts: { topic: string; fromBeginning?: boolean } | { topics: string[] }) => {
      // No-op for shim; `startConsumer` already subscribes to configured topic
    },
    run: async ({ eachMessage }: { eachMessage: (arg: { message: { value: Buffer } }) => Promise<void> }) => {
      handler = eachMessage as unknown as (payload: any) => void;
      return;
    },
    disconnect: async () => {
      stopped = true;
      await ctrl.stop();
    }
  };
}
