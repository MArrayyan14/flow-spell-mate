import { NavLink, Navigate, Outlet, useLocation } from "react-router-dom";
import { BookOpen, Home, UserRound, Flame, Zap, Heart } from "lucide-react";
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
  if (!user || location.pathname === "/login" || location.pathname.startsWith("/lesson") || location.pathname.startsWith("/grand-quiz")) return null;
  const items = [
    { to: "/home", label: "Home", icon: Home },
    { to: "/vocabulary", label: "Vocabulary", icon: BookOpen },
    { to: "/profile", label: "Profile", icon: UserRound },
  ];
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 bg-white md:hidden"
      style={{
        borderTop: "1px solid #F0F0F0",
        boxShadow: "0 -2px 10px rgba(0,0,0,0.06)",
      }}
    >
      <div className="mx-auto flex items-center justify-around px-2 py-1.5" style={{ maxWidth: 480 }}>
        {items.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `relative flex min-w-[72px] flex-col items-center gap-0.5 px-3 py-2 text-[11px] font-bold transition-transform duration-100 active:scale-90 ${
                isActive ? "" : ""
              }`
            }
            style={({ isActive }) => ({ color: isActive ? "#58CC02" : "#999" })}
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <span
                    className="absolute -top-0.5 h-[3px] w-6 rounded-full"
                    style={{ backgroundColor: "#58CC02" }}
                  />
                )}
                <Icon className="h-5 w-5" />
                <span>{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

export function PageTopBar() {
  const { profile, user } = useAuthStore();
  const location = useLocation();
  const chip = "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold";
  const navItems = [
    { to: "/home", label: "Home", icon: Home },
    { to: "/vocabulary", label: "Vocabulary", icon: BookOpen },
    { to: "/profile", label: "Profile", icon: UserRound },
  ];
  const showNav = !!user && location.pathname !== "/login" && !location.pathname.startsWith("/lesson") && !location.pathname.startsWith("/grand-quiz");
  return (
    <header
      className="-mx-4 mb-5 flex items-center justify-between gap-6 bg-white px-4 py-3 md:-mx-6 md:px-6"
      style={{ borderBottom: "1px solid #F0F0F0" }}
    >
      <div className="flex items-center gap-8">
        <NavLink to="/home" style={{ fontSize: 20, fontWeight: 700, color: "#58CC02" }}>
          LinguaFlow
        </NavLink>
        {showNav && (
          <nav className="hidden items-center gap-1 md:flex">
            {navItems.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-bold transition"
                style={({ isActive }) => ({
                  color: isActive ? "#16A34A" : "#475569",
                  backgroundColor: isActive ? "#F0FDF4" : "transparent",
                })}
              >
                <Icon size={16} />
                {label}
              </NavLink>
            ))}
          </nav>
        )}
      </div>
      <div className="flex items-center gap-2">
        <span className={chip} style={{ backgroundColor: "#F5F5F5", color: "#1A1A1A" }}>
          <Flame size={14} style={{ color: "#FF7A00" }} />
          {profile?.streak_days ?? 0}
        </span>
        <span className={chip} style={{ backgroundColor: "#F5F5F5", color: "#1A1A1A" }}>
          <Zap size={14} style={{ color: "#FFD700" }} />
          {profile?.xp_total ?? 0}
        </span>
        <span className={chip} style={{ backgroundColor: "#F5F5F5", color: "#1A1A1A" }}>
          <Heart size={14} style={{ color: "#FF4B4B" }} fill="#FF4B4B" />
          {profile?.hearts ?? 5}
        </span>
      </div>
    </header>
  );
}

export function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="lif-card grid place-items-center gap-4 p-8 text-center">
      <p className="font-semibold">Something went wrong. Tap to retry.</p>
      <button
        onClick={onRetry}
        className="rounded-xl px-5 py-3 font-bold text-white"
        style={{ backgroundColor: "#58CC02" }}
      >
        Retry
      </button>
    </div>
  );
}
export function LoadingGrid() {
  return (
    <div className="grid gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="lif-skeleton h-24" />
      ))}
    </div>
  );
}
