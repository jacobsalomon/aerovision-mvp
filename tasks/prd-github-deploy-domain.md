# PRD: GitHub Setup, Vercel + Turso Deployment, and Custom Domain

**Created:** 2026-02-15
**Status:** In Progress
**Project:** AeroVision MVP (`~/Desktop/Primary_OIR/MVC/MVP/aerovision-mvp/`)

---

## Overview
Set up the AeroVision MVP for professional development and deployment. This covers three phases: (1) clean up and configure the GitHub repo so it's ready for collaborators, (2) deploy to Vercel with Turso as the cloud database, and (3) connect Jake's Squarespace custom domain. The app is a demo/MVP with seeded data — AI features are mocked, no Anthropic API key needed in production.

## Goals
- GitHub repo is clean, documented, and ready for collaborators (developers, contractors, AI agents)
- `main` branch is protected and auto-deploys to production on push
- App is live on Vercel with a working cloud database (Turso)
- Custom domain (via Squarespace) points to the live app
- A `.env.example` file documents all required environment variables
- A professional README explains the project, setup, and architecture

## Quality Gates

These must pass for every user story:
- `npm run build` — Production build succeeds (uses Turbopack)
- `npx tsc --noEmit` — TypeScript type checking passes
- Manual verification: app loads and demo pages work at the deployed URL

## User Stories

### US-001: Audit and clean up the repo
**Status:** Pending
**Description:** As a collaborator, I want the repo to only contain necessary files so I'm not confused by temp files, logs, or stale artifacts.

**Acceptance Criteria:**
- [ ] Remove any temp files, build artifacts, or unnecessary logs from the repo
- [ ] Ensure `dev.db` is in `.gitignore` (production will use Turso, local dev uses local SQLite)
- [ ] Ensure `generated/prisma/` is in `.gitignore` (regenerated on install)
- [ ] Ensure `.env` is in `.gitignore` (secrets never committed)
- [ ] Add `.env.example` with all required env vars (no real values)
- [ ] Remove any stale or redundant config files
- [ ] Verify `node_modules/` is not committed

### US-002: Write a professional README
**Status:** Pending
**Description:** As a collaborator, I want a clear README so I can understand the project and get it running locally in under 10 minutes.

