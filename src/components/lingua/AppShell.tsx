import { NavLink, Navigate, Outlet, useLocation } from "react-router-dom";
import { BookOpen, Home, UserRound } from "lucide-react";
import { useAuthStore } from "@/stores/authStore";

export function ProtectedRoute() {
  const { user, loading } = useAuthStore();
  if (loading) return <div className="lif-page"><div className="lif-shell grid gap-4"><div className="lif-skeleton h-24" /><div className="lif-skeleton h-64" /></div></div>;
  if (!user) return <Navigate to="/login" replace />;
  return <Outlet />;
}

export function RootRedirect() {
  const { user, loading } = useAuthStore();
  if (loading) return <div className="lif-page" />;
  return <Navigate to={user ? "/home" : "/login"} replace />;
}

export function BottomNav() {
  const { user } = useAuthStore();
  const location = useLocation();
  if (!user || location.pathname === "/login" || location.pathname.startsWith("/lesson")) return null;
  const items = [
    { to: "/home", label: "Home", icon: Home },
    { to: "/vocabulary", label: "Vocabulary", icon: BookOpen },
    { to: "/profile", label: "Profile", icon: UserRound },
  ];
  return <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur"><div className="mx-auto flex max-w-xl items-center justify-around px-4 py-2">{items.map(({ to, label, icon: Icon }) => <NavLink key={to} to={to} className={({ isActive }) => `flex min-w-20 flex-col items-center gap-1 rounded-2xl px-3 py-2 text-xs font-bold transition ${isActive ? "text-primary" : "text-muted-foreground hover:bg-muted"}`}><Icon className="h-5 w-5" /><span>{label}</span></NavLink>)}</div></nav>;
}

export function PageTopBar() {
  const { profile } = useAuthStore();
  const initials = (profile?.display_name?.[0] ?? "L").toUpperCase();
  return <header className="mb-6 flex items-center justify-between"><NavLink to="/home" className="text-2xl font-black text-primary">🌿 LinguaFlow</NavLink><div className="flex items-center gap-3 text-sm font-extrabold"><span>🔥{profile?.streak_days ?? 0}</span><span>⚡{profile?.xp_total ?? 0}</span><span>❤️{profile?.hearts ?? 5}</span><div className="grid h-10 w-10 place-items-center rounded-2xl bg-primary-soft text-primary">{initials}</div></div></header>;
}

export function ErrorState({ onRetry }: { onRetry: () => void }) { return <div className="lif-card grid place-items-center gap-4 p-8 text-center"><p className="font-bold">Something went wrong. Tap to retry.</p><button onClick={onRetry} className="rounded-2xl bg-primary px-5 py-3 font-bold text-primary-foreground transition hover:scale-[1.02]">Retry</button></div>; }
export function LoadingGrid() { return <div className="grid gap-4 md:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="lif-skeleton h-36" />)}</div>; }
