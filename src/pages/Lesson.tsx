import { useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { X, Volume2, Heart, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { speakSpanish, updateMemory, type ConceptWithMemory } from "@/lib/lingua";
import { useAuthStore } from "@/stores/authStore";
import { useLessonStore, type Exercise } from "@/stores/lessonStore";
import { useLesson } from "@/hooks/useLessons";
import TranslationInput from "@/components/lingua/TranslationInput";
import SpeakingExercise from "@/components/lingua/SpeakingExercise";
import ChoiceExercise from "@/components/lingua/ChoiceExercise";
import WrongAnswerSheet from "@/components/lingua/WrongAnswerSheet";
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
  const [wrongSheet, setWrongSheet] = useState<{ open: boolean; prompt: string; answer: string }>({
    open: false,
    prompt: "",
    answer: "",
  });
  const [newWordsCount, setNewWordsCount] = useState(0);
  const [earnedXp, setEarnedXp] = useState(0);

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
      setWrongSheet({
        open: true,
        prompt: exercise.concept.surface_form,
        answer: exercise.concept.translation,
      });
    } else {
      const next = correctStreak + 1;
      setCorrectStreak(next);
      if (next % 4 === 0) store.reinsertWrong();
    }
    window.setTimeout(() => nextStep(), isCorrect ? 900 : ADVANCE_DELAY_MS + 600);
  };

  const nextStep = () => {
    setFlipped(false);
    setWrongSheet((s) => ({ ...s, open: false }));
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

  return (
    <main className="min-h-screen bg-background p-4">
      <div className="mx-auto max-w-2xl">
        <header className="mb-8 flex items-center gap-4">
          <button
            onClick={() => confirm("Exit lesson?") && navigate(`/unit/${id}`)}
            className="rounded-2xl p-2 hover:bg-muted"
          >
            <X />
          </button>
          <div className="h-4 flex-1 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${(store.currentIndex / store.exercises.length) * 100}%` }}
            />
          </div>
          <span className="font-black">⭐ {profile?.xp_total ?? 0} XP</span>
        </header>

        <section className="lif-card min-h-[460px] p-6 text-center animate-pop" key={exercise.id}>
          {exercise.type === "introduce" && <Intro concept={exercise.concept} onNext={nextStep} />}
          {exercise.type === "choice" && (
            <ChoiceExercise concept={exercise.concept} options={options} onAnswer={finishAnswer} />
          )}
          {exercise.type === "translation" && (
            <TranslationInput
              prompt={exercise.concept.translation}
              onSubmit={(value) =>
                finishAnswer(
                  // import isCloseEnough from lingua via a small inline check
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
            <SpeakingExercise target={exercise.concept.surface_form} onAnswer={finishAnswer} />
          )}
        </section>
      </div>

      <WrongAnswerSheet
        open={wrongSheet.open}
        prompt={wrongSheet.prompt}
        correctAnswer={wrongSheet.answer}
        onDismiss={() => setWrongSheet((s) => ({ ...s, open: false }))}
      />
    </main>
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

  const news = concepts.filter((c) => (c.memory?.attempts ?? 0) === 0).slice(0, 3);
  const reviews = concepts
    .filter((c) => (c.memory?.attempts ?? 0) > 0 && c.recall < 0.6)
    .sort(
      (a, b) =>
        ((b.memory?.adaptive_weight ?? 1) * (1 - b.recall)) -
        ((a.memory?.adaptive_weight ?? 1) * (1 - a.recall))
    )
    .slice(0, 8);

  const base = [...news, ...(reviews.length ? reviews : concepts)].slice(0, 10);

  const initial: Exercise[] = base.flatMap((c, i) =>
    (c.memory?.attempts ?? 0) === 0
      ? [
          { id: `i-${i}`, type: "introduce", concept: c },
          {
            id: `q-${i}`,
            type: i % 3 === 0 ? "speaking" : i % 2 ? "translation" : "choice",
            concept: c,
          },
        ]
      : [
          {
            id: `r-${i}`,
            type: i % 3 === 0 ? "speaking" : i % 2 ? "translation" : "choice",
            concept: c,
          },
        ]
  ).slice(0, 15) as Exercise[];

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
  return [
    c.translation,
    ...all.filter((x) => x.concept_id !== c.concept_id).slice(0, 3).map((x) => x.translation),
  ].sort(() => Math.random() - 0.5);
}

function Intro({ concept, onNext }: { concept: ConceptWithMemory; onNext: () => void }) {
  return (
    <div className="grid gap-5 place-items-center">
      <span className="rounded-full bg-primary-soft px-4 py-2 font-black text-primary">
        ✨ New Word!
      </span>
      <h1 className="text-5xl font-black">{concept.surface_form}</h1>
      <button
        onClick={() => speakSpanish(concept.surface_form)}
        className="text-6xl transition hover:scale-110"
      >
        {concept.emoji}
        <Volume2 className="mx-auto mt-2" />
      </button>
      <p className="text-2xl font-bold">{concept.translation}</p>
      {concept.mnemonic && <p className="italic text-muted-foreground">{concept.mnemonic}</p>}
      <Button onClick={onNext}>Got it! →</Button>
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
        className="min-h-72 rounded-2xl bg-primary-soft p-8 transition hover:scale-[1.01]"
      >
        <p className="text-6xl">{concept.emoji}</p>
        <h1 className="mt-4 text-5xl font-black text-primary">
          {flipped ? concept.translation : concept.surface_form}
        </h1>
        <p className="mt-4 font-semibold text-muted-foreground">
          {flipped ? concept.mnemonic : "Tap to flip"}
        </p>
      </button>
      {flipped && (
        <div className="grid grid-cols-2 gap-3">
          <Button variant="dangerSoft" onClick={() => onAnswer(false)}>
            😅 Missed it
          </Button>
          <Button onClick={() => onAnswer(true)}>✅ Got it</Button>
        </div>
      )}
    </div>
  );
}
