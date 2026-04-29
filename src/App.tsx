import { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BottomNav, ProtectedRoute, RootRedirect } from "@/components/lingua/AppShell";
import { useAuthStore } from "@/stores/authStore";
import Home from "./pages/Home";
import Lesson from "./pages/Lesson";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound.tsx";
import Profile from "./pages/Profile";
import UnitPreview from "./pages/UnitPreview";
import Vocabulary from "./pages/Vocabulary";

const queryClient = new QueryClient();

const AppContent = () => {
  const init = useAuthStore((s) => s.init);
  useEffect(() => { init(); }, [init]);
  return <BrowserRouter><Routes><Route path="/" element={<RootRedirect />} /><Route path="/login" element={<Login />} /><Route element={<ProtectedRoute />}><Route path="/home" element={<Home />} /><Route path="/unit/:id" element={<UnitPreview />} /><Route path="/lesson/:id" element={<Lesson />} /><Route path="/vocabulary" element={<Vocabulary />} /><Route path="/profile" element={<Profile />} /></Route><Route path="*" element={<NotFound />} /></Routes><BottomNav /></BrowserRouter>;
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
