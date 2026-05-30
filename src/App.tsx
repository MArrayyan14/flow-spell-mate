import { useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BottomNav, ProtectedRoute, RootRedirect } from "@/components/lingua/AppShell";
import Splash from "@/components/lingua/Splash";
import { useAuthStore } from "@/stores/authStore";
import Home from "./pages/Home";
import Lesson from "./pages/Lesson";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound.tsx";
import Profile from "./pages/Profile";
import UnitPreview from "./pages/UnitPreview";
import Vocabulary from "./pages/Vocabulary";
import GrandQuiz from "./pages/GrandQuiz";

const queryClient = new QueryClient();

const AppContent = () => {
  const init = useAuthStore((s) => s.init);
  const loading = useAuthStore((s) => s.loading);
  const [showSplash, setShowSplash] = useState(true);
  const [splashFading, setSplashFading] = useState(false);

  useEffect(() => { init(); }, [init]);

  useEffect(() => {
    if (!loading && showSplash) {
      setSplashFading(true);
      const t = window.setTimeout(() => setShowSplash(false), 320);
      return () => window.clearTimeout(t);
    }
  }, [loading, showSplash]);

  return (
    <BrowserRouter>
      {showSplash && <Splash fading={splashFading} />}
      <Routes>
        <Route path="/" element={<RootRedirect />} />
        <Route path="/login" element={<Login />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/home" element={<Home />} />
          <Route path="/unit/:id" element={<UnitPreview />} />
          <Route path="/lesson/:id" element={<Lesson />} />
          <Route path="/vocabulary" element={<Vocabulary />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/grand-quiz" element={<GrandQuiz />} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
      <BottomNav />
    </BrowserRouter>
  );
};

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
