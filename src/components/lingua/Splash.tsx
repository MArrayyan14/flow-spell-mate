import { BookOpen } from "lucide-react";

export default function Splash({ fading = false }: { fading?: boolean }) {
  return (
    <div
      className={`fixed inset-0 z-[100] grid place-items-center ${fading ? "splash-fade-out" : ""}`}
      style={{ backgroundColor: "#1a1a2e" }}
    >
      <div className="grid place-items-center gap-3 text-white">
        <div className="splash-icon">
          <BookOpen size={48} className="text-white" strokeWidth={2.25} />
        </div>
        <h1 style={{ fontSize: 32, fontWeight: 700, color: "#fff" }}>LinguaFlow</h1>
        <p style={{ fontSize: 14, color: "rgba(255,255,255,0.7)" }}>
          Learn Spanish with science
        </p>
      </div>
    </div>
  );
}
