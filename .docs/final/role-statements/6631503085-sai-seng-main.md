# Role Statement — Sai Seng Main

**Student ID:** 6631503085  
**Role:** Tech Lead

I owned the technical direction and integration work for AdvisingLog. My responsibilities covered the React/Vite frontend structure, the Cloudflare Workers and Hono backend, the Drizzle/D1 data layer, API integration, deployment configuration, and coordination of the team's implementation decisions. I helped keep the project aligned with the locked technology stack and the domain rules for role-based access, PDPA consent, auditability, and private document handling.

The main evidence for my work is the [frontend source](../../../frontend/), [backend source](../../../backend/), [database schema](../../../backend/src/db/schema.ts), [deployment workflow](../../../.github/workflows/deploy.yml), and [system architecture diagram](../../02-design/diagrams/04-system-architecture-diagram.jpg). The repository also contains frontend and backend test suites that exercise core role flows and API behavior. The deployed result is linked from the [case study](../case-study.md), including the live Cloudflare Pages frontend and Workers API.

I used AI as a development assistant for investigating TypeScript, authentication, API, and test issues, and for reviewing implementation options. I validated suggestions against the source code, tests, and deployment behavior. AI did not replace technical review, security decisions, or verification of the deployed system. Claims about UAT outcomes are taken from the documented evidence and are presented with limitations in the [comparison table](../comparison-table.md).
