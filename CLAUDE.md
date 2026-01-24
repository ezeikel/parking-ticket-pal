# Claude Code Context

## Database (Neon)

This project uses Neon PostgreSQL with branch-based development:

- **Project ID**: `hidden-snowflake-44299487`
- **Organization**: Chewy Bytes (`org-fragrant-frog-77141390`)

### Branches

| Branch          | ID                           | Usage                              |
| --------------- | ---------------------------- | ---------------------------------- |
| **production**  | `br-red-sun-a4ynxrao`        | Production data (deployed site)    |
| **development** | `br-winter-feather-a4oxk7a5` | Local development data (localhost) |

**Important**: When the user is testing on `localhost`, always query the **development** branch. The production branch has different data.

### Migrations

**CRITICAL: Never use `prisma db push`** - it causes schema drift between the database and migration history.

#### Workflow

1. **Make schema changes** in `packages/db/prisma/schema.prisma`
2. **Create migration locally**: `cd packages/db && pnpm db:migrate`
3. **Build the db package**: `pnpm build` (compiles TypeScript after Prisma generates client)
4. **Commit & push** migration files to `main` branch
5. **Auto-deploy**: GitHub Action runs `prisma migrate deploy` on production

#### Commands (run from `packages/db`)

| Command            | Purpose                   | When to Use                     |
| ------------------ | ------------------------- | ------------------------------- |
| `pnpm db:migrate`  | Create + apply migration  | After schema changes            |
| `pnpm build`       | Compile TypeScript        | After db:migrate or db:generate |
| `pnpm db:deploy`   | Apply existing migrations | CI/CD only                      |
| `pnpm db:generate` | Regenerate Prisma client  | After pulling changes           |
| `pnpm db:push`     | **NEVER USE**             | Causes drift                    |
| `pnpm db:studio`   | Database GUI              | Debugging                       |

**Important**: Always run `pnpm build` after `db:migrate` or `db:generate` to compile the updated Prisma client.

## Project Structure

- **Monorepo** using Turborepo + pnpm workspaces
- `apps/web` - Next.js 15 web application
- `apps/mobile` - Expo/React Native mobile app
- `packages/db` - Prisma database client
- `packages/constants` - Shared constants
- `packages/types` - Shared TypeScript types

### Monorepo Constraints

**React version must stay in sync** across all apps and packages. pnpm's strict dependency isolation means version mismatches cause multiple React instances, leading to "Invalid hook call" errors. When upgrading React, update all workspaces together.

## Web App (apps/web)

### Key Features

- Parking ticket management and challenge generation
- AI-powered letter generation for ticket appeals
- Vehicle management
- Stripe subscription billing
- RevenueCat for mobile IAP

### Automation System

Located in `apps/web/utils/automation/`. Uses **Playwright MCP** to automate interactions with council/issuer websites.

#### Supported Issuers

- **Lewisham** - Direct council portal
- **Horizon** - Multi-council parking platform (used by many UK councils)
- **Westminster** - Westminster City Council

#### Functions

| Function    | Purpose                                  | File          |
| ----------- | ---------------------------------------- | ------------- |
| `verify`    | Verify ticket details on issuer website  | `verify.ts`   |
| `challenge` | Submit challenge/appeal on issuer portal | `challenge.ts`|

#### Adding New Issuers

1. Create issuer file in `apps/web/utils/automation/issuers/`
2. Export `verify` and `challenge` functions
3. Add to `VERIFY_FUNCTIONS` and `CHALLENGE_FUNCTIONS` maps
4. Update `isAutomationSupported()` in constants

## Mobile App (apps/mobile)

Built with Expo SDK 54 and React Native 0.81.

### Running the Mobile App

From `apps/mobile`:

**iOS:**

```bash
pnpm prebuild:ios  # Only when native dependencies change
pnpm ios           # Build and run on iOS simulator
```

**Android:**

```bash
pnpm prebuild:android  # Only when native dependencies change
pnpm android           # Build and run on Android emulator
```

**Development server only:**

```bash
pnpm start         # Start Metro bundler
pnpm dev:ios       # Start with iOS simulator
pnpm dev:android   # Start with Android emulator
```

**EAS Builds:**

```bash
pnpm eas:build:preview:ios      # Build iOS preview
pnpm eas:build:preview:android  # Build Android preview
pnpm eas:build:production       # Build production
```

Note: Prebuild regenerates native `ios/` and `android/` folders. Only run when adding native dependencies.

## Icons

Use `faSpinnerThird` from `@fortawesome/pro-solid-svg-icons` for loading spinners (not `faSpinner`). Use the `size` prop for FontAwesome icon sizing (e.g., `size="2x"`) rather than Tailwind width/height classes.

## Commits

Use semantic commit style (`type(scope): message`). Keep messages as one-liners, succinct but covering work done. Do not attribute Claude in commit messages.

## GitHub CLI

Use `gh` CLI when referencing GitHub repos that I own or public repos (e.g., `gh repo view`, `gh issue list`, `gh pr list`).
