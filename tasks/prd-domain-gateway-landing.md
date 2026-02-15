[PRD]
# PRD: MVC Domain Gateway & Landing Page

## Overview

Set up `mechanicalvisioncorp.com` as a professional gateway for The Mechanical Vision Corporation. The domain serves a sleek, minimal landing page with two CTAs — "Demo" (linking to the AeroVision MVP at `/aerovision-demo`) and "Pitch" (linking to the investor seed deck at `/pitch`). All three experiences are served under one domain using Vercel's multi-zone rewrite pattern, keeping each project as an independent codebase.

## Goals

- Present MVC with a clean, professional web presence at `mechanicalvisioncorp.com`
- Route `/aerovision-demo/*` to the AeroVision MVP seamlessly (no visible redirect)
- Route `/pitch/*` to the investor seed deck seamlessly
- Match the seed-deck's blue/white professional design language on the landing page
- Keep all three projects as independent codebases that deploy independently

## Quality Gates

These commands must pass for every user story:
- `npx tsc --noEmit` — Type checking
- `next build` — Production build

For UI stories, also include:
- Verify in browser using Chrome DevTools MCP

## User Stories

### US-001: Deploy seed-deck to Vercel with `/pitch` basePath

**Description:** As a developer, I want the seed-deck deployed to Vercel with `basePath: '/pitch'` so that it can be served under `mechanicalvisioncorp.com/pitch`.

**Acceptance Criteria:**
- [ ] `aerovision-seed-deck` repo is linked to a new Vercel project
- [ ] `basePath: '/pitch'` added to the seed-deck's `next.config.ts`
- [ ] All slides accessible at `<vercel-url>/pitch`
- [ ] Navigation between slides works correctly under the `/pitch` prefix
- [ ] Static assets (fonts, images) load correctly under the prefix
- [ ] Changes committed and pushed to the seed-deck repo

### US-002: Add `/aerovision-demo` basePath to AeroVision MVP

**Description:** As a developer, I want the AeroVision MVP to serve all routes under `/aerovision-demo` so it integrates seamlessly when proxied from the gateway domain.

**Acceptance Criteria:**
- [ ] `basePath: '/aerovision-demo'` added to `next.config.ts`
- [ ] All `<Link>` navigation works (Next.js auto-prepends basePath)
- [ ] Hardcoded paths audited and updated:
  - Glasses demo "View Part Details" button link
  - Any `fetch('/api/...')` calls in client components
  - Any `<a href="...">` raw links
  - Image paths in `<img>` tags (not Next.js `<Image>`)
- [ ] Glasses demo accessible at `<vercel-url>/aerovision-demo/glasses-demo`
- [ ] Parts page accessible at `<vercel-url>/aerovision-demo/parts/demo-hpc7-overhaul`
- [ ] PDF download endpoints work under the new prefix
- [ ] Dashboard accessible at `<vercel-url>/aerovision-demo`
- [ ] Changes committed and pushed via PR to main

### US-003: Build gateway landing page with rewrites

**Description:** As a visitor, I want to see a professional MVC landing page at the root domain with clear paths to the product demo and investor pitch.

**Acceptance Criteria:**
- [ ] New Next.js project created (e.g., `mvc-gateway`)
- [ ] Landing page at `/` with:
  - "The Mechanical Vision Corporation" or "AeroVision" as the hero text
  - Tagline: "The Mechanic Works. The Paperwork Writes Itself." (with keyword pill styling)
  - "Demo" CTA button → `/aerovision-demo/glasses-demo`
  - "Pitch" CTA button → `/pitch`
- [ ] Styling matches seed-deck design language:
  - Blue gradient background (`from-blue-500 to-blue-900`)
  - Inter font
  - White text on blue
  - Keyword pill badge on tagline (`bg-gray-900 text-white rounded-md`)
  - Minimal and sleek — no scrolling needed
- [ ] `next.config.ts` configured with rewrites:
  - `/aerovision-demo/:path*` → `https://<aerovision-mvp-vercel-url>/aerovision-demo/:path*`
  - `/pitch/:path*` → `https://<seed-deck-vercel-url>/pitch/:path*`
- [ ] Page verified visually in Chrome DevTools
- [ ] Responsive — looks good on mobile
- [ ] Committed to a new GitHub repo

### US-004: Deploy gateway and connect `mechanicalvisioncorp.com`

**Description:** As Jake, I want `mechanicalvisioncorp.com` serving the landing page with working demo and pitch links so I can share one professional URL.

**Acceptance Criteria:**
- [ ] Gateway project deployed to Vercel
- [ ] `mechanicalvisioncorp.com` added as custom domain on the Vercel project
- [ ] DNS records configured (CNAME or A record pointing to Vercel)
- [ ] SSL certificate provisioned by Vercel (automatic)
- [ ] `mechanicalvisioncorp.com` → shows landing page
- [ ] `mechanicalvisioncorp.com/aerovision-demo/glasses-demo` → shows glasses demo
- [ ] `mechanicalvisioncorp.com/pitch` → shows seed deck slide 1
- [ ] All three experiences work end-to-end (no broken links, assets, or navigation)

## Functional Requirements

- FR-1: The landing page must load in under 2 seconds
- FR-2: CTA buttons must be immediately visible without scrolling (above the fold)
- FR-3: Rewrites must be transparent — URL bar always shows `mechanicalvisioncorp.com/...`
- FR-4: Each sub-project remains independently deployable via its own Vercel project
- FR-5: The landing page must be responsive (mobile and desktop)
- FR-6: Landing page uses "AeroVision" and "The Mechanical Vision Corporation" (not "AeroTrack")

## Non-Goals (Out of Scope)

- Full marketing website with multiple sections, about page, etc.
- Contact forms or email capture
- Analytics or tracking (can be added later)
- Blog or content management
- Custom 404 pages for sub-projects
- SEO optimization beyond basic meta tags

## Technical Considerations

- **Multi-zone pattern**: Vercel's approach for multiple Next.js apps under one domain. The gateway "owns" the domain and proxies sub-paths to other Vercel projects via `rewrites`.
- **basePath**: Required in each sub-project so `<Link>`, `<Image>`, and `_next/static` assets resolve correctly under their prefix. Next.js auto-prepends basePath to these.
- **Rewrite vs redirect**: Must use `rewrites` (not `redirects`) so the browser URL stays on `mechanicalvisioncorp.com`.
- **Squarespace DNS**: Domain DNS must point to Vercel. If there's currently a live Squarespace site, it will stop working once DNS is pointed to Vercel.
- **Seed-deck references "AeroTrack"**: The landing page should use current branding ("AeroVision" / "The Mechanical Vision Corporation"). The seed-deck itself can keep its current copy for now.
- **Existing AeroVision Vercel deployment**: Adding `basePath` changes all routes. The `aerovision-mvp.vercel.app` URL will serve pages under `/aerovision-demo/` prefix after this change.

## Success Metrics

- All three URLs work: `/`, `/aerovision-demo/glasses-demo`, `/pitch`
- Page loads are fast (no noticeable delay from rewrites)
- Jake can share `mechanicalvisioncorp.com` as the single professional entry point
- Design quality matches the seed-deck's polished investor-grade aesthetic

## Open Questions

- Is there currently a live Squarespace website at `mechanicalvisioncorp.com` that would be replaced?
- Should `www.mechanicalvisioncorp.com` also be configured as an alias?
- Does Jake want any specific imagery/logo on the landing page, or text-only?
- Should the "Demo" CTA go to `/aerovision-demo` (dashboard) or `/aerovision-demo/glasses-demo` (the interactive glasses demo directly)?

[/PRD]
