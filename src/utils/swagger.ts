import swaggerJsdoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Notification Service API',
      version: '1.0.0',
      description: 'Kafka-based notification service for email and SMS delivery'
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server'
      }
    ],
    components: {
      schemas: {
        NotificationRequest: {
          type: 'object',
          required: ['to', 'channel', 'template'],
          properties: {
            to: { type: 'string', description: 'Recipient email or phone number' },
            channel: { type: 'string', enum: ['email', 'sms'] },
            template: { type: 'string', description: 'Template name' },
            data: { type: 'object', description: 'Template variables' },
            idempotency_key: { type: 'string', description: 'Idempotency key' }
          }
        }
      }
    }
  },
  apis: ['./dist/routes/*.js']
};

const swaggerSpec = swaggerJsdoc(options);

export { swaggerSpec };
