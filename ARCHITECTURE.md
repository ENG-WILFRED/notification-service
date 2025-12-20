# Architecture & Design

## System Overview

The Notification Service is a distributed, event-driven system built on Kafka for reliable asynchronous notification delivery. It decouples request ingestion from message delivery, enabling scalability and fault tolerance.

### Key Components

1. **Producer API** (`src/app.js`)
   - Express HTTP server
   - Validates incoming notification requests
   - Publishes to Kafka topic (`notifications`)
   - Returns `202 Accepted` immediately
   - Supports idempotency keys for deduplication

2. **Consumer Service** (`src/consumer.js`)
   - Long-running Kafka consumer
   - Subscribes to `notifications` topic
   - Renders templates with provided data
   - Routes to appropriate provider (email/SMS)
   - Implements exponential backoff retry logic
   - Graceful error handling and logging

3. **Providers** (`src/providers/`)
   - **Email** (`email.js`) – Nodemailer SMTP adapter
   - **SMS** (`sms.js`) – Twilio HTTP API adapter
   - Mock mode: logs to console if credentials missing
   - Production mode: sends real messages via configured services

4. **Message Queue** (Kafka)
   - Persistent topic: `notifications`
   - Consumer group: `notification-service-group`
   - Ensures exactly-once delivery per consumer instance

## Data Flow

```
HTTP Client
    │
    ├─────────── POST /notify ──────────────┐
    │                                        │
    ▼                                        ▼
Request Validation                   Idempotency Check
(to, channel, template)                    │
    │                                       │
    └───────────────┬──────────────────────┘
                    │
                    ▼
          Build Notification Payload
          {
            id: uuid,
            to: string,
            channel: "email" | "sms",
            template: string,
            data: object,
            timestamp: number
          }
                    │
                    ▼
          Publish to Kafka Topic
          (partitioned by id)
                    │
         ┌──────────┴──────────┐
         │                     │
         ▼                     ▼
    Consumer 1             Consumer 2
    (instance 1)           (instance 2)
         │                     │
         ├─────────────┬───────┤ Load balanced by partition
         │             │       │
         ▼             ▼       ▼
   Message Received
         │
         ├─ Parse JSON
         │
         ├─ Load Template
         │
         ├─ Render (substitute {{ vars }})
         │
         └─ Route by Channel
            │
            ├─ email? ──→ EmailProvider.send()
            │            (Nodemailer/Mock)
            │
            └─ sms?   ──→ SMSProvider.send()
                           (Twilio/Mock)

         Retry Loop (up to 5 attempts):
         - Success? → Log & continue
         - Failure? → Exponential backoff + retry
```

## Message Schema

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "to": "user@example.com",
  "channel": "email",
  "template": "welcome_email",
  "data": {
    "name": "Alice",
    "message": "Welcome!"
  },
  "timestamp": 1703084096000
}
```

## Configuration Management

All environment-specific settings are centralized in [src/config.js](src/config.js):

```javascript
module.exports = {
  port: 3000,
  kafka: { clientId, brokers, topic },
  smtp: { host, port, user, pass, from },
  twilio: { accountSid, authToken, from },
  env: 'production' // or 'development'
};
```

This allows:
- Easy testing (inject mock config)
- No hardcoded values
- Clear dependency injection
- Single source of truth for all settings

## Resilience Features

### 1. Exponential Backoff Retry

Failed sends are retried with increasing delays:

```
Attempt 1: fail → wait 500ms × 2¹ = 1s
Attempt 2: fail → wait 500ms × 2² = 2s
Attempt 3: fail → wait 500ms × 2³ = 4s
Attempt 4: fail → wait 500ms × 2⁴ = 8s
Attempt 5: fail → wait 500ms × 2⁵ = 16s (capped at 30s)
```

### 2. Idempotency Keys

Clients can supply optional `idempotency_key` to prevent duplicate sends:
- Same key + same payload = guaranteed single send
- Useful for retry scenarios on client side

### 3. Consumer Group Coordination

Kafka consumer group ensures:
- Each message processed by exactly one consumer
- Automatic load balancing across instances
- Offset management for at-least-once delivery

### 4. Graceful Shutdown

Both producer and consumer handle `SIGTERM`:
- Producer: flushes pending messages before exit
- Consumer: completes current batch before shutdown

## Scalability Considerations

### Horizontal Scaling

1. **Add Consumer Instances**
   ```bash
   npm run consumer &
   npm run consumer &
   npm run consumer &
   ```
   Kafka automatically partitions work across consumers.

2. **Producer Remains Stateless**
   - Multiple producers can run independently
   - Each publishes to same topic
   - No coordination needed

### Monitoring & Observability

**Built-in Logging:**
```
[APP] Kafka producer initialized
[CONSUMER] Received notification abc-123 (email → user@example.com)
[EMAIL] Sent to user@example.com: <message-id>
[CONSUMER] ✓ Successfully sent abc-123
```

**Suggested Additions:**
- Prometheus metrics (message count, latency, errors)
- Structured logging (JSON format for ELK stack)
- Distributed tracing (OpenTelemetry)
- Dead-letter queue for persistent failures

## Security Notes

1. **Credential Management**
   - Never commit `.env` with real credentials
   - Use `.env.example` as template
   - In production: use secrets manager (AWS Secrets, HashiCorp Vault)

2. **Input Validation**
   - All inputs validated before publishing
   - Template names whitelisted (can be enhanced)
   - Phone/email format validation recommended

3. **Network Security**
   - Kafka broker should be behind firewall
   - Use SASL/TLS for Kafka in production
   - API should use HTTPS in production

4. **Rate Limiting**
   - Can add middleware: `express-rate-limit`
   - Per-client or global limits recommended
   - Kafka naturally provides backpressure

## Testing Strategy

### Unit Tests (recommended additions)

```javascript
describe('Template Renderer', () => {
  it('should replace variables', () => {
    const result = render('welcome_email', { name: 'Alice' });
    expect(result).toContain('Hello Alice');
  });
});
```

### Integration Tests

```bash
# Start Kafka
docker-compose up -d

# Send test message
curl -X POST http://localhost:3000/notify -d '...'

# Verify consumer processes it
npm run consumer &
# Check logs for "Successfully sent"
```

### Load Testing

```bash
# Using Apache Bench
ab -n 1000 -c 10 -p payload.json \
  -T application/json \
  http://localhost:3000/notify
```

## Performance Characteristics

| Metric | Value | Notes |
|--------|-------|-------|
| Producer latency | <100ms | HTTP → Kafka publish |
| Consumer latency | <5s | Template render + send attempt 1 |
| Throughput | ~100+ msg/s | Per consumer instance (network/provider dependent) |
| Memory | ~50MB | Base Node.js + single consumer |
| Disk | ~100MB | Kafka log retention (configurable) |

## Future Enhancements

1. **Multi-template Localization**
   - Support for language variants
   - Dynamic template selection

2. **Advanced Routing**
   - Conditional logic (A/B testing)
   - Time-based delivery (send at specific time)

3. **Analytics**
   - Track delivery success rates
   - Monitor cost per notification

4. **Additional Channels**
   - Push notifications (APNs, FCM)
   - Slack/Teams messages
   - Webhooks

5. **Message Deduplication**
   - Maintain Redis cache of recent IDs
   - Prevent duplicate sends within time window

6. **Circuit Breakers**
   - Fail fast if provider is down
   - Automatic recovery with backoff
