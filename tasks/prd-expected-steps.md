# PRD: Expected Steps / SOP Feature

## Overview
Add an `expectedSteps` field to CaptureSession so technicians or supervisors can define what maintenance steps should be performed for a given job. When no CMM (Component Maintenance Manual) is available, Gemini uses these user-defined steps as the checklist for procedure verification instead of inventing its own. The web dashboard gets a UI to create/edit these SOPs on session detail pages.

**Priority ladder for procedure verification:**
1. **CMM** (highest authority) — if a CMM is linked via the session's component
2. **Expected Steps** (user-defined SOP) — if someone entered steps for this session
3. **AI-Inferred** (fallback) — Gemini infers steps from video alone

## Goals
- Let supervisors/technicians define expected maintenance steps before or after capture
- Give Gemini a concrete checklist to verify against when no CMM exists
- Track which verification source was used so reviewers know the basis of the analysis
- Keep it simple — one free-text field, no new tables or complex UI

## Quality Gates

These commands must pass for every user story:
- `npx tsc --noEmit` — Type checking
- `npm run build` — Production build

For UI stories, also include:
- Visual verification via dev server

## User Stories

### US-001: Add expectedSteps and verificationSource to Database
**Description:** As a developer, I want to add an `expectedSteps` column to `CaptureSession` and a `verificationSource` column to `SessionAnalysis` so the system can store user-defined SOPs and track how procedure steps were verified.

**Acceptance Criteria:**
- [ ] `expectedSteps String?` added to `CaptureSession` model in Prisma schema
- [ ] `verificationSource String?` added to `SessionAnalysis` model in Prisma schema
- [ ] Database migrated with `npx prisma db push`
- [ ] PATCH `/api/mobile/sessions/[id]` accepts and persists `expectedSteps`
- [ ] GET `/api/mobile/sessions/[id]` returns `expectedSteps` in the response

### US-002: Web Dashboard — Edit Expected Steps on Session Detail
**Description:** As a supervisor, I want to view and edit the expected maintenance steps for a capture session from the web dashboard so I can define the SOP before or after the technician captures evidence.

**Acceptance Criteria:**
- [ ] New "Expected Steps" card on the session detail page (`/sessions/[id]`)
- [ ] Card shows the current expected steps (or a placeholder if empty)
- [ ] Editable via a textarea with a Save button
- [ ] Saves via PATCH to `/api/mobile/sessions/[id]` with `expectedSteps`
- [ ] Shows success/error feedback after save
- [ ] Card appears between session info and evidence sections

### US-003: Pass Expected Steps to Gemini Analysis Prompt
**Description:** As the system, I want to include user-defined expected steps in the Gemini analysis prompt (when no CMM is available) so the AI verifies against a real checklist instead of inventing steps.

**Acceptance Criteria:**
- [ ] `analyzeSessionVideo()` accepts an optional `expectedSteps` parameter
- [ ] When CMM is available, CMM is used (no change)
- [ ] When no CMM but expectedSteps exist, they're injected into the prompt as the verification checklist
- [ ] When neither exists, Gemini infers steps from video (current behavior)
- [ ] `verificationSource` is set to "cmm", "expected_steps", or "ai_inferred" and saved to SessionAnalysis
- [ ] The analyze-session endpoint loads expectedSteps from the session and passes them through

### US-004: Show Verification Source in Mobile Session Summary
**Description:** As a technician reviewing results, I want to see what the AI used to verify my work (CMM, expected steps, or AI-inferred) so I know how reliable the procedure verification is.

**Acceptance Criteria:**
- [ ] Session Summary card shows a "Verified against" line
- [ ] Displays "CMM" when verificationSource is "cmm"
- [ ] Displays "Expected Steps (SOP)" when verificationSource is "expected_steps"
- [ ] Displays "AI-Inferred (no SOP)" when verificationSource is "ai_inferred"
- [ ] Gracefully handles null/missing verificationSource (older sessions)

## Functional Requirements
- FR-1: The `expectedSteps` field is optional free-text (nullable String)
- FR-2: Expected steps can be set/updated at any time via PATCH endpoint
- FR-3: The Gemini prompt clearly distinguishes between CMM-verified and SOP-verified analysis
- FR-4: The `verificationSource` field records which source was used for each analysis
- FR-5: The mobile app does NOT need to input expected steps — that's a web dashboard function

## Non-Goals
- Structured step templates or libraries (future)
- Per-component SOP templates that auto-apply (future)
- Mobile app SOP editing (web-only for now)
- Versioning or history of expected steps changes

## Technical Considerations
- Backend: aerovision-mvp (Next.js 15, Prisma 7, SQLite)
- Mobile: aerovision-capture (Expo/React Native)
- Gemini prompt lives in `lib/ai/gemini.ts` → `analyzeSessionVideo()`
- Session PATCH endpoint at `app/api/mobile/sessions/[id]/route.ts`
- Web session detail page at `app/(dashboard)/sessions/[id]/page.tsx`

## Success Metrics
- Expected steps can be saved and retrieved via API
- Gemini uses expected steps when no CMM is available
- verificationSource correctly reflects which source was used
- Web dashboard allows editing expected steps with clear feedback

## Open Questions
- None — scope is well-defined
