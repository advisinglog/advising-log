# Test Plan — AdvisingLog

## Student Advising Record System (Software Engineering Program)

Version: 1.0  
Date Prepared: October 25, 2026  
Submission Deadline: October 28, 2026  
UAT Date: November 4, 2026  
AI Disclosure: AI was used to help draft the initial structure and tables of this document. All content has been reviewed and revised by the team to reflect the actual system.

| Role | Name | Student ID |
| :---- | :---- | :---- |
| UX/UI Designer | Phonepadith Kongsengchanh | 6631503083 |
| Tech Lead | Sai Seng Main | 6631503085 |
| AI Lead | Woranut Khwanpongdee | 6631503036 |
| QA / Test Lead | Wilasinee Mangkorn | 6631503039 |
| Product Owner | Pirisa Kitichai | 6631503031 |

## ---

# 1\. Scope

Verify that authorised users can complete the advising workflow, that the system handles records and documents correctly, and that it supports real user tasks. Compare task outcomes between AdvisingLog V1 (Previous Version) and AdvisingLog V2 (Current Version) using the within-subjects evaluation design in Section 5\. 

In scope: authenticated sign-in and role access; student onboarding and advisor assignment; category-based requests routed to the assigned advisor; scheduling; session notes and follow-ups; documents and form templates; Thai and English interface; QA aggregate dashboards and report exports. Check access boundaries: students see their own records; advisors see authorised advisees; QA case-level access is limited to permitted departure cases.

Conditional scope: departure cases, Student Voice, AI analysis, automated email/reminders and Calendar handoff. Confirm availability in the evaluated build and expand test cases before execution. The supplied proposal/specification describes intended requirements, while the backlog and user journey include prototype or unfinished behaviour; none proves current implementation.

Out of scope for this cycle: large-scale load testing, exhaustive penetration testing and internal testing of Google or Cloudinary services. Basic access control and external-service failure handling remain in scope.

---

## 2\. Levels — Which Test Levels

![Test Levels](<./img/Test Level.png>)

The team will perform four levels of testing following the Testing Pyramid.

| Test Level | Testing Purpose | Advising Log Example |
| :---- | :---- | :---- |
| Unit Testing | Verify individual functions | Validate advising request inputs |
| Integration Testing | Verify communication between components | Confirm that submitted requests appear on the advisor dashboard |
| End-to-End (E2E) Testing | Verify the complete workflow | Student requests advising → Advisor records session → Follow-up task is assigned |
| User Acceptance Testing (UAT) | Evaluate system usability with real users | Students and advisors perform realistic advising activities |

---

# 3\. Test Cases — Test Cases and UAT Scenarios

### 3.1 Functional Test Cases

| ID | Test Case | Test Steps | Test Data | Expected Result | Pass/Fail |
| :---- | :---- | :---- | :---- | :---- | :---- |
| TC01 | Valid Login | Enter valid credentials and submit | Valid test account | Login succeeds | Pending |
| TC02 | Invalid Login | Enter incorrect credentials | Invalid password | Access denied | Pending |
| TC03 | Submit Advising Request | Log in as a student and submit a request | Sample advising request | Request saved | Pending |
| TC04 | Check Request Status | Open advising requests and view status | Existing request | Correct status displayed | Pending |
| TC05 | View Advisor Requests | Log in as advisor and open requests | Assigned student requests | Requests displayed | Pending |
| TC06 | Save Advising Record | Create and submit advising record | Sample session notes | Record saved | Pending |
| TC07 | Assign Follow-up Task | Create task for a student | Task title and due date | Task assigned | Pending |
| TC08 | Update Task Status | Student updates assigned task | Task status | Status updated | Pending |
| TC09 | View Advising History | Open advising history | Existing advising records | Authorised records displayed | Pending |
| TC10 | Unauthorized Access | Attempt to access another student's record | Unauthorized record ID | Access denied | Pending |

Note: Pending means the test has not yet been executed. The team will record actual Pass/Fail results during testing.

### 3.2 UAT Scenarios

| UAT ID | User Role | Scenario | Success Criteria |
| :---- | :---- | :---- | :---- |
| UAT01 | Student | Request an advising session | Request successfully submitted |
| UAT02 | Student | Check the status of an advising request | Correct status identified |
| UAT03 | Advisor | Record a completed advising session | Session record saved |
| UAT04 | Advisor | Assign a follow-up task | Task assigned to intended student |
| UAT05 | Student | Update a follow-up task | Task status saved correctly |
| UAT06  | QA Coordinator / Program Staff  | View the QA dashboard and generate an advising report.  | Authorized aggregate data is displayed correctly, and the report is exported successfully.  |

