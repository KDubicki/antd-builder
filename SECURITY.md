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

## Server-side protections

- `/api/data/fetch` fetches user-supplied URLs. It only reaches public addresses (checked at
  connect time and after redirects), with size and time limits. See `src/lib/remoteJson`.
- API routes that cost resources are rate-limited per client (`src/lib/rateLimit`). The limit
  keys on `X-Forwarded-For`, which is only trustworthy behind a proxy that sets it.
- Shared project snapshots are public to anyone holding the link until they expire
  (`SHARES_TTL_DAYS`) or are deleted. Don't share projects that contain confidential mock data.
- Share delete tokens are stored on the server only as SHA-256 hashes and compared in constant
  time.
