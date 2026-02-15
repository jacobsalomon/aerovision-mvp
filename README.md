# AeroVision MVP

**AI-powered documentation assistant for aerospace maintenance.**

AeroVision automates the paperwork that aerospace mechanics generate during component overhauls — FAA Form 8130-3, work orders, findings reports, and test documentation. A mechanic works normally (narrating, snapping photos, inspecting parts), and AeroVision captures everything into a digital lifecycle record that follows the part across companies.

Built by [The Mechanical Vision Corporation](https://github.com/jacobsalomon/aerotrack-mvp).

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS 4 + shadcn/ui |
| Database | SQLite (local) / Turso (production) via Prisma 7 |
| PDF Generation | pdf-lib |
| Charts | Recharts |
| Icons | Lucide React |
| QR Codes | qrcode.react |

---

## Getting Started

### Prerequisites

- **Node.js** 18+ ([download](https://nodejs.org/))
- **npm** (comes with Node.js)

### Setup

```bash
# 1. Clone the repo
git clone https://github.com/jacobsalomon/aerotrack-mvp.git
cd aerotrack-mvp

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env
# The defaults work for local development — no changes needed

# 4. Generate the Prisma client
npx prisma generate

# 5. Create and seed the database with demo data
npx prisma db push
npx prisma db seed

# 6. Start the dev server
npm run dev
```

Open **http://localhost:3000** — you should see the AeroVision dashboard.

> **Note:** The first page load after starting the dev server takes ~10 seconds to compile. Subsequent loads are instant.

---

## Demo Pages

| Page | Path | What It Shows |
|------|------|--------------|
| **Glasses Demo** | `/glasses-demo` | Full AR glasses experience — simulates a mechanic wearing smart glasses during an overhaul. 4 phases: pre-start, HUD overlay, document generation, and document review. |
| **Part Detail** | `/parts/demo-hpc7-overhaul` | Complete lifecycle view of a high-pressure compressor overhaul — every event from manufacturing to release, with compliance documents and PDF downloads. |
| **Interactive Demo** | `/demo` | Step-by-step walkthrough of the digital thread concept. |
| **Dashboard** | `/dashboard` | Overview of all tracked components, alerts, and system status. |
| **Capture** | `/capture` | Evidence capture interface for mechanics in the field. |
| **Integrity** | `/integrity` | Exception and anomaly tracking across components. |
| **Analytics** | `/analytics` | Charts and metrics for fleet-wide component health. |
| **Knowledge Base** | `/knowledge` | Searchable reference library for maintenance procedures. |
| **Print Labels** | `/print-labels` | QR code label generator for physical parts. |

---

## Project Structure

```
aerovision-mvp/
├── app/                    # Next.js App Router pages and API routes
│   ├── (dashboard)/        # Main app pages (sidebar layout)
│   │   ├── dashboard/      # Home dashboard
│   │   ├── parts/[id]/     # Individual part detail pages
│   │   ├── capture/        # Evidence capture interface
│   │   ├── demo/           # Interactive demo walkthrough
│   │   └── ...             # Analytics, integrity, knowledge, etc.
│   ├── glasses-demo/       # AR glasses demo (standalone layout)
│   ├── api/                # API routes (documents, components, AI, exports)
│   └── layout.tsx          # Root layout
├── components/             # React components
│   ├── ui/                 # shadcn/ui base components
│   ├── documents/          # FAA form renderers (8130-3, 337, 8010-4)
│   ├── demo/               # Demo-specific components
│   └── ...
├── lib/                    # Utilities and database client
│   └── db.ts               # Prisma database singleton
├── prisma/                 # Database schema and seed data
│   ├── schema.prisma       # Data model
│   └── seed.ts             # 9 demo components with full lifecycle data
├── public/                 # Static assets (glasses photos, icons)
├── specs/                  # Feature specifications
├── tasks/                  # PRDs and task tracking
└── generated/              # Auto-generated Prisma client (gitignored)
```

---

## Environment Variables

See [`.env.example`](.env.example) for all required variables.

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Local dev | SQLite connection string. Default: `file:./dev.db` |
| `TURSO_DATABASE_URL` | Production | Turso cloud database URL |
| `TURSO_AUTH_TOKEN` | Production | Turso authentication token |

> **AI features** are mocked in the demo — no Anthropic API key is needed.

---

## Scripts

| Command | What It Does |
|---------|-------------|
| `npm run dev` | Start development server (Turbopack) |
| `npm run build` | Production build (Turbopack) |
| `npm start` | Start production server |
| `npm run lint` | Run ESLint |
| `npx prisma db seed` | Seed the database with 9 demo components |
| `npx prisma studio` | Open the database GUI |

---

## Deployment

This app deploys to **Vercel** with **Turso** as the cloud database. See the deployment guide in `tasks/prd-github-deploy-domain.md` for full instructions.

---

## License

Private. All rights reserved.
