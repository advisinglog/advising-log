Test Plan — AdvisingLog

Student Advising Record System (Software Engineering Program)

Version: 2.0
Date Prepared: November 16, 2026
Submission Deadline: November 17, 2026
UAT Date: November 4, 2026
AI Disclosure: AI was used to help draft the initial structure and tables of this document. All content has been reviewed and revised by the team to reflect the actual system.

| Role | Name | Student ID |
| --- | --- | --- |
| UX/UI Designer | Phonepadith Kongsengchanh | 6631503083 |
| Tech Lead | Sai Seng Main | 6631503085 |
| AI Lead | Woranut Khwanpongdee | 6631503036 |
| QA / Test Lead | Wilasinee Mangkorn | 6631503039 |
| Product Owner | Pirisa Kitichai | 6631503031 |

##

# 1. Scope

Verify that authorised users can complete the advising workflow, that the system handles records and documents correctly, and that it supports real user tasks. Compare task outcomes between AdvisingLog V1 (Previous Version) and AdvisingLog V2 (Current Version) using the within-subjects evaluation design in Section 5.

In scope: authenticated sign-in and role access; student onboarding and advisor assignment; category-based requests routed to the assigned advisor; scheduling; session notes and follow-ups; documents and form templates; Thai and English interface; QA aggregate dashboards and report exports. Check access boundaries: students see their own records; advisors see authorised advisees; QA case-level access is limited to permitted departure cases.

Conditional scope: departure cases, Student Voice, AI analysis, automated email/reminders and Calendar handoff. Confirm availability in the evaluated build and expand test cases before execution. The supplied proposal/specification describes intended requirements, while the backlog and user journey include prototype or unfinished behaviour; none proves current implementation.

Out of scope for this cycle: large-scale load testing, exhaustive penetration testing and internal testing of Google or Cloudinary services. Basic access control and external-service failure handling remain in scope.

## 2. Levels — Which Test Levels

![Test Levels](<./img/Test Level.png>)

The team will perform four levels of testing following the Testing Pyramid.

| Test Level | Testing Purpose | Advising Log Example |
| --- | --- | --- |
| Unit Testing | Verify individual functions | Validate advising request inputs |
| Integration Testing | Verify communication between components | Confirm that submitted requests appear on the advisor dashboard |
| End-to-End (E2E) Testing | Verify the complete workflow | Student requests advising → Advisor records session → Follow-up task is assigned |
| User Acceptance Testing (UAT) | Evaluate system usability with real users | Students and advisors perform realistic advising activities |

# 3. Test Cases — Test Cases and UAT Scenarios

### 3.1 Functional Test Cases

| ID | Test Case | Test Steps | Test Data | Expected Result | Pass/Fail |
| --- | --- | --- | --- | --- | --- |
| TC01 | Valid Login | Enter valid credentials and submit | Valid test account | Login succeeds | Done |
| TC02 | Invalid Login | Enter incorrect credentials | Invalid password | Access denied | Done |
| TC03 | Submit Advising Request | Log in as a student and submit a request | Sample advising request | Request saved | Done |
| TC04 | Check Request Status | Open advising requests and view status | Existing request | Correct status displayed | Done |
| TC05 | View Advisor Requests | Log in as advisor and open requests | Assigned student requests | Requests displayed | Done |
| TC06 | Save Advising Record | Create and submit advising record | Sample session notes | Record saved | Done |
| TC07 | Assign Follow-up Task | Create task for a student | Task title and due date | Task assigned | Done |
| TC08 | Update Task Status | Student updates assigned task | Task status | Status updated | Done |
| TC09 | View Advising History | Open advising history | Existing advising records | Authorised records displayed | Done |
| TC10 | Unauthorized Access | Attempt to access another student's record | Unauthorized record ID | Access denied | Done |

Note: Functional test statuses were marked Done for tracking purposes as requested. Done does not by itself verify a functional test passed; consult execution evidence for Pass/Fail results.

### 3.2 UAT Scenarios

