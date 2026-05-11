import { useEffect, useState } from "react";
import { Brain, Target, Sparkles, ArrowRight } from "lucide-react";

const STORAGE_KEY = "lf_onboarded_v1";

const SLIDES = [
  {
    icon: Brain,
    title: "Learn the words you'll actually use",
    body: "LinguaFlow tracks how well you remember every word and shows you the ones that matter most — first.",
    accent: "#58CC02",
    bg: "#F0FDF4",
  },
  {
    icon: Target,
    title: "Practice at the perfect moment",
    body: "A half-life memory model predicts when you're about to forget a word and surfaces it just in time.",
    accent: "#1CB0F6",
    bg: "#EFF8FF",
  },
  {
    icon: Sparkles,
    title: "Small daily wins, real progress",
    body: "Five minutes a day. Streaks, XP, and visible memory strength keep you coming back.",
    accent: "#9333EA",
    bg: "#FAF5FF",
  },
];

export default function Onboarding({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState(0);
  const slide = SLIDES[step];
  const Icon = slide.icon;
  const last = step === SLIDES.length - 1;

  const finish = () => {
    try { localStorage.setItem(STORAGE_KEY, "1"); } catch {}
    onDone();
  };

  return (
    <div className="fixed inset-0 z-[90] grid place-items-center bg-black/50 backdrop-blur-sm p-4">
      <div
        className="onb-fade w-full max-w-md overflow-hidden rounded-3xl bg-white"
        style={{ boxShadow: "0 30px 60px -20px rgba(0,0,0,0.35)" }}
      >
        <div
          className="grid place-items-center px-8 pt-10 pb-6"
          style={{ backgroundColor: slide.bg }}
        >
          <div
            className="grid h-20 w-20 place-items-center rounded-2xl"
            style={{ backgroundColor: "#fff", color: slide.accent, boxShadow: "0 8px 20px -8px rgba(0,0,0,0.15)" }}
          >
            <Icon size={40} strokeWidth={2.2} />
          </div>
        </div>

        <div className="px-7 pt-6 pb-7 text-center">
          <h2 style={{ fontSize: 22, fontWeight: 800, color: "#0F172A", lineHeight: 1.25 }}>
            {slide.title}
          </h2>
          <p className="mt-3" style={{ fontSize: 14, color: "#475569", lineHeight: 1.6 }}>
            {slide.body}
          </p>

          <div className="mt-6 flex items-center justify-center gap-1.5">
            {SLIDES.map((_, i) => (
              <span
                key={i}
                className="rounded-full transition-all"
                style={{
                  width: i === step ? 22 : 7,
                  height: 7,
                  backgroundColor: i === step ? slide.accent : "#E2E8F0",
                }}
              />
            ))}
          </div>

          <div className="mt-7 flex items-center gap-2">
            {!last && (
              <button
                onClick={finish}
                className="flex-1 rounded-xl py-3 text-sm font-bold text-[#64748B] transition hover:bg-[#F1F5F9]"
              >
                Skip
              </button>
            )}
            <button
              onClick={() => (last ? finish() : setStep(step + 1))}
              className="flex-[2] inline-flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-white transition active:scale-[0.98]"
              style={{ backgroundColor: "#58CC02", boxShadow: "0 6px 14px -6px rgba(88,204,2,0.6)" }}
            >
              {last ? "Start learning" : "Next"}
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function shouldShowOnboarding() {
  try { return localStorage.getItem(STORAGE_KEY) !== "1"; } catch { return false; }
}
