import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { PageTopBar, LoadingGrid, ErrorState } from "@/components/lingua/AppShell";
import { StrengthBar } from "@/components/lingua/StrengthBar";
import { VocabModal } from "@/components/lingua/VocabModal";
import { formatDays, type ConceptWithMemory } from "@/lib/lingua";
import { useAuthStore } from "@/stores/authStore";
import { useVocabulary, VocabHelpers } from "@/hooks/useVocabulary";

export default function Vocabulary() {
  const { user } = useAuthStore(); const [params] = useSearchParams();
  const [topic, setTopic] = useState(params.get("filter") === "forgotten" ? "Forgotten" : "All");
  const [search, setSearch] = useState(""); const [sort, setSort] = useState("due"); const [selected, setSelected] = useState<ConceptWithMemory | null>(null);
  const query = useVocabulary(user?.id);
  const filtered = useMemo(() => { 
    let rows = query.data?.concepts ?? []; 
    rows = VocabHelpers.filterByTopic(rows, topic);
    if (search) rows = VocabHelpers.search(rows, search);
    return VocabHelpers.sort(rows, sort as any);
  }, [query.data?.concepts, topic, search, sort]);
  if (query.isLoading) return <main className="lif-page"><div className="lif-shell"><PageTopBar /><LoadingGrid /></div></main>;
  if (query.isError || !query.data) return <main className="lif-page"><div className="lif-shell"><ErrorState onRetry={() => query.refetch()} /></div></main>;
  const allConcepts = query.data?.concepts ?? [];
  const learned = allConcepts.filter(c => (c.memory?.attempts ?? 0) > 0);
  const topics = allConcepts.length ? Array.from(new Set(allConcepts.map(c => c.topic))) : [];
  return <main className="lif-page"><div className="lif-shell"><PageTopBar /><section className="mb-5 grid grid-cols-2 gap-3 md:grid-cols-4"><Stat label="Total Learned" value={learned.length} /><Stat label="Due for Review" value={learned.filter(c=>c.recall<.6).length} /><Stat label="Strong" value={learned.filter(c=>c.recall>=.9).length} /><Stat label="Forgotten" value={learned.filter(c=>c.recall<.4).length} /></section><div className="mb-5 grid gap-3 md:grid-cols-[1fr_220px]"><input className="lif-input" placeholder="Search Spanish or English" value={search} onChange={e=>setSearch(e.target.value)} /><select className="lif-input" value={sort} onChange={e=>setSort(e.target.value)}><option value="due">Due soonest</option><option value="weak">Weakest first</option><option value="recent">Recently learned</option><option value="az">A–Z</option></select></div><div className="mb-5 flex gap-2 overflow-x-auto pb-2">{["All","Forgotten",...topics].map(t=><button key={t} onClick={()=>setTopic(t)} className={`shrink-0 rounded-2xl px-4 py-2 text-sm font-black ${topic===t?"bg-primary text-primary-foreground":"bg-muted text-muted-foreground"}`}>{t}</button>)}</div><section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{filtered.map(c => <WordCard key={c.concept_id} c={c} onClick={() => setSelected(c)} />)}</section><VocabModal concept={selected} open={!!selected} onOpenChange={(o)=>!o&&setSelected(null)} /></div></main>;
}
function Stat({ label, value }: { label:string; value:number }) { return <div className="lif-stat"><p className="text-3xl font-black">{value}</p><p className="text-xs font-bold text-muted-foreground">{label}</p></div>; }
function WordCard({ c, onClick }: { c: ConceptWithMemory; onClick:()=>void }) { const attempts=c.memory?.attempts??0; const pct=Math.round((attempts?c.recall:0)*100); const color=c.recall>=.8?"text-primary":c.recall>=.5?"text-warning":"text-destructive"; return <button onClick={onClick} className={`lif-card p-4 text-left transition hover:-translate-y-1 hover:shadow-lg ${attempts===0?"opacity-75":""}`}><div className="mb-3 flex justify-between gap-2"><div><h3 className="text-xl font-black">{c.emoji} {c.surface_form}</h3><p className="font-semibold text-muted-foreground">{c.translation}</p></div><span className="rounded-full bg-muted px-2 py-1 text-xs font-black capitalize">{attempts===0?"⬜ New":c.status}</span></div><div className="my-3"><StrengthBar value={attempts?c.recall:0} /></div><p className="font-bold">Memory: <span className={color}>{pct}%</span></p><p className="text-sm font-semibold text-muted-foreground">Half-life: {(c.memory?.half_life_est??1).toFixed(1)} days</p><p className="text-sm font-semibold text-muted-foreground">Next review: {formatDays(c.daysUntilReview)}</p><p className="mt-3 border-t pt-3 text-sm font-bold text-muted-foreground">Seen: {attempts}× ✓{c.memory?.correct??0} ✗{c.memory?.incorrect??0} · {c.part_of_speech}</p>{attempts===0 && <p className="mt-2 text-sm font-black text-muted-foreground">⬜ Not yet learned · {'★'.repeat(c.difficulty_level)}</p>}</button>; }
