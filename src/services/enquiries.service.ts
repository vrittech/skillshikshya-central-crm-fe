import { api } from "@/lib/api";
import type { Paginated } from "@/types";
import type {
  ApiCourseInterest,
  ApiEnquiryStage,
  ApiEnquiryStageChange,
  ApiLostReason,
} from "@/types/leads-api";

const base = (leadId: number) => `/leads/${leadId}/course-interests/`;

const EXTENSION: Record<string, string> = {
  "audio/webm": "webm",
  "audio/ogg": "ogg",
  "audio/mp4": "m4a",
};

export interface NewEnquiry {
  course: number;
  about: string;
  description: string;
  recording: { blob: Blob; seconds: number } | null;
}

/** A lead's enquiries, one per course, each with its own stage. */
export const enquiriesService = {
  async list(leadId: number) {
    const { data } = await api.get<Paginated<ApiCourseInterest>>(base(leadId), {
      params: { page_size: 100 },
    });
    return data;
  },

  /** A new enquiry. A recorded description goes with it and becomes its voice note. */
  async add(leadId: number, v: NewEnquiry) {
    if (!v.recording) {
      const { data } = await api.post<ApiCourseInterest>(base(leadId), {
        course: v.course,
        about: v.about,
        description: v.description,
      });
      return data;
    }
    const type = v.recording.blob.type.split(";")[0] || "audio/webm";
    const form = new FormData();
    form.append("course", String(v.course));
    form.append("about", v.about);
    form.append("description", v.description);
    form.append(
      "recording",
      new File([v.recording.blob], `enquiry.${EXTENSION[type] ?? "webm"}`, { type: v.recording.blob.type }),
    );
    form.append("recording_seconds", String(Math.round(v.recording.seconds)));
    const { data } = await api.post<ApiCourseInterest>(base(leadId), form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data;
  },

  async move(leadId: number, id: number, stage: ApiEnquiryStage, note = "") {
    const { data } = await api.post<ApiCourseInterest>(`${base(leadId)}${id}/stage/`, {
      stage,
      note,
    });
    return data;
  },

  async lose(leadId: number, id: number, reason: ApiLostReason, note = "") {
    const { data } = await api.post<ApiCourseInterest>(`${base(leadId)}${id}/lose/`, {
      reason,
      note,
    });
    return data;
  },

  async history(leadId: number, id: number) {
    const { data } = await api.get<ApiEnquiryStageChange[]>(`${base(leadId)}${id}/history/`);
    return data;
  },
};
