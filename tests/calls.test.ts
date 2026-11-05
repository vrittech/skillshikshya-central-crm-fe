import assert from "node:assert/strict";
import { test } from "node:test";
import {
  durationClock,
  durationLabel,
  parseCallDuration,
} from "../src/lib/call-duration";
import {
  nepalDate,
  presetDates,
  readCallFilters,
  recordingLink,
} from "../src/lib/calls-filters";

test("all four accepted duration inputs save the same number of seconds", () => {
  for (const value of ["4:19", "4.19", "4m19s", "259", "04:19"])
    assert.equal(parseCallDuration(value), 259, value);
});

test("dot notation is minutes and seconds, never decimal minutes", () => {
  assert.equal(parseCallDuration("4.5"), 245);
  assert.equal(parseCallDuration("4.05"), 245);
  assert.equal(parseCallDuration("4.50"), 290);
});

test("overflow carries, hours work, and empty duration means zero", () => {
  for (const value of ["7:89", "7.89", "7m89s"])
    assert.equal(durationLabel(parseCallDuration(value)!), "8 min 29 sec");
  assert.equal(parseCallDuration("1:99:99"), 9639);
  assert.equal(parseCallDuration("1:02:30"), 3750);
  assert.equal(parseCallDuration(""), 0);
  assert.equal(parseCallDuration("0"), 0);
  assert.equal(durationClock(3750), "62:30");
});

test("invalid and dangerously large durations cannot be submitted", () => {
  for (const value of [
    "abc",
    "4.99.99",
    "foo:bar",
    "-5",
    "4:-3",
    "4m19sjunk",
    "1e3",
    "Infinity",
    "NaN",
    "4.199",
    "9007199254740992",
  ])
    assert.equal(parseCallDuration(value), null, value);
});

test("preset dates follow Nepal midnight even when browser timezone differs", () => {
  const now = new Date("2026-10-31T18:15:00Z");
  assert.equal(nepalDate(now), "2026-11-01");
  assert.deepEqual(presetDates("today", now), {
    start: "2026-11-01",
    end: "2026-11-01",
  });
  assert.deepEqual(presetDates("week", now), {
    start: "2026-10-26",
    end: "2026-11-01",
  });
  assert.deepEqual(presetDates("month", now), {
    start: "2026-11-01",
    end: "2026-11-01",
  });
});

test("date ranges include the entire last day, preserving microseconds", () => {
  const result = readCallFilters(
    new URLSearchParams("start=2026-10-29&end=2026-10-29"),
    false,
  );
  assert.equal(result.filters.call_timestamp__gte, "2026-10-29T00:00:00+05:45");
  assert.equal(
    result.filters.call_timestamp__lte,
    "2026-10-29T23:59:59.999999+05:45",
  );
});

test("URL restores filters, sorting and page", () => {
  const result = readCallFilters(
    new URLSearchParams(
      "search=Sita&direction=outbound&created_by=9&branch_id=2&ordering=duration_seconds&page=3",
    ),
    true,
  );
  assert.deepEqual(result.filters, {
    search: "Sita",
    direction: "outbound",
    created_by: 9,
    branch_id: 2,
  });
  assert.equal(result.page, 3);
  assert.equal(result.ordering, "duration_seconds");
});

test("non-staff URL branch filters are ignored", () => {
  assert.equal(
    readCallFilters(new URLSearchParams("branch_id=2"), false).filters
      .branch_id,
    undefined,
  );
});

test("malformed pagination and ordering use safe defaults", () => {
  for (const page of ["-1", "0", "NaN", "1.5", "1e2", "99999999999999999999"]) {
    assert.equal(
      readCallFilters(new URLSearchParams(`page=${page}`), true).page,
      1,
    );
  }
  assert.equal(
    readCallFilters(new URLSearchParams("ordering=password"), true).ordering,
    "-call_timestamp",
  );
});

test("invalid calendar dates and reversed ranges cannot send a query", () => {
  for (const query of [
    "start=2026-02-30",
    "start=invalid",
    "start=2026-10-30&end=2026-10-29",
  ]) {
    assert.ok(readCallFilters(new URLSearchParams(query), true).dateError);
  }
});

test("recording URLs only allow web links", () => {
  assert.equal(recordingLink("javascript:alert(1)"), null);
  assert.equal(recordingLink("data:text/html,test"), null);
  assert.equal(recordingLink(null), null);
  assert.equal(
    recordingLink("https://example.test/recording"),
    "https://example.test/recording",
  );
});
