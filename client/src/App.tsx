import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import ActivateAccount from './pages/ActivateAccount';
import RenewalDashboard from './pages/renewals/RenewalDashboard';
import RenewalForm from './pages/renewals/RenewalForm';
import RenewalContacts from './pages/renewals/RenewalContacts';
import RenewalRegister from './pages/renewals/RenewalRegister';
import RenewalFollowUps from './pages/renewals/RenewalFollowUps';
import RenewalReports from './pages/renewals/RenewalReports';
import TemplateBuilderPage from './pages/renewals/TemplateBuilderPage';
import TemplatesPage from './pages/renewals/TemplatesPage';
import MappingDashboard from './pages/renewals/MappingDashboard';
import MappingDetail from './pages/renewals/MappingDetail';
import MappingForm from './pages/renewals/MappingForm';
import MyProfile from './pages/MyProfile';

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <div>Loading...</div>;
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
};

import React from 'react';
import Layout from './components/Layout';
import Masters from './pages/admin/Masters';
import MasterList from './pages/admin/MasterList';
import BantMaster from './pages/admin/BantMaster';
import Users from './pages/admin/Users';
import InviteUsers from './pages/admin/InviteUsers';
import UserManagement from './pages/admin/UserManagement';
import UserDetail from './pages/admin/UserDetail';
import Privileges from './pages/admin/Privileges';
import Leads from './pages/Leads';
import LeadForm from './pages/LeadForm';
import LeadDetail from './pages/LeadDetail';
import CallTrackerPage from './pages/CallTrackerPage';
import BulkUploadsPage from './pages/calls/BulkUploads';
import SwatMeetingPage from './pages/SwatMeetingPage';
import KraTrackerPage from './pages/KraTrackerPage';
import CallTrackerForm from './pages/calls/CallTrackerForm';
import CallTrackerView from './pages/calls/CallTrackerView';
import SwatPerformanceForm from './pages/SwatPerformanceForm';
import Reports from './pages/Reports';
import Farming from './pages/Farming';
import FarmingDetail from './pages/FarmingDetail';
import SwatPerformanceIndex from './pages/SwatPerformanceIndex';

import LeadReport from './pages/LeadReport';
import DailyReportList from './pages/dailyReport/DailyReportList';
import DailyReportPreview from './pages/dailyReport/DailyReportPreview';
import OrderWonReport from './pages/OrderWonReport';
import { SealFilterProvider } from './context/SealFilterContext';
import SealDashboard from './pages/seal/SealDashboard';
import LeadGenSummary from './pages/LeadGenSummary';
import WeeklySummary from './pages/seal/WeeklySummary';
import POAs from './pages/seal/POAs';
import EnquiryTracker from './pages/seal/EnquiryTracker';
import EnquiryForm from './pages/seal/EnquiryForm';
import PartnerSignup from './pages/seal/PartnerSignup';
import PartnerForm from './pages/seal/PartnerForm';
import OrderWonLeads from './pages/cashflow/OrderWonLeads';
import OrderWonLeadView from './pages/cashflow/OrderWonLeadView';
import CashflowTrackerPage from './pages/cashflow/CashflowTracker';
import CashflowTrackerView from './pages/cashflow/CashflowTrackerView';
import CashflowTrackerForm from './pages/cashflow/CashflowTrackerForm';
import CashflowReport from './pages/cashflow/CashflowReport';
import CashflowForecast from './pages/cashflow/CashflowForecast';
import CashflowForecastView from './pages/cashflow/CashflowForecastView';
import BillingForecastMilestones from './pages/billingForecast/BillingForecastMilestones';
import BillingForecastTracker from './pages/billingForecast/BillingForecastTracker';
import BillingAchievedReport from './pages/billingForecast/BillingAchievedReport';



