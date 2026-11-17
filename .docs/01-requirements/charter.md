# Project Charter — AdvisingLog

## 1. Project Information

| Field         | Detail                                                        |
|---------------|---------------------------------------------------------------|
| Project Name  | AdvisingLog                                                   |
| Course        | 1305493 SE Case Study                                         |
| Program       | ADT — Mae Fah Luang University (MFU)                          |
| Repository    | https://github.com/se-advisinglog/advising-log                |
| Deployment    | Cloudflare Pages (frontend) · Cloudflare Workers (backend)    |

---

## 2. Team Members

| Student ID   | Name                        | Role               | Responsibilities                                                                             |
|--------------|-----------------------------|--------------------|----------------------------------------------------------------------------------------------|
| 6631503083   | Phonepadith Kongsengchanh   | UX/UI Designer     | Wireframes, design system, Figma prototypes, accessibility, component library review         |
| 6631503085   | Sai Seng Main               | Tech Lead          | Architecture decisions, code review, CI/CD pipeline, backend APIs, database schema           |
| 6631503036   | Woranut Khwanpongdee        | AI Lead            | AI-assisted feature design, prompt engineering, output validation, AI usage documentation    |
| 6631503039   | Wilasinee Mangkorn          | QA / Test Lead     | Test plan, Vitest unit tests, Playwright E2E tests, bug tracking, regression testing          |
| 6631503031   | Pirisa Kitichai             | Product Owner      | Backlog management, user stories, sprint planning, stakeholder communication, acceptance criteria |

---

## 3. Project Purpose

AdvisingLog replaces ad-hoc, paper-based student advising workflows with a structured web application.  
The system provides role-based dashboards for Students, Advisors, Program Chairs/QA Coordinators, and Admins to manage advising sessions, follow-ups, dropout/leave cases, and AUN-QA evidence generation.

---

## 4. Team Rules

### 4.1 Communication Channels

| Channel     | Purpose                                      | Expected Response Time |
|-------------|----------------------------------------------|------------------------|
| Line Group  | Day-to-day discussion, quick questions       | Within 2 hours         |
| GitHub Issues | Bug reports, feature requests, task tracking | Within 1 working day  |
| GitHub PRs  | Code review and feedback                     | Within 1 working day   |
| Weekly Call | Sprint review, planning, blockers            | Synchronous — attend or notify in advance |

### 4.2 Meeting Cadence

- **Weekly stand-up**: Every Monday at a time agreed by the team.
- **Sprint review**: End of each sprint (1-week sprints).
- **Ad-hoc meetings**: Called by any member with 24-hour notice via Line; minutes documented in `.docs/meetings/`.

### 4.3 Decision-Making

- **Day-to-day technical decisions**: Tech Lead has final say after team discussion.
- **Feature scope and priority**: Product Owner has final say.
- **UI/UX direction**: UX/UI Designer has final say.
- **Disagreements**: Discussed in the weekly meeting; majority vote resolves ties; decision logged in GitHub Issues.

### 4.4 Code Review

- Every pull request (PR) must receive **at least one approval** before merging.
- The Tech Lead must approve any change to the database schema, CI/CD pipeline, or authentication logic.
- Reviewers should respond within **1 working day**.
- Review comments must be resolved or explicitly acknowledged before merge.
- Self-merging (merging your own PR without review) is not allowed except for hotfixes, which must be followed by a post-merge review comment.

### 4.5 Definition of Done

A feature is considered **done** when all of the following are true:

- [ ] All acceptance criteria in the linked GitHub Issue are met.
- [ ] TypeScript type check passes (`tsc --noEmit`).
- [ ] Vitest unit/integration tests pass and cover the new logic.
- [ ] Playwright E2E tests cover the critical user flow (if applicable).
- [ ] Role-based permission checks are verified for each endpoint and UI route.
- [ ] Zod validation is in place on both frontend and backend inputs.
- [ ] Cloudinary upload flow is tested (if the feature involves file uploads).
- [ ] PR is reviewed and approved.
- [ ] No secrets, API keys, or `.env` files are committed.
- [ ] Migration files are included if the database schema changed.

### 4.6 AI Usage Policy

AI-assisted tools (e.g., GitHub Copilot, Gemini, ChatGPT) may be used to accelerate development, but the following rules apply:

1. **Disclose**: Any code or document produced primarily by an AI tool must note it in the PR description or commit message (e.g., `AI-assisted: Copilot`).
2. **Verify**: Every AI-generated output must be reviewed, tested, and understood by the team member who submits it. Submitting unverified AI output is a violation of academic integrity.
3. **No secrets in prompts**: Never paste API keys, database credentials, real student data, or `.env` contents into an AI prompt.
4. **No PII in prompts**: Do not include personally identifiable student information in AI tool inputs.
5. **Final responsibility**: The team member who commits the code is fully responsible for its correctness and security, regardless of AI assistance.

---

## 5. Git Workflow

### 5.1 Conventional Commits

All commit messages must follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>(<scope>): <short description>

[optional body]
[optional footer]
```

**Types:**

| Type       | When to use                                             |
|------------|---------------------------------------------------------|
| `feat`     | A new feature                                           |
| `fix`      | A bug fix                                               |
| `docs`     | Documentation changes only                              |
| `style`    | Formatting, whitespace — no logic change                |
| `refactor` | Code restructuring — no feature or bug change           |
| `test`     | Adding or updating tests                                |
| `chore`    | Build process, dependency updates, CI/CD config         |
| `perf`     | Performance improvements                                |
| `ci`       | CI/CD pipeline changes                                  |
| `migration`| Database migration files                                |

**Examples:**

```
feat(advising): add follow-up reminder notification
fix(auth): handle expired Google OAuth token gracefully
docs(charter): add AI usage policy section
chore(ci): replace hardcoded env vars with GitHub Secrets
migration: add dropout_cases table
```

### 5.2 Branch Naming

```
<type>/<short-description>
```

**Examples:**

```
feat/advising-log-creation
fix/cloudinary-upload-error
docs/user-research
chore/ci-secrets-migration
test/playwright-advising-flow
```

- Use lowercase letters and hyphens only.
- Keep descriptions short (3–5 words).
- Branch from `main` for features; from the failing commit for hotfixes.

### 5.3 Pull Request Process

1. Push your feature branch to the remote repository.
2. Open a PR against `main`.
3. Fill in the PR template:
   - **What**: Summary of changes.
   - **Why**: Link to the related GitHub Issue.
   - **How tested**: Describe what tests were run.
   - **AI assistance**: Disclose if applicable.
   - **Checklist**: Confirm the Definition of Done items are met.
4. Request review from at least one teammate (Tech Lead for schema/auth changes).
5. Address review comments; mark resolved conversations.
6. Squash and merge once approved; delete the source branch.

### 5.4 Protected Branches

- `main` is the production branch. Direct pushes are disabled; all changes must go through a PR.
- The CI/CD pipeline (`deploy.yml`) runs automatically on merge to `main`.
