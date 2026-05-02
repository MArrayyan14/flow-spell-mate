export function StrengthBar({ value, segments = false }: { value: number; segments?: boolean }) {
  const pct = Math.max(0, Math.min(100, Math.round(value * 100)));
  if (segments) {
    return (
      <div className="flex gap-1">
        {[0.25, 0.5, 0.75, 1].map((n) => (
          <span
            key={n}
            className="h-1.5 flex-1 rounded-full"
            style={{
              backgroundColor:
                value >= n ? "#58CC02" : "#F0F0F0",
            }}
          />
        ))}
      </div>
    );
  }
  return (
    <div
      className="overflow-hidden rounded-full"
      style={{ height: 6, backgroundColor: "#F0F0F0" }}
    >
      <div
        className="bar-fill h-full rounded-full"
        style={{
          width: `${pct}%`,
          background: "linear-gradient(90deg, #58CC02, #4CAF50)",
        }}
      />
    </div>
  );
}
