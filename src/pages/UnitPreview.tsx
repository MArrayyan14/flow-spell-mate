import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PageTopBar, LoadingGrid, ErrorState } from "@/components/lingua/AppShell";
import { Button } from "@/components/ui/button";
import { StrengthBar } from "@/components/lingua/StrengthBar";
import { enrichConcepts, unitStrength, type Concept, type Memory, type Unit } from "@/lib/lingua";
import { useAuthStore } from "@/stores/authStore";

export default function UnitPreview() {
  const { id } = useParams();
  const { user } = useAuthStore();
  const [flipped, setFlipped] = useState<Record<string, boolean>>({});
  const query = useQuery({ queryKey: ["unit", id, user?.id], enabled: !!user && !!id, queryFn: async () => {
    const [unit, concepts, memory] = await Promise.all([
      supabase.from("units").select("*").eq("id", Number(id)).single(),
      supabase.from("concepts").select("*").eq("unit_id", Number(id)).order("surface_form"),
      supabase.from("user_memory").select("*").eq("user_id", user!.id),
    ]);
    if (unit.error || concepts.error || memory.error) throw new Error("load");
    return { unit: unit.data as Unit, concepts: enrichConcepts(concepts.data as Concept[], memory.data as Memory[]) };
  }});
  if (query.isLoading) return <main className="lif-page"><div className="lif-shell"><PageTopBar /><LoadingGrid /></div></main>;
  if (query.isError || !query.data) return <main className="lif-page"><div className="lif-shell"><ErrorState onRetry={() => query.refetch()} /></div></main>;
  const { unit, concepts } = query.data;
  const strength = unitStrength(concepts);
  return <main className="lif-page"><div className="lif-shell max-w-4xl"><PageTopBar /><section className="lif-card mb-6 p-6"><div className="flex items-start gap-4"><div className="grid h-20 w-20 place-items-center rounded-2xl bg-primary-soft text-5xl">{unit.emoji}</div><div className="flex-1"><div className="flex items-center gap-2"><h1 className="text-3xl font-black">{unit.topic}</h1><span className="rounded-full bg-secondary-soft px-3 py-1 text-sm font-black text-secondary">{unit.cefr_level}</span></div><p className="mt-2 font-semibold text-muted-foreground">{unit.description}</p><div className="mt-4"><StrengthBar value={strength} /></div><p className="mt-2 text-sm font-bold text-muted-foreground">{Math.round(strength * 100)}% skill strength</p></div></div></section><section className="mb-6"><h2 className="mb-3 text-xl font-black">What you'll learn</h2><div className="flex flex-wrap gap-2">{concepts.map((c) => <button key={c.concept_id} onClick={() => setFlipped((f) => ({ ...f, [c.concept_id]: !f[c.concept_id] }))} className={`rounded-2xl px-4 py-3 font-bold shadow-md transition hover:scale-[1.03] ${(c.memory?.attempts ?? 0) === 0 ? "bg-primary-soft text-primary" : "bg-muted text-muted-foreground"}`}>{c.emoji} {flipped[c.concept_id] ? c.translation : c.surface_form}</button>)}</div></section><div className="fixed inset-x-0 bottom-20 z-30 mx-auto grid max-w-4xl gap-3 bg-background/90 p-4 backdrop-blur md:static md:grid-cols-2 md:bg-transparent md:p-0"><Button asChild variant="soft" size="lg"><Link to={`/lesson/${unit.id}?mode=flashcard`}>📚 Study with Flashcards</Link></Button><Button asChild size="lg"><Link to={`/lesson/${unit.id}`}>▶ Start Lesson</Link></Button></div></div></main>;
}
