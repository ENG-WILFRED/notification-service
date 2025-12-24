import dotenv from 'dotenv';

dotenv.config();

interface KafkaConfig {
  clientId: string;
  brokers: string[];
  topic: string;
  saslMechanism?: string;
  saslUsername?: string;
  saslPassword?: string;
  sslCaLocation?: string;
}

interface SmtpConfig {
  host?: string;
  port: number;
  user?: string;
  pass?: string;
  from: string;
}

interface SendGridConfig {
  apiKey?: string;
  from: string;
}

interface SmsHttpConfig {
  url?: string;
  partnerId?: string;
  apiKey?: string;
  shortcode?: string;
  passType?: string;
}

interface Config {
  port: number;
  kafka: KafkaConfig;
  smtp: SmtpConfig;
  sendgrid: SendGridConfig;
  sms: SmsHttpConfig;
  env: string;
  mockMode: boolean;
}

const config: Config = {
  // Producer (API) port — use PRODUCER_PORT to avoid colliding with consumer worker
  port: Number(process.env.PRODUCER_PORT) || 5371,
  kafka: {
    clientId: process.env.KAFKA_CLIENT_ID || 'notification-service',
    brokers: [process.env.KAFKA_BROKER || 'localhost:9092'],
    topic: process.env.KAFKA_TOPIC || 'notifications',
    saslMechanism: process.env.KAFKA_SASL_MECHANISM || 'SCRAM-SHA-256',
    saslUsername: process.env.KAFKA_SASL_USERNAME,
    saslPassword: process.env.KAFKA_SASL_PASSWORD,
    sslCaLocation: process.env.KAFKA_SSL_CA_LOCATION || 'ca.pem'
  },
  smtp: {
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 465,
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.SMTP_FROM
  },
  sendgrid: {
    apiKey: process.env.SENDGRID_API_KEY,
    from: process.env.SENDGRID_FROM || 'noreply@notification-service.com'
  },
  sms: {
    url: process.env.SMS_URL || 'https://sms.textsms.co.ke/api/services/sendsms/',
    partnerId: process.env.SMS_PARTNER_ID || '12362',
    apiKey: process.env.SMS_API_KEY || '773ac3416a5b3f7cb26dbccad158c929',
    shortcode: process.env.SMS_SHORTCODE || 'TextSMS',
    passType: process.env.SMS_PASS_TYPE || 'plain'
  },
  env: process.env.NODE_ENV || 'development',
  mockMode: process.env.MOCK_MODE === 'true' || false
};

export default config;
