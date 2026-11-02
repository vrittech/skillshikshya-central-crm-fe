# Calls module — review notes

All six stories are implemented, including the optional call-details panel. The
page follows the existing Payments layout and reuses the shared controls, query
patterns, chart bars and Sheet. Search, filters, sorting and pagination live in
the URL. Summary and export use the same backend filters as the list.

Nepal date ranges use local midnight through the next day's midnight, with an
exclusive upper bound. This includes fractional seconds on the final day. Daily
aggregation explicitly uses Asia/Kathmandu. Calls with zero duration count in
the average but not as connected.

The export streams related rows instead of loading every call into memory or
fetching each lead/user separately. It includes a UTF-8 BOM for Nepali names and
escapes formula-like text in all text columns. Tests confirm fixed query counts
at 20,000 calls: two for the list, three for summary and one for export, excluding
authentication queries.

The duration field accepts the required formats, previews the normalized time,
rejects invalid input and sends integer seconds. It also sends the caller's
display name, as the backend expects. Successful saves invalidate calls, leads,
users and call-minute balances. New calls now inherit their lead's branch, and
a branch user cannot create a call against another branch's lead.

**US-6:** BranchFilterBackend currently returns the original queryset when a
non-staff user has no assigned branch. That exposes all branches' call records,
summary data and exports. This behavior is intentionally unchanged and covered
by a characterization test. The next improvement should fail closed for these
users until a branch is assigned, reviewed across all branch-scoped endpoints.

**AI use:** Codex generated and edited the implementation, regression tests and
these notes, then ran the checks. Iteration corrected the duration conversion,
caller payload, missing call branch, test discovery, frontend test placement and empty proxy error messages.
The approach of changing no-branch access immediately was rejected because the
task explicitly requires documenting that behavior without changing it. These
changes still need the candidate's own review and understanding before submission.

**Validation:** 122 backend tests pass on PostgreSQL 17. Frontend build, lint and
five focused tests pass; seven existing lint warnings and the existing bundle
size warning remain. Browser checks cover light/dark mode, 390 px width, search,
sorting, pagination, URL reload, empty results, details, download and duration
entry. A 28-second recording and synthetic sample CSV are included.

**Outstanding:** The CSV still needs a visual check in a real spreadsheet app;
Excel automation could not reliably target its window. The task submission form
will be completed separately with the two final PR links.