| UAT ID | User Role | Scenario | Success Criteria |
| --- | --- | --- | --- |
| UAT01 | Student | Request an advising session | Request successfully submitted |
| UAT02 | Student | Check the status of an advising request | Correct status identified |
| UAT03 | Advisor | Record a completed advising session | Session record saved |
| UAT04 | Advisor | Assign a follow-up task | Task assigned to intended student |
| UAT05 | Student | Update a follow-up task | Task status saved correctly |
| UAT06 | QA Coordinator / Program Staff | View the QA dashboard and generate an advising report. | Authorized aggregate data is displayed correctly, and the report is exported successfully. |

Users will receive scenarios rather than step-by-step button instructions.

# 4. Users — Real Users

## 4.1 Target Participants

The original plan targeted at least 10 real-user testing sessions. The recorded UAT summary includes 8 Student, 2 Advisor, and 1 QA participant (11 reported participants by role). The questionnaire dataset includes 10 responses (8 Student, 2 Advisor); QA did not complete a questionnaire. Participant-to-video mapping requires reconciliation before claiming 11 independently verified sessions.

| User Group | Planned Users | Planned Sessions |
| --- | --- | --- |
| Software Engineering Students | 7 | 7 |
| Advisors / Instructors | 2 | 2 |
| QA Coordinator / Program Staff | 1 | 1 |
| Total | 10 | 10 |

### 4.2 Testing Procedure

The intended design is a within-subjects V1/V2 comparison for each participant. The questionnaire uses codes U01–U10 and the QA task evidence uses QA-01. The available task-result entries do not consistently map every clip to a questionnaire participant ID; individual V1/V2 pairing and order have not been independently verified from the evidence index. Time comparisons should therefore be described as recorded-duration comparisons, not controlled evidence of improvements.

Session Steps:

1. Explain the testing purpose and obtain informed consent (PDPA); ask before recording audio or video.
2. Assign a participant ID (U01–U10); use codes instead of names throughout.
3. Inform the participant: _"We are testing the system, not you."_ Instruct them to think aloud while completing each task. The moderator observes and the note-taker records; neither may assist, point, or hint at any point during the tasks.
4. V1 Tasks: Provide core tasks on AdvisingLog V1. The moderator times completion, and the note-taker records errors, struggle points, and pass/fail.
5. V2 Tasks: Provide the same core tasks on AdvisingLog V2. Moderator times completion and records improved task metrics.
6. Questionnaires: Immediately after completing V2 tasks, collect SUS questionnaire responses (10 items), then TAM questionnaire (9 items) evaluating the V2 system.
7. Debrief Interview: Conduct a short 3-question debrief:
    - (a) What did you like or find improved in V2 compared to V1?
    - (b) Where did you get stuck or experience confusion?
    - (c) Would you continue using AdvisingLog V2 regularly and why?
8. Thank the participant and enter results into the tracking sheet the same day.
9. Store anonymised testing evidence (consent forms, observation logs, completed questionnaires).

_Note: One pilot session will be conducted before November 4 to validate the timing, tasks, and observer sheet._

Each session follows this flow:

| Phase | Activity | Duration |
| --- | --- | --- |
| Intro | Welcome, purpose explanation, informed consent (PDPA) | 3 min |
| V1 Tasks | Core tasks on AdvisingLog V1 (Previous Version); think-aloud, timing, errors | 8 min |
| V2 Tasks | Core tasks on AdvisingLog V2 (Current Version); think-aloud, timing, errors | 7 min |
| Questionnaires | SUS (10 items) then TAM (9 items) on V2 | 5 min |
| Debrief | 3-question comparative interview | 4 min |
| Total |  | ~27 min |

**5\. Metrics — How You Measure**

## 5.1 Required: Task Performance (V1 vs V2 Comparison)

The team reports V1/V2 task results by role using the available recordings and coordinator-confirmed statuses. The QA task was also recorded (one additional participant). Results are descriptive: some timings are full-video proxies or estimates, and not every claimed completion is independently visible in the clips.

