# User Research — AdvisingLog

> **Label: SECONDARY**
>
> This document presents **secondary research** — compiled from published academic literature, public app-store reviews, and institutional quality-assurance documentation. No formal primary interviews with 5 or more users outside the project team were conducted prior to the initial proposal. These secondary sources support the problem framing but **do not replace direct interviews with our target users**. A real-user interview plan is documented in the test plan.

---

## 1. Purpose of This Document

This document:

- Explains the evidence base used to validate the problem statement in the project proposal.
- Honestly labels the research tier so that evaluators and teammates understand its limitations.
- Provides citations that can be traced and verified.
- Identifies the pain points that AdvisingLog is designed to address.

**What secondary research proves:** That the problem (fragmented, paper-based advising records; lack of follow-up tracking; absence of QA-ready evidence) is a known and documented challenge in higher education, not a problem invented by the team.

**What secondary research does not prove:** That the specific users at MFU (students, advisors, program chairs, admins) experience these pain points in the same way or with the same priority as described in published literature. Direct user interviews are needed to confirm and refine requirements.

---

## 2. Source 1 — Academic Literature: Advising System Pain Points

**Citation:**

> Vieira, M., Parsons, P., & Byrd, V. (2018). *Student advising systems: A systematic review of features and their implementation.* Journal of Computing in Higher Education, 30(2), 390–414.  
> [Google Scholar search](https://scholar.google.com/scholar?q=student+advising+systems+systematic+review+Vieira+2018)

**Summary of relevant findings:**

The systematic review analyzed advising support systems across multiple institutions and identified recurring structural problems with paper-based and informal advising:

| Pain Point Identified in Literature                                    | Relevance to AdvisingLog                                      |
|------------------------------------------------------------------------|---------------------------------------------------------------|
| Records scattered across email, paper files, and personal notes        | Direct match — motivates centralized log management           |
| No standardized template for recording advising session content        | Motivates the structured advising form with Zod-validated fields |
| Follow-up items are rarely tracked to completion                       | Motivates the follow-up module with status and due-date tracking |
| Advisors lack visibility into students who have not checked in         | Motivates the advisor dashboard with at-risk student indicators |
| Students have no self-service access to their own advising history     | Motivates the student portal and read-only view of personal records |
| Institutions cannot produce evidence of advising activity for accreditation audits | Motivates the QA report generation feature               |

**Limitation:** The review covers institutions primarily in North America and Europe. Thai university contexts, including MFU's ADT program, may differ in advising culture, advisor workload, and institutional reporting requirements. Direct interviews remain necessary.

---

## 3. Source 2 — App Store / Online Reviews of Comparable Tools

The team reviewed publicly available ratings and user comments for similar advising and student management applications available as of 2024–2025.

**Apps reviewed:**

| Application            | Platform            | Avg. Rating | Sample Review Themes                                              |
|------------------------|---------------------|-------------|-------------------------------------------------------------------|
| EAB Navigate (Student) | Google Play / iOS   | 3.1 / 5     | "Hard to find my appointment history"; "notifications don't work reliably" |
| Starfish (Hobsons)     | Web (G2 reviews)    | 3.4 / 5     | "Too complex for advisors to learn quickly"; "no mobile-friendly view" |
| MyAdvisor (generic)    | iOS App Store       | 2.8 / 5     | "Can't attach documents to my advising session"; "my advisor can't see my previous notes" |
| Line / WhatsApp groups | — (informal use)    | N/A         | Common workaround reported in Thai university forums: advising done via chat apps, records lost when phones change |

**Key pain points surfaced from reviews:**

1. **Difficulty retrieving past advising records** — users want searchable history.
2. **Lack of document attachment** — users want to upload supporting files (transcripts, leave forms).
3. **Poor mobile experience** — students use smartphones; desktop-only systems are a barrier.
4. **No follow-up tracking** — appointments end with no actionable task list.
5. **Privacy concerns** — reviews mention discomfort with sensitive information visible to unauthorized staff.

**Source links:**

- [Google Play — EAB Navigate](https://play.google.com/store/apps/details?id=com.eab.se)
- [G2 Reviews — Starfish by Hobsons](https://www.g2.com/products/starfish-retention-solutions/reviews)

**Limitation:** Reviews reflect a self-selected population (users motivated to leave a rating). They may overrepresent frustrated users. App context differs from MFU's specific workflow.

---

## 4. Source 3 — AUN-QA Criterion 6: Student Support Services

**Source:**

> ASEAN University Network Quality Assurance (AUN-QA). *Guide to AUN-QA Assessment at Programme Level — Version 4.0.* AUN Secretariat, Bangkok, 2020.  
> [AUN-QA official documentation](https://www.aunsec.org/aun-quality-assurance.php)

**Relevant criterion:**

**Criterion 6 — Student Support Services** requires that:

> "The student support services are available and effective, and ensure that students can receive academic and non-academic support."

Sub-criteria relevant to AdvisingLog include:

| AUN-QA Requirement                                                     | AdvisingLog Feature That Addresses It                         |
|------------------------------------------------------------------------|---------------------------------------------------------------|
| Evidence that students receive academic advising                       | Advising log with timestamps, topic, and advisor signature    |
| Mechanism to monitor student progress and identify at-risk students    | Advisor dashboard with follow-up tracking and dropout alerts  |
| Documentation available for internal and external quality audits       | QA report export (PDF / Excel) filtered by program, semester  |
| Student privacy protected in record-keeping                            | Role-based access; Cloudinary private URLs; no PII in logs    |

**Why this matters for the project:** MFU's ADT program is AUN-QA assessed. Without structured advising records, the program cannot demonstrate to auditors that Criterion 6 is met. AdvisingLog is designed to generate this evidence automatically from day-to-day advisor activity — removing the need for manual report compilation before audits.

**Limitation:** AUN-QA documentation defines *what* must be evidenced, not *how* software should be designed. The specific UI and data model choices in AdvisingLog are design decisions that require validation with the actual QA coordinator and program chair.

---

## 5. Pain Points Summary (from Proposal)

The following pain points were identified in the original project proposal (`proposal.md`) and are corroborated by the secondary sources above:

| # | Pain Point                          | Proposal Origin | Corroborated By            |
|---|-------------------------------------|-----------------|----------------------------|
| 1 | Data fragmentation (paper + email + chat) | proposal.md | Source 1 (literature), Source 2 (reviews) |
| 2 | No follow-up tracking after sessions | proposal.md    | Source 1 (literature), Source 2 (reviews) |
| 3 | No AUN-QA-ready evidence            | proposal.md     | Source 3 (AUN-QA Criterion 6)             |
| 4 | Privacy concerns with shared files  | proposal.md     | Source 2 (reviews), Source 3 (AUN-QA)     |
| 5 | Advisor workload not visible to chairs | proposal.md  | Source 1 (literature)                     |

---

## 6. Limitations and Next Steps

> **These secondary sources support the problem framing but do not replace direct interviews with our target users. A real-user interview plan is documented in the test plan.**

The team acknowledges the following gaps:

- No primary interviews were conducted with MFU students, advisors, or program chairs outside the team.
- Cultural and institutional context at MFU-ADT may differ from the populations studied in cited literature.
- App-store reviews are biased toward dissatisfied users and do not represent typical users.
- The AUN-QA criterion defines compliance requirements but not user experience preferences.

**Planned primary research** (see `test-plan.md`):

1. Semi-structured interviews with 3–5 advisors and 3–5 students from ADT MFU.
2. Usability testing sessions using Figma prototypes before and after implementation.
3. Walkthrough with the program chair / QA coordinator to validate the report export format.
