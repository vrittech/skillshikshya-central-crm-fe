import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { CallDetailsContent } from "../src/pages/calls/call-details-panel";
import type { GlobalCall } from "../src/types/leads-api";

const call: GlobalCall = {
  id: 5,
  lead: 24,
  lead_name: "Maya Sharma",
  lead_reference_number: "LD-2026-000024",
  call_timestamp: "2026-11-03T18:15:00.000Z",
  direction: "outbound",
  caller: "Maya Counselor",
  phone_number: "9811111111",
  duration_seconds: 259,
  outcome: "Interested",
  notes: "Discussed next steps",
  recording_url: null,
  next_followup_at: "2026-11-05T05:15:00.000Z",
  next_action: "Send course details",
  branch: 2,
  created_by: 3,
  created_by_name: "Staff Member",
  created_at: "2026-11-03T18:15:00.000Z",
};

function renderDetails(row: GlobalCall) {
  return renderToStaticMarkup(
    createElement(
      MemoryRouter,
      null,
      createElement(CallDetailsContent, { call: row }),
    ),
  );
}

test("shows all available call details with NPT dates and lead navigation", () => {
  const markup = renderDetails(call);
  for (const label of [
    "Date and time (NPT)",
    "Direction",
    "Lead",
    "Lead reference",
    "Phone number",
    "Caller",
    "Logged by",
    "Duration",
    "Outcome",
    "Notes",
    "Next action",
    "Next follow-up",
    "Recording",
  ]) {
    assert.ok(markup.includes(label), `Expected details to include ${label}`);
  }
  assert.match(markup, /Nov 4, 2026/);
  assert.match(markup, /Nov 5, 2026/);
  assert.match(markup, /Inbound|Outbound/);
  assert.match(markup, /href="\/leads\/24"/);
  assert.match(markup, /Maya Sharma/);
  assert.match(markup, /04:19/);
  assert.match(markup, /Discussed next steps/);
  assert.match(markup, /Send course details/);
  assert.doesNotMatch(markup, /Open recording/);
});

test("uses placeholders for missing data and only links an existing recording", () => {
  const missing = renderDetails({
    ...call,
    lead_name: "",
    lead_reference_number: "",
    phone_number: null,
    caller: null,
    created_by_name: "",
    duration_seconds: null,
    outcome: null,
    notes: null,
    next_action: null,
    next_followup_at: null,
  });
  assert.match(missing, /—/);
  assert.doesNotMatch(missing, /href="\/leads\/24"/);
  assert.doesNotMatch(missing, /Open recording/);

  const withRecording = renderDetails({
    ...call,
    recording_url: "https://media.example/calls/5.mp3",
  });
  assert.match(withRecording, /href="https:\/\/media\.example\/calls\/5\.mp3"/);
  assert.match(withRecording, /Open recording/);
});

test("changing the selected call renders the newly selected call only", () => {
  const secondCall = { ...call, lead_name: "Newly selected lead", id: 6, lead: 25 };
  const markup = renderDetails(secondCall);
  assert.match(markup, /Newly selected lead/);
  assert.doesNotMatch(markup, /Maya Sharma/);
});
