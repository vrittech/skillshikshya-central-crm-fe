# Leads — First-Time User Guide

A complete, plain-language walkthrough of the **Leads** module (`/leads`). If you have never used this screen before, read top to bottom. Everything here reflects exactly what the app does today.

> **A "lead" is one potential student.** From the moment someone shows interest — a form on the website, a phone call, a walk-in — until they either enrol or drop off, that person lives in the system as a single lead record. The Leads screen is where the counselling team works that list every day.

---

## 1. The two data modes (read this first)

At the top the page may say **"Previewing mock data."** That tells you which mode you are in:

| Mode | What it means | What you can do |
|------|---------------|-----------------|
| **Mock / preview** | Sample data baked into the app. Nothing you do is saved. | Click around freely, learn the screen. Saving, exporting, enrolling, and payments are disabled and just show a "prototype" message. |
| **Live / API** | Real data from the backend. | Everything is real: creating, editing, assigning, archiving, deleting, converting, and payments all persist. |

You switch modes from the **data-source toggle** in the app (outside this screen). If a button tells you to "switch to Live," you are currently in mock mode.

---

## 2. Anatomy of the Leads page

From top to bottom:

1. **Header** — title, plus **Import**, **Export**, and **New Lead** buttons (top-right).
2. **Summary cards** — four at-a-glance counters (explained in §3).
3. **Search + Advanced Filters + Saved views** bar.
4. **Bulk action bar** — only appears when you tick one or more rows.
5. **The leads table** — the main list (explained in §5).
6. **Pagination** — page size (25 / 50 / 100) and Previous / Next.

---

## 3. The four summary cards

These count **only the leads currently visible to you** (a counsellor sees their own book; a manager/admin sees all).

| Card | Counts | Why it matters |
|------|--------|----------------|
| **New leads** | Leads still in the `New` status | Your fresh, un-worked inquiries — contact them first. |
| **Follow-ups due today** | Leads whose next follow-up is today | Your to-do list for the day. The badge flags how many are **high priority (Hot)**. |
| **Overdue follow-ups** | Follow-up date has passed and the lead isn't enrolled | Slipping leads — clear these urgently. |
| **Enrolled this month** | Leads that reached `Enrolled` this calendar month | Your conversions / win count. |

---

## 4. The vocabulary — what every value means

The table uses three controlled vocabularies: **Source**, **Status**, and **Priority**. Here is what each option signifies.

### 4a. Source — *where did this lead come from?*

The acquisition channel. Used to see which marketing works. Options: **Website, Facebook, Instagram, TikTok, WhatsApp, Viber, Telephone, Direct Call, Walk-in / Direct Visit, Referral, Online Counseling, Google Search, Shramsansar, Orbit (Social Media), Manual Entry.**

- *Example:* Someone fills the form on the site → **Website**. Someone your existing student sent → **Referral**. You typed the lead in by hand from a paper note → **Manual Entry**.
- A **Campaign** can sit alongside the source (e.g. source *Facebook* + campaign *"Facebook UI/UX Campaign"*), so you know the exact ad, not just the channel.

### 4b. Status — *where is this lead in the journey?*

Status is the lifecycle stage. It roughly flows top-to-bottom, though a lead can jump or reverse.

| Status | Colour family | Meaning |
|--------|---------------|---------|
| **New** | Open (blue) | Just arrived, nobody has worked it yet. |
| **Contact Attempted** | Open (blue) | You tried to reach them (call/message) but haven't connected. |
| **Contacted** | Active | You actually spoke/messaged and they responded. |
| **Follow-up Scheduled** | Active | A next touchpoint is booked. |
| **Qualified** | Active | Confirmed as a genuine, suitable prospect. |
| **Counseling Completed** | Active | They've had the full counselling session. |
| **Enrollment Pending** | Active | Agreed to join; waiting on payment/paperwork. |
| **Enrolled** ✅ | Won (green) | Converted to a student. This is the goal. *(Terminal)* |
| **Lost** | Lost (red) | Decided not to join. *(Terminal)* |
| **Not Interested** | Lost (red) | Explicitly said no. *(Terminal)* |
| **Invalid** | Neutral | Bad/fake data — not a real prospect. *(Terminal)* |
| **Duplicate** | Neutral | Same person already exists as another lead. *(Terminal)* |
| **On Hold** | Neutral | Paused for now (e.g. "call me next intake"). |

*"Terminal"* means the lead's journey has ended in that state.

> In **Live** mode statuses (and their colours) are defined by your admin, so you may see custom names — but the idea is the same.

### 4c. Priority — *how hot is this lead?*

