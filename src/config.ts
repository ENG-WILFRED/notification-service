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

interface TwilioConfig {
  accountSid?: string;
  authToken?: string;
  from?: string;
}

interface Config {
  port: number;
  kafka: KafkaConfig;
  smtp: SmtpConfig;
  twilio: TwilioConfig;
  env: string;
  mockMode: boolean;
}

const config: Config = {
  port: Number(process.env.PORT) || 5371,
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
    port: Number(process.env.SMTP_PORT) || 587,
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.SMTP_FROM || 'no-reply@example.com'
  },
  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID,
    authToken: process.env.TWILIO_AUTH_TOKEN,
    from: process.env.TWILIO_FROM
  },
  env: process.env.NODE_ENV || 'development',
  mockMode: process.env.MOCK_MODE === 'true' || false
};

export default config;
