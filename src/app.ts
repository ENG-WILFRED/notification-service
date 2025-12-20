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
  if (config.mockMode) {
    res.json({ mode: 'mock', queued_messages: getMockQueue() });
  } else {
    res.json({ mode: 'kafka', message: 'Messages are in Kafka broker' });
  }
});

// Initialize Kafka and start
async function start(): Promise<void> {
  try {
    await initProducer();
    if (config.mockMode) {
      console.log('[APP] ⚠️  Running in MOCK MODE (no Kafka broker)');
      console.log('[APP] Messages will be queued in memory');
      console.log('[APP] Visit http://localhost:' + config.port + '/queue to see queued messages');
    } else {
      console.log('[APP] Kafka producer initialized');
    }
    
    app.listen(config.port, () => {
      console.log(`[APP] Producer API listening on port ${config.port}`);
      console.log(`[APP] Swagger docs available at http://localhost:${config.port}/api-docs`);
    });
  } catch (err) {
    console.error('[APP] Failed to start:', err);
    process.exit(1);
  }
}

process.on('SIGTERM', async () => {
  console.log('[APP] SIGTERM received, closing...');
  await closeProducer();
  process.exit(0);
});

start();
