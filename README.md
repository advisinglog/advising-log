<div align="center">

# 🎓 AdvisingLog

### A web-based student advising system designed to replace the current paper-and-email workflow.

[![Status](https://img.shields.io/badge/status-in%20development-yellow?style=for-the-badge)](README.md)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=white)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-6-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Vite](https://img.shields.io/badge/Vite-8-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev)
[![Cloudflare](https://img.shields.io/badge/Cloudflare-Workers-F38020?style=for-the-badge&logo=cloudflare&logoColor=white)](https://workers.cloudflare.com)
[![Cloudinary](https://img.shields.io/badge/Cloudinary-Storage-3448C5?style=for-the-badge&logo=cloudinary&logoColor=white)](https://cloudinary.com)

</div>

---

## 📖 Overview

**AdvisingLog** is a centralized platform for managing the full lifecycle of student advising — from scheduling meetings and recording advising sessions, to tracking follow-ups, managing dropout/leave cases, and generating **AUN-QA** compliance reports.

The system consolidates scattered advising activities into a single source of truth, making it easier for advisors, students, and administrators to stay aligned and for the program to collect quality-assurance evidence. All sensitive documents are stored securely via **Cloudinary** with private/authenticated URLs in compliance with **PDPA**.

---

## ⚠️ Problem Statement

The current advising process relies on **paper forms and scattered email threads**, which leads to:

| Pain Point | Impact |
| :--- | :--- |
| ❌ **No systematic follow-up** | Advising cases are recorded but never tracked to resolution |
| 🗂️ **Scattered records** | Documents lost across emails and physical files |
| 📉 **No centralized data** | Hard to produce AUN-QA evidence (C6 Student Support, C8 dropout analysis) |
| 🔀 **Unclear routing** | Students don't know who to contact for different issues |
| 🔒 **Privacy concerns** | Sensitive student data handled without PDPA-aware processes |

---

## ✨ Key Features

### 📝 Advising Records
- Structured advising session logs (date, topic, advice, tags)
- Categories: academic, activities, general, and personal matters
- Document & photo attachments (stored securely in **Cloudinary** with signed/private URLs)
- Bilingual interface: 🇹🇭 Thai / 🇬🇧 English toggle

### 🔄 Automated Follow-up System
- Auto-triggered follow-up tasks based on critical tags and time
- Kanban-style tracking (`pending → in progress → completed`)
- Full follow-up history timeline

### 📉 Dropout & Leave Management
- Multi-step workflow: `Student → Admin → Advisor → Program Chair`
- Private advisor evaluation form
- Consent-based **Student Voice Form** (filled on student's own device)
- De-identified dropout register with coded root causes

### 🧭 Support Directory
- "Who should I ask?" routing for academic, activity, and welfare issues
- Referrals to the appropriate support unit (counselling, financial aid, etc.)

### 📊 AUN-QA Reporting
- Dashboard with statistics via Recharts
- Exportable reports (CSV/Excel) using SheetJS
- Root-cause analysis for dropout/leave cases

### 🔐 PDPA-Aware Design
- **Cloudinary**: Stores only `public_id` in D1; all binary files served via authenticated private URLs
- **Audit Logging**: Records source IP, timestamp, action, and `public_id` for every file access
- De-identified records for reporting; student codes instead of PII in logs
- Role-based access control (RBAC) — Student, Advisor, QA, Admin

---

## 👥 User Roles

| Role | Responsibilities |
| :--- | :--- |
| 🎓 **Student** | Request meetings, submit drop/leave requests, view own advising history, complete Student Voice Form |
| 👨‍🏫 **Advisor** | Record advising sessions, manage follow-ups, approve requests, complete dropout evaluation, refer students |
| 📊 **Program Chair / QA** | View aggregate statistics, generate AUN-QA reports, analyze root causes |
| 🏢 **Admin** | Manage user accounts, configure master data (tags, directory), oversee workflows |

---

## 🛠 Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Frontend** | React 19 + Vite 8 + TypeScript 6 |
| **UI Components** | Tailwind CSS 4 + shadcn/ui + Lucide Icons |
| **Backend** | Cloudflare Workers + Hono |
| **Database** | Cloudflare D1 (SQLite) + Drizzle ORM |
| **Media Storage** | Cloudinary (authenticated/private URLs — `public_id` only stored in D1) |
| **Validation** | Zod (shared schemas, frontend + backend) |
| **Charts** | Recharts |
| **Import/Export** | SheetJS (xlsx) |
| **Testing** | Vitest (unit/integration) + Playwright (E2E) |
| **i18n** | Custom LanguageContext (Thai / English toggle) |

---

## 📁 Project Structure

```
advising-log/
├── .docs/
│   ├── 01-requirements/    # proposal.md · spec.md · backlog.md
│   ├── 02-design/          # feature-list.md · user-journey.md · diagrams/
│   └── 03-compliance/      # rule.md (PDPA & legal guardrails)
├── frontend/               # React + Vite application
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── pages/          # Route-level page components
│   │   ├── contexts/       # Auth, Language, Theme contexts
│   │   ├── services/       # API client & Cloudinary helpers
│   │   ├── types/          # Shared TypeScript interfaces
│   │   └── utils/          # Export utilities (SheetJS)
│   └── package.json
├── backend/                # Cloudflare Workers + Hono API
│   ├── src/
│   │   ├── db/             # Drizzle ORM schema & seed
│   │   └── index.ts        # All route handlers
│   └── package.json
├── AGENTS.md               # AI agent coding rules
├── CLAUDE.md               # Project brief & architecture guide
└── README.md               # ← you are here
```

---

## 📄 Documentation

| Document | Description |
| :--- | :--- |
| [`AGENTS.md`](AGENTS.md) | AI agent rules, coding conventions, and testing requirements |
| [`CLAUDE.md`](CLAUDE.md) | Full project brief, architecture, and coding guide |
| [`.docs/01-requirements/proposal.md`](.docs/01-requirements/proposal.md) | Updated project proposal |
| [`.docs/01-requirements/spec.md`](.docs/01-requirements/spec.md) | Full functional & technical specification |
| [`.docs/01-requirements/backlog.md`](.docs/01-requirements/backlog.md) | Feature backlog & task breakdown |
| [`.docs/02-design/feature-list.md`](.docs/02-design/feature-list.md) | Core feature list by role |
| [`.docs/02-design/user-journey.md`](.docs/02-design/user-journey.md) | User journey maps |
| [`.docs/03-compliance/rule.md`](.docs/03-compliance/rule.md) | PDPA compliance & legal guardrails |

---

## 👥 Project Members

| # | Student ID | Name | Role |
| :-: | :--- | :--- | :--- |
| 01 | `6631503083` | **Phonepadith Kongsengchanh** | 🎨 UX/UI Designer |
| 02 | `6631503085` | **Sai Seng Main** | 🧭 Tech Lead |
| 03 | `6631503036` | **Woranut Khwanpongdee** | 🤖 AI Lead |
| 04 | `6631503039` | **Wilasinee Mangkorn** | ✅ QA / Test |
| 05 | `6631503031` | **Pirisa Kitichai** | 📦 Product Owner |
