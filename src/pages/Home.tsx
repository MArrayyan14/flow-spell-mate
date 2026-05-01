import { Link, useNavigate } from "react-router-dom";
import { Lock } from "lucide-react";
import { PageTopBar, LoadingGrid, ErrorState } from "@/components/lingua/AppShell";
import { StrengthBar } from "@/components/lingua/StrengthBar";
import { enrichConcepts, unitStrength, type Unit } from "@/lib/lingua";
import { useAuthStore } from "@/stores/authStore";
import { useLessons } from "@/hooks/useLessons";

export default function Home() {
  const { user, profile } = useAuthStore();
  const navigate = useNavigate();
  const query = useLessons(user?.id);
  if (query.isLoading) return <main className="lif-page"><div className="lif-shell"><PageTopBar /><LoadingGrid /></div></main>;
  if (query.isError || !query.data) return <main className="lif-page"><div className="lif-shell"><ErrorState onRetry={() => query.refetch()} /></div></main>;
  const enriched = enrichConcepts(query.data.concepts, query.data.memories);
  const strengthByUnit = new Map(query.data.units.map((u) => [u.id, unitStrength(enriched.filter((c) => c.unit_id === u.id))]));
  const forgotten = enriched.some((c) => (c.memory?.attempts ?? 0) > 0 && c.recall < 0.4);
  return <main className="lif-page"><div className="lif-shell"><PageTopBar />{forgotten && <button onClick={() => navigate("/vocabulary?filter=forgotten")} className="mb-5 w-full rounded-2xl bg-destructive-soft p-4 text-left font-black text-destructive shadow-md transition hover:scale-[1.01]">🔴 Some words are fading — tap to review</button>}<section className="mb-8 grid grid-cols-3 gap-3"><Stat label="Words Learned" value={query.data.memories.filter((m) => m.attempts > 0).length} /><Stat label="Day Streak" value={profile?.streak_days ?? 0} /><Stat label="Weekly XP" value={profile?.weekly_xp ?? 0} /></section><section className="relative mx-auto max-w-xl py-2 before:absolute before:left-1/2 before:top-0 before:h-full before:border-l-4 before:border-dotted before:border-primary-soft before:content-['']">{query.data.units.map((unit, index) => { const strength = strengthByUnit.get(unit.id) ?? 0; return <Link key={unit.id} to={`/unit/${unit.id}`} className={`relative z-10 mb-8 flex ${index % 2 ? "justify-end" : "justify-start"}`}><div className="lif-card w-44 p-4 text-center transition hover:-translate-y-1 hover:shadow-lg"><span className="absolute right-3 top-3 rounded-full bg-secondary-soft px-2 py-1 text-xs font-black text-secondary">{unit.cefr_level}</span><div className="mx-auto grid h-24 w-24 place-items-center rounded-full bg-path-gradient text-5xl shadow-md animate-float">{unit.emoji}</div><h2 className="mt-3 font-black">{unit.topic}</h2><div className="mt-3"><StrengthBar value={strength} segments /></div></div></Link>; })}</section></div></main>;
}
function Stat({ label, value }: { label: string; value: number }) { return <div className="lif-stat text-center"><p className="text-2xl font-black">{value}</p><p className="text-xs font-bold text-muted-foreground">{label}</p></div>; }
