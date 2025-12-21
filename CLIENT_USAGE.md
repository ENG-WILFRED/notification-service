# Client Usage Guide — Notification Service

This document explains how external backends and services can integrate with the Notification Service to send notifications (email and SMS).

---

## 1. Overview

The Notification Service exposes a simple HTTP API that accepts notification requests. Your backend sends a JSON POST request to the `/notify` endpoint, and the service queues the notification for asynchronous delivery via Kafka consumers.

**Key characteristics:**
- Asynchronous: Returns immediately (202 Accepted) without waiting for delivery.
- Reliable: Messages are stored in Kafka; consumers can retry on failure.
- Template-based: Supports dynamic message rendering with data injection.
- Multi-channel: Supports email and SMS notifications.
- Idempotent: Optional idempotency keys prevent duplicate sends.

---

## 2. Base URL

```
http://localhost:5371
```

Or set via `PORT` env var. For production, use your deployment domain/port.

---

## 3. Authentication

Currently, the API does not enforce authentication. For production, consider adding:
- API key headers
- OAuth tokens
- mTLS client certificates

---

## 4. POST /notify — Queue a notification

### Request

**Method:** `POST`
**Path:** `/notify`
**Content-Type:** `application/json`

### Request Body

```json
{
  "to": "user@example.com",
  "channel": "email",
  "template": "welcome_email",
  "data": {
    "name": "Alice",
    "message": "Welcome to our service!"
  },
  "idempotency_key": "optional-unique-key-123"
}
```

### Parameters

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `to` | string | Yes | Recipient email (email channel) or phone (SMS channel). |
| `channel` | string | Yes | `email` or `sms`. |
| `template` | string | Yes | Template name (must exist in `src/templates/`). |
| `data` | object | No | Key-value pairs to inject into template. Defaults to `{}`. |
| `idempotency_key` | string | No | Unique key to prevent duplicate sends. If omitted, a UUID is generated. |

### Response (202 Accepted)

```json
{
  "status": "queued",
  "id": "550e8400-e29b-41d4-a716-446655440000"
}
```

The `id` is the notification's unique identifier (either your `idempotency_key` or a generated UUID). Use this ID to track/correlate the notification.

### Error Responses

**400 Bad Request** — Missing required fields or invalid channel:

```json
{
  "error": "missing to, channel or template"
}
```

or

```json
{
  "error": "channel must be email or sms"
}
```

**500 Internal Server Error** — Kafka publish failed:

```json
{
  "error": "failed to publish"
}
```

---

## 5. GET /health — Health check

**Method:** `GET`
**Path:** `/health`

### Response (200 OK)

```json
{
  "status": "ok",
  "timestamp": "2025-12-21T10:00:00.000Z"
}
```

Use this endpoint to check if the service is running.

---

## 6. GET /queue — Get queued messages (Mock mode only)

**Method:** `GET`
**Path:** `/queue`

### Response (when `MOCK_MODE=true`)

```json
{
  "mode": "mock",
  "queued_messages": [
    {
      "id": "123",
      "to": "user@example.com",
      "channel": "email",
      "template": "welcome_email",
      "data": { "name": "Alice" },
      "timestamp": 1703084096000
    }
  ]
}
```

### Response (when `MOCK_MODE=false`)

```json
{
  "mode": "kafka",
  "message": "Messages are in Kafka broker"
}
```

---

## 7. Example integrations

### 7.1 Node.js / TypeScript

```typescript
import axios from 'axios';

const notifyServiceUrl = 'http://localhost:5371';

async function sendWelcomeEmail(userId: string, email: string, name: string) {
  try {
    const response = await axios.post(`${notifyServiceUrl}/notify`, {
      to: email,
      channel: 'email',
      template: 'welcome_email',
      data: { name },
      idempotency_key: `welcome-${userId}-${Date.now()}`
    });

    console.log(`Notification queued: ${response.data.id}`);
    return response.data.id;
  } catch (error) {
    console.error('Failed to queue notification:', error.response?.data || error.message);
    throw error;
  }
}

// Usage
await sendWelcomeEmail('user-123', 'alice@example.com', 'Alice');
```

### 7.2 Python / FastAPI

```python
import httpx
import uuid
from datetime import datetime

NOTIFY_SERVICE_URL = "http://localhost:5371"

async def send_sms_notification(phone: str, message: str, idempotency_key: str = None):
    idempotency_key = idempotency_key or f"sms-{uuid.uuid4()}"
    
    payload = {
        "to": phone,
        "channel": "sms",
        "template": "otp_sms",
        "data": {"otp": message},
        "idempotency_key": idempotency_key
    }
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                f"{NOTIFY_SERVICE_URL}/notify",
                json=payload,
                timeout=5
            )
            response.raise_for_status()
            return response.json()
        except httpx.HTTPError as e:
            print(f"Error sending notification: {e}")
            raise
```

### 7.3 cURL

```bash
curl -X POST http://localhost:5371/notify \
  -H "Content-Type: application/json" \
  -d '{
    "to": "user@example.com",
    "channel": "email",
    "template": "welcome_email",
    "data": { "name": "Alice" },
    "idempotency_key": "user-signup-123"
  }'
```

