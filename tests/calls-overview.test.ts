import assert from "node:assert/strict";
import test from "node:test";
import {
  callOverviewCallerName,
  formatCallDuration,
  formatNepalDayLabel,
} from "../src/lib/calls-overview";

test("formats aggregate durations in readable units", () => {
  assert.equal(formatCallDuration(0), "0 sec");
  assert.equal(formatCallDuration(65), "1 min 5 sec");
  assert.equal(formatCallDuration(3661), "1 hr 1 min 1 sec");
  assert.equal(formatCallDuration(165.4), "2 min 45 sec");
});

test("formats the Nepal-local day label without shifting the calendar date", () => {
  assert.equal(formatNepalDayLabel("2026-08-26"), "26 Aug");
  assert.equal(formatNepalDayLabel("invalid"), "invalid");
});

test("provides a safe label when a caller user is missing", () => {
  assert.equal(callOverviewCallerName(null), "Unknown caller");
  assert.equal(callOverviewCallerName("  "), "Unknown caller");
  assert.equal(callOverviewCallerName("Sita"), "Sita");
});
