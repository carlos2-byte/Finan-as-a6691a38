import { useState, useEffect } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { LockScreen } from "@/components/security/LockScreen";
import { useAppLock } from "@/hooks/useAppLock";
import HomePage from "./pages/HomePage";
import DashboardPage from "./pages/DashboardPage";
import CardsPage from "./pages/CardsPage";
import SettingsPage from "./pages/SettingsPage";
import InvestmentsPage from "./pages/InvestmentsPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function AppContent() {
  const { isLocked, hasPassword, loading, refresh } = useAppLock();
  const [unlocked, setUnlocked] = useState(false);

  // Always require unlock when app starts if password is set
  useEffect(() => {
    if (!loading) {
      if (!hasPassword) {
        // No password configured, allow access
        setUnlocked(true);
      } else {
        // Password is configured - keep locked until user unlocks
        setUnlocked(false);
      }
    }
  }, [hasPassword, loading]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  // If password is set, always show lock screen until unlocked in this session
  if (hasPassword && !unlocked) {
    return (
      <LockScreen 
        onUnlock={() => {
          setUnlocked(true);
          refresh();
        }} 
      />
    );
  }

  return (
    <BrowserRouter>
      <AppLayout>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/investments" element={<InvestmentsPage />} />
          <Route path="/cards" element={<CardsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </AppLayout>
    </BrowserRouter>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AppContent />
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
