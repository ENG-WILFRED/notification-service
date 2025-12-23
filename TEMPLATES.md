# Templates — Pension App Notification Service

This document describes available templates, required data fields, and example payloads for the `/notify` API.

General rules
- Template names are kebab-case and match files in `src/templates` (prefer `.html`).
- Placeholders use `{{ key }}` syntax; the renderer replaces occurrences of `{{ key }}` with the corresponding value provided in the `data` object.
- For complex table rows or lists include pre-rendered HTML fragments such as `statement_rows_html` or `bullets_html`.
- Email provider sends `html` and a simple plaintext fallback automatically.

Supported templates

1) otp
- File: `src/templates/otp.html` (fallback: `otp.txt`)
- Description: One-time passcode for verification.
- Required data: `name`, `code`, `expiryMinutes`
- Example payload:

```json
{
  "to": "user@example.com",
  "channel": "email",
  "template": "otp",
  "data": {
    "name": "Alice",
    "code": "123456",
    "expiryMinutes": 10
  }
}
```

2) welcome
- File: `src/templates/welcome.html` (fallback: `welcome.txt`)
- Description: Welcome / onboarding email that includes a temporary password and a CTA to set a permanent password.
- Required data: `name`, `message`, `link`, `temp_password`
- Example payload:

```json
{
  "to": "user@example.com",
  "channel": "email",
  "template": "welcome",
  "data": {
    "name": "Alice",
    "message": "Thanks for joining Pension App!",
    "link": "https://app.example.com/start",
    "temp_password": "TempPass123"
  }
}
```

3) pension-statement
- File: `src/templates/pension-statement.html`
- Description: Detailed pension statement for a period.
- Required data: `name`, `period`, `statement_rows_html`, `total`, `dashboard_link`
- Notes: `statement_rows_html` is expected to be an HTML fragment containing `<tr>...</tr>` rows for the statement table. The renderer will insert it into the statement table.
- Example payload:

```json
{
  "to": "user@example.com",
  "channel": "email",
  "template": "pension-statement",
  "data": {
    "name": "Alice",
    "period": "Q3 2025",
    "statement_rows_html": "<tr><td>Plan A</td><td>$100</td><td>$5</td><td>$105</td></tr>",
    "total": "$105",
    "dashboard_link": "https://app.example.com/dashboard"
  }
}
```

4) payment-confirmation
- File: `src/templates/payment-confirmation.html`
- Description: Confirms a received payment and shows a reference.
- Required data: `amount`, `date`, `reference`, `dashboard_link`
- Example payload:

```json
{
  "to": "user@example.com",
  "channel": "email",
  "template": "payment-confirmation",
  "data": {
    "amount": "$250.00",
    "date": "2025-12-01T14:30:00Z",
    "reference": "PAY-12345",
    "dashboard_link": "https://app.example.com/payments"
  }
}
```

5) password-reset
- File: `src/templates/password-reset.html`
- Description: Password reset email with a secure link.
- Required data: `name`, `reset_link`
- Example payload:

```json
{
  "to": "user@example.com",
  "channel": "email",
  "template": "password-reset",
  "data": {
    "name": "Alice",
    "reset_link": "https://app.example.com/reset?token=..."
  }
}
```

6) monthly-summary
- File: `src/templates/monthly-summary.html`
- Description: Highlights and quick summary for the month.
- Required data: `name`, `month`, `bullets_html`, `dashboard_link`
- Notes: `bullets_html` should be HTML list items like `<li>...</li>`.
- Example payload:

```json
{
  "to": "user@example.com",
  "channel": "email",
  "template": "monthly-summary",
  "data": {
    "name": "Alice",
    "month": "November 2025",
    "bullets_html": "<li>Contribution received: $200</li><li>Portfolio growth: 1.2%</li>",
    "dashboard_link": "https://app.example.com/dashboard"
  }
}
```

How to call the API (example)

```bash
curl -X POST http://localhost:5371/notify \
  -H 'Content-Type: application/json' \
  -d '{"to":"user@example.com","channel":"email","template":"otp","data":{"name":"Alice","code":"123456","expiryMinutes":10}}'
```

Renderer details
- The renderer replaces `{{ key }}` (whitespace tolerant) with the string value of `data.key`.
- For missing templates the renderer will fallback to `.txt` if present. Ensure your `template` field matches the filename (without extension).
- For lists/tables provide pre-rendered HTML fragments as described above.

If you'd like, I can also:
- Add example server-side helper functions to generate `statement_rows_html` and `bullets_html` safely.
- Add automated request validation against the OpenAPI `oneOf` schemas at runtime.
