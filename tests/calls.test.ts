import assert from "node:assert/strict";
import { test } from "node:test";
import { apiErrorMessage } from "../src/lib/api";
import { formatCallDuration, parseCallDuration } from "../src/lib/call-duration";
import { nepalDate, presetDates, recordingUrl } from "../src/lib/calls-filters";

test("duration formats use seconds, not decimal minutes", () => {
  for (const input of ["4:19", "4.19", "4m19s", "259", "04:19"]) {
    assert.equal(parseCallDuration(input), 259, input);
  }
  assert.equal(parseCallDuration("4.5"), 245);
  assert.equal(parseCallDuration("7:89"), 509);
  assert.equal(parseCallDuration("1:99:99"), 9639);
  assert.equal(formatCallDuration(509), "08:29");
  assert.equal(parseCallDuration("0"), 0);
});

test("invalid durations cannot be submitted", () => {
  for (const input of [
    "",
    " ",
    "-1",
    "4:-19",
    "4.199",
    "4m19s junk",
    "NaN",
    "Infinity",
    "1e3",
    "2147483648",
  ]) {
    assert.equal(parseCallDuration(input), null, input);
  }
});

test("presets use Nepal's day even when browser date differs", () => {
  const now = new Date("2026-08-31T18:30:00Z");
  assert.equal(nepalDate(now), "2026-09-01");
  assert.deepEqual(presetDates("today", now), { from_date: "2026-09-01", to_date: "2026-09-01" });
  assert.deepEqual(presetDates("week", now), { from_date: "2026-08-26", to_date: "2026-09-01" });
  assert.deepEqual(presetDates("month", now), { from_date: "2026-09-01", to_date: "2026-09-01" });
});

test("recording links only allow web URLs", () => {
  assert.equal(
    recordingUrl("https://example.test/recording.mp3"),
    "https://example.test/recording.mp3",
  );
  for (const value of [null, "", "javascript:alert(1)", "data:text/html,test", "broken"]) {
    assert.equal(recordingUrl(value), undefined);
  }
});

test("empty proxy errors still have a useful message", () => {
  const error = { isAxiosError: true, response: { status: 500, data: "" } };
  assert.equal(apiErrorMessage(error, "Could not load calls."), "Could not load calls.");
});
