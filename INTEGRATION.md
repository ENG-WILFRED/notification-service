# Integration Guide — Notification Service

This guide explains, in detail, how to connect external systems to the Notification Service and how the service integrates with a secure Kafka provider (Aiven example). It covers prerequisites, environment variables, CA certificates, installing `node-rdkafka`, producer and consumer examples, mock mode, troubleshooting, and best practices.

---

## 1. Overview

The Notification Service is a TypeScript Node.js application that exposes an HTTP producer API and a long-running Kafka consumer. Messages are published to a Kafka topic and consumed by the consumer which renders templates and sends notifications using configured providers (SMTP/Twilio).

This guide focuses on integrating with a remote, SASL+TLS protected Kafka cluster (Aiven example) using `node-rdkafka` (librdkafka binding).

## 2. Prerequisites

- Node.js (LTS, e.g. 18+ recommended)
- npm
- OpenSSL installed and available in PATH (required when building `node-rdkafka` native bindings on some platforms)
- CA certificate file (provided by Kafka provider) — e.g. `ca.pem`
- Network access to the broker endpoint and port (eg. `pensions-...:23362`)

On Linux, ensure you have the build toolchain and OpenSSL dev headers installed. Example (Debian/Ubuntu):

```bash
sudo apt update
sudo apt install build-essential pkg-config libssl-dev python3
```

On macOS, ensure OpenSSL is installed (Homebrew):

```bash
brew install openssl@3
export PATH="/opt/homebrew/opt/openssl@3/bin:$PATH"
```

## 3. Environment variables

Add these variables to your environment or `.env` (we provide `.env.example`):

- `KAFKA_BROKER` — Broker address and port (comma-separated for multiple brokers). Example: `pensions-kimaniwilfred95-d2b4.c.aivencloud.com:23362`
- `KAFKA_CLIENT_ID` — Client id for the service (e.g. `notification-service`)
- `KAFKA_TOPIC` — Topic name to publish/subscribe (e.g. `notifications`)
- `KAFKA_SASL_MECHANISM` — `SCRAM-SHA-256` or `SCRAM-SHA-512`
- `KAFKA_SASL_USERNAME` — SASL username (from provider)
- `KAFKA_SASL_PASSWORD` — SASL password (from provider)
- `KAFKA_SSL_CA_LOCATION` — Path to the CA file (relative to project root), e.g. `ca.pem`
- `MOCK_MODE` — `true` to run without Kafka (producer will queue in memory)

Example `.env` additions (replace with your actual credentials from Aiven):

```dotenv
KAFKA_BROKER=your-cluster-url:23362
KAFKA_CLIENT_ID=notification-service
KAFKA_TOPIC=notifications
KAFKA_SASL_MECHANISM=SCRAM-SHA-256
KAFKA_SASL_USERNAME=your-username
KAFKA_SASL_PASSWORD=your-password
KAFKA_SSL_CA_LOCATION=ca.pem
MOCK_MODE=false
```

> Security: Never commit real credentials to source control. Use secrets manager for production.

## 4. Install `node-rdkafka`

`node-rdkafka` is a binding to `librdkafka` and may require native build steps. Install it as a dependency (we added it to `package.json`):

```bash
npm install node-rdkafka
```

If you encounter build issues, ensure OpenSSL dev headers are present and `pkg-config` can locate them. On systems using OpenSSL 3, you may need to ensure `openssl@3` is on your PATH before installing.

## 5. CA certificate

Download the CA certificate from your Kafka provider (Aiven: `Download CA certificate`), and place it at the path specified by `KAFKA_SSL_CA_LOCATION` (default `ca.pem` in project root).

## 6. How the service connects (what we implemented)

- Producer: implemented in `src/services/kafkaProducer.ts`. Uses `node-rdkafka` `Producer` class. The service builds a `Producer` config using the `KAFKA_*` env vars, connects, and exposes `publishNotification(payload)` which produces a Buffer containing the JSON message. A compatibility alias `initProducer` is provided for legacy imports.

- Consumer: implemented in `src/services/kafkaConsumer.ts`. Uses `node-rdkafka` `KafkaConsumer`. The `startConsumer(onMessage)` API starts the consumer and calls your handler for parsed messages. For compatibility with the existing `consumer.ts` script (which expected a `kafkajs`-style API), a `createConsumer()` shim was added that adapts the `startConsumer` messages to the expected `eachMessage` call shape.

- Config: `src/config.ts` exposes env-driven Kafka settings including SASL and CA path. `MOCK_MODE` allows running without Kafka for local dev.

