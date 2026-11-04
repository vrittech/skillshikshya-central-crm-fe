import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CallsOverviewContent } from "../src/pages/calls";
import type { CallSummary } from "../src/types/leads-api";

const EMPTY_SUMMARY: CallSummary = {
  total_calls: 0,
  inbound_calls: 0,
  outbound_calls: 0,
  connected_calls: 0,
  total_duration_seconds: 0,
  average_duration_seconds: 0,
  connect_rate: 0,
  calls_per_day: [],
  top_callers: [],
};

function renderOverview(
  options: {
    summary?: CallSummary;
    isLoading?: boolean;
    errorMessage?: string | null;
    isExporting?: boolean;
    exportErrorMessage?: string | null;
    onRetry?: () => void;
  } = {},
) {
  return renderToStaticMarkup(
    createElement(CallsOverviewContent, {
      summary: options.summary,
      isLoading: options.isLoading ?? false,
      errorMessage: options.errorMessage ?? null,
      isFetching: false,
      onRetry: options.onRetry ?? (() => undefined),
      isExporting: options.isExporting,
      exportErrorMessage: options.exportErrorMessage,
    }),
  );
}

test("renders loading skeletons while summary data is loading", () => {
  const markup = renderOverview({ isLoading: true });
  assert.match(markup, /data-slot="skeleton"/);
  assert.doesNotMatch(markup, /No daily call data/);
});

test("renders a retryable error state", () => {
  const markup = renderOverview({ errorMessage: "Service unavailable" });
  assert.match(markup, /role="alert"/);
  assert.match(markup, /Service unavailable/);
  assert.match(markup, />Retry</);
});

test("renders empty chart and caller states with zero total calls", () => {
  const markup = renderOverview({ summary: EMPTY_SUMMARY });
  assert.match(markup, /No daily call data for this view/);
  assert.match(markup, /No caller data for this view/);
  assert.match(markup, /tabular-nums">0</);
});

test("displays summary values returned by the API", () => {
  const markup = renderOverview({
    summary: {
      total_calls: 23,
      inbound_calls: 7,
      outbound_calls: 16,
      connected_calls: 19,
      total_duration_seconds: 3661,
      average_duration_seconds: 159.17,
      connect_rate: 82.61,
      calls_per_day: [{ date: "2026-08-26", count: 23 }],
      top_callers: [
        { id: 34, name: "Sita Counselor", email: "sita@example.com", call_count: 12 },
      ],
    },
  });
  assert.match(markup, /23/);
  assert.match(markup, /7 inbound · 16 outbound/);
  assert.match(markup, /1 hr 1 min 1 sec/);
  assert.match(markup, /2 min 39 sec/);
  assert.match(markup, /82\.61%/);
  assert.match(markup, /Sita Counselor/);
  assert.match(markup, /sita@example\.com/);
  assert.match(markup, /12\s*<span[^>]*>calls/);
  assert.match(markup, /26 Aug: 23 calls/);
});

test("shows export progress and export failures", () => {
  const markup = renderOverview({
    isExporting: true,
    exportErrorMessage: "Could not export calls CSV.",
  });
  assert.match(markup, /Preparing CSV/);
  assert.match(markup, /disabled=""/);
  assert.match(markup, /Could not export calls CSV\./);
});
