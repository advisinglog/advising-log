# AdvisingLog Issue Log

**Evidence basis:** Git history, changed test files, and regression runs on 17 November 2026.  
**Scope:** Issues that have an identifiable fix commit. The source workbook's `QA Issue Log` sheet contained no rows, so this log does not claim that the UAT found zero defects.

Severity was assigned retrospectively from the affected workflow: **High** blocks or risks a core workflow; **Medium** affects a workflow but has a workaround. This is a repository evidence log, not a claim that every historical fix was independently reported by a UAT participant.

| Issue ID | Severity | Issue / affected workflow | Fix commit | Retest evidence | Status |
|---|---|---|---|---|---|
| IL-001 | High | Students could not submit an advising request to every intended faculty advisor. | [`d5abea8`](https://github.com/advisinglog/advising-log/commit/d5abea8) | `backend/src/scope.test.ts`; backend scope/index regression run: **64/64 passed** on 17 Nov 2026. | Fixed and regression-tested |
| IL-002 | High | Advising detail could appear blank after a student submitted a request. | [`58b152f`](https://github.com/advisinglog/advising-log/commit/58b152f) | `backend/src/index.ts` and frontend store changes reviewed; frontend regression suite: **101/101 passed** on 17 Nov 2026. No issue-specific test was identified in the commit. | Fixed; indirect regression evidence |
| IL-003 | High | Advisor scoping, appointment notifications, and cancellation role display needed correction. | [`3f06f4e`](https://github.com/advisinglog/advising-log/commit/3f06f4e) | `backend/src/index.test.ts` and `backend/src/scope.test.ts`; backend scope/index regression run: **64/64 passed**. | Fixed and regression-tested |
| IL-004 | Medium | Follow-up completion time was not saved consistently and completed tasks were not listed newest-first. | [`ef046d2`](https://github.com/advisinglog/advising-log/commit/ef046d2) | Backend/frontend follow-up and date utility changes reviewed; frontend regression suite: **101/101 passed**. No issue-specific test was identified in the commit. | Fixed; indirect regression evidence |
| IL-005 | Medium | Student dashboard cards could open the wrong list, and follow-up submission could continue when an evidence file failed to save. | [`8a8d1c7`](https://github.com/advisinglog/advising-log/commit/8a8d1c7) | Student store/dashboard/follow-up changes reviewed; frontend regression suite: **101/101 passed**. No issue-specific test was identified in the commit. | Fixed; indirect regression evidence |
| IL-006 | High | QA export had fabricated fallback numbers when source data was empty. | [`f0df0fc`](https://github.com/advisinglog/advising-log/commit/f0df0fc) | `frontend/src/utils/exportUtils.test.ts`; targeted regression run: **4/4 passed** on 17 Nov 2026, including preservation of true zero counts. | Fixed and regression-tested |

## Test execution record

- Frontend targeted export regression: `frontend`: `npm test -- --run src/utils/exportUtils.test.ts` — **1 file, 4 tests passed**.
- Backend authorization/scoping regression: `backend`: `npm test -- --run src/scope.test.ts src/index.test.ts` — **2 files, 64 tests passed**.
- Frontend regression suite: **15 files, 101 tests passed**.

The root workspace script was also invoked once with a frontend path; it ran the frontend suite successfully but forwarded that path to the backend and reported “No test files found”. The direct workspace commands above are the authoritative results.

## UAT issue-log status

The source `QA Issue Log` sheet had no recorded rows. Therefore, no additional UAT defect, severity, fix commit, or retest result is invented here. The six entries above are traceable historical fixes from the repository's commit history.
