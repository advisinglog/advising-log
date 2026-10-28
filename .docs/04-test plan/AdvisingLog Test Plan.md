# **Test Plan — AdvisingLog**

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

# **1\. Scope**

Verify that authorised users can complete the advising workflow, that the system handles records and documents correctly, and that it supports real user tasks. Compare task outcomes before and after using the proposed evaluation design in Section 5.

**In scope:** authenticated sign-in and role access; student onboarding and advisor assignment; category-based requests routed to the assigned advisor; scheduling; session notes and follow-ups; documents and form templates; Thai and English interface; QA aggregate dashboards and report exports. Check access boundaries: students see their own records; advisors see authorised advisees; QA case-level access is limited to permitted departure cases.

Conditional scope: departure cases, Student Voice, AI analysis, automated email/reminders and Calendar handoff. Confirm availability in the evaluated build and expand test cases before execution. The supplied proposal/specification describes intended requirements, while the backlog and user journey include prototype or unfinished behaviour; none proves current implementation.

**Out of scope for this cycle:** large-scale load testing, exhaustive penetration testing and internal testing of Google or Cloudinary services. Basic access control and external-service failure handling remain in scope.

## **2\. Levels — Which Test Levels**

![Test Levels](<img/Test Level.png>)

The team will perform four levels of testing following the Testing Pyramid.

| Test Level | Testing Purpose | Advising Log Example |
| :---- | :---- | :---- |
| Unit Testing | Verify individual functions | Validate advising request inputs |
| Integration Testing | Verify communication between components | Confirm that submitted requests appear on the advisor dashboard |
| End-to-End (E2E) Testing | Verify the complete workflow | Student requests advising → Advisor records session → Follow-up task is assigned |
| User Acceptance Testing (UAT) | Evaluate system usability with real users | Students and advisors perform realistic advising activities |

# **3\. Test Cases — Test Cases and UAT Scenarios**

### **3.1 Functional Test Cases**

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

**Note:** Pending means the test has not yet been executed. The team will record actual Pass/Fail results during testing.

### **3.2 UAT Scenarios**

| UAT ID | User Role | Scenario | Success Criteria |
| :---- | :---- | :---- | :---- |
| UAT01 | Student | Request an advising session | Request successfully submitted |
| UAT02 | Student | Check the status of an advising request | Correct status identified |
| UAT03 | Advisor | Record a completed advising session | Session record saved |
| UAT04 | Advisor | Assign a follow-up task | Task assigned to intended student |
| UAT05 | Student | Update a follow-up task | Task status saved correctly |

Users will receive scenarios rather than step-by-step button instructions.

# **4\. Users — Real Users**

## **4.1 Target Participants**

The team plans to conduct at least 10 real-user testing sessions.

| User Group | Planned Users | Planned Sessions |
| :---- | :---- | :---- |
| Software Engineering Students | 7 | 7 |
| Advisors / Instructors | 2 | 2 |
| QA Coordinator / Program Staff | 1 | 1 |
| **Total** | **10** | **10** |

### **4.2 Testing Procedure**

1. Explain the testing purpose and obtain informed consent (PDPA); ask before recording audio or video.
2. Assign a participant ID (U01–U10); use codes instead of names throughout.
3. Provide tasks appropriate to the participant's role, ordered from easy to hard.
4. Inform the participant: *"We are testing the system, not you."* Instruct them to **think aloud** while completing each task. The moderator observes and the note-taker records; **neither may assist, point, or hint** at any point during the tasks.
5. Record task success/failure, completion time, errors, and notable observations per task.
6. Immediately after tasks, collect SUS questionnaire responses, then TAM questionnaire.
7. Conduct a short 3-question debrief: (a) what did you like, (b) where did you get stuck, (c) would you keep using it and why.
8. Thank the participant and enter results into the tracking sheet the same day.
9. Store anonymised testing evidence (consent form, observation notes, completed questionnaire).

*Note: One pilot session will be conducted prior to UAT Round 1 to validate the timing, tasks, and observer sheet.*

Each session is expected to follow this flow:

| Phase | Activity | Duration |
| :---- | :---- | :---- |
| Intro | Welcome, purpose explanation, consent | 3 min |
| Baseline | Participant describes or simulates the old process (LINE / Google Form) | 5 min |
| Tasks | Core tasks with think-aloud; moderator times, note-taker records | 10–15 min |
| Questionnaires | SUS (10 items) then TAM (9 items) | 3–6 min |
| Debrief | 3-question interview | 5 min |
| **Total** | | **~26–34 min** |

---

# **5\. Metrics — How You Measure**

## **5.1 Required: Task Performance (Before / After)**

The team will compare relevant tasks completed through the existing advising process and through AdvisingLog.

