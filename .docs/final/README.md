# AdvisingLog Final Evidence Index

This index covers the project evidence from Discover through Deliver. All files listed below are on the `main` branch unless stated otherwise.

## 1. Discover

| Evidence | File |
|---|---|
| Project overview, team members, roles, and system scope | [Project README](../../README.md) |
| Company charter, team rules, and git workflow | [Company charter](../01-requirements/charter.md) |
| Team development rules and responsibilities | [AGENTS.md](../../AGENTS.md) |
| Project brief, roles, workflow, domain rules, and AI guidance | [CLAUDE.md](../../CLAUDE.md) |
| Problem analysis and literature review (SECONDARY) | [User research (SECONDARY)](../01-requirements/user-research.md) |
| Project proposal and problem definition | [Proposal](../01-requirements/proposal.md) |
| Functional requirements | [System specification](../01-requirements/spec.md) |
| MoSCoW product backlog and MUST items | [Product backlog](../01-requirements/backlog.md) |
| Real-user qualitative UAT feedback (not interview transcripts) | [UAT qualitative feedback](../01-requirements/evidence/uat-qualitative-feedback.md) |
| User journeys | [User journey](../02-design/user-journey.md) |
| Feature list | [Feature list](../02-design/feature-list.md) |
| PDPA and legal requirements | [Compliance rules](../03-compliance/rule.md) |

> Due to timeline constraints, user research relies on secondary evidence (academic literature, market review of comparable advising systems, and AUN-QA documentation) labeled `SECONDARY` in [User research](../01-requirements/user-research.md).

## 2. Build

| Evidence | File |
|---|---|
| Use-case diagram | [Use-case diagram](../02-design/diagrams/01-use-case-diagram.jpg) |
| Activity diagram | [Activity diagram](../02-design/diagrams/02-activity-diagram.jpg) |
| Sequence diagram | [Sequence diagram](../02-design/sequence-diagram.md) |
| Entity-relationship diagram | [ER diagram](../02-design/diagrams/03-ER-diagram.jpg) |
| System architecture | [Architecture diagram](../02-design/diagrams/04-system-architecture-diagram.jpg) |
| Frontend source code | [Frontend](../../frontend/) |
| Backend source code | [Backend](../../backend/) |
| Root environment template | [Root .env.example](../../.env.example) |
| Frontend environment template | [Frontend .env.example](../../frontend/.env.example) |
| Backend environment template | [Backend .dev.vars.example](../../backend/.dev.vars.example) |
| Frontend tests | [Frontend test files](../../frontend/src/) |
| Backend tests | [Backend test files](../../backend/src/) |
| Deployment workflow | [Cloudflare deployment workflow](../../.github/workflows/deploy.yml) |

## 3. Test

| Evidence | File |
|---|---|
| Test scope, levels, cases, UAT scenarios, and metrics | [AdvisingLog Test Plan](../04-test%20plan/AdvisingLog%20Test%20Plan.md) |
| Test-level visual | [Test Level diagram](../04-test%20plan/img/Test%20Level.png) |
| Test schedule | [Master Timeline](../04-test%20plan/img/Master%20Timeline.png) |
| Anonymized U01–U10 session logs | [UAT session logs](../04-test%20plan/evidence/uat-session-logs.md) |
| Anonymized task-level UAT records | [UAT task results CSV](../04-test%20plan/evidence/uat-task-results.csv) |
| Issue severity, fix commits, and retest results | [Issue log](../04-test%20plan/evidence/issue-log.md) |
| Anonymized SUS/TAM item responses and scores | [SUS/TAM results](../04-test%20plan/evidence/sus-tam-results.md) |
| Anonymized SUS/TAM CSV data | [SUS/TAM CSV](../04-test%20plan/evidence/sus-tam-results.csv) |
| Before/after task results and SUS/TAM summary | [Before/After comparison](comparison-table.md) |

> The source participant-code field was blank, so U01–U10 are repository-local pseudonyms assigned in source row order. Task-level records are not attributed to individual participants because the source workbook does not provide that mapping.

## 4. Deliver

| Evidence | File |
|---|---|
| Problem, Process, Outcome, and live URL | [Case study](case-study.md) |
| AI assistance disclosure and evaluation status | [AI logic](ai-logic.md) |
| V1/V2 comparison, SUS/TAM results, and AI comparison row | [Comparison table](comparison-table.md) |
| Phonepadith Kongsengchanh — UX/UI Designer | [Role statement](role-statements/6631503083-phonepadith-kongsengchanh.md) |
| Sai Seng Main — Tech Lead | [Role statement](role-statements/6631503085-sai-seng-main.md) |
| Woranut Khwanpongdee — AI Lead | [Role statement](role-statements/6631503036-woranut-khwanpongdee.md) |
| Wilasinee Mangkorn — QA / Test Lead | [Role statement](role-statements/6631503039-wilasinee-mangkorn.md) |
| Pirisa Kitichai — Product Owner | [Role statement](role-statements/6631503031-pirisa-kitichai.md) |

## 5. Live deployment

- [AdvisingLog frontend](https://advising-log.pages.dev)
- [AdvisingLog API](https://advising-log-backend.se-advisinglog.workers.dev)

Both deployment endpoints were reachable with HTTP 200 on 17 November 2026.