Priority is the classic HOT / WARM / COOL / COLD temperature system. It drives how fast you should follow up and feeds the lead **Score**.

| Priority | Icon | Meaning / rule of thumb |
|----------|------|--------------------------|
| 🔥 **Hot** | Flame | Answered and asked for details → **follow up the same day.** |
| **Warm** | Sun/thermometer | Interested but had objections → **follow up within 24 hours.** |
| **Cool** | Thermometer | Filled the form, interested for a *future* batch. |
| ❄️ **Cold** | Snowflake | No response after ~3 attempts → **re-engage monthly.** |

### 4d. Score — *the 0–100 engagement number*

Each lead has a **Score** shown as a little bar. It's derived from status + priority + how recently they were contacted. Higher = more likely to convert. Colour of the bar: green ≥75, amber ≥50, orange ≥30, grey below.

---

## 5. The table columns explained

Each row is one lead. Columns left to right:

| Column | What it shows |
|--------|----------------|
| **☑ (checkbox)** | Tick to select the row for bulk actions. The header checkbox selects all on the page. |
| **Lead** | Initials avatar, **full name**, the **reference number** (e.g. `LD-00123`), and phone. An **Archived** tag appears here if the lead is archived. |
| **Course** | The primary course they're interested in. |
| **Source** | The acquisition channel; the campaign name shows underneath if set. |
| **Status** | The current lifecycle status as a coloured pill (see §4b). |
| **Priority** | Hot / Warm / Cool / Cold pill with a thermometer icon (see §4c). |
| **Score** | The 0–100 engagement bar (see §4d). |
| **Assigned** | The counsellor who owns the lead, or a yellow **Unassigned** tag. |
| **Next follow-up** | Relative time ("tomorrow", "in 3 days"). Turns **red** when overdue. |
| **Last contact** | When you last touched this lead ("yesterday", "5 days ago"). |
| **Created** | The date the lead entered the system. |
| **⋯ (menu)** | Per-row actions (see §7). |

**Row cues to notice:**
- A **red left border** = the follow-up is overdue.
- An **orange left border** = a Hot lead (not overdue).
- A **faded row** = archived lead.
- **Click anywhere on a row** (except the checkbox/menu) to open the lead's full detail page.

---

## 6. Finding leads — search & filters

- **Search box** — type a **name, phone, email, or lead ID**. Filters as you type.
- **Advanced Filters** (slider icon) — opens a side panel. Filter by:
  - Status, Source, Course, Assigned-to counsellor, Priority.
  - **Quick toggles:** *Overdue only*, *Include archived*, and (mock mode) *Unassigned only*.
  - Set your filters in the panel, then press **Apply**. **Reset** clears them.
- **Active filter chips** appear under the search bar. Click a chip's **✕** to remove just that filter, or **Clear all** to reset everything.
- **Saved views** — *(coming with the backend)* will let you save filter presets.
- The badge number on the **Advanced Filters** button tells you how many filters are currently active.

---

## 7. What you can DO with a lead

### 7a. Row menu (⋯ on any row)
- **View** — open the full lead detail page.
- **Edit** — open the edit form.
- **Log Call** — record a phone call outcome.
- **Add Follow-up** — schedule the next touchpoint.
- **Assign** — hand the lead to a counsellor.
- **Archive** — remove it from active lists (recoverable).

*(Which items appear depends on your permissions.)*

### 7b. Bulk actions (tick rows first)
When you select rows, a bar shows **"N selected"** with **Assign** / **Archive** / **Clear**. *(Bulk assign/archive land with the backend; for now they show a placeholder.)*

### 7c. Import / Export (top-right)
- **Export** — downloads the current (filtered) list as CSV. *Live mode only* — in mock it asks you to switch to Live.
- **Import** — bulk-upload leads. *Ships with the backend importer.*

---

## 8. How to add a NEW lead — step by step

1. On the Leads page, click **➕ New Lead** (top-right). You land on the **New Lead** form.
2. Fill **Basic Information**:
   - **Full Name** *(required)*
   - **Primary Phone** *(required)* — e.g. `9812345678`
   - Secondary Phone, Email, Address *(all optional)*
3. Fill **Lead Classification**:
   - **Lead Source** — where they came from (§4a).
   - **Campaign** — the specific campaign, if any.
   - **Current Status** — usually leave at *New* for a fresh lead.
   - **Priority** — Hot / Warm / Cool / Cold (§4c).
   - **Assigned Counselor** — who will work it (leave blank = Unassigned).
   - **Branch** *(Live mode only)* — the office/branch.
   - **Expected Revenue (NPR)** — the deal value you expect, e.g. `30000`.
