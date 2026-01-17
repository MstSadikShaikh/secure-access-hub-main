import React, { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { SettingsProvider } from "@/context/SettingsContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { cn } from "@/lib/utils";
import { CyberBackground } from "@/components/CyberBackground";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import UserDashboard from "./pages/UserDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import NotFound from "./pages/NotFound";
import Wallet from "./pages/Wallet";
import Alerts from "./pages/Alerts";
import SecurityTools from "./pages/SecurityTools";
import Assistant from "./pages/Assistant";
import SOSSettings from "./pages/SOSSettings";
import Settings from "./pages/Settings";

const queryClient = new QueryClient();

const GlobalEnhancements = () => {
  const [isTouch, setIsTouch] = useState(false);

  useEffect(() => {
    // Detect touch device
    const touchQuery = window.matchMedia('(pointer: coarse)');
    setIsTouch(touchQuery.matches);
    const handleTouchChange = (e: MediaQueryListEvent) => setIsTouch(e.matches);
    touchQuery.addEventListener('change', handleTouchChange);

    return () => {
      touchQuery.removeEventListener('change', handleTouchChange);
    };
  }, []);

  return (
    <>
      <div className="fraud-guard-bg" />
      {!isTouch && <CyberBackground />}
    </>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <GlobalEnhancements />
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <SettingsProvider>
            <div className="dashboard-content">
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute allowedRoles={['user']}>
                      <UserDashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/dashboard/wallet"
                  element={
                    <ProtectedRoute allowedRoles={['user']}>
                      <Wallet />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/dashboard/alerts"
                  element={
                    <ProtectedRoute allowedRoles={['user']}>
                      <Alerts />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/dashboard/security"
                  element={
                    <ProtectedRoute allowedRoles={['user']}>
                      <SecurityTools />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/dashboard/assistant"
                  element={
                    <ProtectedRoute allowedRoles={['user']}>
                      <Assistant />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/dashboard/sos-settings"
                  element={
                    <ProtectedRoute allowedRoles={['user']}>
                      <SOSSettings />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/dashboard/settings"
                  element={
                    <ProtectedRoute allowedRoles={['user']}>
                      <Settings />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin"
                  element={
                    <ProtectedRoute allowedRoles={['admin']}>
                      <AdminDashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/admin/*"
                  element={
                    <ProtectedRoute allowedRoles={['admin']}>
                      <AdminDashboard />
                    </ProtectedRoute>
                  }
                />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </div>
          </SettingsProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

