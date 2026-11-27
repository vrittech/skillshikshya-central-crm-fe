import {
  ArrowLeft,
  CalendarPlus,
  Copy,
  GraduationCap,
  Mail,
  MessageCircle,
  MoreHorizontal,
  PencilLine,
  Phone,
  PhoneCall,
  UserPlus,
} from "lucide-react";
import { useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useRole } from "@/context/role";
import {
  EDUCATION_LEVELS,
  labelOf,
  LEARNING_MODES,
  SHIFTS,
} from "@/data/lead-lookups";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useCompleteFollowup } from "@/hooks/use-followups";
import { useDeleteLead, useLead } from "@/hooks/use-leads";
import { EnquiriesPanel } from "@/pages/leads/components/enquiries-panel";
import { EnrollmentsPanel, LeadPaymentsPanel } from "@/pages/leads/components/enrollments-panel";
import {
  formatDate,
  formatDateTime,
  formatDuration,
  formatPhone,
  initialsOf,
  isOverdue,
  relativeToToday,
} from "@/lib/leads-format";
import { cn } from "@/lib/utils";
import type { Activity, LeadCustomData } from "@/types/leads";
import { LeadTimeline } from "./components/lead-timeline";
import { EditCallDialog } from "./components/edit-call-dialog";
import { LeadActionDialogs, type LeadAction } from "./components/lead-action-dialogs";
import { PriorityBadge, ScoreBar, StatusBadge } from "./components/lead-badges";
import { CALL_OUTCOME_TONE } from "@/data/lead-lookups";

/* --------------------------------------------- dynamic (JSONB) field render */

function dynamicRows(data: LeadCustomData): { label: string; value: string }[] {
  const rows: { label: string; value: string }[] = [];
  const push = (label: string, value: string | undefined | null) => {
    if (value != null && value !== "") rows.push({ label, value });
  };
  push("Preferred Learning Mode", data.preferredLearningMode && labelOf(LEARNING_MODES, data.preferredLearningMode));
  push("Preferred Shift", data.preferredShift && labelOf(SHIFTS, data.preferredShift));
  push("Preferred Timing", data.preferredTiming);
  push("Preferred Duration", data.preferredCourseDuration?.replace(/_/g, " "));
  if (data.hasLaptop != null) push("Laptop Available", data.hasLaptop ? "Yes" : "No");
  push("Institution", data.institutionName);
  push("Education Level", data.educationLevel && labelOf(EDUCATION_LEVELS, data.educationLevel));
  if (data.emergencyContact)
    push(
      "Emergency Contact",
      `${data.emergencyContact.name} (${data.emergencyContact.relationship}) · ${data.emergencyContact.phone}`,
    );
  if (data.referral) push("Referral Code", data.referral.code);
  if (data.referral?.referredByName) push("Referred By", data.referral.referredByName);
  push("Master Class Topic", data.masterClassTopic);
  if (data.masterClassPreferredDate) push("Preferred Date", formatDate(data.masterClassPreferredDate));
  push("Preferred Mode", data.masterClassPreferredMode && labelOf(LEARNING_MODES, data.masterClassPreferredMode));
  push("Subject", data.inquirySubject);
  push("Category", data.inquiryCategory);
  push("Message", data.inquiryMessage);
  if (data.externalSource)
    push("Ad Source", `${data.externalSource.platform}${data.externalSource.adName ? ` · ${data.externalSource.adName}` : ""}`);
  return rows;
}

/* ------------------------------------------------------- small UI helpers */

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-1.5 text-sm">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}

