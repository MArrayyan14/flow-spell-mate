import { create } from "zustand";
import type { ConceptWithMemory } from "@/lib/lingua";

export type Exercise = { id: string; type: "introduce" | "choice" | "translation" | "flashcard" | "speaking"; concept: ConceptWithMemory; reinserts?: number };

type LessonState = {
  exercises: Exercise[];
  currentIndex: number;
  hearts: number;
  wrongQueue: Exercise[];
  sessionType: "lesson" | "review" | "flashcard";
  setLesson: (exercises: Exercise[], hearts: number, sessionType: LessonState["sessionType"]) => void;
  next: () => void;
  loseHeart: () => void;
  addWrong: (exercise: Exercise) => void;
  reinsertWrong: () => void;
  reset: () => void;
};

export const useLessonStore = create<LessonState>((set, get) => ({
  exercises: [], currentIndex: 0, hearts: 5, wrongQueue: [], sessionType: "lesson",
  setLesson: (exercises, hearts, sessionType) => set({ exercises, hearts, sessionType, currentIndex: 0, wrongQueue: [] }),
  next: () => set((s) => ({ currentIndex: s.currentIndex + 1 })),
  loseHeart: () => set((s) => ({ hearts: Math.max(0, s.hearts - 1) })),
  addWrong: (exercise) => set((s) => ({ wrongQueue: [...s.wrongQueue, exercise] })),
  reinsertWrong: () => {
    const s = get();
    const [item, ...rest] = s.wrongQueue;
    if (!item || (item.reinserts ?? 0) >= 2) return set({ wrongQueue: rest });
    const exercises = [...s.exercises];
    exercises.splice(s.currentIndex + 1, 0, { ...item, reinserts: (item.reinserts ?? 0) + 1 });
    set({ exercises, wrongQueue: rest });
  },
  reset: () => set({ exercises: [], currentIndex: 0, hearts: 5, wrongQueue: [], sessionType: "lesson" }),
}));