Users will receive scenarios rather than step-by-step button instructions.

---

# 4\. Users — Real Users

## 4.1 Target Participants

The team plans to conduct at least 10 real-user testing sessions.

| User Group | Planned Users | Planned Sessions |
| :---- | :---- | :---- |
| Software Engineering Students | 7 | 7 |
| Advisors / Instructors | 2 | 2 |
| QA Coordinator / Program Staff | 1 | 1 |
| Total | 10 | 10 |

### 4.2 Testing Procedure

The evaluation uses a Within-Subjects comparative design, in which each participant (U01–U10) performs the core advising tasks on AdvisingLog V1 (Previous Version) and then on AdvisingLog V2 (Current Version) to directly measure performance improvements.

Session Steps:

1. Explain the testing purpose and obtain informed consent (PDPA); ask before recording audio or video.  
2. Assign a participant ID (U01–U10); use codes instead of names throughout.  
3. Inform the participant: *"We are testing the system, not you."* Instruct them to think aloud while completing each task. The moderator observes and the note-taker records; neither may assist, point, or hint at any point during the tasks.  
4. V1 Tasks: Provide core tasks on AdvisingLog V1. The moderator times completion, and the note-taker records errors, struggle points, and pass/fail.  
5. V2 Tasks: Provide the same core tasks on AdvisingLog V2. Moderator times completion and records improved task metrics.  
6. Questionnaires: Immediately after completing V2 tasks, collect SUS questionnaire responses (10 items), then TAM questionnaire (9 items) evaluating the V2 system.  
7. Debrief Interview: Conduct a short 3-question debrief:  
   * (a) What did you like or find improved in V2 compared to V1?  
   * (b) Where did you get stuck or experience confusion?  
   * (c) Would you continue using AdvisingLog V2 regularly and why?  
8. Thank the participant and enter results into the tracking sheet the same day.  
9. Store anonymised testing evidence (consent forms, observation logs, completed questionnaires).

*Note: One pilot session will be conducted before November 4 to validate the timing, tasks, and observer sheet.*

Each session follows this flow:

| Phase | Activity | Duration |
| :---- | :---- | :---- |
| Intro | Welcome, purpose explanation, informed consent (PDPA) | 3 min |
| V1 Tasks | Core tasks on AdvisingLog V1 (Previous Version); think-aloud, timing, errors | 8 min |
| V2 Tasks | Core tasks on AdvisingLog V2 (Current Version); think-aloud, timing, errors | 7 min |
| Questionnaires | SUS (10 items) then TAM (9 items) on V2 | 5 min |
| Debrief | 3-question comparative interview | 4 min |
| Total |  | \~27 min |

---

5\. Metrics — How You Measure

## 5.1 Required: Task Performance (V1 vs V2 Comparison)

The team compares task performance between AdvisingLog V1 (Previous Version) and AdvisingLog V2 (Current Version) across all 10 participants to demonstrate measurable usability and efficiency gains.

| Metric | AdvisingLog V1 (Previous Version) | AdvisingLog V2 (Current Version) | Expected Improvement |
| ----- | ----- | ----- | ----- |
| Task Completion Time | To be measured | To be measured | To be measured |
| Task Success Rate | To be measured | To be measured | To be measured |
| Number of Errors | To be measured | To be measured | To be measured |

Task Success Rate (%) \= (Successful Tasks / Attempted Tasks) × 100

The team will calculate the percentage of time saved and error reduction from V1 to V2. 

## 5.2 Optional: System Usability Scale (SUS)

The team proposes using SUS to evaluate ease of use.

* 10 standardised questions  
* Five-point Likert scale  
* Total score from 0 to 100  
* Compare the average score with the benchmark of 68

## 5.3: Technology Acceptance Model (TAM)

The team uses **TAM (Davis, 1989\)** to evaluate technology acceptance. TAM is selected over UTAUT2 because AdvisingLog is an institutional system that users are expected to use as part of their academic process — not a consumer app chosen freely — making TAM the more appropriate model.  
Three constructs are measured, each with three items on a 5-point Likert scale (1 \= Strongly Disagree, 5 \= Strongly Agree):

