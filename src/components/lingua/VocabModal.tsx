import { Line, LineChart, ResponsiveContainer, XAxis, YAxis, Tooltip, ReferenceLine, ReferenceDot } from "recharts";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { forgettingCurvePoints } from "@/lib/hlr";
import { formatDays, speakSpanish, type ConceptWithMemory } from "@/lib/lingua";

export function VocabModal({ concept, open, onOpenChange }: { concept: ConceptWithMemory | null; open: boolean; onOpenChange: (v: boolean) => void }) {
  if (!concept) return null;
  const memory = concept.memory;
  const half = memory?.half_life_est ?? 1;
  const last = memory?.last_practiced ? new Date(memory.last_practiced) : null;
  const chart = forgettingCurvePoints(half, last);
  const accuracy = memory?.attempts ? Math.round((memory.correct / memory.attempts) * 100) : 0;
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-h-[90vh] overflow-y-auto rounded-2xl"><DialogHeader><DialogTitle className="text-2xl font-black">{concept.emoji} {concept.surface_form}</DialogTitle></DialogHeader><div className="grid gap-5"><div><p className="text-xl font-bold">{concept.translation}</p><p className="text-sm font-semibold text-muted-foreground">{concept.part_of_speech} · {concept.topic} · {concept.frequency}</p>{concept.mnemonic && <p className="mt-3 rounded-2xl bg-primary-soft p-3 text-sm italic">{concept.mnemonic}</p>}</div><Button variant="soft" onClick={() => speakSpanish(concept.surface_form)}>🔊 Hear it</Button><div className="grid grid-cols-3 gap-2 text-center"><Stat label="Attempts" value={memory?.attempts ?? 0} /><Stat label="Accuracy" value={`${accuracy}%`} /><Stat label="Status" value={concept.status} /></div><div className="grid grid-cols-2 gap-2 text-sm"><Stat label="Half-life" value={`${half.toFixed(1)} days`} /><Stat label="Next review" value={formatDays(concept.daysUntilReview)} /><Stat label="Adaptive" value={(memory?.adaptive_weight ?? 1).toFixed(1)} /><Stat label="Gender" value={concept.gender ?? "—"} /></div><div className="h-56 rounded-2xl bg-surface p-2"><ResponsiveContainer width="100%" height="100%"><LineChart data={chart}><XAxis dataKey="day" tick={{ fontSize: 12 }} label={{ value: "Days from now", position: "insideBottom", offset: -2 }} /><YAxis domain={[0,100]} tick={{ fontSize: 12 }} /><Tooltip /><ReferenceLine x={Math.round(concept.daysUntilReview)} stroke="hsl(var(--destructive))" strokeDasharray="5 5" /><ReferenceDot x={0} y={chart[0]?.recall ?? 100} r={5} fill="hsl(var(--primary))" stroke="none" /><Line type="monotone" dataKey="recall" stroke="hsl(var(--primary))" strokeWidth={3} dot={false} /></LineChart></ResponsiveContainer></div><Button onClick={() => onOpenChange(false)}>Practice this word →</Button></div></DialogContent></Dialog>;
}
function Stat({ label, value }: { label: string; value: string | number }) { return <div className="rounded-2xl bg-muted p-3"><p className="text-xs font-bold text-muted-foreground">{label}</p><p className="font-black capitalize">{value}</p></div>; }
