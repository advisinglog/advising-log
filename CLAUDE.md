# CLAUDE.md — AdvisingLog Project Brief

> This file is the AI agent's single source of truth for the AdvisingLog project.
> It sits at the repo root alongside `rule.md` (legal guardrails in `.docs/03-compliance/`).

## 1. What This Project Is

**AdvisingLog** is a web-based student advising record system for the Software Engineering (SE) program
at Mae Fah Luang University. It replaces the current paper-based advising workflow with an online system
that covers: advising requests, scheduling, interaction logging, follow-ups, exit/dropout case management,
and QA reporting — all built to produce evidence for **AUN-QA Criterion 6** (Student Support Services),
with links to **Criterion 5** (Staff Quality / workload) and **Criterion 8** (Output / dropout analysis).

## 2. User Roles (4 roles — never add more without explicit approval)

| Role | What they can do |
|------|-----------------|
| **Student** | Submit advising requests, view own history, complete follow-up tasks, submit exit forms, fill Student Voice surveys |
| **Advisor** | Accept/schedule sessions, write advising logs, assign follow-ups, create early warnings, make referrals, submit exit assessments |
| **Program Chair / QA Coordinator** | View aggregate dashboards & analytics, review exit cases, export QA reports (sees de-identified data only, except scoped dropout case-level access) |
| **Admin** | Manage users, import/maintain student-advisor roster, configure advising categories & document types, view audit logs, manage AI API keys |

## 3. Tech Stack (locked — do not add libraries without discussion)

| Layer | Technology |
|-------|-----------|
| Frontend | React 19 + Vite + TypeScript |
| UI Components | Tailwind CSS + shadcn/ui + Lucide Icons |
| Backend | Cloudflare Workers + Hono |
| Database | Cloudflare D1 (SQLite) + Drizzle ORM |
| Media Storage | Cloudinary (authenticated/private URLs) |
| Validation | Zod (shared schemas, frontend + backend) |
| Charts | Recharts |
| Excel/CSV Export | SheetJS (xlsx) |
| Testing | Vitest (unit/integration) + Playwright (E2E) |
| i18n | Custom LanguageContext (Thai / English toggle) |

## 4. Repository Layout

```
advising-log/
├── CLAUDE.md              # ← this file (project brief for the AI agent)
├── AGENTS.md              # coding standards & role permissions
├── DESIGN.md              # design tokens, color palette, component guidelines
├── README.md              # setup & run instructions
├── .docs/
│   ├── 01-requirements/   # proposal.md, spec.md, backlog.md
│   ├── 02-design/         # user-journey.md, feature-list.md, diagrams/ (D1–D4)
│   └── 03-compliance/     # rule.md (PDPA, Computer Crime Act, ETA)
├── frontend/
│   └── src/
│       ├── pages/         # student/ advisor/ qa/ admin/ LoginPage.tsx
│       ├── components/    # layout/ ui/ (reusable shadcn components)
│       ├── contexts/      # AuthContext, LanguageContext, ThemeContext
│       ├── services/      # apiClient.ts
│       ├── types/         # index.ts (shared TypeScript interfaces)
│       └── utils/         # dateUtils, calendarUtils, exportUtils
├── backend/
│   └── src/
│       ├── index.ts       # Hono API routes & middleware
│       └── db/
│           ├── schema.ts  # Drizzle ORM table definitions (16 tables)
│           └── seed.sql   # Initial seed data
└── slide/                 # Course lecture slides (W2–W6, CoffeeAI case study)
```

## 5. Database Schema (16 tables in Drizzle ORM)

1. `users` — Student, Advisor, QA Chair, Admin accounts
2. `student_advisor_assignments` — Roster mapping (student ↔ advisor)
3. `advising_requests` — Student advising requests with category, PDPA consent, status lifecycle
4. `appointments` — Scheduled sessions (date, time, location, confirmation)
5. `advising_sessions` — Completed session records (summary, problem, advice, actions, outcome)
6. `follow_ups` — Post-session tasks assigned by advisor
7. `follow_up_progress` — Student progress updates on follow-up tasks
8. `referrals` — Referrals to specialized units (counseling, financial, etc.)
9. `exit_cases` — Withdrawal, leave of absence, transfer, dropout cases with reason codes
10. `student_voice_responses` — Voluntary departure feedback surveys (de-identified)
11. `documents` — Cloudinary references for uploaded files (public_id only, no binary)
12. `early_warnings` — Risk indicators flagged by advisors
13. `audit_logs` — PDPA & security audit trail (action, user, IP, timestamp)
14. `ai_api_keys` — Multi-key AI governance configuration
15. `advising_category_configs` — Admin-configurable advising categories (TH/EN labels)
16. `document_type_configs` — Admin-configurable document types with format/size rules

