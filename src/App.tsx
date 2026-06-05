import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AdminLayout } from "@/components/admin/AdminLayout";

// Pages
import Auth from "./pages/Auth";
import Index from "./pages/Index";
import Scan from "./pages/Scan";
import Dashboard from "./pages/admin/Dashboard";
import WasteManagement from "./pages/admin/WasteManagement";
import BinsManagement from "./pages/admin/BinsManagement";
import RewardsManagement from "./pages/admin/RewardsManagement";
import RewardRequests from "./pages/admin/RewardRequests";
import UsersManagement from "./pages/admin/UsersManagement";
import TransactionsManagement from "./pages/admin/TransactionsManagement";
import Reports from "./pages/admin/Reports";
import Settings from "./pages/admin/Settings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Role-aware root redirect */}
            <Route path="/" element={<Index />} />
            
            {/* Auth page */}
            <Route path="/auth" element={<Auth />} />

            {/* User scan page */}
            <Route
              path="/scan"
              element={
                <ProtectedRoute>
                  <Scan />
                </ProtectedRoute>
              }
            />
            
            {/* Admin routes - protected */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute requireAdmin>
                  <AdminLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Dashboard />} />
              <Route path="waste" element={<WasteManagement />} />
              <Route path="bins" element={<BinsManagement />} />
              <Route path="rewards" element={<RewardsManagement />} />
              <Route path="requests" element={<RewardRequests />} />
              <Route path="users" element={<UsersManagement />} />
              <Route path="transactions" element={<TransactionsManagement />} />
              <Route path="reports" element={<Reports />} />
              <Route path="settings" element={<Settings />} />
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