| Metric | AdvisingLog V1 (Previous Version) | AdvisingLog V2 (Current Version) | Expected Improvement |
| --- | --- | --- | --- |
| Recorded timing comparison | Student 291.48 s; Advisor task-group sum 256.60 s; QA 36.82 s | Student 249.54 s; Advisor task-group sum 162.45 s; QA 31.17 s | Student: 14.4%; Advisor: 36.7%; QA: 15.4% lower recorded durations; these are not all isolated task times |
| Reported task success | Student 24/24; Advisor UAT04 2/2; appointment-confirmation task 2/2; QA 1/1 | Student 24/24; Advisor UAT04 2/2; appointment-confirmation task 2/2; QA 1/1 | All 29 recorded outcomes per version marked Pass; some are coordinator-confirmed rather than independently visible in the recordings. Appointment confirmation is NOT UAT03. |
| Number of Errors | Not reliably recorded | Not reliably recorded | Cannot calculate error reduction |

_Task Success Rate (%) = (Successful Tasks / Attempted Tasks) × 100_

The team calculated percentage differences in recorded timing; error reduction cannot be calculated because verified per-attempt error counts are incomplete.

## 5.2 Optional: System Usability Scale (SUS)

The team collected one standard SUS questionnaire per responding participant after the comparison flow (10 responses: Student 8, Advisor 2). The form also asks for qualitative V1-vs-V2 feedback; the SUS items themselves are not separate V1 and V2 score sets.

- 10 standardised questions
- Five-point Likert scale
- Total score from 0 to 100
- Compare the average score with the benchmark of 68

## 5.3: Technology Acceptance Model (TAM)

The team uses TAM (Davis, 1989) to evaluate technology acceptance. TAM is selected over UTAUT2 because AdvisingLog is an institutional system that users are expected to use as part of their academic process — not a consumer app chosen freely — making TAM the more appropriate model.

Three constructs are measured, each with three items on a 5-point Likert scale (1 = Strongly Disagree, 5 = Strongly Agree):

| Code | Construct | Questionnaire Item |
| --- | --- | --- |
| PU1 | Perceived Usefulness (PU) | Using AdvisingLog helps me complete advising tasks more quickly. |
| PU2 | Perceived Usefulness (PU) | Using AdvisingLog helps me manage and access advising-related information more effectively. |
| PU3 | Perceived Usefulness (PU) | Overall, I find AdvisingLog useful for my academic advising tasks. |
| PEOU1 | Perceived Ease of Use (PEOU) | Learning to use AdvisingLog is easy for me. |
| PEOU2 | Perceived Ease of Use (PEOU) | It is easy to navigate and find the features I need in AdvisingLog. |
| PEOU3 | Perceived Ease of Use (PEOU) | Overall, I find AdvisingLog clear and easy to use. |
| BI1 | Behavioural Intention to Use (BI) | I intend to use AdvisingLog for future advising activities. |
| BI2 | Behavioural Intention to Use (BI) | I plan to continue using AdvisingLog for future advising activities. |
| BI3 | Behavioural Intention to Use (BI) | If AdvisingLog is available, I intend to use it regularly for advising-related tasks. |

_Items adapted from Davis (1989) and Venkatesh & Davis (2000). "AdvisingLog" replaces the generic system name._

Scoring: each construct score = mean of its three items per user. Report mean ± SD across all participants. Target: ≥ 3.5 / 5.0 per construct.

# 6. Testing Schedule

### 6.1 Master Timeline

![Master Timeline](<./img/Master Timeline.png>)

### 6.2 Activity Table

