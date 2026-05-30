import { useEffect, useRef, useState } from "react";
import { Mic } from "lucide-react";
import { Button } from "@/components/ui/button";
import TranslationInput from "./TranslationInput";
import { isCloseEnough } from "@/lib/lingua";

type Props = {
  target: string;
  meaning: string;
  onAnswer: (correct: boolean) => void;
  /** Called instead of onAnswer when the user submits via the text fallback. */
  onAnswerTyped?: (correct: boolean) => void;
};

/**
 * Speech recognition with a single persistent instance.
 * - No live transcript flicker (interimResults = false)
 * - 5 second auto-stop with text fallback
 * - 300ms settle delay before submitting result
 */
export default function SpeakingExercise({ target, meaning, onAnswer, onAnswerTyped }: Props) {
  const recRef = useRef<any>(null);
  const timeoutRef = useRef<number | null>(null);
  const settledRef = useRef(false);
  const [recording, setRecording] = useState(false);
  const [showFallback, setShowFallback] = useState(false);
  const [typeInstead, setTypeInstead] = useState(false);

  const SR =
    typeof window !== "undefined" &&
    ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

  // Build the recognition instance once.
  useEffect(() => {
    if (!SR) return;
    const rec = new SR();
    rec.lang = "es-ES";
    rec.continuous = false;
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    recRef.current = rec;
    return () => {
      try {
        rec.abort();
      } catch {}
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    };
  }, [SR]);

  // Reset state whenever the target word changes.
  useEffect(() => {
    settledRef.current = false;
    setShowFallback(false);
    setRecording(false);
    setTypeInstead(false);
  }, [target]);

  const start = () => {
    const rec = recRef.current;
    if (!rec || recording) return;
    settledRef.current = false;

    rec.onresult = (e: any) => {
      const transcript = e.results?.[0]?.[0]?.transcript ?? "";
      settledRef.current = true;
      window.setTimeout(() => onAnswer(isCloseEnough(transcript, target)), 300);
    };
    rec.onerror = () => {
      setRecording(false);
      setShowFallback(true);
    };
    rec.onend = () => {
      setRecording(false);
      if (!settledRef.current) setShowFallback(true);
    };

    setRecording(true);
    try {
      rec.start();
    } catch {
      setRecording(false);
    }

    if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    timeoutRef.current = window.setTimeout(() => {
      try {
        rec.stop();
      } catch {}
    }, 5000);
  };

  if (!SR || typeInstead) {
    return (
      <div className="grid gap-4">
        {typeInstead && (
          <p className="rounded-2xl bg-muted p-3 text-center font-bold text-muted-foreground">
            Couldn't hear you — try typing instead
          </p>
        )}
        <TranslationInput
          prompt={target}
          label="Translate this to English:"
          placeholder="Type the English meaning"
          onSubmit={(v) => {
            const correct = isCloseEnough(v, meaning);
            if (onAnswerTyped) {
              onAnswerTyped(correct);
            } else {
              onAnswer(correct);
            }
          }}
        />
      </div>
    );
  }

  if (showFallback) {
    return (
      <div className="grid gap-5 place-items-center py-6 text-center">
        <div className="h-16 w-16 grid place-items-center rounded-full bg-amber-50 text-amber-500 mb-2">
          <Mic className="h-8 w-8 animate-bounce" />
        </div>
        <h2 className="text-xl font-extrabold text-slate-800">We couldn't hear you</h2>
        <p className="text-sm font-semibold text-slate-400 max-w-xs">
          Make sure your microphone is enabled and you're speaking clearly.
        </p>
        
        <div className="flex flex-col gap-3 w-full max-w-xs mt-4">
          <Button 
            className="w-full bg-[#58CC02] hover:bg-[#46A302] text-white font-extrabold rounded-xl py-3.5 transition"
            onClick={() => {
              setShowFallback(false);
              setRecording(false);
              setTimeout(() => {
                start();
              }, 50);
            }}
          >
            Try speaking again
          </Button>
          
          <Button 
            variant="outline" 
            className="w-full font-extrabold rounded-xl py-3.5 border-slate-200 text-slate-500 hover:bg-slate-50 transition"
            onClick={() => {
              setTypeInstead(true);
            }}
          >
            Type instead
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-5 place-items-center">
      <h1 className="text-5xl font-black">{target}</h1>
      <button
        onClick={start}
        disabled={recording}
        className={`grid h-24 w-24 place-items-center rounded-full bg-destructive text-destructive-foreground transition active:scale-95 ${
          recording ? "animate-pulseRed" : ""
        }`}
      >
        <Mic />
      </button>
      <div className="min-h-16 w-full rounded-2xl bg-muted p-4 text-center font-bold text-muted-foreground">
        {recording ? "Listening..." : "Tap the mic and say the word"}
      </div>
      <Button variant="outline" onClick={() => setShowFallback(true)}>
        Type instead
      </Button>
    </div>
  );
}
