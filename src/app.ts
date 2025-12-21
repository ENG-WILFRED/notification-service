import dotenv from 'dotenv';
import express, { Express } from 'express';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './utils/swagger';
import { initProducer, closeProducer, getMockQueue } from './services/kafkaProducer';
import { notifyRoute } from './routes/notify';
import { healthRoute } from './routes/health';
import config from './config';

dotenv.config();

const app: Express = express();
app.use(express.json());

// Swagger docs
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Routes
app.post('/notify', notifyRoute);
app.get('/health', healthRoute);

// Mock queue endpoint (for testing without Kafka)
app.get('/queue', (_req, res) => {
  const requestId = _req.headers['x-request-id'] as string || 'queue-check';
  console.log(`[QUEUE] GET /queue received (request_id: ${requestId}, mode: ${config.mockMode ? 'mock' : 'kafka'})`);
  if (config.mockMode) {
    const queued = getMockQueue();
    console.log(`[QUEUE] GET /queue response: 200 OK (queued_count: ${queued.length})`);
    res.json({ mode: 'mock', queued_messages: queued, request_id: requestId });
  } else {
    console.log(`[QUEUE] GET /queue response: 200 OK (mode: kafka)`);
    res.json({ mode: 'kafka', message: 'Messages are in Kafka broker', request_id: requestId });
  }
});

// Initialize Kafka and start
async function start(): Promise<void> {
  const startTime = Date.now();
  console.log(`[APP] === Notification Service Starting (timestamp: ${new Date().toISOString()}) ===`);
  console.log(`[APP] Environment: ${config.env}, Mock mode: ${config.mockMode}`);
  console.log(`[APP] Kafka config: broker=${config.kafka.brokers.join(',')}, topic=${config.kafka.topic}, clientId=${config.kafka.clientId}`);
  
  try {
    console.log('[APP] Initializing Kafka producer...');
    await initProducer();
    const initDuration = Date.now() - startTime;
    
    if (config.mockMode) {
      console.log(`[APP] ⚠️  MOCK MODE enabled (${initDuration}ms) - running without Kafka broker`);
      console.log('[APP] Messages will be queued in memory');
      console.log('[APP] Visit http://localhost:' + config.port + '/queue to view queued messages');
    } else {
      console.log(`[APP] ✓ Kafka producer initialized (${initDuration}ms)`);
    }
    
    app.listen(config.port, () => {
      const totalDuration = Date.now() - startTime;
      console.log(`[APP] ✓ Producer API listening on port ${config.port} (total init: ${totalDuration}ms)`);
      console.log(`[APP] Swagger docs available at http://localhost:${config.port}/api-docs`);
      console.log(`[APP] === Service started successfully ===`);
    });
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    const errStack = err instanceof Error ? err.stack : 'N/A';
    console.error(`[APP] ✗ Failed to start: ${errMsg}`);
    console.error(`[APP] Stack trace: ${errStack}`);
    process.exit(1);
  }
}

process.on('SIGTERM', async () => {
  console.log(`[APP] SIGTERM received (timestamp: ${new Date().toISOString()}), shutting down gracefully...`);
  try {
    await closeProducer();
    console.log('[APP] ✓ Producer closed successfully');
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error(`[APP] ✗ Error closing producer: ${errMsg}`);
  }
  console.log('[APP] === Service stopped ===');
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log(`[APP] SIGINT received (timestamp: ${new Date().toISOString()}), shutting down gracefully...`);
  try {
    await closeProducer();
    console.log('[APP] ✓ Producer closed successfully');
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error(`[APP] ✗ Error closing producer: ${errMsg}`);
  }
  console.log('[APP] === Service stopped ===');
  process.exit(0);
});

start();
