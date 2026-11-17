# AdvisingLog Case Study

## Live system

**Live URL:** [https://advising-log.pages.dev](https://advising-log.pages.dev)

The deployed API is available at [https://advising-log-backend.se-advisinglog.workers.dev](https://advising-log-backend.se-advisinglog.workers.dev). Both production endpoints were reachable with HTTP 200 on 17 November 2026.

## Problem

The Software Engineering program's advising process was distributed across paper forms, email, personal chats, and face-to-face conversations. This created four connected problems:

- Advising histories were fragmented, making it difficult for students and advisors to see the status of an ongoing case.
- Follow-up actions and referrals were easy to lose after a meeting.
- Sensitive student information lacked a consistent, role-aware handling process.
- The program had no reliable central dataset for advisor workload, response time, satisfaction, or dropout/leave analysis required for AUN-QA evidence.

Students also had to work out who to contact and how to track a request, while advisors and QA staff had to reconstruct information manually.

## Process

### 1. Requirements and workflow definition

The team translated interviews and the advising requirements into one end-to-end workflow:

1. A student submits a categorized advising request and gives mandatory PDPA consent.
2. The system routes the request through the maintained student-advisor roster.
3. The advisor accepts and schedules an appointment.
4. The advisor records the session, outcome, referral, and any follow-up task.
5. The student updates follow-up progress and may submit satisfaction feedback.
6. QA reviews aggregate evidence and has scoped access to dropout/leave cases for Criterion 8 analysis.

The request lifecycle is `Requested → Scheduled → Completed → Closed`, with `Cancelled` supported separately. Coded categories and reason codes were prioritized over unstructured text so that records can be grouped and reported.

### 2. Product and technical implementation

AdvisingLog was implemented as a bilingual React and TypeScript frontend with a Cloudflare Workers/Hono API, Cloudflare D1 with Drizzle ORM, and Cloudinary for private document storage. The interface provides separate Student, Advisor, Program Chair/QA, and Admin experiences.

The implementation focused on:

- role-based access and scoped records;
- categorized requests, appointments, session notes, referrals, and follow-ups;
- dropout/leave workflows with coded reason taxonomy;
- QA dashboards and CSV/Excel export;
- Thai/English language switching and light/dark presentation;
- audit logging and PDPA-aware consent;
- storing Cloudinary `public_id` references rather than document binaries or full URLs.

### 3. Verification and iteration

The team used unit and integration tests, critical-flow testing, and role-based UAT. Ten questionnaire respondents and eleven UAT participants were represented in the final evidence set: eight students, two advisors, and one QA participant. Each participant completed comparable V1 and V2 tasks where applicable, using participant codes rather than personal identities.

The evaluated workflows were:

- Student: request advising, check request status, and update follow-up status.
- Advisor: confirm an advising appointment and assign a follow-up task.
- QA: view the dashboard and generate an advising report.

The test plan and comparison report record the measurement limitations: some timings are whole-video proxies or estimates, QA export success was not independently demonstrated in every clip, and the questionnaire contains one unseparated SUS/TAM item set rather than separate V1 and V2 scores. These limitations are retained instead of presenting the evidence as a controlled laboratory benchmark.

## Outcome

### Measured results

| Measure | Result |
|---|---:|
| Student aggregate task time | 291.48 s → 249.54 s (**14.4% lower**) |
| Advisor aggregate task time | 256.60 s → 162.45 s (**36.7% lower**) |
| QA dashboard/report task time | 36.82 s → 31.17 s (**15.4% lower**) |
| Reported Student task success | 24/24 in V1 and 24/24 in V2 |
| Reported Advisor task success | 4/4 in V1 and 4/4 in V2 |
| Reported QA task success | 1/1 in V1 and 1/1 in V2 |
| Overall reported outcomes | 29/29 pass per version |
| Overall SUS | 64.00/100 from 10 responses |
| Overall TAM | PU 4.33, PEOU 4.17, BI 4.13 out of 5 |

The V2 workflow therefore reduced recorded task time while preserving the reported task success rate. Users specifically identified clearer navigation, text size, notifications, and status feedback as areas for continued improvement. The SUS result of 64.00 is below the project's 68 reference benchmark, so the outcome is an improvement in the tested task timings—not a claim that the system is universally easy to use.

### Practical and quality-assurance outcome

AdvisingLog turns a scattered advising process into a traceable case lifecycle. Students can submit and monitor requests, advisors can record decisions and follow-up work in one place, and QA can use aggregate coded data for AUN-QA Criteria 5 and 6. Dropout/leave cases retain a separate scoped evidence path for Criterion 8 without opening general sensitive advising notes to QA.

The current result is a functional prototype/MVP deployment. Further work should add stronger anonymized repository evidence, repeat usability testing with task-only timings, and additional validation of external email, calendar, and Cloudinary failure paths before production-wide adoption.

## Evidence

- [Project proposal](../01-requirements/proposal.md)
- [System specification](../01-requirements/spec.md)
- [Test plan](../04-test%20plan/AdvisingLog%20Test%20Plan.md)
- [Before/After comparison](comparison-table.md)
- [AI use disclosure](ai-logic.md)