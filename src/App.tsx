import { Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "@/components/layout/app-layout";
import { RequireCaps } from "@/components/no-access";
import { BranchScopeProvider } from "@/context/branch-scope";
import { RoleProvider } from "@/context/role";
import BatchProfitPage from "@/pages/batch-profit";
import CallsPage from "@/pages/calls";
import EnquiriesReportPage from "@/pages/enquiries";
import BatchesPage from "@/pages/batches";
import BatchDetailPage from "@/pages/batches/batch-detail";
import BranchesPage from "@/pages/branches";
import CallMinutesPage from "@/pages/call-minutes";
import ComingSoonPage from "@/pages/coming-soon";
import CoursesPage from "@/pages/courses";
import DashboardPage from "@/pages/dashboard";
import DuesPage from "@/pages/dues";
import EnrollmentsPage from "@/pages/enrollments";
import EnrollmentDetailPage from "@/pages/enrollments/enrollment-detail";
import FollowUpsPage from "@/pages/follow-ups";
import InvoicesPage from "@/pages/invoices";
import LeadsPage from "@/pages/leads";
import PaymentsPage from "@/pages/payments";
import LeadDetailPage from "@/pages/leads/lead-detail";
import LeadFormPage from "@/pages/leads/lead-form";
import RecycleBinPage from "@/pages/leads/recycle-bin";
import LoginPage from "@/pages/login";
import ReportsPage from "@/pages/reports";
import ResetPasswordPage from "@/pages/reset-password";
import RolesPage from "@/pages/roles";
import SettingsPage from "@/pages/settings";
import StudentsPage from "@/pages/students";
import TeamsPage from "@/pages/teams";
import UsersPage from "@/pages/users";

export default function App() {
  return (
    <RoleProvider>
      <BranchScopeProvider>
        <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route element={<AppLayout />}>
          <Route path="/" element={<DashboardPage />} />

          {/* Leads */}
          <Route path="/leads" element={<RequireCaps caps="leads.view"><LeadsPage /></RequireCaps>} />
          <Route path="/leads/new" element={<LeadFormPage />} />
          <Route path="/leads/recycle-bin" element={<RequireCaps caps="leads.delete"><RecycleBinPage /></RequireCaps>} />
          <Route path="/leads/:id" element={<RequireCaps caps="leads.view"><LeadDetailPage /></RequireCaps>} />
          <Route path="/leads/:id/edit" element={<RequireCaps caps="leads.view"><LeadFormPage /></RequireCaps>} />

          {/* Institute modules (live backend) */}
          <Route path="/students" element={<RequireCaps caps="students.view"><StudentsPage /></RequireCaps>} />
          <Route path="/branches" element={<BranchesPage />} />

          {/* Planned lead-ops modules — navigation ready, pages pending */}
          <Route path="/follow-ups" element={<RequireCaps caps="followups.view"><FollowUpsPage /></RequireCaps>} />
          <Route path="/enrollments" element={<RequireCaps caps="enrollment.view"><EnrollmentsPage /></RequireCaps>} />
          <Route path="/enrollments/:id" element={<RequireCaps caps="enrollment.view"><EnrollmentDetailPage /></RequireCaps>} />
          <Route path="/payments" element={<RequireCaps caps="payment.view"><PaymentsPage /></RequireCaps>} />
          <Route path="/invoices" element={<RequireCaps caps="invoices.view"><InvoicesPage /></RequireCaps>} />
          <Route path="/dues" element={<RequireCaps caps="reports.view"><DuesPage /></RequireCaps>} />
          <Route path="/batch-profit" element={<RequireCaps caps="reports.view"><BatchProfitPage /></RequireCaps>} />
          <Route path="/enquiries" element={<RequireCaps caps="leads.view"><EnquiriesReportPage /></RequireCaps>} />
          <Route path="/teams" element={<RequireCaps caps="teams.view"><TeamsPage /></RequireCaps>} />
          <Route path="/reports" element={<RequireCaps caps={["reports.view", "leads.view"]}><ReportsPage /></RequireCaps>} />
          <Route path="/settings" element={<SettingsPage />} />

          {/* Existing API-wired modules */}
          <Route path="/courses" element={<CoursesPage />} />
          <Route path="/batches" element={<BatchesPage defaultTab="course-batches" />} />
          <Route path="/batches/shifts" element={<BatchesPage defaultTab="slots" />} />
          <Route path="/batches/slots" element={<Navigate to="/batches/shifts" replace />} />
          <Route path="/batches/:id" element={<RequireCaps caps="batches.view"><BatchDetailPage /></RequireCaps>} />
          <Route path="/courses/batches" element={<Navigate to="/batches/shifts" replace />} />
          <Route path="/courses/course-batches" element={<Navigate to="/batches" replace />} />
          <Route path="/users" element={<UsersPage />} />
          <Route path="/roles" element={<RequireCaps caps="roles.view"><RolesPage /></RequireCaps>} />
          <Route path="/calls" element={<RequireCaps caps="calls.view"><CallsPage /></RequireCaps>} />
          <Route path="/call-minutes" element={<CallMinutesPage />} />
          <Route path="*" element={<ComingSoonPage title="Not found" />} />
          </Route>
        </Routes>
      </BranchScopeProvider>
    </RoleProvider>
  );
}
