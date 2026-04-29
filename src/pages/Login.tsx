import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuthStore } from "@/stores/authStore";

export default function Login() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [mode, setMode] = useState("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  if (user) return <Navigate to="/home" replace />;
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(""); setBusy(true);
    const result = mode === "signin" ? await supabase.auth.signInWithPassword({ email, password }) : await supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin } });
    setBusy(false);
    if (result.error) return setError(result.error.message);
    navigate("/home");
  };
  return <main className="grid min-h-screen place-items-center bg-background p-4"><section className="lif-card w-full max-w-md p-6 animate-pop"><div className="mb-8 text-center"><h1 className="text-4xl font-black text-primary">🌿 LinguaFlow</h1><p className="mt-3 font-semibold text-muted-foreground">Learn Spanish with memory-based review scheduling</p></div><Tabs value={mode} onValueChange={setMode} className="w-full"><TabsList className="grid h-12 w-full grid-cols-2 rounded-2xl"><TabsTrigger className="rounded-2xl" value="signin">Sign In</TabsTrigger><TabsTrigger className="rounded-2xl" value="signup">Create Account</TabsTrigger></TabsList><TabsContent value={mode}><form onSubmit={submit} className="mt-6 grid gap-4"><input className="lif-input" type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required /><input className="lif-input" type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />{error && <p className="rounded-2xl bg-destructive-soft p-3 text-sm font-bold text-destructive">{error}</p>}<Button size="lg" disabled={busy}>{busy ? "Working..." : mode === "signin" ? "Sign In" : "Create Account"}</Button></form></TabsContent></Tabs></section></main>;
}
