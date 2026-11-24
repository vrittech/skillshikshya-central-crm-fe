import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { apiErrorMessage } from "@/lib/api";
import { enquiriesService } from "@/services/enquiries.service";
import type { ApiPhoneMatch } from "@/types/leads-api";
import { StagePill } from "./enquiries-panel";

/**
 * Leads that already have the typed phone number, from any branch.
 * On a new lead: add the picked courses as enquiries to one of them, or
 * save a new lead anyway.
 */
export function PhoneMatchBox({
  matches,
  courses,
  creating,
  saving,
  onSaveAnyway,
}: {
  matches: ApiPhoneMatch[];
  /** The courses picked on the form, added as enquiries on Add enquiry. */
  courses: number[];
  creating: boolean;
  saving: boolean;
  onSaveAnyway: () => void;
}) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [adding, setAdding] = useState<number | null>(null);

  async function addTo(match: ApiPhoneMatch) {
    setAdding(match.id);
    let added = 0;
    for (const course of courses) {
      try {
        await enquiriesService.add(match.id, course);
        added += 1;
      } catch (e) {
        toast.error(apiErrorMessage(e, "Could not add the enquiry"));
      }
    }
    setAdding(null);
    if (added) {
      toast.success(added === 1 ? "Enquiry added" : `${added} enquiries added`, {
        description: match.full_name,
      });
      for (const key of ["enquiries", "lead", "leads"]) void qc.invalidateQueries({ queryKey: [key] });
      navigate(`/leads/${match.id}`);
    }
  }

  return (
    <div className="space-y-3 rounded-xl border border-amber-500/40 bg-amber-500/5 p-4">
      <p className="text-sm font-semibold">Same phone number</p>
      {matches.map((m) => (
        <div
          key={m.id}
          className="bg-card flex flex-wrap items-start justify-between gap-3 rounded-lg border px-3 py-2"
        >
          <div className="space-y-1">
            <p className="text-sm">
              <span className="font-medium">{m.full_name}</span>{" "}
              <span className="text-muted-foreground font-mono text-xs">{m.reference_number}</span>
            </p>
            <p className="text-muted-foreground text-xs">
              {[m.phone, m.secondary_phone, m.branch_name, m.counselor_name, m.status_name]
                .filter(Boolean)
                .join(" · ")}
            </p>
            {m.enquiries.length > 0 && (
              <div className="flex flex-wrap gap-x-3 gap-y-1">
                {m.enquiries.map((e) => (
                  <span key={e.id} className="inline-flex items-center gap-1.5 text-xs">
                    {e.course_name ?? "—"}
                    <StagePill stage={e.stage} label={e.stage_display} />
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Button size="sm" variant="ghost" asChild>
              <Link to={`/leads/${m.id}`}>Open</Link>
            </Button>
            {creating && (
              <Button
                size="sm"
                variant="outline"
                disabled={courses.length === 0 || adding != null}
                onClick={() => void addTo(m)}
              >
                {adding === m.id ? "Saving…" : "Add enquiry"}
              </Button>
            )}
          </div>
        </div>
      ))}
      {creating && (
        <div className="flex justify-end">
          <Button size="sm" variant="ghost" disabled={saving} onClick={onSaveAnyway}>
            Save as new lead
          </Button>
        </div>
      )}
    </div>
  );
}