| Metric | Before (Existing Process) | After (AdvisingLog) |
| ----- | ----- | ----- |
| Task Completion Time | To be measured | To be measured |
| Task Success Rate | To be measured | To be measured |
| Number of Errors | To be measured | To be measured |

Task Success Rate (%) \= (Successful Tasks / Attempted Tasks) × 100

The team will also calculate the average time saved when comparable baseline data is available.

## **5.2 Optional: System Usability Scale (SUS)**

The team evaluates usability using the standard 10-item System Usability Scale (Brooke, 1996) on a 5-point Likert scale (1 = Strongly Disagree to 5 = Strongly Agree).

**Scoring Method:**
* Odd items (1, 3, 5, 7, 9): `Score − 1`
* Even items (2, 4, 6, 8, 10): `5 − Score`
* System SUS Score = `(Sum of all 10 adjusted scores) × 2.5` (normalized range: 0–100)
* Report mean ± SD across participants. Target benchmark: **≥ 68 / 100** (Sauro & Lewis average).

## **5.3 Optional: Technology Acceptance Model (TAM)**

The team uses **TAM (Davis, 1989)** to evaluate technology acceptance. TAM is selected over UTAUT2 because AdvisingLog is an institutional system that users are expected to use as part of their academic process — not a consumer app chosen freely — making TAM the more appropriate model.

Three constructs are measured, each with three items on a 5-point Likert scale (1 = Strongly Disagree, 5 = Strongly Agree):

| Code | Construct | Questionnaire Item |
| :---- | :---- | :---- |
| **PU1** | Perceived Usefulness | Using AdvisingLog lets me request advising appointments more quickly. |
| **PU2** | Perceived Usefulness | Using AdvisingLog makes it easier to track my advising history and follow-up tasks. |
| **PU3** | Perceived Usefulness | I find AdvisingLog useful for my academic and advising needs. |
| **PEOU1** | Perceived Ease of Use | Learning to use AdvisingLog is easy for me. |
| **PEOU2** | Perceived Ease of Use | My interaction with AdvisingLog is clear and understandable. |
| **PEOU3** | Perceived Ease of Use | I find AdvisingLog easy to use. |
| **BI1** | Behavioural Intention | I intend to use AdvisingLog when I need advising. |
| **BI2** | Behavioural Intention | I plan to keep using AdvisingLog throughout the semester. |
| **BI3** | Behavioural Intention | If AdvisingLog is officially launched, I would use it regularly. |

*Items adapted from Davis (1989) and Venkatesh & Davis (2000). "AdvisingLog" replaces the generic system name.*

Scoring: each construct score = mean of its three items per user. Report mean ± SD across all participants. Target: **≥ 3.5 / 5.0** per construct.

---

# **6\. Testing Schedule**

### **6.1 Master Timeline**

![Testing Timeline and Milestones](<img/Master Timeline.png>)

### **6.2 Activity Table**

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
| Nov 1–3 | Contact and confirm UAT Round 1 participants (U01–U05) | Product Owner | To Do |
| Nov 4 (AM) | ★ UAT Round 1 — U01 through U05 | Moderator \+ Note-taker | To Do |
| Nov 4 (PM) | Collect Round 1 feedback; prioritize bug and UX fixes | QA Lead | To Do |
| Nov 4 (PM) | ★ UAT Round 2 — U06 through U10 (after critical fixes) | Moderator \+ Note-taker | To Do |
| Nov 5–9 | Calculate SUS scores, TAM means, Before/After comparison | QA Lead | To Do |
| Nov 9–10 | Prepare final test summary for report and presentation | All members | To Do |
| Nov 11 | ★ Final Presentation | All members | To Do |

### **6.3 Exit Criteria (Testing is Complete When All Are Met)**

| Criterion | Target |
| :---- | :---- |
| Unit / Integration Tests passing | \>= 90% pass rate |
| E2E core flows passing | 100% in Chromium |
| UAT sessions completed | \>= 10 sessions (Round 1 \+ Round 2 both done) |
| Task Success Rate | \>= 70% per task |
| SUS Score (overall) | \>= 68 (Acceptable) |
| TAM Score (all dimensions) | \>= 3.5 / 5.0 |
| Open Critical bugs | \= 0 |

### **6.4 Defect Severity Classification**

| Severity | Definition | Example | Fix SLA |
| :---- | :---- | :---- | :---- |
| Critical | System is unusable | Cannot log in; data loss | Fix before UAT Round 2 |
| High | Core feature fails | Cannot submit request; upload fails | Fix within 1 day |
| Medium | Feature works but causes UX confusion | Unclear labels; confusing workflow | Fix before Final Presentation |
| Low | Cosmetic / visual issue | Color inconsistency; typo | Fix if time permits |

