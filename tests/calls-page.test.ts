import assert from "node:assert/strict";
import test from "node:test";
import {
  callsApiFilters,
  formatCallDurationMmSs,
  formatCallTimestampNpt,
  readCallsPageState,
} from "../src/lib/calls-page";

test("restores valid calls page state and safely defaults invalid URL values", () => {
  const state = readCallsPageState(
    new URLSearchParams(
      "search=maya&direction=inbound&created_by=12&date_range=custom&start_date=2026-11-01&end_date=2026-11-04&branch_id=4&sort=duration_seconds&sort_dir=asc&page=3",
    ),
  );
  assert.deepEqual(state, {
    search: "maya",
    direction: "inbound",
    loggedBy: "12",
    dateRange: "custom",
    startDate: "2026-11-01",
    endDate: "2026-11-04",
    branch: "4",
    sortField: "duration_seconds",
    sortDirection: "asc",
    page: 3,
  });

  const defaults = readCallsPageState(
    new URLSearchParams("direction=unknown&date_range=invalid&page=-4&sort=not-supported"),
  );
  assert.equal(defaults.direction, "all");
  assert.equal(defaults.dateRange, "all");
  assert.equal(defaults.page, 1);
  assert.equal(defaults.sortField, "call_timestamp");
  assert.equal(defaults.sortDirection, "desc");
  const invalidDateOrder = readCallsPageState(
    new URLSearchParams("date_range=custom&start_date=2026-11-05&end_date=2026-11-01"),
  );
  assert.equal(invalidDateOrder.startDate, "");
  assert.equal(invalidDateOrder.endDate, "");
  const impossibleDate = readCallsPageState(
    new URLSearchParams("date_range=custom&start_date=2026-02-31&end_date=2026-03-01"),
  );
  assert.equal(impossibleDate.startDate, "");
});

test("builds inclusive Nepal-time boundaries for today and date presets", () => {
  const today = new Date("2026-11-04T07:48:00.000Z");
  const state = readCallsPageState(new URLSearchParams("date_range=today"));
  const filters = callsApiFilters(state, "", false, today);
  assert.equal(filters.call_timestamp__gte, "2026-11-03T18:15:00.000Z");
  assert.equal(filters.call_timestamp__lte, "2026-11-04T18:14:59.000Z");

  const last7 = callsApiFilters(
    readCallsPageState(new URLSearchParams("date_range=last7")),
    "",
    false,
    today,
  );
  assert.equal(last7.call_timestamp__gte, "2026-10-28T18:15:00.000Z");
  assert.equal(last7.call_timestamp__lte, "2026-11-04T18:14:59.000Z");

  const thisMonth = callsApiFilters(
    readCallsPageState(new URLSearchParams("date_range=thismonth")),
    "",
    false,
    today,
  );
  assert.equal(thisMonth.call_timestamp__gte, "2026-10-31T18:15:00.000Z");
});

test("maps filters to supported API params and omits branch for non-staff", () => {
  const state = readCallsPageState(
    new URLSearchParams("search=  Maya%20Sharma%20&direction=outbound&created_by=8&branch_id=3"),
  );
  const userFilters = callsApiFilters(state, "Maya Sharma", false);
  assert.equal(userFilters.search, "Maya Sharma");
  assert.equal(userFilters.direction, "outbound");
  assert.equal(userFilters.created_by, 8);
  assert.equal(userFilters.branch_id, undefined);

  const staffFilters = callsApiFilters(state, "Maya Sharma", true);
  assert.equal(staffFilters.branch_id, 3);
});

test("formats durations and call timestamps in Nepal time", () => {
  assert.equal(formatCallDurationMmSs(259), "04:19");
  assert.equal(formatCallDurationMmSs(3600), "60:00");
  assert.equal(formatCallDurationMmSs(null), "—");
  assert.match(formatCallTimestampNpt("2026-11-03T18:15:00.000Z"), /Nov 4, 2026/);
});
