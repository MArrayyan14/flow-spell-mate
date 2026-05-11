import { useEffect } from "react";
import { X } from "lucide-react";

type Props = {
  open: boolean;
  prompt: string;
  correctAnswer: string;
  onDismiss: () => void;
};

/**
 * Slide-up bottom sheet shown for 2s after a wrong answer.
 */
export default function WrongAnswerSheet({ open, prompt, correctAnswer, onDismiss }: Props) {
  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(onDismiss, 2000);
    return () => window.clearTimeout(t);
  }, [open, onDismiss]);

  if (!open) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 animate-slide-up">
      <div className="mx-auto max-w-2xl rounded-t-3xl bg-card p-6 shadow-2xl ring-1 ring-border">
        <div className="flex items-start gap-4">
          <div className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-red-500 text-white">
            <X className="h-8 w-8" strokeWidth={3} />
          </div>
          <div className="grid gap-1">
            <p className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
              Correct answer
            </p>
            <p className="text-3xl font-black text-green-600">{correctAnswer}</p>
            <p className="text-sm font-semibold text-muted-foreground">
              {prompt} = {correctAnswer}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
