import { useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { X, Volume2, Heart, Zap, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { speakSpanish, updateMemory, type ConceptWithMemory } from "@/lib/lingua";
import { useAuthStore } from "@/stores/authStore";
import { useLessonStore, type Exercise } from "@/stores/lessonStore";
import { useLesson } from "@/hooks/useLessons";
import TranslationInput from "@/components/lingua/TranslationInput";
import SpeakingExercise from "@/components/lingua/SpeakingExercise";
import ChoiceExercise from "@/components/lingua/ChoiceExercise";

import CompletionScreen from "@/components/lingua/CompletionScreen";

const ADVANCE_DELAY_MS = 1500;

export default function Lesson() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const mode = params.get("mode") === "flashcard" ? "flashcard" : "lesson";
  const { user, profile, refreshProfile } = useAuthStore();
  const store = useLessonStore();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [flipped, setFlipped] = useState(false);
  const [correctStreak, setCorrectStreak] = useState(0);
  const [complete, setComplete] = useState(false);
  const [feedbackState, setFeedbackState] = useState<"idle" | "correct" | "incorrect">("idle");
  const [newWordsCount, setNewWordsCount] = useState(0);
  const [earnedXp, setEarnedXp] = useState(0);
  // True when a speaking exercise was answered via the text-typing fallback.
  // In that case the user answered in English, so the correct answer shown
  // in FeedbackFooter must also be the English translation, not the Spanish word.
  const [speakingUsedTyping, setSpeakingUsedTyping] = useState(false);

  const query = useLesson(id, user?.id);

  useEffect(() => {
    store.reset();
    setComplete(false);
    setCorrectStreak(0);
    setEarnedXp(0);
    setNewWordsCount(0);
  }, [id, mode]);

  useEffect(() => {
    if (query.data?.concepts && profile && store.exercises.length === 0 && !complete) {
      const exercises = makeExercises(query.data.concepts, mode);
      const introCount = exercises.filter((e) => e.type === "introduce").length;
      setNewWordsCount(introCount);
      store.setLesson(exercises, 99, mode);
    }
  }, [query.data?.concepts, mode, complete]);

  const exercise = store.exercises[store.currentIndex];
  const options = useMemo(
    () => (exercise ? makeOptions(exercise.concept, query.data?.concepts ?? []) : []),
    [exercise, query.data?.concepts]
  );

  if (!user) return <Navigate to="/login" />;
  if (query.isLoading || (!exercise && !complete))
    return (
      <main className="lif-page grid place-items-center">
        <div className="lif-skeleton h-48 w-full max-w-xl" />
      </main>
    );

  const finishAnswer = async (isCorrect: boolean) => {
    await updateMemory(exercise.concept, isCorrect, exercise.concept.memory, user.id);
    if (!isCorrect) {
      store.addWrong(exercise);
      setCorrectStreak(0);
    } else {
      const next = correctStreak + 1;
      setCorrectStreak(next);
      if (next % 4 === 0) store.reinsertWrong();
    }
    setFeedbackState(isCorrect ? "correct" : "incorrect");
  };

  const nextStep = () => {
    setFlipped(false);
    setFeedbackState("idle");
    setSpeakingUsedTyping(false);
    if (store.currentIndex + 1 >= store.exercises.length) completeSession();
    else store.next();
  };

  const completeSession = async () => {
    const correctCount = store.exercises.length - store.wrongQueue.length;
    const xp = mode === "flashcard" ? 5 + correctCount : 10 + correctCount * 2;
    setEarnedXp(xp);
    const today = new Date().toISOString().slice(0, 10);
    const last = profile?.last_streak_date;
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const streak =
      !last || last < yesterday
        ? 1
        : last < today
        ? (profile?.streak_days ?? 0) + 1
        : profile?.streak_days ?? 0;
    await supabase
      .from("user_profiles")
      .update({
        xp_total: (profile?.xp_total ?? 0) + xp,
        weekly_xp: (profile?.weekly_xp ?? 0) + xp,
        streak_days: streak,
        last_streak_date: today,
        last_practiced: new Date().toISOString(),
      })
      .eq("id", user.id);
    await supabase.from("sessions").insert({
      user_id: user.id,
      unit_id: Number(id),
      session_type: mode,
      completed: true,
      xp_earned: xp,
    });
    await refreshProfile();
    setComplete(true);
    store.reset();
    qc.invalidateQueries();
  };

  if (complete)
    return (
      <CompletionScreen
        xp={earnedXp}
        streak={profile?.streak_days ?? 0}
        newWords={newWordsCount}
        onContinue={() => navigate("/home")}
      />
    );

  const progressPct = (store.currentIndex / Math.max(1, store.exercises.length)) * 100;
  const hearts = profile?.hearts ?? 5;

  return (
    <main className="min-h-screen bg-background page-enter">
      <div className="mx-auto w-full px-4 pt-4 pb-10" style={{ maxWidth: 480 }}>
        <header className="mb-6 flex items-center gap-3">
          <button
            onClick={() => confirm("Exit lesson?") && navigate(`/home`)}
            className="grid h-9 w-9 place-items-center rounded-full text-[#999] transition hover:bg-muted"
            aria-label="Exit lesson"
          >
            <X size={20} />
          </button>
          <div
            className="h-2 flex-1 overflow-hidden rounded-full"
            style={{ backgroundColor: "#E5E5E5" }}
          >
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{ width: `${progressPct}%`, backgroundColor: "#58CC02" }}
            />
          </div>
          <div className="flex items-center gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <Heart
                key={i}
                size={16}
                style={{
                  color: i < hearts ? "#FF4B4B" : "#E5E5E5",
                  fill: i < hearts ? "#FF4B4B" : "transparent",
                }}
              />
            ))}
          </div>
        </header>

        <section
          className="lif-card exercise-enter min-h-[460px] p-6 lif-soft-shadow"
          key={exercise.id}
        >
          {exercise.type === "introduce" && <Intro concept={exercise.concept} onNext={nextStep} />}
          {exercise.type === "choice" && (
            <ChoiceExercise concept={exercise.concept} options={options} onAnswer={finishAnswer} />
          )}
          {exercise.type === "translation" && (
            <TranslationInput
              prompt={exercise.concept.translation}
              disabled={feedbackState !== "idle"}
              onSubmit={(value) =>
                finishAnswer(
                  normalize(value) === normalize(exercise.concept.surface_form) ||
                    levenshteinClose(value, exercise.concept.surface_form)
                )
              }
            />
          )}
          {exercise.type === "flashcard" && (
            <Flashcard
              concept={exercise.concept}
              flipped={flipped}
              setFlipped={setFlipped}
              onAnswer={finishAnswer}
            />
          )}
          {exercise.type === "speaking" && (
            <SpeakingExercise
              target={exercise.concept.surface_form}
              meaning={exercise.concept.translation}
              onAnswer={finishAnswer}
              onAnswerTyped={(correct) => {
                setSpeakingUsedTyping(true);
                finishAnswer(correct);
              }}
            />
          )}
        </section>

        {correctStreak >= 3 && (
          <div className="mt-3 flex justify-center">
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold"
              style={{ backgroundColor: "#FEF3C7", color: "#92400E" }}
            >
              <Zap size={12} /> {correctStreak} in a row — nice streak
            </span>
          </div>
        )}

        <div className="mt-4 flex items-center justify-center gap-1.5 text-xs font-semibold text-muted-foreground">
          <Zap size={12} style={{ color: "#FFD700" }} />
          {profile?.xp_total ?? 0} XP
        </div>
      </div>

      <FeedbackFooter
        state={feedbackState}
        correctAnswer={
          speakingUsedTyping
            ? exercise?.concept.translation   // user typed English → show English
            : exercise?.concept.surface_form  // all other cases → show Spanish
        }
        onContinue={nextStep}
      />
    </main>
  );
}

