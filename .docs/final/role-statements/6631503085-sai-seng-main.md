# Role Statement — Sai Seng Main

**Student ID:** 6631503085  
**Role:** Tech Lead

As Tech Lead for AdvisingLog, I was responsible for the technical foundation of the system and for connecting
the frontend, backend, database, and deployment into one working product. According to our git history, I made
about 128 commits between 1 September and 15 November 2026, adding roughly 38,000 lines across 820 file changes.

**Foundation (September).** I initialized the frontend (React 19 + Vite + TypeScript) and backend (Cloudflare
Workers + Hono) tech stack, built the first frontend scaffold with navigation, authentication and advising
modules, and wrote the initial [backlog](../../01-requirements/backlog.md) and
[feature list](../../02-design/feature-list.md). I added dark mode support and the Student Voice exit survey
used for AUN-QA Criterion 8.

**Backend, data and integrations.** I connected the app to the real [D1 database schema](../../../backend/src/db/schema.ts)
and REST API, implemented Google OAuth sign-in restricted to the university domain with pre-registration,
built user management with bulk import and the student–advisor roster, and integrated Cloudinary for private
student documents. I also built the database-backed multi-key Gemini governance, Google Calendar appointment
integration, and admin-configurable advising categories and document types stored in D1. Later I removed the
static mock data and fake fallbacks so that every screen shows only real data.

**Deployment.** I created the [GitHub Actions workflow](../../../.github/workflows/deploy.yml) that deploys the
backend to Cloudflare Workers and the frontend to Cloudflare Pages, including remote D1 migrations, and removed
the old Vercel configuration.

**Security and performance (October).** I replaced the demo login with server-verified session tokens and
role-based access control, then added record-level data scoping per role, ownership checks on write
operations, a persistent audit trail, rate limiting, and restricted notification access. I moved the Gemini
API key out of the URL into a request header. I reduced the main frontend bundle from 1.9 MB to 485 KB by
loading role pages on demand, and lowered auto-refresh frequency to save Workers request quota.

**Workflow completion (November).** I added case closing, satisfaction ratings (FR-13), anonymous student
feedback, walk-in session logging, multiple follow-up tasks per session, and an automatic flow that keeps
cases moving when an advisor forgets to press Complete. I then fixed bugs found during UAT.

I used AI as a coding assistant for scaffolding, debugging TypeScript and API issues, and reviewing
implementation options. I validated every suggestion against the source code, tests, and the deployed system.

## Reflection

### 1. Lessons Learned
AI changed every stage of our work. Requirements and design became faster because AI could turn our spec into
a working screen in minutes, so we could show advisors something real and get feedback early. Coding speed
improved the most: I built the CI/CD pipeline, Google sign-in and Cloudinary integration in a few days.

**Better:** delivery speed. We went from an empty repository to a deployed full-stack system on Cloudflare in
about three weeks.

**Worse:** hidden quality and security debt. AI often chose the "easy" solution — mock data, fake fallback
values, and a login that only selected a user ID with no real verification. The app looked finished, but it was
not safe. I had to spend a lot of October rebuilding authentication, RBAC, data scoping and audit logging, and
removing fake numbers. Teamwork also became harder because AI-generated changes were large, which caused more
merge conflicts and made reviews slower.

### 2. Where I Stand in the Industry
In the AI era, writing code is no longer the hardest part. The value of an engineer is in knowing what to
build, designing the system, and judging whether AI output is correct, secure and legal (PDPA). I see myself
as a junior engineer with strong full-stack and deployment experience who can use AI productively, but I still
need more depth in security and system design to review AI work with confidence.

### 3. My Plan
- **Next year:** Graduate, join a company as a full-stack or cloud developer, and deepen my knowledge of
  application security, testing, and serverless architecture.
- **In 5 years:** Become a senior engineer or tech lead who designs systems and guides a team that works
  with AI tools, making sure speed never comes at the cost of quality, security, or user privacy.