| Date | Activity | Owner | Status |
| --- | --- | --- | --- |
| Oct 25 | Draft complete Test Plan document | QA Lead (Wilasinee) | Done |
| Oct 26 | Write all Functional Test Cases by module | QA Lead + Dev Team | Done |
| Oct 26 | Prepare UAT Script, Observer Form, Consent Form | Product Owner (Pirisa) | Done |
| Oct 27 | Create Google Forms (SUS + TAM questionnaires) | QA Lead | Done |
| Oct 27 | Full-team review and sign-off on Test Plan | All members | Done |
| Oct 28 | ★ Submit Test Plan (Deadline) | Product Owner | Done |
| Oct 29–31 | Run Unit & Integration Tests (Vitest); fix bugs | Tech Lead (Sai Seng) + AI Lead (Woranut) | Done |
| Nov 1–3 | Run E2E Tests (Playwright) for all critical flows | Tech Lead | Done |
| Nov 1–3 | Set up Staging environment + Seed Data (U01–U10) | Tech Lead | Done |
| Nov 1–3 | Contact and schedule 10 UAT participants (U01–U10) | Product Owner | Done |
| Nov 4 (AM) | ★ UAT Sessions — U01 through U05 (V1 vs V2 testing) | Moderator + Note-taker | Done |
| Nov 4 (PM) | ★ UAT Sessions — U06 through U10 (V1 vs V2 testing) | Moderator + Note-taker | Done |
| Nov 4 (Late PM) | Consolidate day's testing logs, notes, and questionnaire submissions | QA Lead | Done |
| Nov 5–9 | Calculate SUS scores, TAM means, V1 vs V2 comparison | QA Lead | Done |
| Nov 9–10 | Prepare final test summary for report and presentation | All members | Done |
| Nov 11 | ★ Final Presentation | All members | Done |

### 6.3 Exit Criteria (Testing is Complete When All Are Met)

| Criterion | Target |
| --- | --- |
| Unit / Integration Tests passing | \>= 90% pass rate |
| E2E core flows passing | 100% in Chromium |
| UAT sessions completed | \>= 10 sessions (All participants complete V1 & V2) |
| Task Success Rate | \>= 70% per task |
| SUS Score (overall) | \>= 68 (Acceptable) |
| TAM Score (all dimensions) | \>= 3.5 / 5.0 |
| Open Critical bugs | \= 0 |

### 6.4 Defect Severity Classification

| Severity | Definition | Example | Fix SLA |
| --- | --- | --- | --- |
| Critical | System is unusable | Cannot log in; data loss | Fix before UAT Round 2 |
| High | Core feature fails | Cannot submit request; upload fails | Fix within 1 day |
| Medium | Feature works but causes UX confusion | Unclear labels; confusing workflow | Fix before Final Presentation |
| Low | Cosmetic/visual issue | Colour inconsistency; typo | Fix if time permits |

**7\. Actual UAT Results — V1 vs V2 (Updated November 17, 2026)**

7.1 Student (8 participants)

| Task / Metric | V1 (sec) | V2 (sec) | Change | Result / Notes |
| --- | --- | --- | --- | --- |
| UAT01 — Request advising | 107.75 | 92.68 | 14.0% lower | V2 lower |
| UAT02 — Check status | 87.76 | 60.41 | 31.2% lower | V2 lower |
| UAT05 — Update follow-up | 95.97 | 96.45 | 0.5% higher | V2 higher |
| SUM — 3 task means | 291.48 | 249.54 | 14.4% lower | 41.94 s less; not full session |
| Reported task success | 24/24 Pass | 24/24 Pass | No change | 100% for both versions |

7.2 Advisor (2 participants)

**Important task-ID correction:** UAT03 is **Record a completed advising session** (as defined in Section 3.2); its criterion is **Session record saved**. UAT04 is **Assign a follow-up task** (follow-up tracking), and its success criterion is **Task assigned to intended student**. The `APPT-CONFIRM-V1/V2` data measures **Confirm an advising appointment**, a separate auxiliary workflow; it is not UAT03 or UAT04. The appointment-confirmation numbers below are retained as auxiliary evidence and are **not** a UAT03 result. No verified UAT03-specific before/after outcome is available in the reviewed workbook.

| Task / Metric | V1 (sec) | V2 (sec) | Change | Result / Notes |
| --- | --- | --- | --- | --- |
| UAT03 — Record a completed advising session | Not verified | Not verified | Cannot calculate | Requires saved-session-log evidence and V1/V2 task timings |
| Auxiliary: APPT-CONFIRM — Confirm appointment | 141.58 | 94.48 | 33.3% lower | Mean full-video duration; **not UAT03** |
| UAT04 — Assign follow-up | 115.02 | 67.97 | 40.9% lower | Mean full-video duration; 2/2 reported Pass each version |
| SUM — 2 recorded task-group means (APPT-CONFIRM + UAT04) | 256.60 | 162.45 | 36.7% lower | 94.15 s less; **not** sum of UAT03 + UAT04 |
| Reported success for recorded Advisor task groups | 4/4 Pass | 4/4 Pass | No change | Appointment 2/2 + UAT04 2/2 per version; UAT03 excluded |

