import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";
import { useQuery } from "@tanstack/react-query";
import { Flame, Zap, BookOpen, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { PageTopBar, LoadingGrid, ErrorState } from "@/components/lingua/AppShell";
import { StrengthBar } from "@/components/lingua/StrengthBar";
import { enrichConcepts, unitStrength, type Concept, type Memory, type Unit } from "@/lib/lingua";
import { useAuthStore } from "@/stores/authStore";

export default function Profile() {
  const { user, profile, signOut } = useAuthStore();
  const query = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const [units, concepts, memory, sessions] = await Promise.all([
        supabase.from("units").select("*"),
        supabase.from("concepts").select("*"),
        supabase.from("user_memory").select("*").eq("user_id", user!.id),
        supabase.from("sessions").select("*").eq("user_id", user!.id).order("created_at", { ascending: false }).limit(100),
      ]);
      if (units.error || concepts.error || memory.error || sessions.error) throw new Error("load");
      return {
        units: units.data as Unit[],
        concepts: concepts.data as Concept[],
        memories: memory.data as Memory[],
        sessions: sessions.data as any[],
      };
    },
  });

  if (query.isLoading)
    return <main className="lif-page page-enter"><div className="lif-shell"><PageTopBar /><LoadingGrid /></div></main>;
  if (query.isError || !query.data)
    return <main className="lif-page page-enter"><div className="lif-shell"><PageTopBar /><ErrorState onRetry={() => query.refetch()} /></div></main>;

  const concepts = enrichConcepts(query.data.concepts, query.data.memories);
  const learned = query.data.memories.filter((m) => m.attempts > 0).length;
  const mastered = query.data.memories.filter((m) => m.half_life_est > 14).length;
  const strength = (ids: number[]) =>
    ids.every((id) => unitStrength(concepts.filter((c) => c.unit_id === id)) >= 0.75);
  const level = strength([1, 2, 3, 4, 5])
    ? strength([6, 7, 8])
      ? strength([9, 10]) ? "B1" : "A2"
      : "A1"
    : "Starter";
  const levelValue = level === "B1" ? 0.75 : level === "A2" ? 0.5 : level === "A1" ? 0.25 : 0.08;
  const chart = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(Date.now() - (6 - i) * 86400000);
    const key = d.toISOString().slice(0, 10);
    return {
      day: d.toLocaleDateString(undefined, { weekday: "short" }),
      xp: query.data.sessions
        .filter((s) => s.created_at?.slice(0, 10) === key)
        .reduce((a, s) => a + (s.xp_earned ?? 0), 0),
    };
  });
  const strongest = [...concepts]
    .filter((c) => c.memory)
    .sort((a, b) => (b.memory?.half_life_est ?? 0) - (a.memory?.half_life_est ?? 0))
    .slice(0, 3);
  const weakest = [...concepts]
    .filter((c) => (c.memory?.attempts ?? 0) > 0)
    .sort((a, b) => a.recall - b.recall)
    .slice(0, 3);
  const initials = (profile?.display_name?.[0] ?? user?.email?.[0] ?? "L").toUpperCase();

  const stats = [
    { icon: <Flame size={16} style={{ color: "#FF7A00" }} />, label: "Day Streak", value: profile?.streak_days ?? 0 },
    { icon: <Zap size={16} style={{ color: "#FFD700" }} />, label: "Total XP", value: profile?.xp_total ?? 0 },
    { icon: <BookOpen size={16} style={{ color: "#1CB0F6" }} />, label: "Words Learned", value: learned },
    { icon: <Star size={16} style={{ color: "#9333EA" }} />, label: "Mastered", value: mastered },
  ];

  return (
    <main className="lif-page page-enter">
      <div className="lif-shell">
        <PageTopBar />

        <section className="mb-5 flex items-center gap-4 rounded-2xl bg-white p-5 shadow-sm">
          <div
            className="grid h-16 w-16 place-items-center rounded-2xl text-2xl font-extrabold text-white"
            style={{ backgroundColor: "#58CC02" }}
          >
            {initials}
          </div>
          <div className="min-w-0">
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "#1A1A1A" }} className="truncate">
              {profile?.display_name ?? "Learner"}
            </h1>
            <p style={{ fontSize: 13, color: "#777" }} className="truncate">{user?.email}</p>
          </div>
        </section>

        <section className="mb-5 grid grid-cols-2 gap-2">
          {stats.map((s) => (
            <div key={s.label} className="rounded-xl bg-white p-3 shadow-sm">
              <div className="flex items-center gap-1.5">{s.icon}<span style={{ fontSize: 11, color: "#777" }}>{s.label}</span></div>
              <p style={{ fontSize: 22, fontWeight: 800, color: "#1A1A1A" }} className="mt-1">{s.value}</p>
            </div>
          ))}
        </section>

        <section className="mb-5 rounded-2xl bg-white p-5 shadow-sm">
          <h2 style={{ fontSize: 16, fontWeight: 700 }} className="mb-3">CEFR Level: {level}</h2>
          <StrengthBar value={levelValue} />
          <div className="mt-2 flex justify-between text-[10px] font-bold text-muted-foreground">
            <span>A1</span><span>A2</span><span>B1</span><span>B2</span>
          </div>
          <p className="mt-4 rounded-xl p-2.5 text-sm font-bold" style={{ backgroundColor: "#FEF9C3", color: "#854D0E" }}>
            League: {profile?.league ?? "Bronze"}
          </p>
        </section>

        <section className="mb-5 rounded-2xl bg-white p-5 shadow-sm" style={{ height: 240 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700 }} className="mb-3">Weekly XP</h2>
          <ResponsiveContainer width="100%" height="80%">
            <BarChart data={chart}>
              <XAxis dataKey="day" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="xp" fill="#58CC02" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </section>

        <section className="mb-5 grid gap-3">
          <List title="Strongest words" rows={strongest} />
          <List title="Weakest words" rows={weakest} />
        </section>

        <Button variant="outline" onClick={signOut} className="w-full">Sign Out</Button>
      </div>
    </main>
  );
}

function List({ title, rows }: { title: string; rows: any[] }) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm">
      <h2 style={{ fontSize: 16, fontWeight: 700 }} className="mb-3">{title}</h2>
      <div className="grid gap-2">
        {rows.length ? (
          rows.map((r) => (
            <div
              key={r.concept_id}
              className="flex justify-between rounded-xl p-2.5 text-sm font-semibold"
              style={{ backgroundColor: "#F8F9FA" }}
            >
              <span>{r.surface_form}</span>
              <span style={{ color: "#58CC02" }}>{Math.round(r.recall * 100)}%</span>
            </div>
          ))
        ) : (
          <p className="text-sm font-semibold text-muted-foreground">No practice data yet.</p>
        )}
      </div>
    </div>
  );
}
