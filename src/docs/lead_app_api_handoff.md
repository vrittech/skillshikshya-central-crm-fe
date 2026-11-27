# Lead CRM - Backend API Handoff

This document is the implementation contract for the Lead CRM currently built in the frontend. The frontend routes are `/leads`, `/leads/new`, `/leads/:id`, and `/leads/:id/edit`.

The client sends and expects JSON in `camelCase`. If the backend uses Django-style `snake_case` internally, its serializers should translate at the API boundary. The existing client uses cookie authentication and calls endpoints below `/api/`.

## API conventions

- All endpoints require authentication unless explicitly made public for web-form intake.
- Use ISO-8601 datetimes with timezone (for example, `2026-07-21T09:30:00+05:45`). Dates are shown in Nepal time.
- Use UUID or integer primary keys consistently. The frontend treats every ID as a string.
- Use standard paginated list responses: `{ "count": 125, "next": "next-page-url", "previous": null, "results": [] }`.
- Return `400` with field-level validation errors, `401` for unauthenticated requests, `403` for insufficient permission, and `404` for unknown IDs.
- Do not hard-delete from normal lead endpoints. Archive is reversible; permanent deletion belongs to a restricted recycle-bin workflow.

## Roles and permissions

The UI needs the following permission semantics. These can map to Django permissions/groups or another RBAC system.

| Capability | Expected access |
| --- | --- |
| `leads.view.all` | View every lead; without it, list/detail access is restricted to leads assigned to the authenticated user. |
| `leads.create` | Create leads. |
| `leads.edit` | Edit a lead. Counselors may edit only their own assigned leads. |
| `leads.assign` | Assign/reassign individual and bulk leads. |
| `leads.log_activity` | Log calls, notes, and follow-ups on accessible leads. |
| `leads.archive` | Archive and restore leads. |
| `leads.delete` | Permanently delete from the recycle bin only. |
| `leads.import` | Upload/import lead files. |
| `followups.complete` | Mark a follow-up completed (`change_followup`). |
| `enrollment.create` | Add an enrollment (`add_enrollment`). |
| `enrollment.manage` | Edit, confirm, cancel, reinstate, change status, seat actions, due dates (`change_enrollment`). |
| `payment.record` | Record a payment (`add_payment`). |
| `payment.manage` | Confirm or void a payment (`change_payment`). |
| `money.adjust` | Add a money entry: extra charge, discount, write-off, refund (`add_adjustment`). |

## Core data model

Suggested normalized tables:

```text
leads
lead_course_interests       (lead_id, course_id, is_primary, interest_level)
lead_activities
lead_follow_ups
lead_status_history
lead_assignment_history
lead_enrollments
lead_payments
lead_import_jobs            (optional but recommended)
```

`leads.customData` is a JSON/JSONB field for type-specific intake data. `sourceSheet` and external-source identifiers should be retained for imports and marketing attribution.

### Lead fields

| Field | Type / rule |
| --- | --- |
| `id` | Server-generated identifier. |
| `referenceNumber` | Server-generated, human-readable unique ID (example `LD-1048`). |
| `fullName` | Required; allow `Unknown Caller`. |
| `primaryPhone` | Required; normalize/deduplicate for matching but preserve display value. |
| `secondaryPhone`, `email`, `address`, `city`, `district` | Optional. Require either primary phone or email for external intake; the staff form always supplies a phone. |
| `leadType`, `source`, `status` | Required controlled codes listed below. |
| `campaign` | Optional campaign ID/string. |
| `priority` | `hot`, `warm`, `cool`, or `cold`; defaults to `warm`. |
| `score` | Integer 0-100. Preferred server-owned/derived field; accept an override only if business rules allow it. |
| `assignedTo` | Nullable user ID. |
| `generalNotes` | Optional text. |
| `isArchived` | Server-owned boolean, default `false`. |
| `createdAt`, `updatedAt` | Server-generated timestamps. |
| `lastContactedAt`, `nextFollowUpAt`, `closedAt` | Server-maintained timestamps. |

### Controlled codes

```text
leadType: course_inquiry | master_class_inquiry | general_inquiry | corporate_inquiry

source: website | facebook | instagram | tiktok | whatsapp | viber | telephone |
        direct_call | walk_in | referral | online_counseling | google_search |
        shramsansar | orbit | manual_entry

status: new | contact_attempted | contacted | follow_up_scheduled | qualified |
        counseling_completed | enrollment_pending | enrolled | lost |
        not_interested | invalid | duplicate | on_hold

priority: hot | warm | cool | cold

courseInterest.interestLevel: high | medium | low
```

Terminal statuses are `enrolled`, `lost`, `not_interested`, `invalid`, and `duplicate`. Set `closedAt` when entering a terminal status (clear it if reopened, subject to business rules). A status change must create a history record and timeline activity.

### `customData` shape

