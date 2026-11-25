/** Save a file the browser downloaded (a Blob) under a name. */
export function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** The file name in a Content-Disposition header, else the fallback. */
export function fileNameFrom(disposition: string | undefined | null, fallback: string) {
  const match = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(disposition ?? "");
  return match ? decodeURIComponent(match[1]) : fallback;
}

/** Rows as a CSV file Excel opens with Nepali text intact (UTF-8 with BOM). */
export function saveCsv(rows: (string | number | null | undefined)[][], filename: string) {
  const cell = (v: string | number | null | undefined) => {
    const s = v == null ? "" : String(v);
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const text = rows.map((r) => r.map(cell).join(",")).join("\r\n");
  saveBlob(new Blob(["﻿", text], { type: "text/csv;charset=utf-8" }), filename);
}
