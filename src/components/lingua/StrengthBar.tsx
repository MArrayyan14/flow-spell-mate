export function StrengthBar({ value, segments = false }: { value: number; segments?: boolean }) {
  if (segments) return <div className="flex gap-1">{[0.25,0.5,0.75,1].map((n) => <span key={n} className={`h-2 flex-1 rounded-full ${value >= 0.75 && n <= value ? "bg-primary" : value >= 0.4 && n <= value ? "bg-warning" : "bg-muted"}`} />)}</div>;
  return <div className="h-3 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${Math.max(2, Math.round(value * 100))}%` }} /></div>;
}
