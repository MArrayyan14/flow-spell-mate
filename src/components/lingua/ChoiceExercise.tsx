import { useState } from "react";
import type { ConceptWithMemory } from "@/lib/lingua";

type Props = {
  concept: ConceptWithMemory;
  options: string[];
  onAnswer: (correct: boolean) => void;
};

export default function ChoiceExercise({ concept, options, onAnswer }: Props) {
  const [selected, setSelected] = useState<string | null>(null);

  const pick = (option: string) => {
    if (selected !== null) return;
    setSelected(option);
    onAnswer(option === concept.translation);
  };

  const styleFor = (option: string): React.CSSProperties => {
    if (selected === null) {
      return { border: "1.5px solid #E5E5E5", background: "#fff", color: "#1A1A1A" };
    }
    const isCorrect = option === concept.translation;
    const isPicked = option === selected;
    if (isCorrect) return { border: "2px solid #58CC02", background: "#F0FFF4", color: "#166534" };
    if (isPicked) return { border: "2px solid #FF4B4B", background: "#FFF1F1", color: "#7F1D1D" };
    return { border: "1.5px solid #E5E5E5", background: "#fff", color: "#1A1A1A", opacity: 0.5 };
  };

  return (
    <div className="grid gap-5">
      <h2 className="text-center" style={{ fontSize: 18, fontWeight: 600, color: "#1A1A1A" }}>
        What does <span style={{ fontWeight: 800 }}>{concept.surface_form}</span> mean?
      </h2>
      <div className="grid gap-2.5">
        {options.map((o) => (
          <button
            key={o}
            disabled={selected !== null}
            onClick={() => pick(o)}
            className="w-full rounded-xl text-base font-semibold transition-transform duration-150 active:scale-[0.97]"
            style={{ height: 52, ...styleFor(o) }}
          >
            {o}
          </button>
        ))}
      </div>
    </div>
  );
}
