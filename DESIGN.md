# DESIGN.md — AdvisingLog System Design

> **Version**: 1.0
> **Last Updated**: September 2026
> **Status**: In Development

This document describes the system architecture, data model, UI/UX standards, and development conventions for **AdvisingLog** — a centralized student advising management system for the School of Applied Digital Technology (ADT), Mae Fah Luang University.

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Architecture](#2-architecture)
3. [Project Structure](#3-project-structure)
4. [Data Model](#4-data-model)
5. [Role-Based Access Control](#5-role-based-access-control)
6. [API Design](#6-api-design)
7. [UI/UX Design System](#7-uiux-design-system)
8. [Bilingual Support](#8-bilingual-support)
9. [AI Integration](#9-ai-integration)
10. [Media & File Handling](#10-media--file-handling)
11. [Testing](#11-testing)
12. [AUN-QA Compliance](#12-aun-qa-compliance)
13. [Security & PDPA](#13-security--pdpa)
14. [Development Conventions](#14-development-conventions)

---

## 1. System Overview

AdvisingLog replaces the existing paper-and-email advising process with a centralized digital system. It covers the full lifecycle of student advising — from scheduling meetings and recording sessions, to tracking follow-ups, managing dropout/leave cases, and generating AUN-QA compliance reports.

### Problem Statement

| Problem | How the System Solves It |
|---|---|
| Paper records lost / emails scattered | Centralized database on Cloudflare D1 |
| No follow-up tracking system | Automated follow-up tasks with Kanban-style workflow |
| No data for AUN-QA audits | Dashboard + Excel/CSV export |
| No PDPA-aware data handling | RBAC + Consent Flow + De-identification |
| Students unsure who to contact | Referral system routing to appropriate support units |

### Core Workflows

```
Student -> Submit Advising Request -> Advisor accepts and schedules -> Record Session -> Create Follow-up
                                                                              |
                                             QA Chair views Dashboard -> Export Report

Student (exit case) -> Submit Exit Form -> Advisor evaluates -> Program Chair approves
                                       -> Student Voice Survey (voluntary / anonymous)
                                                 |
                                       QA uses data for Qualitative Exit Analysis
```

---

## 2. Architecture

### Stack Overview

```
+-------------------------------------------------------------+
|                        FRONTEND                             |
|         React 18 + Vite 5 + TypeScript 5                    |
|         Tailwind CSS + shadcn/ui                            |
|         Recharts  SheetJS  Lucide React                     |
+------------------------+------------------------------------+
                         |
              HTTPS REST API (JSON)
              via VITE_API_URL
                         |
+------------------------v------------------------------------+
|                        BACKEND                              |
|         Cloudflare Workers + Hono Framework                 |
|         Drizzle ORM --> Cloudflare D1 (SQLite)              |
|         Google Gemini 1.5 Flash (AI Analysis)               |
+----------+----------------------------------+---------------+
           |                                  |
    Cloudflare D1                      Cloudinary CDN
    (Structured Data)              (Media / Documents)
```

### Key Design Decisions

| Decision | Rationale |
|---|---|
| **Cloudflare Workers** as backend | Serverless, edge-deployed, no cold start |
| **D1 (SQLite)** as database | Low cost, bundled with Workers |
| **Hono** as web framework | Lightweight, TypeScript-first, fast on edge |
| **Drizzle ORM** | Type-safe, migration-based, D1-compatible |
| **Cloudinary** for file storage | No binary data in D1, built-in CDN and access control |
| **Google OAuth (MFU domain)** | SSO with university email accounts |
| **Mock/Offline fallback** | Frontend still works without a live DB binding |

### Authentication Flow

```
User clicks "Sign in with Google"
     |
Google OAuth -> credential JWT
     |
POST /api/auth/google
     |
Backend decodes JWT -> validates email domain (@mfu.ac.th, @student.mfu.ac.th, etc.)
     |
Looks up user in D1 -> returns user object with role
     |
Frontend stores user in AuthContext -> redirects based on role
```

**Allowed email domains:**
- `@mfu.ac.th`
- `@student.mfu.ac.th`
- `@lamduan.mfu.ac.th`
- `@lamduan.ac.th`
- Super Admin: configured via `SUPER_ADMIN_EMAIL` environment variable

---

## 3. Project Structure

```
advising-log/
|-- backend/
|   `-- src/
|       |-- index.ts               # Hono app — all routes (monolithic)
|       `-- db/
|           |-- schema.ts          # Drizzle table definitions
|           |-- index.ts           # getDb() helper
|           `-- seed.sql           # Sample data for development
|-- frontend/
|   `-- src/
|       |-- App.tsx                # Router + Provider tree
|       |-- main.tsx               # Entry point
|       |-- index.css              # Global styles + Tailwind base
|       |-- components/
|       |   |-- ui/
|       |   |   |-- index.tsx               # Shared UI components
|       |   |   |-- ThemeToggle.tsx         # Light/Dark toggle button
|       |   |   `-- DocumentViewerModal.tsx # Cloudinary document preview
|       |   `-- layout/
|       |       `-- AppLayout.tsx           # Sidebar + Header shell
|       |-- contexts/
|       |   |-- AuthContext.tsx             # Login state + current user
|       |   |-- LanguageContext.tsx         # TH/EN switcher + t() helper
|       |   |-- ThemeContext.tsx            # Dark/Light mode state
|       |   `-- ToastContext.tsx            # Global toast notifications
|       |-- pages/
|       |   |-- LoginPage.tsx
|       |   |-- student/                   # Role: student only
|       |   |-- advisor/                   # Role: advisor only
|       |   |-- qa/                        # Role: qa_chair only
|       |   `-- admin/                     # Role: admin only
|       |-- services/
|       |   |-- apiClient.ts               # Type-safe HTTP client
|       |   |-- aiService.ts               # Google Gemini integration
|       |   `-- cloudinaryService.ts       # Upload helper
|       |-- types/
|       |   `-- index.ts                   # TypeScript interfaces + enums
|       `-- utils/
|           |-- exportUtils.ts             # Excel/CSV generation (SheetJS)
|           `-- calendarUtils.ts           # Date/calendar helpers
|-- AGENTS.md                              # AI agent development rules
|-- DESIGN.md                              # This document
`-- README.md                              # Project overview
```

---

## 4. Data Model

### ER Diagram (Simplified)

```
users (1) -------- (N) student_advisor_assignments (N) -------- (1) users
  |                                                                    |
  |--(N) advising_requests ----------------------------------------(1)|
  |            |-- (N) appointments                                   |
  |            `-- (N) advising_sessions                              |
  |                          |-- (N) follow_ups                       |
  |                          |         `-- (N) follow_up_progress     |
  |                          `-- (N) referrals                        |
  |--(N) exit_cases -------------------------------------------------  |
  |            `-- (N) student_voice_responses                        |
  |--(N) early_warnings                                               |
  `--(N) documents                                                    |
  audit_logs    (no FK -- stored as immutable snapshots)
  ai_api_keys   (standalone -- managed by Admin)
```

### Key Tables

#### `users`
```
id (PK)         text   -- UUID
code            text   UNIQUE  -- Student ID or Employee Code
name, email     text
role            enum:  student | advisor | qa_chair | admin
department      text
isActive        boolean
hasAiAccess     boolean  -- controls AI feature access per user
createdAt       text   (ISO 8601)
```

#### `exit_cases` — core of QA Reporting
```
exitType        enum:  withdrawal | leave_of_absence | transfer | dropout
reasonCode      text   -- coded root cause (E01, F01, etc.)
reasonCategory  text   -- primary category
status          enum:  submitted | advisor_reviewed | chair_approved | completed | cancelled
documents       text   (JSON array of Cloudinary public_ids)
voiceSurveyCompleted  boolean
```

#### `student_voice_responses`
```
isAnonymous           boolean   -- if true, studentId is hidden in reports
primaryFactors        text      (JSON array)
curriculumRating      integer   (1-5)
teachingRating        integer   (1-5)
advisorRating         integer   (1-5)
servicesRating        integer   (1-5)
overallRating         integer   (1-5)
```

#### `ai_api_keys`
```
key             text   -- Gemini API key (encrypted at rest)
isDefault       boolean
provider        text   -- default: "Google Gemini"
model           text   -- default: "gemini-1.5-flash"
status          enum:  active | inactive | rate_limited
```

### Exit Type — Meaning and QA Counting

| exitType | Meaning | Counts as Dropout |
|---|---|---|
| `withdrawal` | Voluntary withdrawal | Yes |
| `dropout` | Involuntary / forced exit | Yes |
| `leave_of_absence` | Temporary leave | No |
| `transfer` | Transfer to another institution | No |

> **IMPORTANT**: `transfer` and `dropout` must display as distinct badges from `withdrawal` and `leave_of_absence` across all UI and reports.

---

## 5. Role-Based Access Control

### Route Guard

Every protected route is wrapped with `<RequireRole>` in `App.tsx`:

```tsx
<Route
  path="advisor/sessions"
  element={
    <RequireRole allowedRoles={['advisor']}>
      <AdvisingSessions />
    </RequireRole>
  }
/>
```

Unauthorized access redirects to the user's own default dashboard. Unauthenticated users are sent to `/login`.

### Feature Matrix

| Feature | Student | Advisor | QA Chair | Admin |
|---|:---:|:---:|:---:|:---:|
| View own advising history | Yes | — | — | — |
| Submit advising request | Yes | — | — | — |
| Complete Student Voice Survey | Yes | — | — | — |
| Submit Exit Form | Yes | — | — | — |
| View assigned students | — | Yes | — | — |
| Record Advising Session | — | Yes | — | — |
| Create Follow-up tasks | — | Yes | — | — |
| Early Warning system | — | Yes | — | — |
| Referrals to support units | — | Yes | — | — |
| Evaluate Exit Cases | — | Yes | — | — |
| QA Dashboard | — | — | Yes | — |
| Exit Case Review | — | — | Yes | — |
| AI Qualitative Analysis | — | — | Yes | — |
| Export Excel / CSV reports | — | — | Yes | — |
| User Management | — | — | — | Yes |
| AI Governance (key management) | — | — | — | Yes |
| Audit Logs | — | — | — | Yes |
| Master Data configuration | — | — | — | Yes |

---

## 6. API Design

### Base URL

```
Development:  http://localhost:8787
Production:   ${VITE_API_URL}   (set in frontend/.env.local)
```

> **WARNING**: Never hardcode the backend URL. Always use `import.meta.env.VITE_API_URL` in frontend code.

### Endpoint Catalog

```
GET    /api/health
GET    /api/info

POST   /api/auth/google

GET    /api/users                        ?role=...
POST   /api/users
POST   /api/users/bulk
DELETE /api/users/:id

GET    /api/roster
POST   /api/roster

GET    /api/requests                     ?studentId=  ?advisorId=
POST   /api/requests
PATCH  /api/requests/:id/status

GET    /api/appointments
POST   /api/appointments

GET    /api/sessions
POST   /api/sessions

GET    /api/follow-ups                   ?studentId=
POST   /api/follow-ups
PATCH  /api/follow-ups/:id/status
POST   /api/follow-up-progress

GET    /api/exit-cases
POST   /api/exit-cases
PATCH  /api/exit-cases/:id

GET    /api/student-voice
POST   /api/student-voice

GET    /api/early-warnings
POST   /api/early-warnings

GET    /api/audit-logs
POST   /api/audit-logs

GET    /api/ai/keys
POST   /api/ai/keys
PATCH  /api/ai/keys/:id/default
POST   /api/ai/keys/:id/test
DELETE /api/ai/keys/:id
POST   /api/ai/analyze

GET    /api/documents                    ?studentId=
POST   /api/documents
DELETE /api/documents/:id
```

### Response Format

```json
// Success
{ "success": true, "data": { ... } }

// Error
{ "success": false, "error": "descriptive message" }
```

### Offline Fallback

`apiClient.ts` wraps every request in `try/catch`. If the backend is unreachable (network error, no D1 binding), it returns `null`. The frontend then falls back to mock data from `StoreProvider`, keeping the app functional in demo mode.

---

## 7. UI/UX Design System

### Theme

Light / Dark mode is managed by `ThemeContext` and Tailwind `dark:` classes.

| Token | Light | Dark |
|---|---|---|
| Background | `bg-white` / `bg-slate-50` | `dark:bg-slate-900` |
| Card | `bg-white border-slate-200` | `dark:bg-slate-800 dark:border-slate-700` |
| Primary | `sky-600` | `sky-400` |
| Text Primary | `slate-900` | `slate-50` |
| Text Muted | `slate-500` | `slate-400` |

### Shared UI Components (`frontend/src/components/ui/index.tsx`)

| Component | Purpose |
|---|---|
| `StatusBadge` | Colored status tag for requests, follow-ups, exit cases, etc. |
| `Modal` | Dialog with backdrop, keyboard-dismiss, and portal rendering |
| `ConfirmDialog` | Confirm / Cancel modal with automatic TH/EN label support |
| `Pagination` | Page navigation + "Page X of Y" with TH/EN localization |
| `SearchInput` | Text input with search icon |
| `EmptyState` | Placeholder shown when a list has no data |
| `LoadingSpinner` | Centered loading indicator |
| `ToastContainer` | Top-right notification toasts |
| `ThemeToggle` | Dark / Light mode switch button |
| `DocumentViewerModal` | In-app preview for Cloudinary documents and images |

### Status Badge Color Mapping

| Status | Color |
|---|---|
| `completed`, `resolved`, `approved`, `accepted` | Green |
| `scheduled`, `active`, `in_progress` | Blue |
| `pending`, `submitted`, `requested`, `open` | Yellow |
| `overdue`, `high`, `critical` | Red |
| `cancelled`, `rejected`, `closed` | Gray |
| `chair_approved`, `advisor_reviewed` | Purple |
| `monitoring` | Orange |

### Exit Case Badge (QA-specific)

Used in the Case Explorer on the QA pages. Each exit type must display a distinct badge:

| exitType | Badge Label | Color |
|---|---|---|
| `withdrawal` | Withdrawal | Red |
| `dropout` | Dropout | Slate / Dark |
| `leave_of_absence` | Leave of Absence | Yellow |
| `transfer` | Transfer | Blue |

---

## 8. Bilingual Support

The system fully supports **Thai (TH)** and **English (EN)** via `LanguageContext`. The default language is Thai, persisted in `localStorage`.

### Usage Pattern

```tsx
import { useLanguage } from '@/contexts/LanguageContext'

function MyComponent() {
  const { t, getExitTypeLabel } = useLanguage()

  return (
    <div>
      <h1>{t('ประวัติการพบอาจารย์', 'Advising History')}</h1>
      <span>{getExitTypeLabel('transfer')}</span>
    </div>
  )
}
```

### Helper Functions

| Function | Purpose |
|---|---|
| `t(th, en)` | Returns Thai or English string based on current language |
| `getCategoryLabel(value)` | Localized advising category label |
| `getReferralLabel(value)` | Localized referral destination label |
| `getExitReasonLabel(value)` | Localized exit reason code label |
| `getExitTypeLabel(value)` | Localized exit type label |
| `getWarningTypeLabel(value)` | Localized early warning type label |
| `formatAcademicTerm()` | Current academic term in the active language |

### Rules

- Never hardcode a single-language string — always use `t()`.
- Components inside `components/ui/` must call `useLanguage()` themselves.
- All button labels, placeholders, error messages, and toasts must be bilingual.
- The active language is Thai by default and stored in `localStorage`.

---

## 9. AI Integration

### Architecture

```
QA Chair / Admin
     |
     v  POST /api/ai/analyze
Backend (Cloudflare Workers)
     |
     v  picks active + default key from ai_api_keys table
Google Gemini 1.5 Flash API
     |
     v  analysis result
Frontend renders output
```

### Use Cases

| Feature | Description |
|---|---|
| **Qualitative Exit Analysis** | Analyzes exit case root causes, trends, and policy recommendations |
| **Case Diagnosis** | Per-case AI assessment for QA Chair review |

### Key Management (Admin)

Admins manage Gemini API keys via `/admin/ai-governance`:
- Add, delete, and test API keys
- Set the default key (used automatically for all AI requests)
- Monitor status: `active | inactive | rate_limited`
- Automatic fallback: if the default key is rate-limited, another active key is selected

### Access Control

AI features are gated by the `hasAiAccess` boolean on the `users` table. Admins can enable or disable this per user.

---

## 10. Media & File Handling

### Principles

- **No binary data in D1** — only Cloudinary `public_id` references are stored.
- **No permanent full URLs in D1** — URLs are generated from `public_id` at render time.
- **Secure URLs** are used for sensitive student documents (signed / private delivery).

### Cloudinary Asset Tagging Rules

```
Allowed tags:   student_code, log_id
Prohibited:     name, surname, national ID, or any other PII
```

### Upload Flow

```
User selects a file
     |
     v  cloudinaryService.ts uploads directly to Cloudinary (unsigned preset)
     |  receives public_id
     |
     v  public_id saved to D1 via backend endpoint
```

---

## 11. Testing

### Toolchain

| Tool | Purpose |
|---|---|
| **Vitest** | Unit and integration tests |
| **Playwright** | End-to-end tests for critical user flows |
| **tsc --noEmit** | TypeScript type checking |

### Test File Locations

```
frontend/src/
  App.test.tsx
  aiService.test.ts
  AdminRosterAndApi.test.tsx
  StudentVoice.test.tsx
  utils/
    exportUtils.test.ts
    calendarUtils.test.ts

backend/src/
  index.test.ts
```

### Pre-Merge Checklist

```bash
# 1. Type check
cd frontend && npx tsc --noEmit
cd backend  && npx tsc --noEmit

# 2. Unit tests
cd frontend && npx vitest run
cd backend  && npx vitest run

# 3. End-to-end tests
npx playwright test
```

Manual verification before merging:
- [ ] Role-based permissions enforced on all endpoints
- [ ] Cloudinary upload works including error and invalid file type handling
- [ ] AI features work both with and without an active API key
- [ ] Thai / English language switching works correctly across all components
- [ ] Offline fallback (no backend) renders mock data correctly

---

## 12. AUN-QA Compliance

The system is designed specifically to support AUN-QA audit evidence collection.

### Supported Criteria

| AUN-QA Criterion | Supported Features |
|---|---|
| **C6** Student Support & Advising | Advising session records, follow-up tracking, referrals |
| **C8** Student Quality | Dropout analysis, retention rate, exit case review |

### Exportable Reports

| Report | Contents |
|---|---|
| Advising Summary | Session count, follow-up rate, referral count per advisor |
| Exit Case Report | Full list of exit cases with type and reason codes |
| Dropout Analysis | Root cause breakdown, year-over-year comparison |
| Student Voice Summary | Satisfaction ratings + qualitative feedback themes |
| Qualitative Exit Analysis | AI-generated insights, trend analysis, policy recommendations |

### Key Performance Indicators

```
Retention Rate
  = (Total Students - (withdrawal + dropout)) / Total Students x 100%
  Note: transfer and leave_of_absence are excluded from dropout count.

Follow-up Completion Rate
  = Completed Follow-ups / Total Follow-ups x 100%

Average Sessions per Student
  = Total Sessions / Unique Students with at least one session
```

---

## 13. Security & PDPA

### PDPA Principles

1. **Consent before collection** — every form includes a `pdpaConsent` checkbox that the student must confirm.
2. **Voluntary survey** — the Student Voice Survey is optional and cannot be forced.
3. **Anonymous option** — students may submit the survey with `isAnonymous: true`; their identity is hidden in all reports.
4. **Data minimization** — QA reports use `student_code` instead of names.
5. **Purpose limitation** — data is used solely for student support and QA evidence.

### Audit Logs

All significant actions are recorded in the `audit_logs` table:
- Fields: `userId`, `userName`, `userRole` (snapshot at time of action), `action`, `description`, `timestamp`, `ipAddress`
- No foreign keys — stored as immutable snapshots to preserve history even if users are deleted

### RBAC Enforcement

- **Frontend**: `RequireRole` component in `App.tsx` enforces page-level access
- **Backend**: Endpoints should validate the user role from the session/auth token for all protected operations

---

## 14. Development Conventions

### TypeScript

```typescript
// Correct — explicit types
const exitCase: ExitCase = { ... }

// Avoid — no implicit any
const data: any = {}
```

### Component Pattern

```tsx
// Standard page component structure
export function MyPage() {
  const { t, language } = useLanguage()
  const { currentUser } = useAuth()

  return <h1>{t('ชื่อหน้า', 'Page Title')}</h1>
}
```

### Import Order

```tsx
// 1. React and third-party libraries
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

// 2. Contexts
import { useLanguage } from '@/contexts/LanguageContext'
import { useAuth } from '@/contexts/AuthContext'

// 3. UI Components
import { StatusBadge, Modal } from '@/components/ui'

// 4. Types
import type { ExitCase } from '@/types'

// 5. Services and utilities
import { api } from '@/services/apiClient'
import { exportToExcel } from '@/utils/exportUtils'
```

### Non-Negotiable Rules

| Rule | Detail |
|---|---|
| No hardcoded URLs | Use `import.meta.env.VITE_API_URL` in all frontend services |
| No files stored in D1 | Store only Cloudinary `public_id` references |
| No raw SQL | Use Drizzle ORM methods exclusively |
| No new libraries without approval | Discuss with the team before adding any dependency |
| No secrets in git | `.env` files, API keys, and Cloudinary credentials must never be committed |
| Validate all inputs | Use Zod schemas on both frontend and backend |
| Schema changes via migration | Always use Drizzle migrations; never modify the production DB manually |

### Commit Message Convention

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(qa):    add transfer filter to Case Explorer
fix(ui):     correct badge color for dropout status
fix(export): include transfer cases in QA Excel summary
fix(ai):     replace hardcoded localhost URL with VITE_API_URL
docs:        add DESIGN.md
test(export):add unit test for exit case counting logic
```

---

*Update this document whenever there are significant changes to the system architecture, database schema, or development conventions.*