/** A titled section inside the unified record card (no nested card frame). */
function Section({
  title,
  action,
  children,
  className,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-headline text-sm font-semibold">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}

/** Small tinted label/value box for the info grid. */
function Fact({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="bg-surface-container-low rounded-lg border p-3">
      <p className="text-muted-foreground font-mono text-[11px] font-semibold tracking-wider uppercase">
        {label}
      </p>
      <p className="mt-1 text-sm font-medium break-words">{value}</p>
    </div>
  );
}

function copy(text: string, label: string) {
  void navigator.clipboard?.writeText(text);
  toast.success(`${label} copied`);
}

/** `tel:` link for the device dialer — keep digits and a leading +. */
function telHref(phone: string | null | undefined): string {
  if (!phone) return "#";
  return `tel:${phone.replace(/[^0-9+]/g, "")}`;
}

/** wa.me link — bare 10-digit Nepal mobiles get the 977 country code. */
function whatsappHref(phone: string | null | undefined): string {
  if (!phone) return "#";
  let d = phone.replace(/[^0-9]/g, "");
  if (!d.startsWith("977") && d.length === 10) d = `977${d}`;
  return `https://wa.me/${d}`;
}

function CallHistory({
  calls,
  onEdit,
}: {
  calls: Activity[];
  onEdit?: (c: Activity) => void;
}) {
  if (calls.length === 0) {
    return <p className="text-muted-foreground py-6 text-center text-sm">No calls logged yet.</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[54rem] text-sm">
        <thead>
          <tr className="text-muted-foreground border-b text-left font-mono text-[11px] tracking-wider uppercase">
            <th className="py-2 pr-3 font-semibold">Timestamp</th>
            <th className="py-2 pr-3 font-semibold">Direction</th>
            <th className="py-2 pr-3 font-semibold">Caller</th>
            <th className="py-2 pr-3 font-semibold">Duration</th>
            <th className="py-2 pr-3 font-semibold">Outcome</th>
            <th className="py-2 pr-3 font-semibold">Notes</th>
            <th className="py-2 pr-3 font-semibold">Next action</th>
            {onEdit && <th className="w-10" />}
          </tr>
        </thead>
        <tbody>
          {calls.map((c) => (
            <tr key={c.id} className="border-b last:border-0">
              <td className="py-2.5 pr-3 whitespace-nowrap">{formatDateTime(c.at)}</td>
              <td className="py-2.5 pr-3 capitalize">{c.direction ?? "—"}</td>
              <td className="py-2.5 pr-3 whitespace-nowrap">{c.performedBy}</td>
              <td className="py-2.5 pr-3 whitespace-nowrap">{formatDuration(c.durationSeconds)}</td>
              <td className="py-2.5 pr-3">
                {c.outcome ? (
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-xs font-medium capitalize",
                      CALL_OUTCOME_TONE[c.outcome] ?? "bg-muted text-muted-foreground",
                    )}
                  >
                    {c.outcome.replace(/_/g, " ")}
                  </span>
                ) : (
                  "—"
                )}
              </td>
              <td className="text-muted-foreground max-w-[18rem] py-2.5 pr-3">
                {c.notes ? (
                  <span className="line-clamp-2" title={c.notes}>
                    {c.notes}
                  </span>
                ) : (
                  "—"
                )}
              </td>
              <td className="text-muted-foreground py-2.5 pr-3">{c.nextAction ?? "—"}</td>
              {onEdit && (
                <td className="py-2.5">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    title="Edit call"
                    onClick={() => onEdit(c)}
                  >
                    <PencilLine />
                  </Button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ------------------------------------------------------------------- page */

const TAB_ACTIVE =
  "data-[state=active]:bg-brand-fixed-dim/20 data-[state=active]:text-brand-container data-[state=active]:shadow-none";

export default function LeadDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { can } = useRole();
  const { lead, isLoading, notFound } = useLead(id);
  const [action, setAction] = useState<LeadAction>(null);
  const [editingCall, setEditingCall] = useState<Activity | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const deleteLead = useDeleteLead();
  const completeFollowup = useCompleteFollowup();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-28 w-full rounded-2xl" />
        <Skeleton className="h-96 w-full rounded-2xl" />
      </div>
    );
  }

  if (notFound || !lead) {
    return (
      <div className="flex min-h-[50dvh] flex-col items-center justify-center gap-3 text-center">
        <h1 className="font-headline text-xl font-semibold">Lead not found</h1>
        <p className="text-muted-foreground text-sm">
          The lead <span className="font-mono">{id}</span> could not be found.{" "}
          It may have been deleted or the link is broken.
        </p>
        <Button variant="outline" asChild>
          <Link to="/leads">
            <ArrowLeft /> Back to leads
          </Link>
        </Button>
      </div>
    );
  }

  const primary = lead.courseInterests.find((c) => c.isPrimary) ?? lead.courseInterests[0];
  const additional = lead.courseInterests.filter((c) => !c.isPrimary);
  const dyn = dynamicRows(lead.customData);
  // The earliest open follow-up (the list comes newest first).
  const nextFollowUp = lead.followUps
    .filter((f) => f.status === "pending" || f.status === "overdue")
    .sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime())[0];
  const calls = lead.activities.filter((a) => a.type === "call");
  // Tabs follow the user's view rights.
  const tabs = {
    overview: true,
    enquiries: lead.apiId != null && can("enquiries.view"),
    history: true,
    calls: can("calls.view"),
    followups: can("followups.view"),
    enrollment: can("enrollment.view"),
    payments: can("payment.view"),
  };
  const askedTab = searchParams.get("tab") as keyof typeof tabs | null;
  const firstTab = askedTab && tabs[askedTab] ? askedTab : "overview";

  return (
    <div className="space-y-6">
      <Link to="/leads" className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm">
        <ArrowLeft className="size-4" /> Back to leads
      </Link>

      {/* Hero */}
      <Card className="p-6">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="flex items-start gap-4">
            <span className="bg-brand-fixed-dim/25 text-brand-container flex size-16 shrink-0 items-center justify-center rounded-2xl text-xl font-bold">
              {initialsOf(lead.fullName)}
            </span>
            <div className="space-y-2">
              <p className="text-brand font-mono text-[11px] font-bold tracking-wider uppercase">
                Lead {lead.referenceNumber}
              </p>
              <h1 className="font-headline text-2xl font-semibold tracking-tight">{lead.fullName}</h1>
              <p className="text-muted-foreground text-sm">
                {formatPhone(lead.primaryPhone)}
                {primary && <> · {primary.courseName}</>}
                {lead.assignedTo && (
                  <>
                    {" "}
                    · Assigned to{" "}
                    <span className="text-foreground font-medium">
                      {lead.assignedToName ?? "Not yet assigned"}
                    </span>
                  </>
                )}
              </p>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <StatusBadge name={lead.statusName} color={lead.statusColor} />
                <PriorityBadge name={lead.priorityName} color={lead.priorityColor} />
                <ScoreBar score={lead.score} />
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Contact quick actions (moved out of the old Contact card) */}
            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon" title={`Call ${formatPhone(lead.primaryPhone)}`} asChild>
                <a href={telHref(lead.primaryPhone)}>
                  <Phone />
                </a>
              </Button>
              <Button variant="outline" size="icon" title="Message on WhatsApp" asChild>
                <a href={whatsappHref(lead.primaryPhone)} target="_blank" rel="noopener noreferrer">
                  <MessageCircle />
                </a>
              </Button>
              <Button variant="outline" size="icon" title="Copy phone" onClick={() => copy(lead.primaryPhone, "Phone")}>
                <Copy />
              </Button>
            </div>
            {can("leads.log_activity") && (
              <>
                <Button variant="outline" onClick={() => setAction("log_call")}>
                  <PhoneCall /> Log Call
                </Button>
                <Button variant="outline" onClick={() => setAction("follow_up")}>
                  <CalendarPlus /> Add Follow-up
                </Button>
              </>
            )}
            {lead.isConverted && (
              <Badge variant="brand" className="gap-1">
                <GraduationCap className="size-3.5" /> Already a student
              </Badge>
            )}
            {can("leads.edit") && (
              <Button variant="brand" onClick={() => navigate(`/leads/${lead.id}/edit`)}>
                <PencilLine /> Edit
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <MoreHorizontal />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {lead.email && (
                  <DropdownMenuItem asChild>
                    <a href={`mailto:${lead.email}`}>
                      <Mail /> Email
                    </a>
                  </DropdownMenuItem>
                )}
                {can("leads.assign") && (
                  <DropdownMenuItem onSelect={() => setAction("assign")}>
                    <UserPlus /> Assign
                  </DropdownMenuItem>
                )}
                {lead.apiId != null && can("leads.delete") && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem variant="destructive" onSelect={() => setDeleteOpen(true)}>
                      Delete
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </Card>

      {/* Unified record card: tab bar + all panels in one frame */}
      <Card className="gap-0 overflow-hidden py-0">
        <Tabs defaultValue={firstTab}>
          <TabsList className="h-auto w-full flex-wrap justify-start gap-1 rounded-none border-b bg-transparent p-2">
            <TabsTrigger value="overview" className={TAB_ACTIVE}>Overview</TabsTrigger>
            {tabs.enquiries && (
              <TabsTrigger value="enquiries" className={TAB_ACTIVE}>Enquiries</TabsTrigger>
            )}
            <TabsTrigger value="history" className={TAB_ACTIVE}>History</TabsTrigger>
            {tabs.calls && <TabsTrigger value="calls" className={TAB_ACTIVE}>Calls</TabsTrigger>}
            {tabs.followups && (
              <TabsTrigger value="followups" className={TAB_ACTIVE}>Follow-ups</TabsTrigger>
            )}
            {tabs.enrollment && (
              <TabsTrigger value="enrollment" className={TAB_ACTIVE}>Enrollment</TabsTrigger>
            )}
            {tabs.payments && (
              <TabsTrigger value="payments" className={TAB_ACTIVE}>Payments</TabsTrigger>
            )}
          </TabsList>

          <div className="p-5">
            {/* Overview */}
            <TabsContent value="overview" className="space-y-8">
              <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="space-y-6">
                <Section title="Lead details">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Fact label="Source" value={lead.sourceName ?? "—"} />
                    <Fact label="Campaign" value={lead.campaign ?? "—"} />
                    <Fact
                      label="Priority"
                      value={
                        lead.priority || lead.priorityName ? (
                          <PriorityBadge name={lead.priorityName} color={lead.priorityColor} />
                        ) : (
                          "—"
                        )
                      }
                    />
                    <Fact label="Created" value={formatDate(lead.createdAt)} />
                    <Fact
                      label="Last contacted"
                      value={lead.lastContactedAt ? formatDate(lead.lastContactedAt) : "—"}
                    />
                    {lead.heardFrom && <Fact label="Heard from" value={lead.heardFrom} />}
                  </div>
                </Section>

                <Section title="Course interest">
                  {primary ? (
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="bg-brand-fixed-dim/25 text-brand-container rounded-full px-2.5 py-0.5 text-xs font-semibold">
                          Primary
                        </span>
                        <span className="font-medium">{primary.courseName}</span>
                      </div>
                      {additional.map((c) => (
                        <div key={c.courseId} className="flex items-center gap-2">
                          <span className="bg-muted text-muted-foreground rounded-full px-2.5 py-0.5 text-xs font-medium">
                            Also
                          </span>
                          <span>{c.courseName}</span>
                        </div>
                      ))}
                      {(lead.customData.preferredLearningMode ||
                        lead.customData.preferredShift ||
                        lead.customData.preferredCourseDuration) && (
                        <p className="text-muted-foreground text-xs">
                          {[
                            lead.customData.preferredLearningMode &&
                              labelOf(LEARNING_MODES, lead.customData.preferredLearningMode),
                            lead.customData.preferredShift && labelOf(SHIFTS, lead.customData.preferredShift),
                            lead.customData.preferredCourseDuration?.replace(/_/g, " "),
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-sm">No course interest recorded.</p>
                  )}
                </Section>

                {dyn.length > 0 && (
                  <Section title="Type-specific information">
                    <div className="grid gap-3 sm:grid-cols-2">
                      {dyn.map((r) => (
                        <Fact key={r.label} label={r.label} value={r.value} />
                      ))}
                    </div>
                  </Section>
                )}
              </div>

              <div className="space-y-6">
                <Section title="Contact">
                  <div className="rounded-lg border px-3 py-1">
                    <InfoRow label="Phone" value={formatPhone(lead.primaryPhone)} />
                    {lead.secondaryPhone && (
                      <InfoRow label="Alt. phone" value={formatPhone(lead.secondaryPhone)} />
                    )}
                    <InfoRow label="Email" value={lead.email ?? "—"} />
                    <InfoRow label="Address" value={lead.address ?? lead.city ?? "—"} />
                    {(lead.cityName || lead.provinceName) && (
                      <InfoRow
                        label="Location"
                        value={[lead.cityName, lead.provinceName].filter(Boolean).join(", ")}
                      />
                    )}
                    {lead.landmark && <InfoRow label="Landmark" value={lead.landmark} />}
                  </div>
                </Section>

                {tabs.followups && (
                <Section title="Follow-up">
                  {nextFollowUp ? (
                    <div className="bg-surface-container-low rounded-lg border p-4">
                      <p
                        className={cn(
                          "font-headline text-lg font-semibold",
                          isOverdue(nextFollowUp.dueAt) && "text-destructive",
                        )}
                      >
                        {relativeToToday(nextFollowUp.dueAt)}
                      </p>
                      <p className="text-muted-foreground text-xs">{formatDateTime(nextFollowUp.dueAt)}</p>
                      <p className="mt-1 text-sm">{nextFollowUp.purpose}</p>
                      {can("leads.log_activity") && (
                        <div className="mt-3 flex gap-1.5">
                          {can("followups.complete") && (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={completeFollowup.isPending}
                              onClick={() => {
                                if (lead.apiId == null) return;
                                completeFollowup.mutate({
                                  leadApiId: lead.apiId,
                                  followupId: Number(nextFollowUp.id.replace(/\D/g, "")),
                                });
                              }}
                            >
                              Complete
                            </Button>
                          )}
                          <Button size="sm" variant="ghost" onClick={() => setAction("follow_up")}>
                            Reschedule
                          </Button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-sm">No follow-up scheduled.</p>
                  )}
                </Section>
                )}

                <Section title="General notes">
                  <p className="text-sm whitespace-pre-wrap">{lead.generalNotes || "No notes recorded."}</p>
                </Section>
              </div>
              </div>
            </TabsContent>

            {/* History: everything about the person, newest first */}
            <TabsContent value="history">
              {lead.apiId != null && <LeadTimeline leadId={lead.apiId} />}
            </TabsContent>

            {/* Calls */}
            {tabs.calls && (
            <TabsContent value="calls">
              <Section
                title="Call history"
                action={
                  can("leads.log_activity") && (
                    <Button variant="outline" size="sm" onClick={() => setAction("log_call")}>
                      <PhoneCall /> Log Call
                    </Button>
                  )
                }
              >
                <CallHistory
                  calls={calls}
                  onEdit={
                    can("leads.log_activity") ? setEditingCall : undefined
                  }
                />
              </Section>
            </TabsContent>
            )}

            {/* Follow-ups */}
            {tabs.followups && (
            <TabsContent value="followups">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-muted-foreground text-sm">
                  {lead.followUps.length} follow-up{lead.followUps.length === 1 ? "" : "s"}
                </p>
                {can("leads.log_activity") && (
                  <Button size="sm" variant="outline" onClick={() => setAction("follow_up")}>
                    <CalendarPlus /> Add Follow-up
                  </Button>
                )}
              </div>
              {lead.followUps.length > 0 ? (
                <ul className="divide-border divide-y">
                  {lead.followUps.map((f) => (
                    <li key={f.id} className="flex items-center justify-between gap-4 py-3">
                      <div>
                        <p className="text-sm font-medium">{f.purpose}</p>
                        <p className="text-muted-foreground text-xs">
                          {formatDateTime(f.dueAt)} · {f.assignedTo}
                        </p>
                      </div>
                      <span
                        className={cn(
                          "rounded-full px-2.5 py-0.5 text-xs font-medium",
                          f.status === "overdue"
                            ? "bg-destructive/10 text-destructive"
                            : "bg-brand-fixed-dim/20 text-brand-container",
                        )}
                      >
                        {f.status}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground py-8 text-center text-sm">No follow-ups scheduled.</p>
              )}
            </TabsContent>
            )}

            {/* Enquiries */}
            {tabs.enquiries && lead.apiId != null && (
              <TabsContent value="enquiries">
                <EnquiriesPanel leadId={lead.apiId} />
              </TabsContent>
            )}

            {/* Enrollment */}
            {tabs.enrollment && (
              <TabsContent value="enrollment">
                <EnrollmentsPanel
                  leadId={lead.apiId}
                  primaryCourseId={lead.primaryCourseId}
                  canManage={can("enrollment.manage")}
                />
              </TabsContent>
            )}

            {/* Payments */}
            {tabs.payments && (
              <TabsContent value="payments">
                <LeadPaymentsPanel leadId={lead.apiId} />
              </TabsContent>
            )}
          </div>
        </Tabs>
      </Card>

      <LeadActionDialogs action={action} lead={lead} onClose={() => setAction(null)} />
      {lead.apiId != null && (
        <EditCallDialog
          leadId={lead.apiId}
          call={editingCall}
          onClose={() => setEditingCall(null)}
        />
      )}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{lead.fullName}”?</AlertDialogTitle>
            <AlertDialogDescription>
              This moves the lead to the recycle bin (soft delete). It can be restored or permanently
              purged by an administrator.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (lead.apiId != null)
                  deleteLead.mutate(lead.apiId, { onSuccess: () => navigate("/leads") });
                setDeleteOpen(false);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
