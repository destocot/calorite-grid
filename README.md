# Calorie Grid

Mobile-only PWA for logging calories in as few taps as possible. Home is a grid
of your foods — tap a card to log it for today, tap again to un-log it. Resets at
local midnight.

TanStack Start · Drizzle · Neon Postgres · Better Auth

## Setup

```bash
pnpm install
cp .env.example .env.local   # fill in DATABASE_URL and BETTER_AUTH_SECRET
pnpm db:push
pnpm dev
```

Generate a secret with `pnpm dlx @better-auth/cli secret`.

## Scripts

| Script           | Does                           |
| ---------------- | ------------------------------ |
| `pnpm dev`       | Dev server on :3000            |
| `pnpm build`     | Production build to `.output/` |
| `pnpm db:push`   | Sync schema to the database    |
| `pnpm db:studio` | Browse the database            |
| `pnpm lint`      | ESLint                         |
| `pnpm format`    | Prettier + ESLint autofix      |
| `pnpm check`     | Prettier check                 |

No migration workflow — `db:push` is the only path from `src/db/schema.ts` to the
database.

## Notes

Signup is disabled (`disableSignUp` in `src/lib/auth.ts`). Flip it to create an
account, then turn it back off.

Login is username + password. Better Auth requires an email internally, so signup
synthesizes `<username>@calorie.local`. It is never shown or used.

Server functions are endpoints reachable on their own, so every one that touches
user data must attach `authMiddleware` from `src/lib/auth-middleware.ts`. Route
guards only control navigation.

One food can be logged at most once per day. That is enforced by a unique
constraint on `(user_id, food_id, local_date)`, not by app code.
