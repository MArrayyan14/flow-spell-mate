import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";

type Props = {
  prompt: string;
  onSubmit: (value: string) => void;
  disabled?: boolean;
};

/**
 * Isolated input — keeps its value in a ref + uncontrolled <input>
 * so typing never re-renders the parent Lesson component.
 */
export default function TranslationInput({ prompt, onSubmit, disabled }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset input whenever the prompt (i.e. exercise) changes.
  useEffect(() => {
    if (inputRef.current) inputRef.current.value = "";
    inputRef.current?.focus();
  }, [prompt]);

  const submit = () => {
    if (disabled) return;
    onSubmit(inputRef.current?.value ?? "");
  };

  return (
    <div className="grid gap-5">
      <h1 className="text-2xl font-black">Translate: {prompt}</h1>
      <input
        ref={inputRef}
        autoFocus
        disabled={disabled}
        onKeyDown={(e) => {
          if (e.key === "Enter") submit();
        }}
        className="lif-input text-center text-2xl font-bold"
      />
      <Button onClick={submit} disabled={disabled}>Submit</Button>
    </div>
  );
}
