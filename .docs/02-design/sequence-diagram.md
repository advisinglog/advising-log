# AdvisingLog — Sequence Diagram

This document illustrates the end-to-end advising session lifecycle across actors and system components, matching the locked Alpha Demo workflow in [`CLAUDE.md`](../../CLAUDE.md) and [`spec.md`](../01-requirements/spec.md).

```mermaid
sequenceDiagram
    autonumber
    actor Student
    actor Advisor
    participant UI as Frontend (React / Vite)
    participant API as Backend (Cloudflare Workers / Hono)
    participant DB as Database (Cloudflare D1 / Drizzle)
    participant Cloudinary as Cloudinary (Media Storage)
    participant Audit as Audit Logger (SHA-256 Chain)

    %% 1. Advising Request
    Note over Student,Audit: 1. Advising Request & PDPA Consent
    Student->>UI: Fill Request (Category, Notes, PDPA Consent Check)
    opt Optional Document Attachment
        Student->>UI: Upload attachment
        UI->>Cloudinary: Upload binary file (signed upload)
        Cloudinary-->>UI: Return public_id (no PII in tags)
    end
    UI->>API: POST /api/requests (with PDPA consent timestamp & public_id)
    API->>DB: Query assigned advisor from student_advisor_assignments
    API->>DB: INSERT INTO advising_requests (status = 'requested')
    API->>Audit: Log CREATE_REQUEST (actor_id, ip, resource_id, prev_hash)
    API-->>UI: 201 Created (Request ID)
    UI-->>Student: Display confirmation & appointment status

    %% 2. Advisor Scheduling
    Note over Advisor,Audit: 2. Advisor Review & Scheduling
    Advisor->>UI: Open Advisor Dashboard / Requests
    UI->>API: GET /api/advisor/requests (scoped to advisees)
    API->>DB: SELECT requests WHERE advisor_id = ADV_ID
    DB-->>API: List of pending requests
    API-->>UI: Display requests
    Advisor->>UI: Accept Request & Set Date/Time/Location
    UI->>API: POST /api/appointments
    API->>DB: INSERT INTO appointments & UPDATE advising_requests (status = 'scheduled')
    API->>Audit: Log SCHEDULE_APPOINTMENT
    API-->>UI: 200 OK (Appointment confirmed)
    UI-->>Advisor: Session scheduled

    %% 3. Advising Session & Log
    Note over Advisor,Audit: 3. Advising Session & Interaction Log
    Advisor->>UI: Complete Session & Submit Advising Log (Topic, Advice, Tags)
    UI->>API: POST /api/sessions
    API->>DB: INSERT INTO advising_sessions
    API->>DB: UPDATE advising_requests (status = 'completed')
    API->>Audit: Log RECORD_SESSION
    API-->>UI: 201 Created (Session Record ID)

    %% 4. Follow-up Tasks
    Note over Advisor,Student: 4. Follow-up Task Assignment & Completion
    Advisor->>UI: Assign Follow-up Task (Title, Due Date, Priority)
    UI->>API: POST /api/follow-ups
    API->>DB: INSERT INTO follow_ups (status = 'pending')
    API->>Audit: Log ASSIGN_FOLLOW_UP
    API-->>UI: 201 Created
    
    Student->>UI: View Assigned Follow-ups
    UI->>API: GET /api/student/follow-ups
    API->>DB: SELECT follow_ups WHERE student_id = STU_ID
    DB-->>API: Return pending tasks
    API-->>UI: Display tasks
    Student->>UI: Mark Task as Completed & Submit Progress
    UI->>API: PATCH /api/follow-ups/:id (status = 'completed')
    API->>DB: UPDATE follow_ups (completed_at = NOW)
    API->>Audit: Log COMPLETE_FOLLOW_UP
    API-->>UI: 200 OK
    UI-->>Student: Task marked completed
```

## Workflow Summary

1. **PDPA Consent & Scoping:** The request requires explicit consent recording before submission.
2. **Auto-routing:** The backend validates and routes requests based on the pre-configured `student_advisor_assignments` table.
3. **Cloudinary Asset Storage:** Only the `public_id` is persisted in Cloudflare D1; binary files never touch the SQLite database.
4. **Audit Logging (Computer Crime Act §26):** Every state transition triggers an append-only audit log entry with SHA-256 hash chaining to ensure tamper evidence.