| Code | Construct | Questionnaire Item |
| :---- | :---- | :---- |
| PU1 | Perceived Usefulness (PU) | Using AdvisingLog helps me complete advising tasks more quickly. |
| PU2 | Perceived Usefulness (PU) | AdvisingLog improves the quality and accuracy of advising records. |
| PU3 | Perceived Usefulness (PU) | Overall, I find AdvisingLog useful for my academic advising tasks. |
| PEOU1 | Perceived Ease of Use (PEOU) | Learning to use AdvisingLog is easy for me. |
| PEOU2 | Perceived Ease of Use (PEOU) | It is easy to navigate and find the features I need in AdvisingLog. |
| PEOU3 | Perceived Ease of Use (PEOU) | Overall, I find AdvisingLog clear and easy to use. |
| BI1 | Behavioural Intention to Use (BI) | I intend to use AdvisingLog for future advising activities. |
| BI2 | Behavioural Intention to Use (BI) | I plan to continue using AdvisingLog for future advising activities.  |
| BI3 | Behavioural Intention to Use (BI) | If AdvisingLog is available, I intend to use it regularly for advising-related tasks.  |

*Items adapted from Davis (1989) and Venkatesh & Davis (2000). "AdvisingLog" replaces the generic system name.*

Scoring: each construct score \= mean of its three items per user. Report mean ± SD across all participants. Target: ≥ 3.5 / 5.0 per construct.

---

# 6\. Testing Schedule

### 6.1 Master Timeline

![Master Timeline](<./img/Master Timeline.png>)

### 6.2 Activity Table

| Date | Activity | Owner | Status |
| :---- | :---- | :---- | :---- |
| Oct 25 | Draft complete Test Plan document | QA Lead (Wilasinee) | Done |
| Oct 26 | Write all Functional Test Cases by module | QA Lead \+ Dev Team | In Progress |
| Oct 26 | Prepare UAT Script, Observer Form, Consent Form | Product Owner (Pirisa) | In Progress |
| Oct 27 | Create Google Forms (SUS \+ TAM questionnaires) | QA Lead | To Do |
| Oct 27 | Full-team review and sign-off on Test Plan | All members | To Do |
| Oct 28 | ★ Submit Test Plan (Deadline) | Product Owner | To Do |
| Oct 29–31 | Run Unit & Integration Tests (Vitest); fix bugs | Tech Lead (Sai Seng) \+ AI Lead (Woranut) | To Do |
| Nov 1–3 | Run E2E Tests (Playwright) for all critical flows | Tech Lead | To Do |
| Nov 1–3 | Set up Staging environment \+ Seed Data (U01–U10) | Tech Lead | To Do |
| Nov 1–3 | Contact and schedule 10 UAT participants (U01–U10) | Product Owner | To Do |
| Nov 4 (AM) | ★ UAT Sessions — U01 through U05 (V1 vs V2 testing) | Moderator \+ Note-taker | To Do |
| Nov 4 (PM) | ★ UAT Sessions — U06 through U10 (V1 vs V2 testing) | Moderator \+ Note-taker | To Do |
| Nov 4 (Late PM) | Consolidate day's testing logs, notes, and questionnaire submissions | QA Lead | To Do |
| Nov 5–9 | Calculate SUS scores, TAM means, V1 vs V2 comparison | QA Lead | To Do |
| Nov 9–10 | Prepare final test summary for report and presentation | All members | To Do |
| Nov 11 | ★ Final Presentation | All members | To Do |

### 6.3 Exit Criteria (Testing is Complete When All Are Met)

| Criterion | Target |
| :---- | :---- |
| Unit / Integration Tests passing | \>= 90% pass rate |
| E2E core flows passing | 100% in Chromium |
| UAT sessions completed | \>= 10 sessions (All participants complete V1 & V2)  |
| Task Success Rate | \>= 70% per task |
| SUS Score (overall) | \>= 68 (Acceptable) |
| TAM Score (all dimensions) | \>= 3.5 / 5.0 |
| Open Critical bugs | \= 0 |

### 6.4 Defect Severity Classification

| Severity | Definition | Example | Fix SLA |
| :---- | :---- | :---- | :---- |
| Critical | System is unusable | Cannot log in; data loss | Fix before UAT Round 2 |
| High | Core feature fails | Cannot submit request; upload fails | Fix within 1 day |
| Medium | Feature works but causes UX confusion | Unclear labels; confusing workflow | Fix before Final Presentation |
| Low | Cosmetic/visual issue | Colour inconsistency; typo | Fix if time permits |