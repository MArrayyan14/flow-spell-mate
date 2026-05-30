import { useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { X, Volume2, Heart, Zap, Check, Trophy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { speakSpanish, updateMemory, enrichConcepts, type ConceptWithMemory } from "@/lib/lingua";
import { useAuthStore } from "@/stores/authStore";
import { useLessons } from "@/hooks/useLessons";
import TranslationInput from "@/components/lingua/TranslationInput";
import SpeakingExercise from "@/components/lingua/SpeakingExercise";
import ChoiceExercise from "@/components/lingua/ChoiceExercise";

export type Exercise = {
  id: string;
  type: "choice" | "translation" | "speaking";
  concept: ConceptWithMemory;
  reinserts?: number;
};

type WordResult = {
  concept_id: string;
  surface_form: string;
  translation: string;
  topic: string;
  isCorrect: boolean;
};

export default function GrandQuiz() {
  const { user, profile, refreshProfile } = useAuthStore();
  const navigate = useNavigate();
  const qc = useQueryClient();
  
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [wrongQueue, setWrongQueue] = useState<Exercise[]>([]);
  const [hearts] = useState(5); // Fixed at 5 hearts (heart deduction is disabled)
  
  const [correctStreak, setCorrectStreak] = useState(0);
  const [complete, setComplete] = useState(false);
  const [feedbackState, setFeedbackState] = useState<"idle" | "correct" | "incorrect">("idle");
  const [earnedXp, setEarnedXp] = useState(0);
  const [loading, setLoading] = useState(true);
  // True when a speaking exercise was answered via the text-typing fallback.
  // The user typed the English meaning, so the correct answer shown must also be English.
  const [speakingUsedTyping, setSpeakingUsedTyping] = useState(false);
  
  // Track correctness of each unique word on the user's first attempt
  const [results, setResults] = useState<WordResult[]>([]);

  // Fetch all concepts and memories
  const query = useLessons(user?.id);

  // Initialize and select quiz questions
  useEffect(() => {
    if (query.data && profile && exercises.length === 0 && !complete) {
      const enriched = enrichConcepts(query.data.concepts, query.data.memories);
      // Only select concepts the user has already learned
      const learned = enriched.filter((c) => (c.memory?.attempts ?? 0) > 0);
      
      if (learned.length === 0) {
        setLoading(false);
        return;
      }

      // Adaptive sizing: Target 15 questions (1.5x of normal 10-concept lesson)
      const targetSize = Math.min(15, learned.length);

      // Weighted random selection based on half-life (give more weight to lower half-life words)
      const pool = learned.map((c) => {
        const halfLife = c.memory?.half_life_est ?? 1.0;
        
        // Priority for low half-life (decaying words)
        let w = 10 / (halfLife + 1);
        
        // Boost priority depending on Spaced Repetition status
        if (c.status === "forgotten" || c.status === "weak") {
          w *= 1.5; // Weak/Forgotten status gets an extra boost
        } else if (c.status === "fading") {
          w *= 1.2; // Moderate status gets a moderate boost
        }
        
        return { concept: c, weight: w };
      });

      // Sample without replacement
      const selected: typeof learned = [];
      const tempPool = [...pool];
      for (let i = 0; i < targetSize; i++) {
        if (tempPool.length === 0) break;
        
        const totalW = tempPool.reduce((sum, item) => sum + item.weight, 0);
        let r = Math.random() * totalW;
        let chosenIdx = 0;
        
        for (let j = 0; j < tempPool.length; j++) {
          r -= tempPool[j].weight;
          if (r <= 0) {
            chosenIdx = j;
            break;
          }
        }
        
        selected.push(tempPool[chosenIdx].concept);
        tempPool.splice(chosenIdx, 1);
      }

      // Map to exercises
      const quizExercises: Exercise[] = selected.map((c, i) => {
        const randomSuffix = Math.random().toString(36).substring(2, 6);
        return {
          id: `gq-${i}-${randomSuffix}`,
          type: getRandomExerciseType(),
          concept: c,
        };
      });

      setExercises(quizExercises);
      setCurrentIndex(0);
      setWrongQueue([]);
      setLoading(false);
    }
  }, [query.data, profile, complete, exercises.length]);

  const exercise = exercises[currentIndex];
  
  const options = useMemo(
    () => (exercise ? makeOptions(exercise.concept, query.data?.concepts ? enrichConcepts(query.data.concepts, query.data.memories) : []) : []),
    [exercise, query.data?.concepts, query.data?.memories]
  );

  if (!user) return <Navigate to="/login" replace />;

  if (query.isLoading || loading || (!exercise && !complete)) {
    return (
      <main className="lif-page grid place-items-center">
        <div className="lif-skeleton h-48 w-full max-w-xl" />
      </main>
    );
  }

  // If user opened page but had 0 learned words
  if (exercises.length === 0 && !complete) {
    return (
      <main className="lif-page page-enter">
        <div className="lif-shell flex flex-col items-center justify-center py-16 text-center">
          <Zap size={64} className="text-yellow-500 animate-bounce mb-4" />
          <h1 className="text-2xl font-black text-slate-800">Grand Quiz Locked</h1>
          <p className="text-slate-500 mt-2 max-w-sm">
            You must learn at least 1 word from the study units before taking the Grand Quiz.
          </p>
          <button 
            onClick={() => navigate("/home")} 
            className="mt-6 bg-[#58CC02] text-white font-extrabold px-6 py-3 rounded-xl transition active:scale-[0.98]"
          >
            Go to Home
          </button>
        </div>
      </main>
    );
  }

  const finishAnswer = async (isCorrect: boolean) => {
    // Record word diagnostic performance on the user's initial (first) attempt
    setResults((prev) => {
      if (prev.some((r) => r.concept_id === exercise.concept.concept_id)) {
        return prev;
      }
      return [
        ...prev,
        {
          concept_id: exercise.concept.concept_id,
          surface_form: exercise.concept.surface_form,
          translation: exercise.concept.translation,
          topic: exercise.concept.topic,
          isCorrect: isCorrect,
        },
      ];
    });

    await updateMemory(exercise.concept, isCorrect, exercise.concept.memory, user.id);
    if (!isCorrect) {
      setWrongQueue(prev => [...prev, exercise]);
      setCorrectStreak(0);
    } else {
      const nextStreak = correctStreak + 1;
      setCorrectStreak(nextStreak);
      
      // Reinsert a wrong question if streak hits a multiple of 4
      if (nextStreak % 4 === 0 && wrongQueue.length > 0) {
        const [item, ...rest] = wrongQueue;
        if ((item.reinserts ?? 0) < 2) {
          const updated = [...exercises];
          updated.splice(currentIndex + 1, 0, { ...item, reinserts: (item.reinserts ?? 0) + 1 });
          setExercises(updated);
          setWrongQueue(rest);
        }
      }
    }
    setFeedbackState(isCorrect ? "correct" : "incorrect");
  };

  const nextStep = () => {
    setFeedbackState("idle");
    setSpeakingUsedTyping(false);
    if (currentIndex + 1 >= exercises.length) {
      completeSession();
    } else {
      setCurrentIndex(prev => prev + 1);
    }
  };

  const completeSession = async () => {
    const correctCount = exercises.length - wrongQueue.length;
    // Premium XP: 25 base XP + 2 XP per correct answer
    const xp = 25 + correctCount * 2;
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
      unit_id: null, // Grand quiz spans all units
      session_type: "grand_quiz",
      completed: true,
      xp_earned: xp,
    });
    
    await refreshProfile();
    setComplete(true);
    qc.invalidateQueries();
  };

  if (complete) {
    const totalQuestions = results.length;
    const correctCount = results.filter(r => r.isCorrect).length;
    const accuracy = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 100;

    return (
      <main className="relative min-h-screen bg-slate-50 py-10 px-4 md:px-6 page-enter flex flex-col items-center">
        {/* Confetti celebration */}
        {Array.from({ length: 40 }).map((_, i) => {
          const left = Math.random() * 100;
          const delay = Math.random() * 0.4;
          const duration = 1.5 + Math.random();
          const color = ["#58CC02", "#6366F1", "#FF4B4B", "#FFD700", "#9333EA"][i % 5];
          const rot = Math.random() * 360;
          return (
            <span
              key={i}
              aria-hidden
              className="confetti-piece pointer-events-none absolute top-0 z-50"
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

        <section className="relative z-10 w-full max-w-xl bg-white rounded-3xl p-6 md:p-8 lif-soft-shadow flex flex-col gap-6 text-center">
          <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-indigo-50 text-indigo-600 animate-bounce">
            <Trophy size={42} className="text-yellow-500 fill-yellow-400" />
          </div>
          
          <div>
            <h1 className="text-3xl font-extrabold text-slate-800">
              Grand Quiz Complete!
            </h1>
            <p className="text-slate-500 mt-1 font-semibold">
              Excellent diagnostic review of your vocabulary library.
            </p>
          </div>

          {/* Stat counters */}
          <div className="grid grid-cols-3 gap-3 my-2">
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">XP Earned</p>
              <p className="text-2xl font-black text-indigo-600 mt-1">+{earnedXp}</p>
            </div>
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Accuracy</p>
              <p className="text-2xl font-black text-green-600 mt-1">{accuracy}%</p>
            </div>
            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Score</p>
              <p className="text-2xl font-black text-amber-600 mt-1">{correctCount} / {totalQuestions}</p>
            </div>
          </div>

          {/* Word list overview */}
          <div className="text-left">
            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">
              Review Breakdown
            </h2>
            
            <div className="max-h-72 overflow-y-auto pr-1 grid gap-2.5 scrollbar-thin">
              {results.map((r, i) => (
                <div 
                  key={r.concept_id + i}
                  className="flex items-center justify-between p-3.5 bg-white border border-slate-100 rounded-2xl shadow-sm hover:border-slate-200 transition-colors"
                >
                  <div className="min-w-0 flex-1 pr-2">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-slate-800 text-base">
                        {r.surface_form}
                      </span>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 font-bold text-[10px] text-slate-500 uppercase tracking-wider shrink-0">
                        {r.topic}
                      </span>
                    </div>
                    <p className="text-slate-500 text-xs font-medium mt-0.5 truncate">
                      {r.translation}
                    </p>
                  </div>
                  
                  <div className="shrink-0">
                    {r.isCorrect ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#E8F5E9] px-2.5 py-1 text-xs font-black text-[#2E7D32]">
                        <Check size={12} strokeWidth={3} /> Correct
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#FFEBEE] px-2.5 py-1 text-xs font-black text-[#C62828]">
                        <X size={12} strokeWidth={3} /> Missed
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={() => navigate("/home")}
            className="w-full rounded-2xl text-white font-extrabold text-lg transition active:scale-[0.98] py-4"
            style={{
              backgroundColor: "#58CC02",
              boxShadow: "0 4px 12px rgba(88,204,2,0.3)",
            }}
          >
            Continue
          </button>
        </section>
      </main>
    );
  }

  const progressPct = (currentIndex / Math.max(1, exercises.length)) * 100;

  return (
    <main className="min-h-screen bg-background page-enter">
      <div className="mx-auto w-full px-4 pt-4 pb-10" style={{ maxWidth: 480 }}>
        <header className="mb-6 flex items-center gap-3">
          <button
            onClick={() => confirm("Exit Grand Quiz?") && navigate(`/home`)}
            className="grid h-9 w-9 place-items-center rounded-full text-[#999] transition hover:bg-muted"
            aria-label="Exit Grand Quiz"
          >
            <X size={20} />
          </button>
          
          <div
            className="h-2.5 flex-1 overflow-hidden rounded-full relative"
            style={{ backgroundColor: "#E5E5E5" }}
          >
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${progressPct}%`,
                background: "linear-gradient(90deg, #6366F1, #58CC02)",
              }}
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

        <div className="mb-4 text-center">
          <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-black text-indigo-600 uppercase tracking-widest">
            🏆 Grand Quiz · Question {currentIndex + 1} of {exercises.length}
          </span>
        </div>

        <section
          className="lif-card exercise-enter min-h-[460px] p-6 lif-soft-shadow"
          key={exercise.id}
        >
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
