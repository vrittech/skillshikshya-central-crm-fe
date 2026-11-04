import assert from "node:assert/strict";
import test from "node:test";
import {
  callDurationPayload,
  durationInputError,
  insufficientCallMinutesFieldError,
  parseDurationInput,
} from "../src/lib/call-duration";

test("parses supported call duration formats into exact seconds", () => {
  for (const [input, expected] of [
    ["4:19", 259],
    ["4.19", 259],
    ["4m19s", 259],
    ["259", 259],
    ["4.5", 245],
    ["7:89", 509],
  ] as const) {
    assert.equal(parseDurationInput(input), expected, input);
  }
});

test("normalizes hour, minute, and second overflow", () => {
  assert.equal(parseDurationInput("1:99:99"), 9639);
});

test("handles empty, invalid, negative, and unsafe values", () => {
  assert.equal(parseDurationInput(""), null);
  assert.equal(parseDurationInput("not a duration"), null);
  assert.equal(parseDurationInput("-4:19"), null);
  assert.equal(parseDurationInput("9007199254740992"), null);
});

test("builds an API payload in integer seconds rather than minutes", () => {
  assert.deepEqual(callDurationPayload("4:19"), { duration_seconds: 259 });
  assert.deepEqual(callDurationPayload(""), { duration_seconds: null });
});

test("invalid non-empty duration has an error and no API payload", () => {
  assert.notEqual(durationInputError("4:x"), null);
  assert.equal(callDurationPayload("4:x"), null);
  assert.equal(callDurationPayload("-4:19"), null);
});

test("maps insufficient call-minutes responses to the duration field error", () => {
  const message = "Insufficient call minutes (required 259 seconds, available 120 seconds).";
  assert.equal(insufficientCallMinutesFieldError(message), message);
  assert.equal(insufficientCallMinutesFieldError("Call could not be logged."), null);
});