4. Fill **Course Interest**:
   - **Primary Course** — the main course they want. *(Extra courses can be added later from the lead detail.)*
5. Fill **Type-specific Information** (optional but useful):
   - Preferred Learning Mode (Online / Office / Hybrid / Undecided), Preferred Shift, Education Level, Laptop Available, College / Institution.
6. Add a short **Note** if helpful.
7. Click **Save Lead** (bottom bar). You're taken to the new lead's detail page.

> **Only Full Name and Primary Phone are mandatory.** Everything else can be filled in later.
>
> ⚠️ **In mock mode, saving is disabled** — the form is fully usable for practice but nothing is stored. Switch to **Live** to actually create leads.

---

## 9. How to EDIT a lead

1. Open the lead (click its row, or **⋯ → Edit**), then click **Edit** — or use **⋯ → Edit** directly from the table.
2. The same form opens, pre-filled. Change any field.
3. Click **Save Changes**.

You can edit any of the fields from §8 — contact details, type, source, campaign, status, priority, assignment, course, expected revenue, and the type-specific fields.

---

## 10. The lead DETAIL page — everything about one lead

Click a lead to open it. At the top (the "hero") you see the name, reference number, phone, primary course, who it's assigned to, and the status / priority / score badges. On the right are quick actions:

- **Call**, **WhatsApp**, **Copy phone** icon buttons.
- **Log Call**, **Add Follow-up** buttons.
- **Convert** *(Live mode)* — turn the lead into an enrolled student.
- **Edit** button.
- **⋯ menu** — Email, Assign, Archive/Restore, and Delete *(Live mode)*.

Below that is a tabbed record:

| Tab | What's inside |
|-----|----------------|
| **Overview** | Lead details, course interest, type-specific info, **call history** table, contact card, next follow-up, "next best actions" suggestions, and notes. |
| **Activity** | The full timeline of everything that's happened (form submissions, calls, notes, status changes, etc.). |
| **Follow-ups** | All scheduled follow-ups and their status (pending / overdue / completed). |
| **Enrollment** | The enrolment record (course, batch, fees, discounts, agreed amount, paid, remaining). *Create Enrollment* / *Add Payment* live here (Live mode). |
| **Payments** | Every payment recorded, with amount, method, reference, and status. |
| **Audit History** | Full **status history** and **assignment history** — who changed what and when. |

---

## 11. The quick-action dialogs (what each asks for)

- **Log Call** — Direction (Outbound/Inbound), Outcome (Interested, No Answer, Busy, Requested Counseling, Call Back Later, Not Interested, etc.), Duration, optional Recording link, Notes, and the Next follow-up + Next action.
- **Add Follow-up** — Date & time, Assigned counsellor, Purpose, and a Reminder (30 min / 1 hr / 1 day before).
- **Assign** — Pick the counsellor and an optional reason.
- **Archive** — Confirms; moves the lead out of active lists (restorable — nothing is deleted).
- **Delete** *(Live mode)* — Soft-deletes to a recycle bin; an admin can restore or purge.

> In mock mode these dialogs are fully laid out but **Save only shows a confirmation toast — no data changes.**

---

## 12. A worked example — one lead's life

> **Sabin Gurung** fills the website form asking about the Full-Stack MERN course.
>
> 1. He appears as a lead: **Source** = Website, **Status** = New, **Primary Course** = Full-Stack MERN Diploma, **Priority** = Cool.
> 2. A counsellor is assigned via **Assign**. Status becomes **Contacted** after the first call.
> 3. On the call he asks for the fee plan and sounds keen → counsellor bumps **Priority** to **Hot** and uses **Log Call** (outcome: *Requested Details*) with a **Next follow-up** for tomorrow.
> 4. Tomorrow he shows in **Follow-ups due today**. After the counselling session, status → **Counseling Completed**, then **Enrollment Pending**.
> 5. He pays → in Live mode the counsellor uses **Convert** / **Create Enrollment** and records the **Payment**. Status → **Enrolled** ✅ and he counts in **Enrolled this month**.
>
> Every step is visible later in the **Activity** and **Audit History** tabs.

---

## 13. Quick tips

- **Work top-down by the summary cards:** clear *Overdue* first, then *Due today*, then *New*.
- **Trust the colours:** red border/text = act now; orange = Hot lead.
- **Always leave a Next follow-up** after a call so the lead doesn't go silent.
- **Use filters + Export** to pull a working list (Live mode).
- **Not sure if something saved?** Check the mode banner — mock never saves; Live always does.
