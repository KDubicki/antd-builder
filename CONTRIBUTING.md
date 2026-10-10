# Contributing

## Setup

```bash
corepack enable
pnpm install
cp .env.example .env.local
pnpm dev
```

`pnpm install` also installs the Git hooks (Husky).

## Workflow

1. Branch from `main` using the pattern `<type>/<short-description>`, for example
   `feat/canvas-dnd` or `fix/inspector-crash`.
2. Keep pull requests small and focused. Fill in the PR template.
3. Run `pnpm validate` before pushing. CI runs the same checks plus the build and e2e tests.
4. At least one approval from a code owner is required to merge. Prefer squash merges.

## Commit messages

We use [Conventional Commits](https://www.conventionalcommits.org), enforced by commitlint:

```
<type>(<optional scope>): <description>

feat(canvas): support nested drop targets
fix(ai): handle empty model response
chore(deps): bump antd to 6.7.0
```

Common types: `feat`, `fix`, `refactor`, `perf`, `test`, `docs`, `build`, `ci`, `chore`.

## Code conventions

- TypeScript strict mode. Avoid `any`, and validate external input (requests, env, LLM output)
  with Zod.
- Server-only code (secrets, LLM calls) lives in `src/lib/` and imports `server-only`.
- Components are server components by default. Add `'use client'` only where you need
  interactivity.
- Put unit tests next to the code they test (`*.test.ts(x)`). Put e2e tests in `e2e/`.
- Use antd theme tokens rather than hard-coded colors.
