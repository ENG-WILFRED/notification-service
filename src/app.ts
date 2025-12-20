import dotenv from 'dotenv';
import express, { Express } from 'express';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './utils/swagger';
import { initProducer, closeProducer } from './services/kafkaProducer';
import { notifyRoute } from './routes/notify';
import { healthRoute } from './routes/health';
import config from './config';

dotenv.config();

const app: Express = express();
app.use(express.json());

// Swagger docs
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, { customCss: '.swagger-ui { max-width: 900px; }' }));

// Routes
app.post('/notify', notifyRoute);
app.get('/health', healthRoute);

// Initialize Kafka and start
async function start(): Promise<void> {
  try {
    await initProducer();
    console.log('[APP] Kafka producer initialized');
    
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