function FeedbackFooter({
  state,
  correctAnswer,
  onContinue,
}: {
  state: "idle" | "correct" | "incorrect";
  correctAnswer?: string;
  onContinue: () => void;
}) {
  if (state === "idle") return null;
  const isCorrect = state === "correct";
  const bg = isCorrect ? "#d7ffb8" : "#ffdfe0";
  const color = isCorrect ? "#58a700" : "#ea2b2b";
  const btnBg = isCorrect ? "#58CC02" : "#FF4B4B";

  return (
    <div
      className="fixed bottom-0 left-0 w-full animate-in slide-in-from-bottom-2 p-4 md:p-6"
      style={{ backgroundColor: bg, color: color, zIndex: 50, borderTop: `2px solid ${isCorrect ? '#bbf786' : '#fca5a5'}` }}
    >
      <div className="mx-auto flex w-full max-w-[480px] flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div
            className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-white"
            style={{ color: color }}
          >
            {isCorrect ? <Check size={24} strokeWidth={3} /> : <X size={24} strokeWidth={3} />}
          </div>
          <div>
            <h2 className="text-xl font-bold md:text-2xl">
              {isCorrect ? "Awesome!" : "Correct solution:"}
            </h2>
            {!isCorrect && correctAnswer && (
              <p className="text-sm font-semibold text-[#1a1a1a] md:text-base">{correctAnswer}</p>
            )}
          </div>
        </div>
        <button
          onClick={onContinue}
          autoFocus
          className="w-full shrink-0 rounded-xl p-3 text-base font-bold text-white shadow-sm transition active:scale-95 sm:w-36 md:p-4 md:text-lg"
          style={{ backgroundColor: btnBg }}
        >
          Continue
        </button>
      </div>
    </div>
  );
}

