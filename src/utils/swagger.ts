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
        url: 'https://notification-service-consumer.onrender.com',
        description: 'consumer------Production server'
      },
      {
        url: 'https://notification-service-producer.onrender.com',
        description: 'producer-----Production server'
      },
      {
        url: 'http://localhost:5371',
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
            template: {
              type: 'string',
              description: 'Template name',
              enum: ['otp', 'welcome', 'pension-statement', 'payment-confirmation', 'password-reset', 'monthly-summary']
            },
            data: {
              description: 'Template variables. Use the schema matching the chosen `template` field.',
              oneOf: [
                { $ref: '#/components/schemas/TemplateDataOtp' },
                { $ref: '#/components/schemas/TemplateDataWelcome' },
                { $ref: '#/components/schemas/TemplateDataPensionStatement' },
                { $ref: '#/components/schemas/TemplateDataPaymentConfirmation' },
                { $ref: '#/components/schemas/TemplateDataPasswordReset' },
                { $ref: '#/components/schemas/TemplateDataMonthlySummary' }
              ]
            },
            idempotency_key: { type: 'string', description: 'Idempotency key' }
          }
        },

        TemplateDataOtp: {
          type: 'object',
          required: ['name', 'code', 'expiryMinutes'],
          properties: {
            name: { type: 'string', example: 'Alice' },
            code: { type: 'string', example: '123456' },
            expiryMinutes: { type: 'integer', example: 10 }
          }
        },

        TemplateDataWelcome: {
          type: 'object',
          required: ['name', 'message', 'link', 'temp_password'],
          properties: {
            name: { type: 'string', example: 'Alice' },
            message: { type: 'string', example: 'Welcome to Pension App' },
            link: { type: 'string', format: 'uri', example: 'https://app.example.com/start' },
            temp_password: { type: 'string', example: 'TempPass123' }
          }
        },

        TemplateDataPensionStatement: {
          type: 'object',
          required: ['name', 'period', 'statement_rows_html', 'total', 'dashboard_link'],
          properties: {
            name: { type: 'string' },
            period: { type: 'string', example: 'March 2025' },
            statement_rows_html: { type: 'string', description: 'Pre-rendered HTML table rows for statement details' },
            total: { type: 'string', example: '$12,345.67' },
            dashboard_link: { type: 'string', format: 'uri' }
          }
        },

        TemplateDataPaymentConfirmation: {
          type: 'object',
          required: ['amount', 'date', 'reference', 'dashboard_link'],
          properties: {
            amount: { type: 'string', example: '$250.00' },
            date: { type: 'string', format: 'date-time' },
            reference: { type: 'string', example: 'PAY-12345' },
            dashboard_link: { type: 'string', format: 'uri' }
          }
        },

        TemplateDataPasswordReset: {
          type: 'object',
          required: ['name', 'reset_link'],
          properties: {
            name: { type: 'string' },
            reset_link: { type: 'string', format: 'uri' }
          }
        },

        TemplateDataMonthlySummary: {
          type: 'object',
          required: ['name', 'month', 'bullets_html', 'dashboard_link'],
          properties: {
            name: { type: 'string' },
            month: { type: 'string', example: 'November 2025' },
            bullets_html: { type: 'string', description: 'Pre-rendered HTML list items (<li>...</li>) for highlights' },
            dashboard_link: { type: 'string', format: 'uri' }
          }
        }
      }
    }
  },
  apis: ['./dist/routes/*.js']
};

const swaggerSpec = swaggerJsdoc(options);

export { swaggerSpec };
