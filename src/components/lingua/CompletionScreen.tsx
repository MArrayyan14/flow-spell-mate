import { useEffect, useState } from "react";
import { CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  xp: number;
  streak: number;
  newWords: number;
  onContinue: () => void;
};

const CONFETTI_COLORS = [
  "#FBBF24",
  "#F472B6",
  "#34D399",
  "#60A5FA",
  "#A78BFA",
  "#FB7185",
  "#FCD34D",
];

export default function CompletionScreen({ xp, streak, newWords, onContinue }: Props) {
  const [displayXp, setDisplayXp] = useState(0);

  // Count-up animation 0 → xp over ~1s
  useEffect(() => {
    if (xp <= 0) return;
    const start = performance.now();
    const duration = 1000;
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / duration);
      setDisplayXp(Math.round(p * xp));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [xp]);

  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden bg-green-500 p-6 text-white">
      {/* Confetti */}
      {Array.from({ length: 20 }).map((_, i) => {
        const left = Math.random() * 100;
        const delay = Math.random() * 1.2;
        const duration = 2 + Math.random() * 2;
        const size = 8 + Math.random() * 8;
        const color = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
        return (
          <span
            key={i}
            aria-hidden
            className="pointer-events-none absolute top-0 animate-confetti rounded-sm"
            style={{
              left: `${left}%`,
              width: size,
              height: size,
              background: color,
              animationDelay: `${delay}s`,
              animationDuration: `${duration}s`,
            }}
          />
        );
      })}

      <section className="relative z-10 grid max-w-md gap-6 text-center">
        <div className="mx-auto animate-check-pop">
          <CheckCircle className="h-32 w-32" strokeWidth={2.5} />
        </div>
        <h1 className="text-5xl font-black">Lesson Complete!</h1>

        <div className="grid grid-cols-3 gap-3">
          <Stat label="XP Earned" value={displayXp} />
          <Stat label="Day Streak" value={streak} />
          <Stat label="New Words" value={newWords} />
        </div>

        <Button
          size="lg"
          variant="secondary"
          className="mt-2 text-lg font-black"
          onClick={onContinue}
        >
          Continue
        </Button>
      </section>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-white/15 p-4 backdrop-blur">
      <p className="text-3xl font-black">{value}</p>
      <p className="text-xs font-bold uppercase tracking-wide opacity-90">{label}</p>
    </div>
  );
}
