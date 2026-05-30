import { useEffect, useRef } from "react";

type Props = {
  prompt: string;
  onSubmit: (value: string) => void;
  disabled?: boolean;
  label?: string;
  placeholder?: string;
};

export default function TranslationInput({ prompt, onSubmit, disabled, label, placeholder }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

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
      <h2 className="text-center" style={{ fontSize: 18, fontWeight: 600, color: "#1A1A1A" }}>
        {label || "Translate this to Spanish:"} <span style={{ fontWeight: 800 }}>{prompt}</span>
      </h2>
      <div className="flex items-stretch gap-2">
        <input
          ref={inputRef}
          autoFocus
          disabled={disabled}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
          }}
          placeholder={placeholder || "Type the Spanish word"}
          className="lif-input flex-1 text-base"
          style={{ height: 52 }}
        />
        <button
          onClick={submit}
          disabled={disabled}
          className="rounded-xl px-5 font-bold text-white transition active:scale-[0.97] disabled:opacity-60"
          style={{ height: 52, backgroundColor: "#58CC02" }}
        >
          Check
        </button>
      </div>
    </div>
  );
}
