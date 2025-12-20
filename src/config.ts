import dotenv from 'dotenv';

dotenv.config();

interface KafkaConfig {
  clientId: string;
  brokers: string[];
  topic: string;
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
}

const config: Config = {
  port: Number(process.env.PORT) || 3000,
  kafka: {
    clientId: process.env.KAFKA_CLIENT_ID || 'notification-service',
    brokers: [process.env.KAFKA_BROKER || 'localhost:9092'],
    topic: 'notifications'
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
  env: process.env.NODE_ENV || 'development'
};

export default config;
