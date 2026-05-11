import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { BookOpen, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "@/stores/authStore";

const BULLETS = [
  "Memory-based spaced repetition",
  "Half-life regression scheduling",
  "Speech recognition practice",
];

export default function Login() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/home" replace />;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    const result =
      mode === "signin"
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({
            email,
            password,
            options: { emailRedirectTo: window.location.origin },
          });
    setBusy(false);
    if (result.error) return setError(result.error.message);
    navigate("/home");
  };

  return (
    <main className="grid min-h-screen md:grid-cols-2">
      {/* Left column (desktop only) */}
      <aside
        className="hidden md:flex flex-col justify-center px-12 text-white"
        style={{ backgroundColor: "#1a1a2e" }}
      >
        <div className="mx-auto max-w-sm">
          <div className="mb-6 grid place-items-center">
            <BookOpen size={64} className="text-white" strokeWidth={2.2} />
          </div>
          <h1 className="text-center" style={{ fontSize: 36, fontWeight: 700 }}>
            LinguaFlow
          </h1>
          <ul className="mt-10 grid gap-4">
            {BULLETS.map((b) => (
              <li
                key={b}
                className="flex items-center gap-3"
                style={{ color: "rgba(255,255,255,0.8)", fontSize: 14 }}
              >
                <CheckCircle size={18} style={{ color: "#58CC02" }} />
                <span>{b}</span>
              </li>
            ))}
          </ul>
        </div>
      </aside>

      {/* Right column */}
      <section className="grid place-items-center bg-white px-6 py-12 page-enter">
        <div className="w-full max-w-sm">
          <div className="md:hidden mb-8 grid place-items-center gap-2">
            <BookOpen size={36} style={{ color: "#1a1a2e" }} />
            <span style={{ fontSize: 22, fontWeight: 800, color: "#1a1a2e" }}>
              LinguaFlow
            </span>
          </div>

          {/* Underline tab switcher */}
          <div className="mb-6 flex border-b border-[#E5E5E5]">
            {(["signin", "signup"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className="flex-1 pb-3 text-sm font-bold transition"
                style={{
                  color: mode === m ? "#1A1A1A" : "#999",
                  borderBottom:
                    mode === m ? "2px solid #58CC02" : "2px solid transparent",
                  marginBottom: -1,
                }}
              >
                {m === "signin" ? "Sign In" : "Sign Up"}
              </button>
            ))}
          </div>

          <h2 style={{ fontSize: 24, fontWeight: 700 }} className="mb-6">
            {mode === "signin" ? "Welcome back" : "Create account"}
          </h2>

          <form onSubmit={submit} className="grid gap-4">
            <input
              className="lif-input"
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <input
              className="lif-input"
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
            {error && (
              <p className="rounded-xl bg-destructive-soft p-3 text-sm font-semibold text-destructive">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-xl text-white text-base font-bold transition active:scale-[0.98] disabled:opacity-60"
              style={{
                height: 48,
                backgroundColor: "#58CC02",
                boxShadow: "0 2px 8px rgba(88,204,2,0.3)",
              }}
            >
              {busy ? "Working..." : mode === "signin" ? "Sign In" : "Create Account"}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
