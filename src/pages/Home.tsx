import { Link, useNavigate } from "react-router-dom";
import {
  Sparkles, Hand, Hash, UtensilsCrossed, Users, Clock, Plane, ShoppingBag,
  Briefcase, ShieldAlert, BookOpen as BookIcon,
} from "lucide-react";
import { PageTopBar, LoadingGrid, ErrorState } from "@/components/lingua/AppShell";
import { StrengthBar } from "@/components/lingua/StrengthBar";
import { enrichConcepts, unitStrength, type Unit } from "@/lib/lingua";
import { useAuthStore } from "@/stores/authStore";
import { useLessons } from "@/hooks/useLessons";

const DAILY_GOAL = 30;

const UNIT_THEMES: Record<string, { bg: string; fg: string; icon: any }> = {
  Core:       { bg: "#EEF2FF", fg: "#4F46E5", icon: Sparkles },
  Greetings:  { bg: "#F0FDF4", fg: "#16A34A", icon: Hand },
  Numbers:    { bg: "#FFF7ED", fg: "#EA580C", icon: Hash },
  Food:       { bg: "#FEF2F2", fg: "#DC2626", icon: UtensilsCrossed },
  Family:     { bg: "#FDF4FF", fg: "#9333EA", icon: Users },
  Time:       { bg: "#F0F9FF", fg: "#0284C7", icon: Clock },
  Travel:     { bg: "#FEFCE8", fg: "#CA8A04", icon: Plane },
  Shopping:   { bg: "#FFF1F2", fg: "#E11D48", icon: ShoppingBag },
  Work:       { bg: "#F8FAFC", fg: "#475569", icon: Briefcase },
  Emergency:  { bg: "#FFF7ED", fg: "#D97706", icon: ShieldAlert },
};

function themeFor(topic: string) {
  const key = Object.keys(UNIT_THEMES).find(
    (k) => topic?.toLowerCase().includes(k.toLowerCase())
  );
  return UNIT_THEMES[key ?? "Core"] ?? UNIT_THEMES.Core;
}

export default function Home() {
  const { user, profile } = useAuthStore();
  const navigate = useNavigate();
  const query = useLessons(user?.id);

  if (query.isLoading)
    return (
      <main className="lif-page page-enter">
        <div className="lif-shell">
          <PageTopBar />
          <LoadingGrid />
        </div>
      </main>
    );
  if (query.isError || !query.data)
    return (
      <main className="lif-page page-enter">
        <div className="lif-shell">
          <PageTopBar />
          <ErrorState onRetry={() => query.refetch()} />
        </div>
      </main>
    );

  const enriched = enrichConcepts(query.data.concepts, query.data.memories);
  const strengthByUnit = new Map(
    query.data.units.map((u) => [u.id, unitStrength(enriched.filter((c) => c.unit_id === u.id))])
  );
  const forgotten = enriched.some((c) => (c.memory?.attempts ?? 0) > 0 && c.recall < 0.4);
  const wordsLearned = query.data.memories.filter((m) => m.attempts > 0).length;
  const firstName =
    profile?.display_name?.split(" ")[0] ?? user?.email?.split("@")[0] ?? "Friend";
  const todayXp = profile?.weekly_xp ?? 0;
  const goalPct = Math.min(1, todayXp / DAILY_GOAL);

  return (
    <main className="lif-page page-enter">
      <div className="lif-shell">
        <PageTopBar />

        {forgotten && (
          <button
            onClick={() => navigate("/vocabulary?filter=forgotten")}
            className="mb-4 w-full rounded-2xl bg-destructive-soft p-4 text-left text-sm font-bold text-destructive transition active:scale-[0.99]"
          >
            Some words are fading — tap to review
          </button>
        )}

        {/* Hero summary */}
        <section
          className="mb-5 flex items-center justify-between rounded-2xl p-5 shadow-sm"
          style={{ background: "linear-gradient(135deg, #f0fff4, #dcfce7)" }}
        >
          <div className="min-w-0">
            <p style={{ fontSize: 18, fontWeight: 700, color: "#1A1A1A" }} className="truncate">
              Keep it up, {firstName}!
            </p>
            <p style={{ fontSize: 13, color: "#52606D" }} className="mt-1 truncate">
              {wordsLearned} words learned · {profile?.streak_days ?? 0} day streak
            </p>
          </div>
          <ProgressRing value={goalPct} current={todayXp} goal={DAILY_GOAL} />
        </section>

        {/* Unit list */}
        <section className="grid gap-3">
          {query.data.units.map((unit) => {
            const strength = strengthByUnit.get(unit.id) ?? 0;
            const theme = themeFor(unit.topic);
            const Icon = theme.icon;
            return (
              <Link
                key={unit.id}
                to={`/unit/${unit.id}`}
                className="lif-card relative block p-4 transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <span
                  className="absolute right-3 top-3 rounded-full px-2 py-0.5 font-semibold"
                  style={{ fontSize: 11, backgroundColor: "#F5F5F5", color: "#666" }}
                >
                  {unit.cefr_level}
                </span>
                <div className="flex items-center gap-3">
                  <div
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-xl"
                    style={{ backgroundColor: theme.bg, color: theme.fg }}
                  >
                    <Icon size={20} />
                  </div>
                  <div className="min-w-0 flex-1 pr-12">
                    <h3 style={{ fontSize: 15, fontWeight: 700, color: "#1A1A1A" }} className="truncate">
                      {unit.topic}
                    </h3>
                    <p style={{ fontSize: 12, color: "#777" }} className="truncate">
                      {(unit as any).description ?? "Tap to start"}
                    </p>
                  </div>
                </div>
                <div className="mt-3">
                  <StrengthBar value={strength} />
                </div>
              </Link>
            );
          })}
        </section>
      </div>
    </main>
  );
}

function ProgressRing({ value, current, goal }: { value: number; current: number; goal: number }) {
  const size = 64;
  const stroke = 6;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - value);
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="#E8F5E9" strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="#58CC02"
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={c}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 600ms ease-out" }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <div className="text-center leading-tight">
          <div style={{ fontSize: 14, fontWeight: 800, color: "#1A1A1A" }}>{current}</div>
          <div style={{ fontSize: 9, color: "#777" }}>/ {goal}</div>
        </div>
      </div>
    </div>
  );
}