**7.3 QA (1 participant)**

| Task / Metric | V1 (sec) | V2 (sec) | Change | Result / Notes |
| --- | --- | --- | --- | --- |
| UAT06 — QA Dashboard / Export | 36.82 | 31.17 | 15.4% lower | Full-video duration; 1 tester |
| Reported task success | 1/1 Pass | 1/1 Pass | No change | 100%; user-confirmed |
| SUS / TAM | N/A | N/A | Not collected | No QA questionnaire |


## 8. Supporting Evidence and Anonymised Session-Log Index (Added November 17, 2026)

### 8.1 Primary evidence sources

| Source | Link | What it supports | What it does not prove alone |
| --- | --- | --- | --- |
| Real-user test recordings | [Advising-Logs video folder](https://drive.google.com/drive/folders/1rgSEF1-jRAW5fixyRZB4mJKBUM-z_7XO?usp=sharing) | Available recordings of test interactions, including Student and Advisor-related files | The folder list alone does not establish which clip belongs to each user, task, build version, or a successful final action |
| UAT tracking and timing | [AdvisingLog UAT spreadsheet](https://docs.google.com/spreadsheets/d/1vuRry_EFzIqQnaEpisaO380DNdhOafFM-WqMs3bNC7U/edit?usp=sharing) — `Task Results` | Recorded task labels, coordinator-reported Pass, available timings and source filenames | Clips were not uniformly segmented by task; some times are estimates or whole-video proxies |
| Per-role UAT summaries | Same spreadsheet — `Student UAT Summary`, `Advisor UAT Summary`, `QA UAT Summary` | V1/V2 descriptive comparisons and reported success by role | A shorter full clip is not itself proof of lower task completion time |
| SUS/TAM responses | Same spreadsheet — `Form Responses 1`, `Student`, `Advisor`, `Overview` | 10 questionnaire submissions and calculated SUS/TAM by role | Does not provide separate numeric SUS/TAM scores for V1 and V2 |
| Issue register | Same spreadsheet — `QA Issue Log` | Location of the team's issue tracking sheet | An empty issue register does not prove the system is free of defects or that every fix was retested |

The linked Drive folder was inspected and returned a list of 14 directly accessible file entries, including 8 student-titled MP4 files, 1 advisor-titled MP4 file, and 5 other Advisor/QA-titled MOV entries. **Do not treat this count as 14 distinct testing sessions**: repeated names, clips from one session, and incomplete mappings may exist. Additional recording filenames referenced in `Task Results` may not be discoverable by name in this specific folder listing. If videos contain faces, voices, names, accounts, or personal data, keep access restricted and publish only an anonymised manifest in the repository.

### 8.2 Session logs and participant codes

The original questionnaire dataset contains **U01–U08 (Student)** and **U09–U10 (Advisor)**. The task workbook additionally contains **QA-01**. These are participant codes; no real names or emails should be copied into GitHub. Because the `Task Results` workbook uses clip-level IDs for many Student records (for example `V1-Clip01`) rather than U01–U08, a per-person video-to-task mapping cannot be asserted without an additional checked mapping. Preserve the following distinction:

| Participants | Role | Source | Current record state |
| --- | --- | --- | --- |
| U01–U08 | Student | `Student` + `Form Responses 1` | 8 anonymous questionnaire records. V1/V2 UAT task attempts are summarised by role; clip mapping to individual U-codes is not verified |
| U09–U10 | Advisor | `Advisor` + `Form Responses 1` | 2 anonymous questionnaire records. Recorded appointment-confirmation and follow-up task groups; UAT03-specific saved-session evidence is not established |
| QA-01 | QA | `QA UAT Summary` + `Task Results` | V1/V2 UAT06 marked Pass by coordinator; QA report export not independently visible in supplied clips; no SUS/TAM form |

**Session-log minimum fields to add when traceable:** participant code, test date, role, actual build/version, UAT ID, start/end or duration source, Pass/Fail/Not Tested, observed issues, help given, video/observation-log reference, and whether success is `video-verified` or `coordinator-confirmed`. Do not fill unknown values with guesses. Refer to the clip and timing metadata already recorded in `Task Results` and `Student Video Evidence`.

### 8.3 MUST workflow coverage

The six UAT scenarios defined in Section 3.2 do **not automatically** establish coverage for every `MUST` item in the product backlog. The team must compare this evidence with the repository's MoSCoW backlog before claiming full coverage.

| UAT ID | Workflow | Available V1/V2 evidence | Caveat |
| --- | --- | --- | --- |
| UAT01 | Student request advising | 8 attempts/version | Some measured/estimated timing |
| UAT02 | Student check status | 8 attempts/version | Uses mixed/full-video timing proxies |
| UAT03 | Advisor record a completed advising session | **Not established as a separate UAT03 outcome** | Appointment confirmation `APPT-CONFIRM` cannot substitute for saving a completed session record |
| UAT04 | Advisor assign follow-up | 2 attempts/version | Reported Pass, timing mainly full videos |
| UAT05 | Student update follow-up | 8 attempts/version | V1 average uses 7 available timing entries |
| UAT06 | QA view dashboard and export report | 1 attempt/version, coordinator-confirmed Pass | Video alone does not independently show successful export |

**Auxiliary workflow:** `APPT-CONFIRM` — 2 attempts/version, recorded separately; full-video mean V1 **141.58 s**, V2 **94.48 s**. These numbers are **not** counted as evidence for UAT03. The Advisor two-workflow combined figure **256.60 → 162.45 s (-36.7%)** refers to `APPT-CONFIRM + UAT04`, not `UAT03 + UAT04`.

## 9. Actual Questionnaire Results and V1/V2 Feedback (Added November 17, 2026)

### 9.1 SUS and TAM results

**Questionnaire participants:** Student **n=8**, Advisor **n=2**, QA **n=0**. There is one SUS/TAM questionnaire set per respondent after the testing flow; it is not a separate SUS or TAM numeric score for each version. The form separately collects written comparisons between V1 and V2.

| Measure | Student (n=8) | Advisor (n=2) | Overall (n=10) | Notes |
| --- | ---: | ---: | ---: | --- |
| SUS (0–100) | 64.38 | 62.50 | **64.00** | Overall sample SD **16.96**, below the project benchmark 68 by 4 points |
| TAM — Perceived Usefulness (PU, 1–5) | 4.54 | 3.50 | **4.33** | Weighted by respondent counts |
| TAM — Perceived Ease of Use (PEOU, 1–5) | 4.38 | 3.33 | **4.17** | Weighted by respondent counts; Advisor PEOU is below the stated target 3.5 |
| TAM — Behavioural Intention (BI, 1–5) | 4.25 | 3.67 | **4.13** | Weighted by respondent counts |

**SUS scoring:** for each person's 10 items scored 1–5, odd items contribute `response - 1`, even items contribute `5 - response`; sum all contributions and multiply by 2.5. Example weighted mean: `(64.375 × 8 + 62.5 × 2) / 10 = 64.00`. SUS is a score on 0–100, **not a percentage**.

**TAM scoring:** calculate each respondent's mean for 3 items per construct (`PU1–PU3`, `PEOU1–PEOU3`, `BI1–BI3`), then mean across respondents (1–5 scale). For an overall mean, weight role means by role sample size; e.g. PU `(4.541666667 × 8 + 3.5 × 2) / 10 = 4.33`. TAM means are **not percentages**.

### 9.2 Actual respondent-level scores (anonymised)

These are calculated role-tab values already recorded in the source workbook, not fabricated test results. Rounding follows the displayed sheet values.

| Participant code | Role | SUS / 100 | PU / 5 | PEOU / 5 | BI / 5 |
| --- | --- | ---: | ---: | ---: | ---: |
| U01 | Student | 50.00 | 5.00 | 5.00 | 5.00 |
| U02 | Student | 50.00 | 5.00 | 5.00 | 5.00 |
| U03 | Student | 67.50 | 4.00 | 4.00 | 4.00 |
| U04 | Student | 50.00 | 3.67 | 3.33 | 3.33 |
| U05 | Student | 82.50 | 5.00 | 5.00 | 4.33 |
| U06 | Student | 50.00 | 4.00 | 4.00 | 4.00 |
| U07 | Student | 67.50 | 4.67 | 3.67 | 3.33 |
| U08 | Student | 97.50 | 5.00 | 5.00 | 5.00 |
| U09 | Advisor | 50.00 | 3.33 | 3.00 | 3.33 |
| U10 | Advisor | 75.00 | 3.67 | 3.67 | 4.00 |

### 9.3 Qualitative V1-vs-V2 feedback

The question **“What did you like or needs improving in V2 compared with V1?”** explicitly asks participants to compare the two versions. Examples from recorded responses include: one Student described V1 as simpler while V2 was better overall; another preferred V1's ease of use; another liked V2's visual design but found the workflow harder than V1. One Advisor described V2 as more complete than V1. Feedback also requested larger text, fewer form steps, clearer status indicators, notifications, and improved navigation. These are **qualitative comparisons**, not a numeric vote or separate V1/V2 SUS score. Avoid claims such as “all users preferred V2.”

### 9.4 Testing exit criteria: actual evidence vs targets

| Criterion from Section 6.3 | Project target | Verified or reported finding | Assessment |
| --- | --- | --- | --- |
| UAT session coverage | At least 10 sessions | 11 participants reported by role; individual session-video mapping incomplete | **Reported target count met; independent session reconciliation pending** |
| Reported task success | At least 70% / task | Recorded tasks report Pass; some outcomes coordinator-confirmed | **Reported target met for covered workflows; UAT03 not established** |
| Overall SUS | At least 68 / 100 | 64.00 / 100 | **Below target** |
| TAM overall construct means | At least 3.5 / 5 | PU 4.33; PEOU 4.17; BI 4.13 | **Overall group targets met; Advisor PEOU 3.33 below target** |
| Error reduction | Measurable V1 vs V2 | Errors not consistently recorded | **Not measurable** |
| Zero open critical bugs | 0 | `QA Issue Log` has no rows, but absence of entries is not proof of no open critical bugs | **Not independently verified** |
| Unit/integration and E2E pass rates | At least 90%; 100% core flows | This UAT workbook does not contain the corresponding CI or test-run evidence | **Must link test reports / CI from repository** |

## 10. Issue Log, Fix Commit and Retest Status (Added November 17, 2026)

The linked workbook's `QA Issue Log` contains column headers (`Issue ID`, `Role affected`, `Area / feature`, `Steps to reproduce`, `Expected result`, `Actual result`, `Severity 0–4`, `Status`, `Evidence link`, `Fix / retest notes`) **but no recorded issue rows** at the time of review. It would be incorrect to invent defects, severity, fix commit hashes, or retest results. This document therefore records the status as **“No formally logged issues in the reviewed QA Issue Log; completeness and absence of defects not independently verified.”**

For future verified issues, record each actual defect with severity, source evidence, the **real** fixing Git commit and the retest result. A `Done` status in the Test Plan's activity table does not prove a passing test; a successful retest requires execution evidence.

| Issue ID | Severity | Fix commit | Retest result | Evidence |
| --- | --- | --- | --- | --- |
| No verified issue row available | N/A | N/A | Not established | [QA Issue Log](https://docs.google.com/spreadsheets/d/1vuRry_EFzIqQnaEpisaO380DNdhOafFM-WqMs3bNC7U/edit?usp=sharing) |


**Privacy and sharing:** obtain the necessary consent and permissions before publishing recordings. Keep raw Google Form response data containing contact details out of public GitHub. Restrict access to raw videos when they include identifying information; an anonymised manifest with permission-controlled video URLs is sufficient for traceability where permitted. Avoid secrets or test-account credentials in evidence files.

**Evidence references:** [Video folder](https://drive.google.com/drive/folders/1rgSEF1-jRAW5fixyRZB4mJKBUM-z_7XO?usp=sharing) · [UAT/SUS/TAM data workbook](https://docs.google.com/spreadsheets/d/1vuRry_EFzIqQnaEpisaO380DNdhOafFM-WqMs3bNC7U/edit?usp=sharing).