### 7.4 Go / Fiber

```go
package main

import (
	"bytes"
	"encoding/json"
	"net/http"
)

type NotifyRequest struct {
	To              string            `json:"to"`
	Channel         string            `json:"channel"`
	Template        string            `json:"template"`
	Data            map[string]string `json:"data"`
	IdempotencyKey  string            `json:"idempotency_key,omitempty"`
}

func sendNotification(to, channel, template string, data map[string]string) error {
	req := NotifyRequest{
		To:       to,
		Channel:  channel,
		Template: template,
		Data:     data,
	}

	body, _ := json.Marshal(req)
	resp, err := http.Post(
		"http://localhost:5371/notify",
		"application/json",
		bytes.NewBuffer(body),
	)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusAccepted {
		return fmt.Errorf("unexpected status: %d", resp.StatusCode)
	}
	return nil
}
```

---

## 8. Retry Strategy

Since `/notify` returns immediately (202 Accepted), you should implement retries on your client side:

```typescript
async function notifyWithRetry(
  payload: any,
  maxRetries: number = 3,
  backoffMs: number = 1000
): Promise<string> {
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await axios.post(`${notifyServiceUrl}/notify`, payload, {
        timeout: 5000
      });
      return response.data.id;
    } catch (error) {
      lastError = error;
      if (attempt < maxRetries) {
        const delayMs = backoffMs * Math.pow(2, attempt - 1);
        console.log(`Retry ${attempt}/${maxRetries} in ${delayMs}ms...`);
        await new Promise(r => setTimeout(r, delayMs));
      }
    }
  }

  throw lastError;
}
```

---

## 9. Idempotency

Use idempotency keys to safely retry requests without creating duplicates:

```typescript
const idempotencyKey = `user-${userId}-password-reset-${Date.now()}`;

// Call this multiple times with the same key; only one notification will be sent
await notifyWithRetry({
  to: email,
  channel: 'email',
  template: 'password_reset',
  data: { reset_link: 'https://...' },
  idempotency_key: idempotencyKey
});
```

---

## 10. Adding new templates

Templates live in `src/templates/`. To add support for a new notification type:

1. Create a template file (e.g., `src/templates/password_reset_email.txt`):
   ```
   Hello {{name}},

   Reset your password: {{reset_link}}

   Best,
   The Team
   ```

2. Reference it by name in your client:
   ```typescript
   await axios.post(`${notifyServiceUrl}/notify`, {
     to: email,
     channel: 'email',
     template: 'password_reset_email',
     data: { name, reset_link }
   });
   ```

The consumer will load and render the template at delivery time.

---

## 11. Logging & debugging

The service logs all requests and responses. For local testing with `MOCK_MODE=true`:

1. Send a notification:
   ```bash
   curl -X POST http://localhost:5371/notify \
     -H "Content-Type: application/json" \
     -d '{"to":"user@example.com","channel":"email","template":"welcome_email","data":{}}'
   ```

2. Check the mock queue:
   ```bash
   curl http://localhost:5371/queue
   ```

3. View app logs:
   ```
   [APP] Producer API listening on port 5371
   [NOTIFY] POST /notify received (request_id: abc-123, timestamp: 2025-12-21T10:00:00Z)
   [NOTIFY] Validation passed: channel=email, template=welcome_email
   [NOTIFY] Notification published: id=uuid-123
   [NOTIFY] POST /notify response: 202 Accepted
   ```

---

## 12. Best practices

1. **Always provide `idempotency_key`** for critical notifications (password resets, confirmations) to prevent duplicates.

2. **Validate the response**: Check for 202 Accepted status and store the returned `id` for tracking.

3. **Implement timeouts**: Set connection/request timeouts (5–10 seconds) to avoid hanging.

4. **Handle errors gracefully**: If `/notify` returns 500, retry with exponential backoff. If it returns 400, fix your payload and retry.

5. **Monitor notification delivery**: Use the consumer logs to track delivery success/failure. Consider adding webhooks for delivery status updates.

6. **Keep data minimal**: Pass only the data needed for template rendering. Avoid sending large payloads.

7. **Use mock mode for testing**: Set `MOCK_MODE=true` locally to avoid real Kafka/email/SMS calls.

---

## 13. API documentation

Full API documentation is available at:

```
http://localhost:5371/api-docs
```

This provides an interactive Swagger UI where you can test endpoints directly.

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| 400 Bad Request | Ensure `to`, `channel`, and `template` are provided. Check channel is `email` or `sms`. |
| 500 Internal Server Error | Service is having issues; check logs. Retry after a delay. |
| Notification not sent | Check consumer logs (should show "Successfully sent" or error). Verify SMTP/Twilio credentials. |
| High latency | May indicate Kafka broker delays. Check Kafka logs. |

---

## Contact & Support

For issues or questions, refer to [INTEGRATION.md](INTEGRATION.md) for setup/Kafka configuration or [ARCHITECTURE.md](ARCHITECTURE.md) for design details.
