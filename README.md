# ECOMERP — Email Inquiry & AI Dashboard

Enterprise email inquiry management system for ecomruns.com. Fetches real inquiries from techichamps.com via IMAP, AI-categorizes them with OpenRouter, extracts line items from attachments, and generates professional quotation PDFs.

## Features

- **📥 IMAP Auto-Sync** — Fetches inquiries from `@techichamps.com` every 5 minutes
- **🤖 AI Categorization** — OpenRouter (DeepSeek V3.1) categorizes each inquiry (Sales, Pricing, Technical Support, etc.) with priority, summary, key points, and suggested action
- **📊 Command Center Dashboard** — Stats cards with sparkline graphs, recent inquiries, live audit log, circular progress charts
- **📋 ERP-Style Inquiries Table** — 9-column table with status tabs, search, filters, pagination
- **🗂️ In-App Tabs** — Open multiple inquiries as tabs inside the ERP with Next/Previous navigation
- **📎 Attachment Extraction** — AI extracts line items (Part Number, NSN, Description, Qty, UOM, Serial) from PDF and Excel attachments
- **💰 Build Quotation** — Form pre-filled from extracted items, auto-calculates GST, generates professional PDF, sends via SMTP
- **🔔 Notifications** — Auto-fires when new inquiries arrive
- **📜 Audit Log** — Every action logged (IMAP fetch, AI categorization, quotation generation, etc.)
- **⚡ AI Eval** — Compare OpenRouter models side-by-side
- **🔄 AI Replay** — Draft professional replies with tone selection

### Department Modules

- **👥 HR Department** — Employee directory, leave requests, attendance tracking
- **🎨 Design Department** — Project tracker (brief → in-progress → review → delivered), team overview, category & progress analytics
- **📈 Sales Department** — Leads pipeline (Kanban + list views), 7-stage funnel (new → won/lost), per-rep performance stats, pipeline value in PKR
- **🚚 Operations Department** — Shipment tracking (sea/air/road/rail), 8-status workflow (pending → delivered/delayed/cancelled), volume & delivery-rate analytics

## Tech Stack

- **Framework:** Next.js 16 (App Router, Turbopack)
- **Language:** TypeScript 5
- **Styling:** Tailwind CSS 4 + shadcn/ui
- **State:** Zustand
- **IMAP:** ImapFlow + mailparser
- **AI:** OpenRouter (deepseek/deepseek-chat-v3.1)
- **PDF:** pdfkit (standalone build)
- **Email:** nodemailer (Hostinger SMTP)
- **Database:** Prisma + SQLite

## Setup

1. Clone the repo
2. Install dependencies: `bun install`
3. Copy `.env.example` to `.env` and fill in your credentials
4. Run the dev server: `bun run dev`
5. Open `http://localhost:3000`

## Environment Variables

See `.env.example` for all required environment variables:

- `IMAP_*` — IMAP connection (imap.hostinger.com:993)
- `INQUIRY_DOMAIN` — Filter inquiries by sender domain
- `OPENROUTER_API_KEY` — OpenRouter API key for AI
- `OPENROUTER_MODEL` — Model to use (default: deepseek/deepseek-chat-v3.1)
- `SMTP_*` — SMTP for sending quotation emails

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── emails/          # IMAP fetch + AI categorize
│   │   ├── attachment/      # Download attachment by UID
│   │   ├── extract-items/   # AI extract line items from attachment
│   │   ├── generate-quotation/  # Generate PDF quotation
│   │   ├── send-quotation/  # Send quotation via SMTP
│   │   ├── ai-eval/         # Compare AI models
│   │   ├── ai-replay/       # Generate AI reply
│   │   ├── hr/              # HR — employees, leaves, attendance
│   │   ├── design/projects/ # Design — projects CRUD
│   │   ├── sales/leads/     # Sales — leads pipeline CRUD
│   │   └── ops/shipments/   # Operations — shipments CRUD
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── sidebar/             # Sidebar, Topbar, TabBar
│   └── views/               # Dashboard, Inquiries, Notifications, AI Replay, AI Eval, Audit Log, Inquiry Detail, Quotation Form
│                            # + HR (Employees, Leaves, Attendance)
│                            # + Design (Overview, Projects, Team)
│                            # + Sales (Overview, Leads, Team)
│                            # + Operations (Overview, Shipments, Team)
└── lib/
    ├── imap.ts              # IMAP client (two-pass fetch)
    ├── categorize.ts        # OpenRouter categorization
    ├── store.ts             # Zustand store
    ├── types.ts             # Shared types
    └── use-auto-sync.ts     # Auto-sync hook

scripts/
└── seed-departments.ts     # Seed demo data for Design / Sales / Ops
```

## Seeding Demo Data

To populate the database with demo employees, design projects, sales leads, and shipments:

```bash
bun run scripts/seed-departments.ts
```

## License

Private — EcomRuns (Pvt) Ltd