**Acceptance Criteria:**
- [ ] Project overview section (what AeroVision is, who it's for)
- [ ] Tech stack section (Next.js 15, Prisma 7, SQLite, Tailwind 4, shadcn/ui)
- [ ] Local setup instructions (clone, install, seed, run)
- [ ] Key demo pages listed with descriptions and paths
- [ ] Environment variables documented
- [ ] Folder structure overview
- [ ] No default Next.js boilerplate README content remains

### US-003: Configure GitHub branch protection and repo settings
**Status:** Pending
**Description:** As a repo owner, I want `main` protected so no one (including me) accidentally pushes broken code directly to production.

**Acceptance Criteria:**
- [ ] `main` branch requires a passing build status check before merging
- [ ] Direct pushes to `main` are blocked (must go through PR)
- [ ] Repo description and topics are set on GitHub
- [ ] Repo is private
- [ ] A `dev` branch is created for active development
- [ ] Default branch remains `main`

### US-004: Migrate database from local SQLite to Turso
**Status:** Pending
**Description:** As a developer, I want the app to use Turso (cloud SQLite) so it works on Vercel's serverless platform.

**Acceptance Criteria:**
- [ ] Turso CLI installed and authenticated
- [ ] Turso database created for AeroVision
- [ ] `@prisma/adapter-libsql` and `@libsql/client@0.8.1` installed
- [ ] `@prisma/adapter-better-sqlite3` removed from dependencies
- [ ] `lib/db.ts` updated to use Turso adapter with env vars
- [ ] `next.config.ts` `serverExternalPackages` updated (replace better-sqlite3 entries with libsql entries)
- [ ] Prisma schema pushed to Turso database
- [ ] Seed data loaded into Turso database
- [ ] App runs locally pointing at Turso and all demo pages work
- [ ] Local dev fallback: app can still use local SQLite when Turso env vars are absent

### US-005: Deploy to Vercel
**Status:** Pending
**Description:** As a founder, I want the app live on a public URL so I can share it with investors and partners.

**Acceptance Criteria:**
- [ ] Vercel project created and linked to GitHub repo
- [ ] Environment variables set in Vercel dashboard (`TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`)
- [ ] `postinstall` script added to `package.json` for `prisma generate`
- [ ] Production build succeeds on Vercel
- [ ] App loads at `*.vercel.app` URL
- [ ] All demo pages work: `/glasses-demo`, `/demo`, `/dashboard`, `/parts/demo-hpc7-overhaul`
- [ ] Auto-deploy triggers on push to `main`

### US-006: Connect Squarespace custom domain
**Status:** Pending
**Description:** As a founder, I want my custom domain pointing to the app so it looks professional when I share it.

**Acceptance Criteria:**
- [ ] Custom domain added in Vercel project settings
- [ ] DNS instructions provided for Squarespace (specific records to add/change)
- [ ] SSL certificate auto-provisioned by Vercel
- [ ] App accessible at custom domain with HTTPS
- [ ] `www` subdomain redirects to apex (or vice versa) cleanly

## Functional Requirements
- FR-1: The GitHub repo must be private with branch protection on `main`
- FR-2: All pushes to `main` must trigger an automatic Vercel deployment
- FR-3: The Turso database must contain all 9 seeded components and their lifecycle data
- FR-4: The app must use `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` environment variables for database connection
- FR-5: The README must be written for a non-technical audience with copy-pasteable setup commands
- FR-6: The custom domain must serve the app over HTTPS with no mixed-content warnings

## Non-Goals
- Setting up CI/CD beyond Vercel's built-in auto-deploy
- Configuring staging/preview environments (can add later)
- Enabling the Anthropic AI features (mocked for now)
- Setting up monitoring, analytics, or error tracking
- Database backups or replication

## Technical Considerations
- `@libsql/client` must be pinned to `0.8.1` for Prisma 7 compatibility
- `output: "standalone"` is already configured in `next.config.ts`
- Turbopack is configured for both `dev` and `build` scripts
- The ESLint config `.js` extension fix is already applied
- Squarespace DNS changes can take up to 48 hours to propagate (usually 15-30 minutes)
- Prisma migrations don't work directly against Turso — use `prisma db push` instead

## Changes Already Made (This Session)
- Added `output: "standalone"` to `next.config.ts`
- Changed build script to use Turbopack: `NODE_OPTIONS='--max-old-space-size=8192' next build --turbopack`
- Changed dev script to use Turbopack: `next dev --turbopack`
- Fixed ESLint config `.js` extension in `eslint.config.mjs`
- Created `scripts/start.sh` (Railway startup — may not be needed now)
- Created `railway.json` (may not be needed now — we're going Vercel)
- Installed Railway CLI via Homebrew (can be removed)

## Pickup Instructions (For New Session)
1. Read this PRD: `~/Desktop/Primary_OIR/MVC/MVP/aerovision-mvp/tasks/prd-github-deploy-domain.md`
2. Check which user stories are marked complete
3. Resume from the first pending story
4. The app's project CLAUDE.md is at `~/Desktop/Primary_OIR/MVC/MVP/aerovision-mvp/CLAUDE.md`
5. Git remote: `https://github.com/jacobsalomon/aerotrack-mvp.git`
6. Jake is non-technical — explain everything in plain language
7. Jake has accounts: GitHub, Vercel, Squarespace (domain registrar)
8. The dev server runs on `localhost:3000` — may still be running from earlier

## Open Questions
- What is Jake's custom domain name? (Needed for US-006, can be added during that story)
- Does Jake want preview deployments for PRs to `dev`? (Nice-to-have, skipped for now)
