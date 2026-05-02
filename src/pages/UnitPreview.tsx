import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { PageTopBar, LoadingGrid, ErrorState } from "@/components/lingua/AppShell";
import { StrengthBar } from "@/components/lingua/StrengthBar";
import { unitStrength, type Unit, enrichConcepts } from "@/lib/lingua";
import { useAuthStore } from "@/stores/authStore";
import { useQuery } from "@tanstack/react-query";
import { fetchLessonData } from "@/services/lessonService";

export default function UnitPreview() {
  const { id } = useParams();
  const { user } = useAuthStore();
  const [flipped, setFlipped] = useState<Record<string, boolean>>({});

  const unitQuery = useQuery({
    queryKey: ["unit", id],
    enabled: !!id,
    queryFn: async () => {
      const response = await fetch("/spanish_concepts.json");
      const data = await response.json();
      const unit = data.metadata.units.find((u: any) => u.unit_id === Number(id));
      if (!unit) throw new Error("Unit not found");
      return {
        id: unit.unit_id,
        topic: unit.topic,
        cefr_level: unit.cefr_level,
        description: unit.description,
        order_index: unit.unit_id,
        emoji: null,
      } as Unit;
    },
  });

  const query = useQuery({
    queryKey: ["unit", id, user?.id],
    enabled: !!user && !!id,
    queryFn: async () => {
      const { concepts, memories } = await fetchLessonData(Number(id), user!.id);
      return { concepts: enrichConcepts(concepts, memories) };
    },
  });

  if (query.isLoading || unitQuery.isLoading)
    return <main className="lif-page page-enter"><div className="lif-shell"><PageTopBar /><LoadingGrid /></div></main>;
  if (query.isError || !query.data || unitQuery.isError || !unitQuery.data)
    return <main className="lif-page page-enter"><div className="lif-shell"><PageTopBar /><ErrorState onRetry={() => { query.refetch(); unitQuery.refetch(); }} /></div></main>;

  const unit = unitQuery.data;
  const concepts = query.data.concepts;
  const strength = unitStrength(concepts);

  return (
    <main className="lif-page page-enter">
      <div className="lif-shell">
        <PageTopBar />

        <Link
          to="/home"
          className="mb-3 inline-flex items-center gap-1 text-sm font-semibold text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft size={16} /> Back
        </Link>

        <section className="mb-5 rounded-2xl bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 style={{ fontSize: 24, fontWeight: 800, color: "#1A1A1A" }} className="truncate">
                {unit.topic}
              </h1>
              <p style={{ fontSize: 13, color: "#666" }} className="mt-1">
                {unit.description}
              </p>
            </div>
            <span
              className="shrink-0 rounded-full px-2 py-0.5"
              style={{ fontSize: 11, fontWeight: 700, backgroundColor: "#F5F5F5", color: "#666" }}
            >
              {unit.cefr_level}
            </span>
          </div>
          <div className="mt-4">
            <StrengthBar value={strength} />
            <p style={{ fontSize: 12, color: "#777" }} className="mt-2">
              {Math.round(strength * 100)}% skill strength
            </p>
          </div>
        </section>

        <section className="mb-24">
          <h2 style={{ fontSize: 16, fontWeight: 700, color: "#1A1A1A" }} className="mb-3">
            What you'll learn
          </h2>
          <div className="flex flex-wrap gap-2">
            {concepts.map((c) => {
              const isNew = (c.memory?.attempts ?? 0) === 0;
              return (
                <button
                  key={c.concept_id}
                  onClick={() => setFlipped((f) => ({ ...f, [c.concept_id]: !f[c.concept_id] }))}
                  className="rounded-xl px-3 py-2 font-semibold transition active:scale-[0.97]"
                  style={{
                    fontSize: 13,
                    backgroundColor: isNew ? "#F0FFF4" : "#F5F5F5",
                    color: isNew ? "#166534" : "#666",
                  }}
                >
                  {flipped[c.concept_id] ? c.translation : c.surface_form}
                </button>
              );
            })}
          </div>
        </section>

        <div
          className="fixed inset-x-0 bottom-16 z-30 mx-auto grid gap-2 px-4 py-3"
          style={{ maxWidth: 480, background: "rgba(250,250,250,0.95)", backdropFilter: "blur(8px)" }}
        >
          <Link
            to={`/lesson/${unit.id}?mode=flashcard`}
            className="grid place-items-center rounded-xl font-bold transition active:scale-[0.98]"
            style={{
              height: 48,
              backgroundColor: "#F0FFF4",
              color: "#166534",
              border: "1.5px solid #58CC02",
            }}
          >
            Study with Flashcards
          </Link>
          <Link
            to={`/lesson/${unit.id}`}
            className="grid place-items-center rounded-xl text-white font-bold transition active:scale-[0.98]"
            style={{ height: 48, backgroundColor: "#58CC02" }}
          >
            Start Lesson
          </Link>
        </div>
      </div>
    </main>
  );
}
