import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { BookOpen } from "lucide-react";
import { PageTopBar, LoadingGrid, ErrorState } from "@/components/lingua/AppShell";
import { StrengthBar } from "@/components/lingua/StrengthBar";
import { VocabModal } from "@/components/lingua/VocabModal";
import { formatDays, type ConceptWithMemory } from "@/lib/lingua";
import { useAuthStore } from "@/stores/authStore";
import { useVocabulary, VocabHelpers } from "@/hooks/useVocabulary";

const STAT_COLORS = {
  green: "#16A34A",
  orange: "#EA580C",
  blue: "#1E40AF",
  red: "#DC2626",
};

const BADGE_STYLES: Record<string, { bg: string; fg: string; label: string }> = {
  strong:    { bg: "#DCFCE7", fg: "#166534", label: "Strong" },
  fading:    { bg: "#FEF9C3", fg: "#854D0E", label: "Moderate" },
  weak:      { bg: "#FFEDD5", fg: "#9A3412", label: "Weak" },
  forgotten: { bg: "#FEE2E2", fg: "#991B1B", label: "Forgotten" },
  new:       { bg: "#DBEAFE", fg: "#1E40AF", label: "New" },
};

function badgeFor(c: ConceptWithMemory) {
  return BADGE_STYLES[c.status] || BADGE_STYLES.new;
}

export default function Vocabulary() {
  const { user } = useAuthStore();
  const [params] = useSearchParams();
  const [topic, setTopic] = useState(params.get("filter") === "forgotten" ? "Forgotten" : "All");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("due");
  const [selected, setSelected] = useState<ConceptWithMemory | null>(null);
  const query = useVocabulary(user?.id);

  const filtered = useMemo(() => {
    let rows = query.data?.concepts ?? [];
    rows = VocabHelpers.filterByTopic(rows, topic);
    if (search) rows = VocabHelpers.search(rows, search);
    return VocabHelpers.sort(rows, sort as any);
  }, [query.data?.concepts, topic, search, sort]);

  if (query.isLoading)
    return <main className="lif-page page-enter"><div className="lif-shell"><PageTopBar /><LoadingGrid /></div></main>;
  if (query.isError || !query.data)
    return <main className="lif-page page-enter"><div className="lif-shell"><PageTopBar /><ErrorState onRetry={() => query.refetch()} /></div></main>;

  const allConcepts = query.data?.concepts ?? [];
  const learned = allConcepts.filter((c) => (c.memory?.attempts ?? 0) > 0);
  const topics = allConcepts.length ? Array.from(new Set(allConcepts.map((c) => c.topic))) : [];

  const stats = [
    { label: "Learned", value: learned.length, color: STAT_COLORS.green },
    { label: "Review", value: learned.filter((c) => c.status === "fading" || c.status === "weak").length, color: STAT_COLORS.orange },
    { label: "Strong", value: learned.filter((c) => c.status === "strong").length, color: STAT_COLORS.blue },
    { label: "Forgotten", value: learned.filter((c) => c.status === "forgotten").length, color: STAT_COLORS.red },
  ];

  return (
    <main className="lif-page page-enter">
      <div className="lif-shell">
        <PageTopBar />

        <section className="mb-4 grid grid-cols-4 gap-2">
          {stats.map((s) => (
            <div key={s.label} className="rounded-xl bg-white p-3 text-center shadow-sm">
              <p style={{ fontSize: 20, fontWeight: 800, color: s.color }}>{s.value}</p>
              <p style={{ fontSize: 10, color: "#777", marginTop: 2 }}>{s.label}</p>
            </div>
          ))}
        </section>

        <div className="mb-4 grid gap-2">
          <input
            className="lif-input"
            placeholder="Search Spanish or English"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            className="lif-input"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            <option value="due">Due soonest</option>
            <option value="weak">Weakest first</option>
            <option value="recent">Recently learned</option>
            <option value="az">A–Z</option>
          </select>
        </div>

        <div className="mb-4 -mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
          {["All", "Forgotten", ...topics].map((t) => (
            <button
              key={t}
              onClick={() => setTopic(t)}
              className="shrink-0 rounded-full px-3 py-1.5 text-xs font-bold transition"
              style={{
                backgroundColor: topic === t ? "#58CC02" : "#F5F5F5",
                color: topic === t ? "#fff" : "#666",
              }}
            >
              {t}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <EmptyVocab />
        ) : (
          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((c) => (
              <WordCard key={c.concept_id} c={c} onClick={() => setSelected(c)} />
            ))}
          </section>
        )}

        <VocabModal
          concept={selected}
          open={!!selected}
          onOpenChange={(o) => !o && setSelected(null)}
        />
      </div>
    </main>
  );
}

function EmptyVocab() {
  return (
    <div className="grid place-items-center gap-2 py-12 text-center">
      <BookOpen size={48} className="text-muted-foreground" />
      <p style={{ fontSize: 16, fontWeight: 700, color: "#1A1A1A" }}>No words yet</p>
      <p style={{ fontSize: 14, color: "#777" }} className="max-w-xs">
        Complete a lesson to start building your vocabulary
      </p>
      <a
        href="/home"
        className="mt-2 rounded-xl px-5 py-2.5 text-white font-bold"
        style={{ backgroundColor: "#58CC02" }}
      >
        Start Learning
      </a>
    </div>
  );
}

function WordCard({ c, onClick }: { c: ConceptWithMemory; onClick: () => void }) {
  const attempts = c.memory?.attempts ?? 0;
  const badge = badgeFor(c);
  return (
    <button
      onClick={onClick}
      className="block w-full rounded-2xl bg-white p-4 text-left shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate" style={{ fontSize: 17, fontWeight: 700, color: "#1A1A1A" }}>
            {c.surface_form}
          </h3>
          <p style={{ fontSize: 13, color: "#666" }} className="truncate">
            {c.translation}
          </p>
        </div>
        <span
          className="shrink-0 rounded-full px-2 py-0.5"
          style={{
            fontSize: 11,
            fontWeight: 700,
            backgroundColor: badge.bg,
            color: badge.fg,
          }}
        >
          {badge.label}
        </span>
      </div>
      <StrengthBar value={attempts ? c.recall : 0} />
      <div className="mt-3 flex items-center justify-between" style={{ fontSize: 11, color: "#888" }}>
        <span>Half-life: {(c.memory?.half_life_est ?? 1).toFixed(1)}d</span>
        <span>Next: {formatDays(c.daysUntilReview)}</span>
      </div>
    </button>
  );
}