/* -------------- helpers -------------- */

function normalize(s: string) {
  return (s ?? "").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}
function levenshteinClose(a: string, b: string) {
  const x = normalize(a);
  const y = normalize(b);
  if (Math.abs(x.length - y.length) > 2) return false;
  const dp: number[] = Array(y.length + 1).fill(0).map((_, i) => i);
  for (let i = 1; i <= x.length; i++) {
    let prev = i - 1;
    dp[0] = i;
    for (let j = 1; j <= y.length; j++) {
      const tmp = dp[j];
      dp[j] = x[i - 1] === y[j - 1] ? prev : Math.min(prev, dp[j], dp[j - 1]) + 1;
      prev = tmp;
    }
  }
  return dp[y.length] <= 1;
}

function getRandomExerciseType(): "choice" | "translation" | "speaking" {
  const types: ("choice" | "translation" | "speaking")[] = ["choice", "translation", "speaking"];
  return types[Math.floor(Math.random() * types.length)];
}

/**
 * Build exercise sequence and ensure introduce → quiz of same concept
 * is separated by at least 2 other exercises (target gap of 3 indices).
 * If not enough room, push the quiz to the end of the session.
 */
function makeExercises(
  concepts: ConceptWithMemory[],
  mode: "lesson" | "flashcard"
): Exercise[] {
  if (mode === "flashcard")
    return concepts.slice(0, 12).map((c, i) => ({
      id: `f-${i}`,
      type: "flashcard",
      concept: c,
    }));

  // 1. Shuffle and pick up to 3 random new concepts (attempts === 0)
  const potentialNews = concepts.filter((c) => (c.memory?.attempts ?? 0) === 0);
  const news = [...potentialNews].sort(() => Math.random() - 0.5).slice(0, 3);

  // 2. Identify weak review words
  const reviews = concepts
    .filter((c) => (c.memory?.attempts ?? 0) > 0 && c.recall < 0.6)
    .sort(
      (a, b) =>
        ((b.memory?.adaptive_weight ?? 1) * (1 - b.recall)) -
        ((a.memory?.adaptive_weight ?? 1) * (1 - a.recall))
    );

  // 3. Backfill with random other concepts if reviews are fewer than 8
  let finalReviews = [...reviews];
  if (finalReviews.length < 8) {
    const chosenIds = new Set([...news, ...finalReviews].map((c) => c.concept_id));
    const paddingPool = concepts.filter((c) => !chosenIds.has(c.concept_id));
    const randomPadding = [...paddingPool]
      .sort(() => Math.random() - 0.5)
      .slice(0, 8 - finalReviews.length);
    finalReviews = [...finalReviews, ...randomPadding];
  }

  // Combine into base pool of 10 concepts for the study session
  const base = [...news, ...finalReviews].slice(0, 10);

  // 4. Map to dynamic exercises with randomized question types
  const initial: Exercise[] = base.flatMap((c, i) => {
    const randomSuffix = Math.random().toString(36).substring(2, 6);
    return (c.memory?.attempts ?? 0) === 0
      ? [
          { id: `i-${i}-${randomSuffix}`, type: "introduce", concept: c },
          {
            id: `q-${i}-${randomSuffix}`,
            type: getRandomExerciseType(),
            concept: c,
          },
        ]
      : [
          {
            id: `r-${i}-${randomSuffix}`,
            type: getRandomExerciseType(),
            concept: c,
          },
        ];
  }).slice(0, 15) as Exercise[];

  return spaceIntroducedQuizzes(initial, 3);
}

