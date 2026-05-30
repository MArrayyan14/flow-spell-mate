import {
  Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Cell,
} from "recharts";
import { useQuery } from "@tanstack/react-query";
import {
  Flame, Zap, BookOpen, Star, Brain, Clock, BarChart2, Target, TrendingUp, Award,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { PageTopBar, LoadingGrid, ErrorState } from "@/components/lingua/AppShell";
import { StrengthBar } from "@/components/lingua/StrengthBar";
import { enrichConcepts, unitStrength, type Concept, type Memory, type Unit } from "@/lib/lingua";
import { useAuthStore } from "@/stores/authStore";

/* ─── colour helpers ────────────────────────────────────────────────────────── */
function pctColor(v: number) {
  if (v >= 75) return "#58CC02";
  if (v >= 50) return "#FFB800";
  if (v >= 25) return "#FF9600";
  return "#FF4B4B";
}
function halfLifeColor(v: number) {
  if (v >= 14) return "#58CC02";
  if (v >= 7)  return "#FFB800";
  if (v >= 3)  return "#FF9600";
  return "#FF4B4B";
}

/* ─── per-unit stat computation ─────────────────────────────────────────────── */
type UnitStat = {
  name: string;       // short label for chart axis
  fullName: string;
  cefr: string;
  learned: number;
  total: number;
  recall: number;     // 0-100
  halfLife: number;   // days
  accuracy: number;   // 0-100
  mastery: number;    // 0-100  (strong / total learned)
};

function buildUnitStats(
  units: Unit[],
  concepts: ReturnType<typeof enrichConcepts>
): UnitStat[] {
  return units
    .sort((a, b) => a.order_index - b.order_index)
    .map((unit) => {
      const uc = concepts.filter((c) => c.unit_id === unit.id);
      const learned = uc.filter((c) => (c.memory?.attempts ?? 0) > 0);

      const recall = learned.length
        ? Math.round((learned.reduce((s, c) => s + c.recall, 0) / learned.length) * 100)
        : 0;

      const halfLife = learned.length
        ? parseFloat(
            (learned.reduce((s, c) => s + (c.memory?.half_life_est ?? 0), 0) / learned.length).toFixed(1)
          )
        : 0;

      const totalAttempts = learned.reduce((s, c) => s + (c.memory?.attempts ?? 0), 0);
      const totalCorrect  = learned.reduce((s, c) => s + (c.memory?.correct  ?? 0), 0);
      const accuracy = totalAttempts > 0 ? Math.round((totalCorrect / totalAttempts) * 100) : 0;

      const strongCount = learned.filter((c) => c.status === "strong").length;
      const mastery = learned.length > 0
        ? Math.round((strongCount / learned.length) * 100)
        : 0;

      // Truncate long topic names for chart labels
      const name = unit.topic.length > 6 ? unit.topic.slice(0, 6) + "…" : unit.topic;

      return { name, fullName: unit.topic, cefr: unit.cefr_level, learned: learned.length, total: uc.length, recall, halfLife, accuracy, mastery };
    });
}

/* ─── custom tooltip ─────────────────────────────────────────────────────────── */
function ChartTooltip({ active, payload, label, suffix = "%" }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-xl px-3 py-2 text-xs font-bold shadow-lg"
      style={{ background: "#1A1A1A", color: "#fff", border: "none" }}
    >
      <p style={{ color: "#aaa", marginBottom: 2 }}>{label}</p>
      <p style={{ color: "#fff", fontSize: 14 }}>
        {payload[0].value}{suffix}
      </p>
    </div>
  );
}

