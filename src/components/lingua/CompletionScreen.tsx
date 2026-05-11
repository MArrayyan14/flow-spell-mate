import { useEffect, useState } from "react";
import { CheckCircle, Zap, Flame, BookOpen } from "lucide-react";

type Props = {
  xp: number;
  streak: number;
  newWords: number;
  onContinue: () => void;
};

const CONFETTI_COLORS = ["#58CC02", "#1CB0F6", "#FF4B4B", "#FFD700", "#9333EA"];

export default function CompletionScreen({ xp, streak, newWords, onContinue }: Props) {
  const [displayXp, setDisplayXp] = useState(0);

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
    <main className="relative grid min-h-screen place-items-center overflow-hidden bg-white p-6 page-enter">
      {/* Confetti */}
      {Array.from({ length: 30 }).map((_, i) => {
        const left = Math.random() * 100;
        const delay = Math.random() * 0.4;
        const duration = 1.5 + Math.random();
        const color = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
        const rot = Math.random() * 360;
        return (
          <span
            key={i}
            aria-hidden
            className="confetti-piece pointer-events-none absolute top-0"
            style={{
              left: `${left}%`,
              width: 8,
              height: 8,
              background: color,
              borderRadius: 2,
              transform: `rotate(${rot}deg)`,
              animationDelay: `${delay}s`,
              animationDuration: `${duration}s`,
            }}
          />
        );
      })}

      <section className="relative z-10 grid w-full max-w-sm gap-5 text-center">
        <div className="mx-auto animate-check-pop">
          <CheckCircle size={72} style={{ color: "#58CC02" }} strokeWidth={2.5} />
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: "#1A1A1A" }}>
          Lesson Complete!
        </h1>
        <p style={{ fontSize: 16, color: "#666" }}>Great work today</p>

        <div className="mt-2 grid grid-cols-3 gap-3">
          <Stat icon={<Zap size={18} style={{ color: "#FFD700" }} />} value={displayXp} label="XP" />
          <Stat icon={<Flame size={18} style={{ color: "#FF7A00" }} />} value={streak} label="Streak" />
          <Stat icon={<BookOpen size={18} style={{ color: "#1CB0F6" }} />} value={newWords} label="New" />
        </div>

        <button
          onClick={onContinue}
          className="mt-4 w-full rounded-xl text-white font-bold transition active:scale-[0.98]"
          style={{
            height: 52,
            backgroundColor: "#58CC02",
            boxShadow: "0 2px 8px rgba(88,204,2,0.3)",
          }}
        >
          Continue
        </button>
      </section>
    </main>
  );
}

function Stat({ icon, value, label }: { icon: React.ReactNode; value: number; label: string }) {
  return (
    <div className="rounded-xl p-3 shadow-sm" style={{ backgroundColor: "#F8F9FA" }}>
      <div className="grid place-items-center">{icon}</div>
      <p className="mt-1" style={{ fontSize: 22, fontWeight: 800, color: "#1A1A1A" }}>{value}</p>
      <p style={{ fontSize: 10, color: "#777", textTransform: "uppercase", letterSpacing: 0.5 }}>
        {label}
      </p>
    </div>
  );
}
