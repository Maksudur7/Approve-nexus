import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";

// Layouts
import { AdminLayout } from "@/components/layout/AdminLayout";
import { ResellerLayout } from "@/components/layout/ResellerLayout";

// Pages
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

// Admin Pages
import AdminDashboard from "./pages/admin/Dashboard";
import AdminResellers from "./pages/admin/Resellers";
import AdminRequests from "./pages/admin/Requests";
import AdminUsers from "./pages/admin/Users";
import AdminAudit from "./pages/admin/Audit";
import Setup from "./pages/Setup";

// Reseller Pages
import ResellerDashboard from "./pages/reseller/Dashboard";
import ResellerRequests from "./pages/reseller/Requests";
import ResellerUsers from "./pages/reseller/Users";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/setup" element={<Setup />} />

            {/* Admin Routes */}
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminDashboard />} />
              <Route path="resellers" element={<AdminResellers />} />
              <Route path="requests" element={<AdminRequests />} />
              <Route path="users" element={<AdminUsers />} />
              <Route path="audit" element={<AdminAudit />} />
            </Route>

            {/* Reseller Routes */}
            <Route path="/reseller" element={<ResellerLayout />}>
              <Route index element={<ResellerDashboard />} />
              <Route path="requests" element={<ResellerRequests />} />
              <Route path="users" element={<ResellerUsers />} />
            </Route>

            {/* Catch-all */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