## 7. Producer example (programmatic)

Call the `publishNotification` exported function to send a notification:

```ts
import { publishNotification, initProducer } from './services/kafkaProducer';

await initProducer();
await publishNotification({
  id: 'uuid-123',
  to: 'user@example.com',
  channel: 'email',
  template: 'welcome_email',
  data: { name: 'Alice' },
  timestamp: Date.now()
});

// optionally close on shutdown
await closeProducer();
```

The HTTP route `/notify` in `src/app.ts` uses this under the hood.

## 8. Consumer example (programmatic)

Existing `src/consumer.ts` uses the `createConsumer()` shim and `consumer.run({ eachMessage })` callback. You can also use `startConsumer(onMessage)` directly:

```ts
import { startConsumer } from './services/kafkaConsumer';

const ctrl = await startConsumer(async (payload) => {
  console.log('Received payload', payload);
});

// stop when needed
await ctrl.stop();
```

## 9. Running the service (development)

1. Ensure `.env` contains Kafka vars and `ca.pem` exists.
2. Install dependencies:

```bash
npm install
```

3. Start the HTTP producer (dev):

```bash
npm run dev
```

4. Start a consumer (dev):

```bash
npm run dev:consumer
```

5. Test the `/notify` endpoint (example):

```bash
curl -X POST http://localhost:5371/notify \
  -H "Content-Type: application/json" \
  -d '{"to":"user@example.com","channel":"email","template":"welcome_email","data":{"name":"Alice"}}'
```

## 10. Mock mode (local testing without Kafka)

Set `MOCK_MODE=true` to disable Kafka connections. The producer will queue messages in memory and the `/queue` endpoint will return queued messages. This is useful for local development without brokers.

## 11. Troubleshooting

- Build fails when installing `node-rdkafka`:
  - Ensure `libssl-dev` (Linux) or `openssl` dev tools are installed and accessible.
  - Ensure `pkg-config` is installed.

- TLS/SASL auth errors:
  - Verify `KAFKA_SASL_USERNAME` and `KAFKA_SASL_PASSWORD` are correct.
  - Ensure the `KAFKA_SSL_CA_LOCATION` points to the provider CA file.
  - Check broker port and firewall access.

- Connection issues:
  - Confirm `KAFKA_BROKER` host:port is reachable from the runtime environment.
  - If running in Docker, expose network or use host networking as required.

## 12. Security & best practices

- Use a secure secrets manager (do not store credentials in repo).
- Rotate SASL secrets per provider recommendations.
- Limit access to CA and credential files (file permissions).
- Run Kafka traffic over a private network where possible.

## 13. Examples (Aiven quick start snippets)

Producer (node-rdkafka style):

```js
const Kafka = require('node-rdkafka');
const producer = new Kafka.Producer({
  'metadata.broker.list': process.env.KAFKA_BROKER,
  'security.protocol': 'sasl_ssl',
  'sasl.mechanisms': process.env.KAFKA_SASL_MECHANISM,
  'sasl.username': process.env.KAFKA_SASL_USERNAME,
  'sasl.password': process.env.KAFKA_SASL_PASSWORD,
  'ssl.ca.location': process.env.KAFKA_SSL_CA_LOCATION,
  'dr_cb': true
});

producer.connect();
producer.on('ready', () => {
  producer.produce(process.env.KAFKA_TOPIC, null, Buffer.from('hello'), null, Date.now());
});
```

Consumer (node-rdkafka createReadStream):

```js
const Kafka = require('node-rdkafka');
const stream = new Kafka.createReadStream(
  {
    'metadata.broker.list': process.env.KAFKA_BROKER,
    'group.id': 'GROUP_ID',
    'security.protocol': 'sasl_ssl',
    'sasl.mechanisms': process.env.KAFKA_SASL_MECHANISM,
    'sasl.username': process.env.KAFKA_SASL_USERNAME,
    'sasl.password': process.env.KAFKA_SASL_PASSWORD,
    'ssl.ca.location': process.env.KAFKA_SSL_CA_LOCATION
  },
  { 'auto.offset.reset': 'beginning' },
  { topics: [process.env.KAFKA_TOPIC] }
);

stream.on('data', (message) => {
  console.log('Got message using SASL:', message.value.toString());
});
```

---

If you'd like, I can also:

- Add a `docs/quick-start-kafka.md` with step-by-step screenshots for Aiven.
- Update `consumer.ts` to call `startConsumer` directly (remove shim).

Files updated in this change:

- `INTEGRATION.md` (this file)
- `.env.example` (already updated earlier with Kafka vars)
