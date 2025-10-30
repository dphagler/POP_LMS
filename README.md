# POP LMS Starter

Production-ready learning management starter built with Next.js 15, NextAuth.js v5, Prisma, Chakra UI, Sanity, and Vercel Postgres.

## Features

- ✅ Next.js App Router with TypeScript, Chakra UI, and reusable learner/admin primitives
- ✅ NextAuth.js (Google + optional magic links) with the Prisma adapter and Vercel Postgres
- ✅ YouTube heartbeat tracking API that conservatively marks lesson completion
- ✅ Sanity CMS schemas plus on-demand sync endpoint
- ✅ Optional integrations for Upstash Redis (leaderboards), Resend (email), and PostHog analytics
- ✅ Minimal learner and admin workspaces with streak badge support

## Tech stack

- [Next.js App Router](https://nextjs.org/docs/app) with TypeScript and server components
- [Chakra UI](https://chakra-ui.com/) for the component system, themed via [`lib/ui/theme.ts`](./lib/ui/theme.ts)
- Tailwind CSS utilities for layout spacing only (no DaisyUI plugins)
- Prisma ORM backed by Vercel Postgres
- Sanity CMS for course content management

## Styling

- ChakraProvider is configured once in the root layout to supply the POP theme and color tokens
- Chakra components replace previous shadcn/daisyUI primitives; DaisyUI is no longer installed
- Tailwind remains available for layout utilities and legacy classnames, with custom CSS in `app/globals.css` covering any remaining structural helpers

## Getting started

1. Copy environment variables:

   ```bash
   cp .env.example .env.local
   ```

2. Provision a [Vercel Postgres](https://vercel.com/docs/storage/vercel-postgres/quickstart) database and set `DATABASE_URL` in `.env.local`.

3. Add Google OAuth credentials, Auth.js secrets, and optional integrations to `.env.local`. When deploying to Vercel, configure `NEXTAUTH_URL=https://pop-lms.vercel.app` (or your custom domain) and `AUTH_TRUST_HOST=true` in both Preview and Production environments so Auth.js can validate callbacks. Refer to [`.env.example`](./.env.example) for a complete list of supported variables and see [`lib/env.ts`](./lib/env.ts) / [`lib/env.client.ts`](./lib/env.client.ts) for the runtime schema.

4. Install dependencies and run initial migrations (requires pnpm):

   ```bash
   pnpm install
   pnpm prisma:generate
   pnpm prisma:migrate
   ```

5. Seed the database with the POP Initiative org and demo admin (required before enabling Google auth):

   ```bash
   pnpm prisma db seed
   ```

   This upsert ensures the "POP Initiative" organization exists before Auth.js attempts to link Google accounts.

6. Start the dev server:

   ```bash
   pnpm dev
   ```

Visit `http://localhost:3000` to view the marketing page, `http://localhost:3000/signin` to authenticate with Google, and `/app` or `/admin` for learner/admin views. Run `pnpm build` locally (or in Vercel preview) to confirm production builds succeed without warnings.

## Admin access

Authenticated users default to the `LEARNER` role. To unlock the admin dashboard for your Google account:

1. Launch Prisma Studio and edit your user record:

   ```bash
   pnpm prisma studio
   ```

2. Locate your Google-authenticated user and update `role` to `ADMIN`.

Alternatively, you can promote an account from the command line with the helper script:

```bash
pnpm ts-node scripts/promote-admin.ts you@example.com
```

The script updates the matching `User` record to `role = "ADMIN"` and prints the result.

## YouTube heartbeat testing

1. Sign in as the seeded admin (`admin@poplms.dev`).
2. Navigate to `/app/lesson/seed-lesson`.
3. Start the embedded video; the client posts a heartbeat every 5 seconds to `/api/progress/heartbeat`.
4. Watch to at least 95% completion (or wait for the end event) to record a `completedAt` timestamp and streak badge computation.

## Sanity content sync

- Configure Sanity project ID, dataset, and read token in `.env.local`.
- Use the provided schemas in `sanity/schemas` when scaffolding the Sanity Studio.
- From the admin dashboard, click **Sync from Sanity** to upsert courses/modules/lessons.

## Scripts

- `pnpm dev` – start Next.js dev server
- `pnpm build` – production build
- `pnpm start` – run the compiled app
- `pnpm lint` – run ESLint
- `pnpm typecheck` – run TypeScript
- `pnpm prisma:push` – push Prisma schema to the database
- `pnpm prisma:migrate` – run/create migrations
- `pnpm prisma:generate` – generate Prisma client
- `pnpm prisma db seed` – seed database with the POP Initiative org and admin
- `pnpm check:routes` – verify that critical application routes still exist

## CI

GitHub Actions workflow (`.github/workflows/ci.yml`) runs linting and type-checking on pull requests. Add `pnpm check:routes` to any CI job to fail fast when essential routes such as `/app`, `/settings`, or `/admin` are accidentally removed.

## Optional integrations

- **Upstash Redis** – set `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` to enable leaderboard helpers in `lib/redis.ts`.
- **Resend** – set `RESEND_API_KEY` to send assignment invite emails via `lib/email.ts`.
- **Email magic links** – set `AUTH_EMAIL_ENABLED=true`, provide a branded from address via `AUTH_EMAIL_FROM`, and optionally tune
  `AUTH_EMAIL_SUBJECT`, `AUTH_EMAIL_RATE_LIMIT_MAX`, `AUTH_EMAIL_RATE_LIMIT_WINDOW`, and `AUTH_EMAIL_TOKEN_MAX_AGE` to send Resend-backed
  magic links for sign-in.
- **PostHog** – set `NEXT_PUBLIC_POSTHOG_KEY` (and optionally `NEXT_PUBLIC_POSTHOG_HOST`) to enable telemetry. Leave the key unset to
  disable analytics entirely. When enabled in production, client error events are sampled (25%) and scrubbed before being sent to
  PostHog.

## Recommended lint guardrails

Enable ESLint rules such as `no-console` and `no-unused-vars` (along with [`unused-imports/no-unused-imports`](https://github.com/sweepline/eslint-plugin-unused-imports)) to keep dead code and debug logging from slipping back into the codebase. Add them to `.eslintrc.js` once the project is ready to enforce the stricter posture.

