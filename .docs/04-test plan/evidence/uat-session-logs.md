# Anonymized UAT Session Logs

**Source:** `Advisor Log Responses.xlsx` supplied for the AdvisingLog UAT review.  
**Anonymization date:** 17 November 2026  
**Participants:** U01–U10

## Privacy and provenance

The source workbook's participant-code field was blank. The codes below are therefore assigned sequentially to the ten questionnaire/session rows in source order: U01–U08 are Student sessions, and U09–U10 are Advisor sessions. They are repository-local pseudonyms and must not be used to recover participant identities.

The source `Task Results` sheet uses clip/task identifiers rather than participant codes, so individual clips are **not** attributed to U01–U10. The task-level records are preserved separately in [`uat-task-results.csv`](uat-task-results.csv) with no names, emails, free-text responses, consent fields, or raw personal data. The QA UAT participant is retained as `QA-01` in the task-level evidence because that participant did not submit the questionnaire.

## Session-level logs

| Participant | Role | Testing date | V1/V2 session scope | Session outcome |
|---|---|---|---|---|
| U01 | Student | 2026-11-03 | Request advising; check request status; update follow-up | Completed assigned V1/V2 UAT tasks |
| U02 | Student | 2026-11-03 | Request advising; check request status; update follow-up | Completed assigned V1/V2 UAT tasks |
| U03 | Student | 2026-11-03 | Request advising; check request status; update follow-up | Completed assigned V1/V2 UAT tasks |
| U04 | Student | 2026-11-03 | Request advising; check request status; update follow-up | Completed assigned V1/V2 UAT tasks |
| U05 | Student | 2026-11-03 | Request advising; check request status; update follow-up | Completed assigned V1/V2 UAT tasks |
| U06 | Student | 2026-11-03 | Request advising; check request status; update follow-up | Completed assigned V1/V2 UAT tasks |
| U07 | Student | 2026-11-03 | Request advising; check request status; update follow-up | Completed assigned V1/V2 UAT tasks |
| U08 | Student | 2026-11-03 | Request advising; check request status; update follow-up | Completed assigned V1/V2 UAT tasks |
| U09 | Advisor | 2026-11-02 | Confirm appointment; assign follow-up | Completed assigned V1/V2 UAT tasks |
| U10 | Advisor | 2026-11-04 | Confirm appointment; assign follow-up | Completed assigned V1/V2 UAT tasks |

## Task-level evidence summary

The source task records report Pass for the evaluated Student, Advisor, and QA task groups in both versions. Timing provenance is retained in the CSV as a category rather than copying free-text notes:

- `video_recorded`: timing recorded from video evidence;
- `whole_video_proxy`: complete recording duration used as a proxy, not isolated task time;
- `estimated_or_user_confirmed`: result or timing was estimated or confirmed by the user;
- `approximate_or_user_confirmed`: approximate endpoint or user-confirmed timing;
- `not_specified`: source did not specify the timing basis.

The aggregate numbers and limitations are reported in the [Before/After comparison](../../final/comparison-table.md). These logs do not prove that every timing is a task-only measurement, and they do not contain personal identities.
