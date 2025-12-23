Naming convention for templates

- Prefer HTML templates for rich, responsive emails: use `kebab-case` filenames and `.html` extension, e.g. `otp.html`, `welcome.html`, `pension-statement.html`.
- Keep placeholder tokens as `{{ name }}`, `{{ code }}`, etc. The renderer replaces `{{ key }}` (whitespace allowed).
- If an `.html` template is present the renderer will use it; otherwise it will fallback to `.txt`.
- For dynamic table rows or lists, include a pre-rendered HTML fragment placeholder such as `{{ statement_rows_html }}` or `{{ bullets_html }}`.

Examples:
- `otp.html` — one-time passcode email (placeholder: `{{ code }}`, `{{ name }}`)
- `welcome.html` — onboarding (placeholder: `{{ name }}`, `{{ link }}`)
- `pension-statement.html` — monthly/annual statement (placeholder: `{{ statement_rows_html }}`, `{{ total }}`, `{{ period }}`)
