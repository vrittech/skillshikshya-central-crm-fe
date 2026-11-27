import { api } from "@/lib/api";
import type { Paginated } from "@/types";
import type { ApiTimelineItem, ApiVoiceNote } from "@/types/leads-api";

export interface NewVoiceNote {
  audio: Blob;
  enquiry: number | null;
  durationSeconds: number;
  note: string;
}

const EXTENSION: Record<string, string> = {
  "audio/webm": "webm",
  "audio/ogg": "ogg",
  "audio/mp4": "m4a",
};

export const voiceNotesService = {
  async list(leadId: number) {
    const { data } = await api.get<Paginated<ApiVoiceNote>>(`/leads/${leadId}/voice-notes/`, {
      // The server sends at most 100 a page.
      params: { page_size: 100 },
    });
    return data;
  },

  async create(leadId: number, v: NewVoiceNote) {
    const type = v.audio.type.split(";")[0] || "audio/webm";
    const form = new FormData();
    form.append("file", new File([v.audio], `voice-note.${EXTENSION[type] ?? "webm"}`, { type: v.audio.type }));
    if (v.enquiry != null) form.append("enquiry", String(v.enquiry));
    form.append("duration_seconds", String(Math.round(v.durationSeconds)));
    if (v.note) form.append("note", v.note);
    const { data } = await api.post<ApiVoiceNote>(`/leads/${leadId}/voice-notes/`, form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data;
  },

  async remove(leadId: number, id: number) {
    await api.delete(`/leads/${leadId}/voice-notes/${id}/`);
  },

  /** The recording itself, for an <audio> element. */
  async audio(leadId: number, id: number) {
    const { data } = await api.get<Blob>(`/leads/${leadId}/voice-notes/${id}/audio/`, {
      responseType: "blob",
    });
    return data;
  },

  async timeline(leadId: number) {
    const { data } = await api.get<{ count: number; results: ApiTimelineItem[] }>(
      `/leads/${leadId}/timeline/`,
    );
    return data.results;
  },
};