/* ─── mini chart card ────────────────────────────────────────────────────────── */
function MetricChart({
  title, icon, data, dataKey, colorFn, suffix = "%", height = 160,
}: {
  title: string;
  icon: React.ReactNode;
  data: UnitStat[];
  dataKey: keyof UnitStat;
  colorFn: (v: number) => string;
  suffix?: string;
  height?: number;
}) {
  const hasData = data.some((d) => (d[dataKey] as number) > 0);
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        {icon}
        <span style={{ fontSize: 13, fontWeight: 700, color: "#0F172A" }}>{title}</span>
      </div>
      {!hasData ? (
        <div
          className="grid place-items-center rounded-xl"
          style={{ height, backgroundColor: "#F8FAFC" }}
        >
          <p style={{ fontSize: 11, color: "#94A3B8", fontWeight: 600 }}>No practice data yet</p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={height}>
          <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <XAxis
              dataKey="name"
              tick={{ fontSize: 9, fill: "#94A3B8", fontWeight: 600 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 9, fill: "#94A3B8" }}
              axisLine={false}
              tickLine={false}
              domain={[0, dataKey === "halfLife" ? "auto" : 100]}
            />
            <Tooltip content={<ChartTooltip suffix={suffix} />} cursor={{ fill: "#F1F5F9" }} />
            <Bar dataKey={dataKey as string} radius={[6, 6, 0, 0]}>
              {data.map((entry, i) => (
                <Cell key={i} fill={colorFn(entry[dataKey] as number)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

/* ─── per-unit summary cards ─────────────────────────────────────────────────── */
function UnitCards({ stats }: { stats: UnitStat[] }) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm md:col-span-2">
      <div className="mb-4 flex items-center gap-2">
        <BarChart2 size={18} style={{ color: "#6366F1" }} />
        <h2 style={{ fontSize: 16, fontWeight: 700 }}>Per-Unit Breakdown</h2>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {stats.map((s) => (
          <div
            key={s.fullName}
            className="rounded-xl p-4"
            style={{ backgroundColor: "#F8FAFC", border: "1px solid #E8EDF2" }}
          >
            {/* Header */}
            <div className="mb-3 flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p style={{ fontSize: 13, fontWeight: 800, color: "#0F172A" }} className="truncate">
                  {s.fullName}
                </p>
                <p style={{ fontSize: 10, color: "#64748B", fontWeight: 600 }}>
                  {s.cefr} · {s.learned}/{s.total} words
                </p>
              </div>
              {s.learned === 0 ? (
                <span
                  className="shrink-0 rounded-full px-2 py-0.5"
                  style={{ fontSize: 9, fontWeight: 700, backgroundColor: "#E2E8F0", color: "#64748B" }}
                >
                  Not started
                </span>
              ) : (
                <span
                  className="shrink-0 rounded-full px-2 py-0.5"
                  style={{ fontSize: 9, fontWeight: 700, backgroundColor: pctColor(s.mastery) + "22", color: pctColor(s.mastery) }}
                >
                  {s.mastery}% mastered
                </span>
              )}
            </div>

            {/* 4-metric mini grid */}
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "Recall",    value: `${s.recall}%`,         color: pctColor(s.recall) },
                { label: "Accuracy",  value: `${s.accuracy}%`,       color: pctColor(s.accuracy) },
                { label: "Half-life", value: `${s.halfLife}d`,       color: halfLifeColor(s.halfLife) },
                { label: "Mastery",   value: `${s.mastery}%`,        color: pctColor(s.mastery) },
              ].map(({ label, value, color }) => (
                <div
                  key={label}
                  className="rounded-lg px-3 py-2"
                  style={{ backgroundColor: "#fff", border: "1px solid #F1F5F9" }}
                >
                  <p style={{ fontSize: 9, color: "#94A3B8", fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>
                    {label}
                  </p>
                  <p style={{ fontSize: 15, fontWeight: 800, color: s.learned > 0 ? color : "#CBD5E1" }} className="mt-0.5">
                    {s.learned > 0 ? value : "—"}
                  </p>
                </div>
              ))}
            </div>

            {/* Recall strength bar */}
            {s.learned > 0 && (
              <div className="mt-3">
                <StrengthBar value={s.recall / 100} />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── main component ─────────────────────────────────────────────────────────── */
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
  const learned  = query.data.memories.filter((m) => m.attempts > 0).length;
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
    const d   = new Date(Date.now() - (6 - i) * 86400000);
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
  const unitStats = buildUnitStats(query.data.units, concepts);

  const topStats = [
    { icon: <Flame size={16} style={{ color: "#FF7A00" }} />, label: "Day Streak",    value: profile?.streak_days ?? 0 },
    { icon: <Zap   size={16} style={{ color: "#FFD700" }} />, label: "Total XP",      value: profile?.xp_total    ?? 0 },
    { icon: <BookOpen size={16} style={{ color: "#1CB0F6" }} />, label: "Words Learned", value: learned },
    { icon: <Star  size={16} style={{ color: "#9333EA" }} />, label: "Mastered",      value: mastered },
  ];

  return (
    <main className="lif-page page-enter">
      <div className="lif-shell">
        <PageTopBar />

        {/* ── Avatar & name ── */}
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

        {/* ── Top-level stats ── */}
        <section className="mb-5 grid grid-cols-2 gap-2 md:grid-cols-4">
          {topStats.map((s) => (
            <div key={s.label} className="rounded-xl bg-white p-3 shadow-sm">
              <div className="flex items-center gap-1.5">{s.icon}<span style={{ fontSize: 11, color: "#777" }}>{s.label}</span></div>
              <p style={{ fontSize: 22, fontWeight: 800, color: "#1A1A1A" }} className="mt-1">{s.value}</p>
            </div>
          ))}
        </section>

        <div className="grid gap-5 md:grid-cols-2">
          {/* ── CEFR level ── */}
          <section className="rounded-2xl bg-white p-5 shadow-sm">
            <h2 style={{ fontSize: 16, fontWeight: 700 }} className="mb-3">CEFR Level: {level}</h2>
            <StrengthBar value={levelValue} />
            <div className="mt-2 flex justify-between text-[10px] font-bold text-muted-foreground">
              <span>A1</span><span>A2</span><span>B1</span><span>B2</span>
            </div>
            <p className="mt-4 rounded-xl p-2.5 text-sm font-bold" style={{ backgroundColor: "#FEF9C3", color: "#854D0E" }}>
              League: {profile?.league ?? "Bronze"}
            </p>
          </section>

          {/* ── Memory snapshot ── */}
          <MemorySnapshot concepts={concepts} />

          {/* ── Weekly XP chart ── */}
          <section className="rounded-2xl bg-white p-5 shadow-sm md:col-span-2" style={{ height: 260 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700 }} className="mb-3">Weekly XP</h2>
            <ResponsiveContainer width="100%" height="82%">
              <BarChart data={chart}>
                <XAxis dataKey="day" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<ChartTooltip suffix=" XP" />} cursor={{ fill: "#F1F5F9" }} />
                <Bar dataKey="xp" radius={[8, 8, 0, 0]}>
                  {chart.map((_, i) => <Cell key={i} fill="#58CC02" />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </section>

          {/* ══════════════════════════════════════════
              UNIT ANALYTICS — 4 bar charts
          ══════════════════════════════════════════ */}
          <div
            className="rounded-2xl p-5 md:col-span-2"
            style={{ background: "linear-gradient(135deg, #F0F9FF 0%, #EEF2FF 100%)", border: "1px solid #E0E7FF" }}
          >
            {/* Section header */}
            <div className="mb-5 flex items-center gap-3">
              <div
                className="grid h-9 w-9 place-items-center rounded-xl"
                style={{ backgroundColor: "#6366F1", color: "#fff" }}
              >
                <BarChart2 size={18} />
              </div>
              <div>
                <h2 style={{ fontSize: 17, fontWeight: 800, color: "#0F172A" }}>Unit Analytics</h2>
                <p style={{ fontSize: 11, color: "#64748B", fontWeight: 600 }}>
                  Recall, half-life, accuracy &amp; mastery — broken down by topic
                </p>
              </div>
            </div>

            {/* Legend */}
            <div className="mb-4 flex flex-wrap gap-3">
              {[
                { color: "#58CC02", label: "≥ 75% (Strong)" },
                { color: "#FFB800", label: "≥ 50% (Moderate)" },
                { color: "#FF9600", label: "≥ 25% (Weak)" },
                { color: "#FF4B4B", label: "< 25% (Critical)" },
              ].map(({ color, label }) => (
                <span key={label} className="flex items-center gap-1.5" style={{ fontSize: 10, color: "#64748B", fontWeight: 700 }}>
                  <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: 2, backgroundColor: color }} />
                  {label}
                </span>
              ))}
            </div>

            {/* 2×2 chart grid */}
            <div className="grid gap-4 sm:grid-cols-2">
              <MetricChart
                title="Avg. Recall"
                icon={<TrendingUp size={15} style={{ color: "#1CB0F6" }} />}
                data={unitStats}
                dataKey="recall"
                colorFn={pctColor}
                suffix="%"
              />
              <MetricChart
                title="Avg. Half-Life"
                icon={<Clock size={15} style={{ color: "#9333EA" }} />}
                data={unitStats}
                dataKey="halfLife"
                colorFn={halfLifeColor}
                suffix=" days"
              />
              <MetricChart
                title="Accuracy"
                icon={<Target size={15} style={{ color: "#58CC02" }} />}
                data={unitStats}
                dataKey="accuracy"
                colorFn={pctColor}
                suffix="%"
              />
              <MetricChart
                title="Mastery"
                icon={<Award size={15} style={{ color: "#F59E0B" }} />}
                data={unitStats}
                dataKey="mastery"
                colorFn={pctColor}
                suffix="%"
              />
            </div>
          </div>

          {/* ── Per-unit detail cards ── */}
          <UnitCards stats={unitStats} />

          {/* ── Word lists ── */}
          <List title="Strongest words" rows={strongest} />
          <List title="Weakest words"   rows={weakest}   />
        </div>

        <Button variant="outline" onClick={signOut} className="mt-5 w-full md:w-auto md:px-8">Sign Out</Button>
      </div>
    </main>
  );
}

/* ─── sub-components ─────────────────────────────────────────────────────────── */

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

function MemorySnapshot({ concepts }: { concepts: ReturnType<typeof enrichConcepts> }) {
  const learned   = concepts.filter((c) => (c.memory?.attempts ?? 0) > 0);
  const dueToday  = learned.filter((c) => c.daysUntilReview <= 1).length;
  const avgHalf   = learned.length
    ? learned.reduce((s, c) => s + (c.memory?.half_life_est ?? 0), 0) / learned.length
    : 0;
  const strongPct = learned.length
    ? Math.round((learned.filter((c) => c.recall >= 0.8).length / learned.length) * 100)
    : 0;

  return (
    <section className="mb-5 rounded-2xl bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <Brain size={18} style={{ color: "#9333EA" }} />
        <h2 style={{ fontSize: 16, fontWeight: 700 }}>Memory snapshot</h2>
      </div>
      <p style={{ fontSize: 12, color: "#64748B" }} className="mb-4">
        Powered by your half-life recall model — updated every answer.
      </p>
      <div className="grid grid-cols-3 gap-2">
        <SnapStat label="Avg. half-life" value={`${avgHalf.toFixed(1)}d`}  icon={<Clock    size={14} style={{ color: "#1CB0F6" }} />} />
        <SnapStat label="Due today"      value={dueToday}                  icon={<Flame    size={14} style={{ color: "#FF7A00" }} />} />
        <SnapStat label="Strong"         value={`${strongPct}%`}           icon={<Star     size={14} style={{ color: "#9333EA" }} />} />
      </div>
    </section>
  );
}

function SnapStat({ label, value, icon }: { label: string; value: string | number; icon: React.ReactNode }) {
  return (
    <div className="rounded-xl p-3" style={{ backgroundColor: "#F8FAFC" }}>
      <div className="flex items-center gap-1.5">{icon}<span style={{ fontSize: 10, color: "#64748B", fontWeight: 600 }}>{label}</span></div>
      <p style={{ fontSize: 18, fontWeight: 800, color: "#0F172A" }} className="mt-1">{value}</p>
    </div>
  );
}
