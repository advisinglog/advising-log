# AdvisingLog — Before / After Comparison (V1 vs V2)

**Project:** AdvisingLog — Student Advising Record System  
**Comparison:** V1 (previous version) vs V2 (improved version)  
**Evidence reviewed:** UAT tracking workbook, 17 November 2026  
**Evaluation:** Role-based V1/V2 task testing, one SUS/TAM questionnaire set, and a direct V1-versus-V2 qualitative feedback question

## 1. Evidence index

- [UAT data workbook (Google Sheets)](https://docs.google.com/spreadsheets/d/1vuRry_EFzIqQnaEpisaO380DNdhOafFM-WqMs3bNC7U/edit): `Task Results`, `Student UAT Summary`, `Advisor UAT Summary`, `QA UAT Summary`, `Overview`, `Student`, `Advisor`, `Form Responses 1`, `Student Video Evidence`, `QA Issue Log`.
- **Committed repository evidence:** [anonymized UAT session logs](../04-test%20plan/evidence/uat-session-logs.md), [anonymized task-level results](../04-test%20plan/evidence/uat-task-results.csv), the [UAT presentation evidence brief](../04-test%20plan/evidence/advisinglog_uat_presentation_brief.pdf), and the [issue log with fix/retest evidence](../04-test%20plan/evidence/issue-log.md). An anonymized SUS/TAM export, video-evidence manifest, and AI feature test artifacts are not included yet.
- **Privacy:** Do not commit participant emails, names, or raw personally identifying form responses. Use participant codes (U01–U10 and QA-01 as recorded) and sanitized aggregates.

## 2. Participants and measurement scope

| Group | UAT participants | Evaluated workflows | Questionnaire responses |
|---|---:|---|---:|
| Student | 8 | UAT01, UAT02, UAT05 | 8 |
| Advisor | 2 | UAT03 (confirm advising appointment), UAT04 | 2 |
| QA | 1 | UAT06 | 0 |
| **Total** | **11** | **6 distinct workflow categories** | **10** |

The **11 UAT participants** and **10 SUS/TAM questionnaire responses** are different denominators. There is **no QA SUS/TAM response**. For this project, **UAT03 is the Advisor task to confirm a student advising appointment**. In the tracking workbook, the same evidence was previously labelled `APPT-CONFIRM-V1/V2`; interpret that label as **UAT03-V1/V2** for this final comparison. This corrects the task ID, not the measured results.

## 3. Before / after performance comparison

**Timing unit: seconds (s).** The Student/Advisor overall rows are **sums of task-level mean times**, not a measured complete session duration. Some Student timings use estimates or whole-video proxies; Advisor and QA comparisons use mean/full **recording durations**, not consistently isolated task-completion times.

| Item / MUST-workflow evaluation | Before (V1) | After (V2) | Change | Measured with | Evidence |
|---|---:|---:|---|---|---|
| Student — UAT01: Request advising | 107.75 s | 92.68 s | **14.0% lower** | Mean available UAT timing; includes 2 estimated completion times per version | `Student UAT Summary` + `Task Results` |
| Student — UAT02: Check request status | 87.76 s | 60.41 s | **31.2% lower** | V1 mixed measured/proxy timing; V2 whole-video proxies | `Student UAT Summary` + `Task Results` |
| Student — UAT05: Update follow-up status | 95.97 s | 96.45 s | **0.5% higher** | Recorded whole-video proxies; V1 mean based on 7 available times | `Student UAT Summary` + `Task Results` |
| **Student — sum of 3 task means** | **291.48 s** | **249.54 s** | **14.4% lower (41.94 s)** | Add the three mean times per version | `Student UAT Summary`, rows 19–23 |
| Advisor — UAT03: Confirm advising appointment | 141.58 s | 94.48 s | **33.3% lower** | Mean duration of 2 complete videos per version | `Advisor UAT Summary` + `Task Results` |
| Advisor — UAT04: Assign follow-up task | 115.02 s | 67.97 s | **40.9% lower** | Mean duration of 2 complete videos per version | `Advisor UAT Summary` + `Task Results` |
| **Advisor — sum of 2 task means** | **256.60 s** | **162.45 s** | **36.7% lower (94.15 s)** | Add the two mean video durations per version | `Advisor UAT Summary`, rows 30–33 |
| QA — UAT06: View QA dashboard / export report | 36.82 s | 31.17 s | **15.4% lower (5.66 s)** | Entire video duration; 1 tester | `QA UAT Summary` + `Task Results` |
| **Task success rate — Student** | 24/24 = **100%** | 24/24 = **100%** | No change | Reported Pass / (Pass + Fail) | `Student UAT Summary` + `Task Results` |
| **Task success rate — Advisor** | 4/4 = **100%** | 4/4 = **100%** | No change | Reported Pass / (Pass + Fail) | `Advisor UAT Summary` + `Task Results` |
| **Task success rate — QA** | 1/1 = **100%** | 1/1 = **100%** | No change | User-confirmed Pass; video does not independently establish report export | `QA UAT Summary` + `Task Results` |
| **All reported task outcomes** | **29/29 = 100%** | **29/29 = 100%** | No change | 24 Student + 4 Advisor + 1 QA outcomes per version | `Task Results`; 58 reported Pass records across both versions |
| **SUS (single questionnaire set)** | **No separate V1 SUS score** | **64.00/100 for the single questionnaire set** (10 responses; not a separately scored V2-only SUS) | **No numeric V1→V2 SUS difference; direct comparative feedback collected separately** | 10-item SUS completed in a form that also asks participants to compare V1 with V2 | `Overview`, `Student`, `Advisor`, `Form Responses 1` |
| **TAM — PU / PEOU / BI (single questionnaire set)** | **No separate V1 TAM scores** | See section 4; not a separately scored V2-only set | **No numeric V1→V2 TAM difference; qualitative V1/V2 feedback available** | One set of construct scores (1–5), plus separate comparative question | `Overview`, `Student`, `Advisor`, `Form Responses 1` |
| **Observed errors / defects** | Incomplete records | Incomplete records | **Cannot calculate** | `QA Issue Log` currently lists 0 recorded issues; does not prove 0 defects | `QA Issue Log` + `Task Results` |
| **AI feature — baseline vs improved** | **Not verified** | **Not verified** | **Not measurable from available evidence** | Requires feature definition, dataset, baseline, test script/log, evaluation metric | **Repository AI evidence required** — see section 7 |

### 3.1 Exact Advisor video durations underlying the averages

| Workflow | V1 videos | V2 videos |
|---|---|---|
| UAT03 — Appointment confirmation | 168.90 s and 114.27 s | 81.60 s and 107.37 s |
| Assign follow-up | 65.87 s and 164.17 s | 111.50 s and 24.43 s |

Advisor V1/V2 recording groups were **reassigned following the coordinator's correction of previously swapped attachments**. This assignment is recorded in `Task Results` but was not independently revalidated against original build metadata. Preserve this provenance in the evidence manifest.

## 4. SUS and TAM — actual questionnaire results

**Important:** Participants evaluated **both V1 and V2 workflows**, and the form directly asked **"What did you like or needs improving in V2 compared with V1?"** The same form has **one SUS1–SUS10 set** and **one TAM item set**, not separate V1 and V2 scored blocks. Therefore, the SUS/TAM values below are **single-set questionnaire results from the V1/V2 evaluation**, not a measurable numerical SUS/TAM improvement from V1 to V2 and not conclusively a V2-only score. The workbook contains **10 questionnaire submissions**: Student **n=8**, Advisor **n=2**, QA **n=0**. Comparative qualitative feedback is reported separately below.

| Measure | Student (n=8) | Advisor (n=2) | Overall (n=10) | Source |
|---|---:|---:|---:|---|
| **SUS (0–100)** | **64.38** | **62.50** | **64.00** | `Overview` + role tabs |
| **TAM PU — Perceived Usefulness (1–5)** | 4.54 | 3.50 | **4.33** | `Overview` + role tabs |
| **TAM PEOU — Perceived Ease of Use (1–5)** | 4.38 | 3.33 | **4.17** | `Overview` + role tabs |
| **TAM BI — Behavioral Intention (1–5)** | 4.25 | 3.67 | **4.13** | `Overview` + role tabs |

- Overall SUS **sample SD = 16.96**, as recorded in `Overview`.
- SUS mean **64.00** is **4.00 points below** the **68** reference benchmark used by the project. It should **not** be described as above benchmark or universally easy to use.
- Weighted overall TAM means use group sizes **8 Student + 2 Advisor**: e.g., PU = `(4.541666667 × 8 + 3.5 × 2) / 10 = 4.33`.
- In the questionnaire, several participants specifically asked for clearer navigation, larger text, fewer steps, notifications, or better status feedback; some favored the V1 workflow despite preferring parts of V2's design. Do not replace these mixed findings with an unsupported claim that all users prefer V2.
- **Direct V1/V2 qualitative feedback:** The form contains the question **"What did you like or needs improving in V2 compared with V1?"** (`Form Responses 1`, column Z). Responses were mixed: U01 reported **"V1 simpler, V2 better"**; U02 and U05 said V1 was easier to use; U03 liked V2's visual design but found it harder to use; U07 described V2 as easier to use while requesting a friendlier interface; U10 said **"v2 more complete than v1"**. Other responses requested design, navigation, or workflow improvements without making an unambiguous version preference. **These are qualitative comparisons, not separate SUS scores or a statistically established preference percentage.**

- No SUS/TAM data was collected for the one QA participant: **N/A**, not 0.

### 4.1 How SUS was calculated

For each respondent, using the ten standard SUS items (each scored 1–5):

1. For **odd-numbered items** (1, 3, 5, 7, 9), contribution = `response − 1`.
2. For **even-numbered items** (2, 4, 6, 8, 10), contribution = `5 − response`.
3. Add all 10 contributions and multiply by **2.5** to obtain a score from **0 to 100**.
4. Average respondents' SUS scores within each role; overall SUS is the mean of all **10 actual responses** (not the unweighted mean of the two role averages).

**Example:** Student mean = `64.375`, Advisor mean = `62.5`; overall = `(64.375 × 8 + 62.5 × 2) / 10 = 64.00`.

### 4.2 How TAM was calculated

The form asks **3 items per construct**: `PU1–PU3`, `PEOU1–PEOU3`, and `BI1–BI3` (Likert 1–5). Calculate each respondent's construct mean across its three items, then average across respondents in the role/group. This is **not** a percent score. Actual subgroup values are from the role sheets.

## 5. Calculation methods for before / after testing

- **Mean recorded time:** `sum of available recorded timings / number of timing entries`; exclude blank/unverified times from the denominator.
- **Task success:** `Pass / (Pass + Fail) × 100`. A `Not Tested` outcome is not counted as Pass or Fail. Each role/version denominator counts **task attempts**, not unique people.
- **Time reduction relative to V1:** `(V1 − V2) / V1 × 100`. Positive means lower V2 recorded timing; negative means higher V2 recorded timing.
- **Student overall:** `(291.48 − 249.54) / 291.48 × 100 = 14.4% lower`.
- **Advisor overall:** `(256.60 − 162.45) / 256.60 × 100 = 36.7% lower`.
- **QA:** `(36.82 − 31.17) / 36.82 × 100 ≈ 15.4% lower`.

**Do not combine the Student/Advisor/QA aggregate timing values into one total project mean.** They use different task counts and timing sources.

## 6. Key findings and limitations

- **Results:** V2 had lower recorded aggregate timing than V1 for Student (**14.4%**), Advisor (**36.7%**), and QA (**15.4%**). Student UAT05 was **0.5% higher** in V2. Across the six evaluated workflows, all **58 recorded task outcomes** were marked Pass (**29 per version**); several Pass decisions were **user-confirmed**, not independently visible in video.
- **Timing caution:** Student timing combines observed times, estimates, and full-video proxies; Advisor and QA mainly use full-video lengths. These are **indicative comparisons**, not controlled measurements of task-only completion time.
- **Survey scope:** Participants tested **V1 and V2**, and the questionnaire includes a **direct V1-versus-V2 feedback question**. SUS (**64.00/100 overall**) and TAM are each drawn from **one unseparated item set** answered by **8 Student + 2 Advisor** respondents. There are no distinct V1 and V2 SUS/TAM score sets; QA supplied no questionnaire. Report comparative opinions qualitatively, without claiming a numerical questionnaire-based V1-to-V2 improvement.
- **Evidence caveats:** Advisor V1/V2 video assignments were corrected following the coordinator's report of swapped files. Some QA clips do not independently demonstrate successful report export. `QA Issue Log` lists no issues, but that is not proof of zero defects. The committed logs preserve anonymized session/task evidence, but the source workbook did not map task clips to individual participant codes.

## 7. AI use and evaluation disclosure

**ChatGPT was used as a development and documentation assistant; this is not the same as a verified AI feature within AdvisingLog.** Actual requests during the project included organizing requirements and role workflows, discussing React/TypeScript and authentication issues, preparing UAT procedures and Google Forms, explaining SUS/TAM calculations, analyzing supplied video records, creating charts, and drafting this comparison and presentation notes. The team must verify any AI suggestions against actual source code, test evidence, and commits; real participant responses and recorded outcomes were not generated by AI.

**Product-side AI evaluation:** The reviewed UAT workbook does not establish an implemented AI feature or any verified AI test set, baseline, evaluation script/log, or before/after result. Therefore the AI comparison row in section 3 remains **Not verified / Not measurable**. See [`ai-logic.md`](ai-logic.md) for the separate AI explanation; add actual repository evidence before making implementation or improvement claims. Do not include participant identities, raw personal responses, credentials, or secrets in published evidence.

---

**Numerical source:** [AdvisingLog UAT workbook](https://docs.google.com/spreadsheets/d/1vuRry_EFzIqQnaEpisaO380DNdhOafFM-WqMs3bNC7U/edit), corroborated by the committed [UAT presentation evidence brief](../04-test%20plan/evidence/advisinglog_uat_presentation_brief.pdf). The repository also includes [anonymized session logs](../04-test%20plan/evidence/uat-session-logs.md) and [task-level results](../04-test%20plan/evidence/uat-task-results.csv); do not publish the source workbook because it contains personal and survey data.