function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/activate-account" element={<ActivateAccount />} />
      <Route path="/" element={
        <ProtectedRoute>
          <Layout />
        </ProtectedRoute>
      }>
        <Route index element={<Dashboard />} />
        <Route path="profile" element={<MyProfile />} />
        <Route path="admin/masters" element={<Masters />} />
        <Route path="admin/masters/bant" element={<BantMaster />} />
        <Route path="admin/masters/:type" element={<MasterList />} />
        <Route path="admin/users" element={<UserManagement />} /> {/* Default to Management */}
        <Route path="admin/users/invite" element={<InviteUsers />} />
        <Route path="admin/users/management" element={<UserManagement />} />
        <Route path="admin/users/:userId" element={<UserDetail />} />
        <Route path="admin/privileges/:userId" element={<Privileges />} />
        <Route path="leads" element={<Leads />} />
        <Route path="leads/new" element={<LeadForm />} />
        <Route path="leads/:id" element={<LeadDetail />} />
        <Route path="leads/:id/edit" element={<LeadForm />} />
        <Route path="partner-signup" element={<PartnerSignup />} />
        <Route path="partner-signup/new" element={<PartnerForm />} />
        <Route path="partner-signup/:id/edit" element={<PartnerForm />} />

        <Route path="renewals" element={<RenewalDashboard />} />
        <Route path="renewals/new" element={<RenewalForm />} />
        <Route path="renewals/:id" element={<RenewalDetail />} />
        <Route path="renewals/:id/contacts" element={<RenewalContacts />} />
        <Route path="renewals/:id/register" element={<RenewalRegister />} />
        <Route path="renewals/follow-ups" element={<RenewalFollowUps />} />
        <Route path="renewals/reports" element={<RenewalReports />} />
        <Route path="renewals/templates" element={<TemplatesPage />} />
        <Route path="renewals/template-builder" element={<TemplateBuilderPage />} />
        <Route path="renewals/mappings" element={<MappingDashboard />} />
        <Route path="renewals/mappings/:type" element={<MappingDetail />} />
        <Route path="renewals/mappings/:type/new" element={<MappingForm />} />

        <Route path="cashflow">
          <Route index element={<Navigate to="order-won" replace />} />
          <Route path="order-won" element={<OrderWonLeads />} />
          <Route path="order-won/:id" element={<OrderWonLeadView />} />
          <Route path="tracker" element={<CashflowTrackerPage />} />
          <Route path="tracker/new" element={<CashflowTrackerForm />} />
          <Route path="tracker/:id" element={<CashflowTrackerView />} />
          <Route path="tracker/:id/edit" element={<CashflowTrackerForm />} />
          <Route path="report" element={<CashflowReport />} />
          <Route path="forecast" element={<CashflowForecast />} />
          <Route path="forecast/:id" element={<CashflowForecastView />} />
        </Route>

        <Route path="billing-forecast">
          <Route index element={<Navigate to="milestones" replace />} />
          <Route path="milestones" element={<BillingForecastMilestones />} />
          <Route path="tracker" element={<BillingForecastTracker />} />
          <Route path="achieved-report" element={<BillingAchievedReport />} />
        </Route>

        <Route path="farming" element={<Farming />} />

        <Route path="farming/:id" element={<FarmingDetail />} />
        <Route path="call-management/tracker" element={<CallTrackerPage />} />
        <Route path="call-management/bulk-uploads" element={<BulkUploadsPage />} />
        <Route path="call-tracker" element={<Navigate to="/call-management/tracker" replace />} />
        <Route path="swat-performance" element={<SwatPerformanceIndex />} />
        <Route path="swat-performance/new" element={<SwatPerformanceForm />} />
        <Route path="calls/new" element={<CallTrackerForm />} />
        <Route path="calls/:id/view" element={<CallTrackerView />} />
        <Route path="calls/:id/edit" element={<CallTrackerForm />} />
        <Route path="calls/:id/update" element={<CallTrackerForm />} />
        <Route path="reports" element={<Reports />} />
        <Route path="reports/products" element={<LeadReport category="Product" title="Products Leads Report" />} />
        <Route path="reports/daily-report" element={<DailyReportList />} />
        <Route path="reports/daily-report/:id" element={<DailyReportPreview />} />
        <Route path="reports/kra-tracker" element={<KraTrackerPage />} />
        <Route path="reports/order-won" element={<OrderWonReport />} />
        <Route path="seal" element={<SealFilterProvider><Outlet /></SealFilterProvider>}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<SealDashboard />} />
          <Route path="weekly-summary" element={<WeeklySummary />} />
          <Route path="lead-gen" element={<LeadGenSummary />} />
          <Route path="poas" element={<POAs />} />
          <Route path="enquiry-tracker" element={<EnquiryTracker />} />
          <Route path="enquiry-tracker/new" element={<EnquiryForm />} />
          <Route path="enquiry-tracker/:id/edit" element={<EnquiryForm />} />
        </Route>


      </Route>
    </Routes>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Toaster position="top-right" toastOptions={{ duration: 3500 }} />
        <Router basename={import.meta.env.VITE_APP_BASENAME || ""}>
          <AppRoutes />
        </Router>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