## 6. Core Workflow (1 locked workflow for Alpha Demo)

**End-to-end advising session flow:**

```
Student submits request (3-step wizard with PDPA consent)
    → System auto-routes to assigned advisor (via roster)
    → Advisor accepts & schedules appointment
    → Advisor completes session & writes advising log
    → Advisor assigns follow-up tasks
    → Student marks follow-up tasks as complete
    → (Optional) Student fills satisfaction survey
```

**Request status lifecycle:** `Requested → Scheduled → Completed → Closed` (+ `Cancelled`)

## 7. Domain Rules (Iron Rules — never violate)

1. **PDPA consent is mandatory.** Every advising request and exit form requires an explicit,
   unchecked-by-default consent checkbox. The system records the consent timestamp and version.
   Refusing optional consent must never block or delay the student's workflow.

2. **De-identification for QA.** QA/Program Chair sees only aggregate statistics.
   Names, full student IDs, emails, and national IDs are stripped at the query level.
   **Exception:** QA has scoped case-level access to dropout/exit cases only (for C8 analysis),
   and every such access is logged in `audit_logs`.

3. **Audit logging (Computer Crime Act §26).** Every create/read/update/delete on advising records,
   every document upload/download, every login/logout, and every unauthorized access attempt
   must be logged with: user ID, IP address, ISO 8601 timestamp, action, resource ID, and result.
   Logs are retained for at least 90 days and are append-only.

4. **Cloudinary only for media.** Store only the `public_id` in D1. Never store binary data,
   full URLs, or PII in Cloudinary metadata/tags. Use authenticated/private expiring URLs
   for sensitive documents. Allowed formats: PDF, JPG, PNG. Max 10 MB per file.

5. **Role-Based Access Control (RBAC).** Every API endpoint and UI route must enforce role checks.
   Students see only their own data. Advisors see only their assigned advisees.
   Admin never sees sensitive personal notes or private advisor evaluations.

6. **Coded taxonomies, not free text.** Advising categories (9 standard types) and dropout
   reason codes (9 standard codes) use mandatory dropdown selections from admin-configurable
   lists. Free-text fields are supplementary only.

## 8. Coding Conventions

- **TypeScript everywhere.** No `.js` files in application code.
- **Drizzle ORM only.** Never write raw SQL unless absolutely necessary.
- **Zod validation** on both frontend (form) and backend (API) — shared schemas preferred.
- **Reusable components.** Use shadcn/ui components; do not duplicate UI code.
- **Bilingual support.** All user-facing strings must support Thai and English via `LanguageContext`.
- **Dark/Light mode.** Use CSS variables and `ThemeContext`; never hardcode colors.
- **Conventional commits.** Clear, descriptive commit messages (`feat:`, `fix:`, `docs:`, etc.).
- **No secrets in code.** Never commit `.env`, API keys, or Cloudinary credentials.

## 9. Testing Requirements

Before considering any feature complete:

1. `npm test -- --run` in `frontend/` — all Vitest tests must pass (currently 57 tests)
2. `npm test` in `backend/` — all Vitest tests must pass (currently 18 tests)
3. `npx tsc --noEmit` — zero TypeScript errors in both frontend and backend
4. Verify RBAC works correctly for each endpoint and UI route
5. Test Cloudinary upload flow including error handling and invalid file types

## 10. What NOT to Do

- Do not add new npm packages without discussing the reason first
- Do not expose PII in logs, error messages, URLs, or Cloudinary metadata
- Do not bypass PDPA consent checks — even in test/demo mode
- Do not write raw SQL — use Drizzle ORM
- Do not store binary files in D1 — use Cloudinary
- Do not give QA access to individual non-dropout records
- Do not delete audit logs before the 90-day retention period
- Do not hardcode Thai-only or English-only strings — use the language context

## 11. Related Documents

| Document | Location | Purpose |
|----------|----------|---------|
| `rule.md` | `.docs/03-compliance/rule.md` | Legal guardrails (PDPA, Computer Crime Act §26, ETA §9/26/28) |
| `spec.md` | `.docs/01-requirements/spec.md` | Full functional & non-functional requirements (FR-01 to FR-28) |
| `backlog.md` | `.docs/01-requirements/backlog.md` | MoSCoW prioritized product backlog |
| `user-journey.md` | `.docs/02-design/user-journey.md` | User journey maps for all 4 roles |
| `feature-list.md` | `.docs/02-design/feature-list.md` | Feature list organized by role |
| `DESIGN.md` | `DESIGN.md` | Design system tokens, colors, typography |
| `AGENTS.md` | `AGENTS.md` | Development rules & database conventions |