/**
 * Ensure each introduce card is followed by `gap` other exercises
 * before its corresponding quiz. If the session is too short, the
 * quiz is moved to the end instead.
 */
function spaceIntroducedQuizzes(list: Exercise[], gap: number): Exercise[] {
  const result = [...list];
  let i = 0;
  while (i < result.length) {
    const ex = result[i];
    if (ex.type === "introduce") {
      const conceptId = ex.concept.concept_id;
      const quizIdx = result.findIndex(
        (e, j) =>
          j > i && e.type !== "introduce" && e.concept.concept_id === conceptId
      );
      if (quizIdx !== -1) {
        const desired = i + gap;
        const distance = quizIdx - i;
        if (distance < gap) {
          const [quiz] = result.splice(quizIdx, 1);
          if (desired < result.length) {
            result.splice(desired, 0, quiz);
          } else {
            // Not enough room — push to end of session
            result.push(quiz);
          }
        }
      }
    }
    i++;
  }
  return result;
}

function makeOptions(c: ConceptWithMemory, all: ConceptWithMemory[]) {
  const distractors = all.filter((x) => x.concept_id !== c.concept_id);
  // Shuffle all distractors and take 3 random ones
  const randomDistractors = [...distractors]
    .sort(() => Math.random() - 0.5)
    .slice(0, 3);

  return [
    c.translation,
    ...randomDistractors.map((x) => x.translation),
  ].sort(() => Math.random() - 0.5);
}

function Intro({ concept, onNext }: { concept: ConceptWithMemory; onNext: () => void }) {
  return (
    <div className="grid place-items-center gap-5 py-2">
      <span
        className="rounded-full px-3 py-1 text-white"
        style={{
          fontSize: 11,
          fontWeight: 800,
          letterSpacing: 0.6,
          textTransform: "uppercase",
          backgroundColor: "#58CC02",
        }}
      >
        New Word
      </span>
      <h1
        className="text-center"
        style={{ fontSize: 48, fontWeight: 800, color: "#1A1A1A", lineHeight: 1.1 }}
      >
        {concept.surface_form}
      </h1>
      <div className="my-1 h-px w-24" style={{ backgroundColor: "#E5E5E5" }} />
      <p className="text-center" style={{ fontSize: 24, fontWeight: 400, color: "#555" }}>
        {concept.translation}
      </p>
      {concept.mnemonic && (
        <p className="text-center italic" style={{ fontSize: 14, color: "#888" }}>
          {concept.mnemonic}
        </p>
      )}
      <button
        onClick={() => speakSpanish(concept.surface_form)}
        aria-label="Play pronunciation"
        className="grid h-11 w-11 place-items-center rounded-full text-white transition active:scale-95"
        style={{ backgroundColor: "#58CC02" }}
      >
        <Volume2 size={20} />
      </button>
      <button
        onClick={onNext}
        className="mt-3 w-full rounded-xl text-white font-bold transition active:scale-[0.98]"
        style={{ height: 48, backgroundColor: "#58CC02" }}
      >
        Got it
      </button>
    </div>
  );
}

function Flashcard({
  concept,
  flipped,
  setFlipped,
  onAnswer,
}: {
  concept: ConceptWithMemory;
  flipped: boolean;
  setFlipped: (v: boolean) => void;
  onAnswer: (v: boolean) => void;
}) {
  return (
    <div className="grid gap-5">
      <button
        onClick={() => setFlipped(!flipped)}
        className="min-h-72 rounded-2xl p-8 transition hover:scale-[1.01]"
        style={{ backgroundColor: "#F0FFF4" }}
      >
        <h1 className="mt-2" style={{ fontSize: 44, fontWeight: 800, color: "#166534" }}>
          {flipped ? concept.translation : concept.surface_form}
        </h1>
        <p className="mt-4 font-semibold text-muted-foreground">
          {flipped ? concept.mnemonic : "Tap to flip"}
        </p>
      </button>
      {flipped && (
        <div className="grid grid-cols-2 gap-3">
          <Button variant="outline" onClick={() => onAnswer(false)}>Missed it</Button>
          <Button onClick={() => onAnswer(true)}>Got it</Button>
        </div>
      )}
    </div>
  );
}
