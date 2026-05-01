import { useState } from "react";
import type { ConceptWithMemory } from "@/lib/lingua";

type Props = {
  concept: ConceptWithMemory;
  options: string[];
  onAnswer: (correct: boolean) => void;
};

/**
 * Multiple choice with:
 *  - Tap-to-answer (no separate confirm)
 *  - Lock all options after first tap
 *  - Green = correct, Red = wrong-selected, Green = correct-when-wrong
 *  - 150ms press scale animation
 *  - Auto-advance handled by parent via onAnswer (parent advances after delay)
 */
export default function ChoiceExercise({ concept, options, onAnswer }: Props) {
  const [selected, setSelected] = useState<string | null>(null);

  const pick = (option: string) => {
    if (selected !== null) return;
    setSelected(option);
    onAnswer(option === concept.translation);
  };

  const styleFor = (option: string) => {
    if (selected === null) {
      return "border-2 border-border bg-card hover:bg-muted";
    }
    const isCorrect = option === concept.translation;
    const isPicked = option === selected;
    if (isCorrect) return "border-2 border-green-500 bg-green-100 text-green-900";
    if (isPicked) return "border-2 border-red-500 bg-red-100 text-red-900";
    return "border-2 border-border bg-card opacity-60";
  };

  return (
    <div className="grid gap-5">
      <h1 className="text-2xl font-black">What does {concept.surface_form} mean?</h1>
      <div className="grid gap-3">
        {options.map((o) => (
          <button
            key={o}
            disabled={selected !== null}
            onClick={() => pick(o)}
            className={`rounded-2xl px-4 py-4 text-lg font-bold transition-transform duration-150 active:scale-[0.97] ${styleFor(
              o
            )}`}
          >
            {o}
          </button>
        ))}
      </div>
    </div>
  );
}
