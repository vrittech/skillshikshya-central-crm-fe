import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { CallsTable } from "../src/pages/calls/calls-table";
import {
  selectCallFromRowClick,
  selectCallFromRowKey,
} from "../src/lib/call-row";
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
  notes: null,
  recording_url: null,
  next_followup_at: null,
  next_action: null,
  branch: 2,
  created_by: 3,
  created_by_name: "Staff Member",
  created_at: "2026-11-03T18:15:00.000Z",
};

function renderTable(rows: GlobalCall[]) {
  return renderToStaticMarkup(
    createElement(
      MemoryRouter,
      null,
      createElement(CallsTable, {
        rows,
        isLoading: false,
        hasError: false,
        hasNoCalls: false,
        isCheckingEmptyHistory: false,
        currentPage: 2,
        totalPages: 7,
        totalCount: 128,
        sortField: "call_timestamp",
        sortDirection: "desc",
        onSort: () => undefined,
        onSelectCall: () => undefined,
        onPrevious: () => undefined,
        onNext: () => undefined,
      }),
    ),
  );
}

test("renders call columns, lead navigation, NPT time and MM:SS duration", () => {
  const markup = renderTable([call]);
  assert.match(markup, />When</);
  assert.match(markup, />Direction</);
  assert.match(markup, />Lead</);
  assert.match(markup, />Phone</);
  assert.match(markup, />Logged by</);
  assert.match(markup, />Duration</);
  assert.match(markup, />Outcome</);
  assert.match(markup, />Recording</);
  assert.match(markup, /href="\/leads\/24"/);
  assert.match(markup, /Maya Sharma/);
  assert.match(markup, /LD-2026-000024/);
  assert.match(markup, /Nov 4, 2026/);
  assert.match(markup, />04:19</);
  assert.match(markup, /Showing 21–40 of 128/);
  assert.doesNotMatch(markup, />Listen</);
});

test("shows recording link only when a recording exists", () => {
  const markup = renderTable([{ ...call, recording_url: "https://media.example/call.mp3" }]);
  assert.match(markup, /href="https:\/\/media\.example\/call\.mp3"/);
  assert.match(markup, />Listen</);
  assert.match(markup, /rel="noopener noreferrer"/);
});

test("renders a first-use empty state and safe missing values", () => {
  const emptyMarkup = renderToStaticMarkup(
    createElement(
      MemoryRouter,
      null,
      createElement(CallsTable, {
        rows: [],
        isLoading: false,
        hasError: false,
        hasNoCalls: true,
        isCheckingEmptyHistory: false,
        currentPage: 1,
        totalPages: 1,
        totalCount: 0,
        sortField: "call_timestamp",
        sortDirection: "desc",
        onSort: () => undefined,
        onSelectCall: () => undefined,
        onPrevious: () => undefined,
        onNext: () => undefined,
      }),
    ),
  );
  assert.match(emptyMarkup, /No calls have been logged yet/);

  const missingMarkup = renderTable([{
    ...call,
    lead_name: "",
    lead_reference_number: "",
    phone_number: null,
    created_by_name: "",
    duration_seconds: null,
    outcome: null,
  }]);
  assert.match(missingMarkup, /Unknown lead/);
  assert.match(missingMarkup, /Unknown user/);
  assert.match(missingMarkup, /—/);
});

test("row click and keyboard activate details but interactive links do not", () => {
  class RowTarget extends EventTarget {
    closest() {
      return null;
    }
  }
  class InteractiveTarget extends EventTarget {
    closest() {
      return {};
    }
  }

  let selected: GlobalCall | null = null;
  const onSelect = (selectedCall: GlobalCall) => {
    selected = selectedCall;
  };
  const plainRowTarget = new RowTarget();
  const leadLinkTarget = new InteractiveTarget();

  assert.equal(selectCallFromRowClick(plainRowTarget, call, onSelect), true);
  assert.equal(selected, call);
  assert.equal(selectCallFromRowClick(leadLinkTarget, call, onSelect), false);
  assert.equal(selectCallFromRowKey("Enter", plainRowTarget, call, onSelect), true);
  assert.equal(selectCallFromRowKey(" ", leadLinkTarget, call, onSelect), false);
  assert.equal(selectCallFromRowKey("Escape", plainRowTarget, call, onSelect), false);
});
