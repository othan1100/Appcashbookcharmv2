import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import { ThemeProvider } from "@/hooks/useTheme";
import { I18nProvider } from "@/hooks/useI18n";
import ProtectedRoute from "@/components/ProtectedRoute";
import AppLayout from "./components/AppLayout";
import Dashboard from "./pages/Dashboard";
import Assistant from "./pages/Assistant";
import AssistantHistory from "./pages/AssistantHistory";
import Transactions from "./pages/Transactions";
import Products from "./pages/Products";
import Customers from "./pages/Customers";
import CustomerDetail from "./pages/CustomerDetail";
import Reports from "./pages/Reports";
import Cashbooks from "./pages/Cashbooks";
import Settings from "./pages/Settings";
import Pricing from "./pages/Pricing";
import Invoices from "./pages/Invoices";
import Inventory from "./pages/Inventory";
import Sales from "./pages/Sales";
import Returns from "./pages/Returns";
import BillingReturn from "./pages/BillingReturn";
import BillingSuccess from "./pages/BillingSuccess";
import BillingFailed from "./pages/BillingFailed";
import BillingPending from "./pages/BillingPending";
import Admin from "./pages/Admin";
import Team from "./pages/Team";
import TeamInvite from "./pages/TeamInvite";
import Auth from "./pages/Auth";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <I18nProvider>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            {/* Billing pages are public: users return here from the Sifalo
                checkout, sometimes in a fresh browser session. */}
            <Route path="/billing/return" element={<BillingReturn />} />
            <Route path="/billing/success" element={<BillingSuccess />} />
            <Route path="/billing/failed" element={<BillingFailed />} />
            <Route path="/billing/pending" element={<BillingPending />} />
            <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/assistant" element={<Assistant />} />
              <Route path="/assistant/history" element={<AssistantHistory />} />
              <Route path="/assistant/:conversationId" element={<Assistant />} />
              <Route path="/transactions" element={<Transactions />} />
              <Route path="/products" element={<Products />} />
              <Route path="/customers" element={<Customers />} />
              <Route path="/customers/:id" element={<CustomerDetail />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/cashbooks" element={<Cashbooks />} />
              <Route path="/invoices" element={<Invoices />} />
              <Route path="/inventory" element={<Inventory />} />
              <Route path="/sales" element={<Sales />} />
              <Route path="/returns" element={<Returns />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/pricing" element={<Pricing />} />
              <Route path="/admin" element={<Admin />} />
              <Route path="/team" element={<Team />} />
              <Route path="/team-invite" element={<TeamInvite />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
          </I18nProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
