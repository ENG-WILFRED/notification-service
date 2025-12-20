import { Kafka, Consumer } from 'kafkajs';
import config from '../config';

async function createConsumer(): Promise<Consumer> {
  const kafka = new Kafka({
    clientId: config.kafka.clientId + '-consumer',
    brokers: config.kafka.brokers
  });
  const consumer = kafka.consumer({ groupId: 'notification-service-group' });
  await consumer.connect();
  return consumer;
}

export { createConsumer };
