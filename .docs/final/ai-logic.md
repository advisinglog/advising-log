# AdvisingLog — AI Logic, Implementation, and Governance

> **Scope:** This document explains the role of Artificial Intelligence in the AdvisingLog project, encompassing both AI-assisted software development and in-product AI exploration, adhering to ETDA AI Ethics guidelines and course requirements.

---

## 1. Executive Summary & AI Usage Classification

In AdvisingLog, AI was utilized under two distinct scopes:
1. **AI-Assisted Engineering (AI in the SDLC):** Used throughout the lifecycle (requirements analysis, test drafting, type debugging, and UAT data structuring) following the Anthropic AI-Native SDLC playbook.
2. **In-System AI Capability (Prototype / Explored Feature):** An AI advising summary assistant prototype (`aiService.ts`) evaluated against simulated transcripts via automated unit tests (`aiService.test.ts`). In production, this feature remains gated behind explicit administrative toggles to comply with strict PDPA Section 26 sensitive data protections.

---

## 2. Where / How / Prove / Measure Framework

| Dimension | Description & Implementation | Repository Evidence |
| :--- | :--- | :--- |
| **Where** | • **Engineering:** Requirements drafting, TypeScript/Hono bug troubleshooting, Vitest test authoring, and comparison metrics calculation.<br>• **Product:** Session summarization helper and category tag recommendation logic explored for faculty advisors. | • [`CLAUDE.md`](../../CLAUDE.md)<br>• [`AGENTS.md`](../../AGENTS.md)<br>• [`frontend/src/aiService.test.ts`](../../frontend/src/aiService.test.ts)<br>• Commits across repo history |
| **How** | • **Models used:** Claude 3.5 Sonnet and ChatGPT (GPT-4o).<br>• **Prompting method:** Role-prompting with strict constraints ("never invent numbers", "preserve Thai law §26 audit trails").<br>• **Human-in-the-loop:** All AI code suggestions were executed through Vitest (`101 frontend`, `64 backend`) and Playwright before merging. | • [`charter.md`](../01-requirements/charter.md) (Team Rules)<br>• Role statements in [`role-statements/`](role-statements/) |
| **Prove** | • **Zero Hallucinated Evaluation:** All reported UAT numbers (11 participants, 29 tasks, SUS 64.00, TAM PU 4.2) originate from real student/advisor sessions, not AI generation.<br>• **Automated Tests:** 4 unit tests in `aiService.test.ts` verify summarization structure, error fallbacks, and boundary conditions. | • [UAT session logs](../04-test%20plan/evidence/uat-session-logs.md)<br>• [UAT task CSV](../04-test%20plan/evidence/uat-task-results.csv)<br>• [`frontend/src/aiService.test.ts`](../../frontend/src/aiService.test.ts) |
| **Measure** | • **Cycle Time Reduction:** Build and debugging cycle reduced by ~40% across sprints.<br>• **Test Coverage:** AI-generated test scaffolding achieved 100% pass rate on core authorization and scope tests.<br>• **Product Metric:** In-product AI feature is classified as **Exploratory/Gated** due to PDPA consent requirements. | • [Before/After Comparison](comparison-table.md)<br>• [Issue log](../04-test%20plan/evidence/issue-log.md) |

---

## 3. Trust, Safety & Ethical AI Principles (ETDA Compliance)

AdvisingLog follows the **ETDA AI Ethics Guidelines (6 Principles)** as outlined in course Week 2–3 lectures:

### 3.1 Transparency & Explainability
- Users are informed whenever an AI tool is active.
- Prompts use deterministic schemas (Zod) to ensure outputs conform to predictable structures.

### 3.2 Security, Privacy & Data Minimization (PDPA Section 26)
- **Zero Sensitive Data in LLMs:** Raw student transcripts, national IDs, medical histories, and family financial data are **never** forwarded to public AI APIs.
- AI evaluation scripts run against de-identified, synthetic test cases (`aiService.test.ts`).
- Cloudflare Workers enforce token masking and strip personal identifiers before any external API call.

### 3.3 Reliability & Fallback Handling
- **Graceful Degradation:** If an external AI provider fails, times out, or returns invalid JSON:
  1. The system catches the error without crashing the user session.
  2. The UI falls back to manual text entry.
  3. The failure is logged in the append-only `audit_logs` table.

### 3.4 Accountability & Human Agency
- Final advising records, official referrals, and drop-out assessments are **always submitted by a human faculty advisor**. AI never makes autonomous academic or disciplinary decisions.

---

## 4. Team Members' AI Contribution Statements

- **Pirisa Kitichai (Product Owner):** Used AI to assist in structuring the MoSCoW backlog and translating stakeholder user stories into formal functional requirements (FR-01 to FR-28). Verified all backlog priorities with team members.
- **Phonepadith Kongsengchanh (UX/UI Designer):** Leveraged AI for accessible color contrast calculations and initial responsive layout boilerplate; manually tested and styled all Tailwind CSS tokens and dark mode support.
- **Sai Seng Main (Tech Lead):** Used AI to investigate Hono routing edge-cases, Cloudflare D1 SQLite transaction constraints, and SHA-256 tamper-evident chaining. Personally verified all database migrations and security headers.
- **Woranut Khwanpongdee (AI Lead):** Authored `CLAUDE.md`, `AGENTS.md`, and this AI logic specification; authored `aiService.test.ts` test suite; led the synthesis of UAT timing metrics from raw sheets while verifying that no AI-hallucinated data entered the report.
- **Wilasinee Mangkorn (QA / Test Lead):** Used AI to expand functional test cases (TC01–TC10) and verify statistical formulas for SUS and TAM calculations; all 11 user session logs and 58 test outcomes reflect human execution.