```json
{
  "preferredLearningMode": "online|office|hybrid|undecided",
  "preferredShift": "morning|day|evening|weekend|flexible",
  "preferredTiming": "6:00 PM - 8:00 PM",
  "preferredCourseDuration": "optional string",
  "hasLaptop": true,
  "institutionName": "string",
  "educationLevel": "see|plus_two|diploma|bachelors|masters|other",
  "emergencyContact": { "name": "string", "phone": "string", "relationship": "string" },
  "referral": { "code": "string", "referredByName": "string", "referredByPhone": "string", "notes": "string" },
  "masterClassTopic": "string",
  "masterClassPreferredDate": "2026-08-01",
  "masterClassPreferredMode": "online|office|hybrid|undecided",
  "inquirySubject": "string",
  "inquiryCategory": "string",
  "inquiryMessage": "string",
  "externalSource": { "platform": "string", "externalLeadId": "string", "adName": "string" }
}
```

## Endpoints

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/api/leads/` | Paginated lead list, filters, search, ordering. |
| POST | `/api/leads/` | Create a lead, optionally with course interests and first follow-up. |
| GET | `/api/leads/{id}/` | Full lead detail with all related records. |
| PATCH | `/api/leads/{id}/` | Partial lead update. |
| POST | `/api/leads/{id}/assign/` | Assign/reassign one lead. |
| POST | `/api/leads/bulk-assign/` | Assign selected leads. |
| POST | `/api/leads/{id}/archive/` | Soft archive. |
| POST | `/api/leads/{id}/restore/` | Restore archived lead. |
| POST | `/api/leads/bulk-archive/` | Archive selected leads. |
| GET/POST | `/api/leads/{id}/activities/` | Read timeline or log an activity/call/note. |
| GET/POST | `/api/leads/{id}/follow-ups/` | Read or schedule follow-ups. |
| PATCH | `/api/leads/{id}/follow-ups/{followUpId}/` | Complete, cancel, or change a follow-up. |
| GET/POST | `/api/leads/{id}/enrollment/` | Read/create enrollment. |
| GET/POST | `/api/leads/{id}/payments/` | Read/create payments. |
| POST | `/api/leads/import/` | Upload CSV/XLSX and create an import job. |
| GET | `/api/leads/imports/{jobId}/` | Import progress, errors, and duplicate summary. |
| GET | `/api/leads/summary/` | List-page metrics. |
| GET | `/api/leads/analytics/` | Funnel/source/activity reporting (optional for first integration). |
| GET | `/api/lead-lookups/` | Controlled values; may be split into focused lookup endpoints. |

## List API

`GET /api/leads/` should return a compact object, not all timeline/payment records.

Supported query parameters:

```text
page, pageSize (or DRF page_size), search, ordering
status, source, leadType, priority, assignedTo, courseId
isArchived=true|false
unassignedOnly=true|false
overdueOnly=true|false
```

`search` must match case-insensitively against full name, primary phone, email, and `referenceNumber`. `overdueOnly` means a pending follow-up with `nextFollowUpAt` before now, excluding enrolled leads. Backend authorization must apply assignment scoping regardless of client filters.

Example list item:

```json
{
  "id": "a7d8-example-id",
  "referenceNumber": "LD-1048",
  "fullName": "Ram Sharma",
  "primaryPhone": "+9779841000000",
  "email": "ram@example.com",
  "leadType": "course_inquiry",
  "source": "facebook",
  "campaign": "fb-uiux-2026",
  "primaryCourse": "UI UX Design Diploma Course",
  "primaryCourseId": "course-uuid",
  "status": "qualified",
  "priority": "hot",
  "score": 84,
  "assignedTo": "user-uuid",
  "lastContactedAt": "2026-07-20T11:10:00+05:45",
  "nextFollowUpAt": "2026-07-21T15:00:00+05:45",
  "createdAt": "2026-07-18T09:12:00+05:45",
  "isArchived": false
}
```

## Create and update

`POST /api/leads/` and `PATCH /api/leads/{id}/` accept this shape. For creates, `fullName`, `primaryPhone`, `leadType`, and `source` are required; `status` defaults to `new`.

```json
{
  "fullName": "Ram Sharma",
  "primaryPhone": "+9779841000000",
  "secondaryPhone": null,
  "email": "ram@example.com",
  "address": "Baneshwor",
  "city": "Kathmandu",
  "district": "Kathmandu",
  "leadType": "course_inquiry",
  "source": "facebook",
  "campaign": "fb-uiux-2026",
  "status": "new",
  "priority": "warm",
  "assignedTo": "user-uuid",
  "courseInterests": [
    { "courseId": "course-uuid", "isPrimary": true, "interestLevel": "high" }
  ],
  "customData": { "preferredLearningMode": "online", "preferredShift": "evening", "hasLaptop": true },
  "generalNotes": "Interested in the next batch.",
  "initialFollowUp": {
    "dueAt": "2026-07-22T10:00:00+05:45",
    "purpose": "Confirm preferred batch",
    "assignedTo": "user-uuid",
    "reminder": "1h"
  }
}
```

The response should be the full lead-detail representation. The server should derive `courseName` / `primaryCourse` from the course record rather than trusting client-provided names. If a PATCH changes `status` or `assignedTo`, create the corresponding history records automatically. Return duplicate candidates (or `409 Conflict`) when normalized phone/email strongly matches another active lead; do not silently discard the intake.

## Lead detail response

The detail endpoint must include the core lead fields plus `courseInterests`, `activities`, `followUps`, `enrollment`, `payments`, `statusHistory`, and `assignmentHistory`.

Activity fields: `id`, `type`, `at`, `performedBy`, `title`, optional `notes`, `channel`, `outcome`, `direction`, `durationSeconds`, `followUpAt`, `nextAction`.

Follow-up fields: `id`, `dueAt`, `purpose`, `assignedTo`, `status` (`pending|completed|overdue|cancelled`). Status may be computed as overdue on read, but completion/cancellation must be persisted.

## Action request bodies

### Log a call

`POST /api/leads/{id}/activities/`

```json
{
  "type": "call",
  "direction": "outbound",
  "outcome": "interested",
  "durationSeconds": 240,
  "recordingUrl": "https://optional.example/recording",
  "notes": "Asked for the UI/UX fee plan.",
  "followUpAt": "2026-07-22T10:00:00+05:45",
  "nextAction": "Send fee plan on WhatsApp"
}
```

Allowed call outcomes: `interested`, `follow_up_required`, `no_answer`, `busy`, `switched_off`, `wrong_number`, `not_interested`, `requested_details`, `requested_counseling`, `enrolled_elsewhere`, `call_back_later`, `do_not_contact`.

On success, update `lastContactedAt`; when `followUpAt` is supplied, create/update a pending follow-up and update `nextFollowUpAt`. Apply business status transitions where appropriate (for example `not_interested` may move to `not_interested`) and record the change.

### Schedule a follow-up

`POST /api/leads/{id}/follow-ups/`

```json
{ "dueAt": "2026-07-22T10:00:00+05:45", "purpose": "Confirm preferred batch", "assignedTo": "user-uuid", "reminder": "1h" }
```

### Assign, archive, and bulk operations

```json
POST /api/leads/{id}/assign/
{ "assignedTo": "user-uuid", "reason": "Rebalancing workload" }

