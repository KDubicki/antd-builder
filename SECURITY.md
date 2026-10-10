# Security Policy

## Reporting a vulnerability

Please do **not** open a public issue for security problems. Report them privately through
GitHub's [private vulnerability reporting](../../security/advisories/new) for this repository,
or contact the maintainers directly.

Include a description, steps to reproduce, and the potential impact. We aim to acknowledge reports
within 3 business days.

## Handling secrets

- Never commit secrets. `.env*` files are git-ignored, except `.env.example`.
- Server secrets must not use the `NEXT_PUBLIC_` prefix.
- Rotate any credential that was exposed, even briefly.