POST /api/leads/bulk-assign/
{ "leadIds": ["id-1", "id-2"], "assignedTo": "user-uuid", "reason": "Campaign handoff" }

POST /api/leads/{id}/archive/
{ "reason": "Optional reason" }

POST /api/leads/bulk-archive/
{ "leadIds": ["id-1", "id-2"], "reason": "Optional reason" }
```

Assignment creates an assignment-history record and an `assignment_change` activity. Archive should set `isArchived=true`, preserve all data, and remove the record from the default list. Restore reverses it.

## Enrollment and payments

Enrollment payload:

```json
{
  "courseId": "course-uuid",
  "batch": "UIUX-2026-EVE-01",
  "enrolledAt": "2026-07-25T10:00:00+05:45",
  "status": "confirmed",
  "listedFee": 25000,
  "standardDiscount": 5000,
  "additionalDiscount": 0,
  "agreedAmount": 20000,
  "remarks": "Paid in installments"
}
```

Payment payload:

```json
{
  "amount": 5000,
  "paidAt": "2026-07-25T10:05:00+05:45",
  "method": "esewa",
  "reference": "ESEWA-12345",
  "status": "successful",
  "notes": "First installment"
}
```

Payment methods: `cash`, `esewa`, `khalti`, `bank_transfer`, `card`, `connectips`. Payment statuses: `pending`, `successful`, `failed`, `refunded`, `voided`. The server should set `receivedBy` from the authenticated user and create enrollment/payment timeline activities.

## Lookups and summary

`GET /api/lead-lookups/` should at minimum provide lead types, sources, statuses (including label, category, terminal flag, and ordering), priorities, counselors/users available for assignment, campaigns, and courses. Courses should come from the existing course app rather than a duplicated catalog.

`GET /api/leads/summary/` should return the values shown on the list page: `newLeads`, `dueToday`, `overdue`, `enrolledThisMonth`, and `hotDueToday`. Scope this result to the authenticated user when they lack `leads.view.all`.

## Import requirements

Accept `multipart/form-data` with a `.csv` or `.xlsx` file. An import job response should include `id`, `status`, `totalRows`, `createdCount`, `updatedCount`, `duplicateCount`, `invalidCount`, and row-level errors with row number/message. Normalize phone numbers before duplicate checks, preserve raw source data for traceability, and record `sourceSheet`/import-job identity on imported leads.

## Frontend integration notes

- Replace `src/data/mock-leads.ts` with API services while retaining the current `Lead` and `LeadListItem` response shapes.
- Replace `src/data/lead-lookups.ts` dropdown data with cached lookup endpoints; course choices should use `/api/courses/`.
- The frontend already has an Axios client at `src/lib/api.ts`, configured for `/api` and cookie credentials.
- Sorting currently is not exposed in the UI, but the list endpoint should support DRF-style `ordering` for future use.
- Reference implementation details live in `src/types/leads.ts`, `src/pages/leads/lead-form.tsx`, `src/pages/leads/lead-detail.tsx`, and `src/pages/leads/components/lead-action-dialogs.tsx`.
