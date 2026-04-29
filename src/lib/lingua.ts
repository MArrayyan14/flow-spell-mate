import { supabase } from "@/integrations/supabase/client";
import { computeAdaptiveWeight, computeHalfLife, computeRecallProb, getDaysUntilThreshold, getStatus } from "@/lib/hlr";

export type Unit = { id: number; topic: string; cefr_level: string; description: string; order_index: number; emoji: string | null };
export type Concept = { concept_id: string; surface_form: string; translation: string; topic: string; part_of_speech: string; difficulty_level: number; frequency: string; base_weight: number; skill_affinity?: string[] | null; unit_id: number | null; mnemonic?: string | null; gender?: string | null; emoji?: string | null };
export type Memory = { id?: string; user_id: string; concept_id: string; attempts: number; correct: number; incorrect: number; last_practiced: string | null; half_life_est: number; recall_prob: number; adaptive_weight: number };
export type Profile = { id: string; display_name: string | null; xp_total: number; streak_days: number; last_streak_date: string | null; hearts: number; gems: number; league: string; weekly_xp: number; last_practiced?: string | null; created_at: string };
export type ConceptWithMemory = Concept & { memory?: Memory; recall: number; status: ReturnType<typeof getStatus>; daysUntilReview: number };

export const fallbackConcepts: Concept[] = [
  {concept_id:"es:hola", surface_form:"hola", translation:"hello", unit_id:2, difficulty_level:1, base_weight:3.8, frequency:"high", topic:"Greetings", part_of_speech:"interjection", emoji:"👋"},
  {concept_id:"es:agua", surface_form:"agua", translation:"water", unit_id:4, difficulty_level:1, base_weight:3.8, frequency:"high", topic:"Food", part_of_speech:"noun", emoji:"💧"},
  {concept_id:"es:manzana", surface_form:"manzana", translation:"apple", unit_id:4, difficulty_level:1, base_weight:3.4, frequency:"high", topic:"Food", part_of_speech:"noun", emoji:"🍎", mnemonic:"Sounds like MAN-sana — imagine a man eating an apple"},
  {concept_id:"es:gracias", surface_form:"gracias", translation:"thank you", unit_id:2, difficulty_level:1, base_weight:3.8, frequency:"high", topic:"Greetings", part_of_speech:"interjection", emoji:"🙏"},
  {concept_id:"es:uno", surface_form:"uno", translation:"one", unit_id:3, difficulty_level:1, base_weight:3.8, frequency:"high", topic:"Numbers", part_of_speech:"numeral", emoji:"1️⃣"},
  {concept_id:"es:madre", surface_form:"madre", translation:"mother", unit_id:5, difficulty_level:1, base_weight:3.6, frequency:"high", topic:"Family", part_of_speech:"noun", emoji:"👩"},
  {concept_id:"es:hoy", surface_form:"hoy", translation:"today", unit_id:6, difficulty_level:1, base_weight:3.8, frequency:"high", topic:"Time", part_of_speech:"adverb", emoji:"📅"},
  {concept_id:"es:ayuda", surface_form:"ayuda", translation:"help", unit_id:10, difficulty_level:1, base_weight:3.8, frequency:"high", topic:"Emergency", part_of_speech:"noun", emoji:"🆘"},
];

export async function seedConceptsIfEmpty() {
  const { count } = await supabase.from("concepts").select("concept_id", { count: "exact", head: true });
  if ((count ?? 0) > 0) return;
  let concepts = fallbackConcepts;
  try {
    const res = await fetch("/spanish_concepts.json");
    if (res.ok) concepts = await res.json();
  } catch { concepts = fallbackConcepts; }
  await supabase.from("concepts").insert(concepts as never, { onConflict: "concept_id" });
}

export async function ensureProfile(userId: string, email?: string) {
  const { data } = await supabase.from("user_profiles").select("*").eq("id", userId).maybeSingle();
  if (data) return data as Profile;
  const display = email?.split("@")[0] ?? "Learner";
  const { data: inserted, error } = await supabase.from("user_profiles").insert({ id: userId, display_name: display }).select("*").single();
  if (error) throw error;
  return inserted as Profile;
}

export function enrichConcepts(concepts: Concept[], memories: Memory[] = []): ConceptWithMemory[] {
  const map = new Map(memories.map((m) => [m.concept_id, m]));
  return concepts.map((concept) => {
    const memory = map.get(concept.concept_id);
    const recall = memory ? computeRecallProb(memory.half_life_est, memory.last_practiced ? new Date(memory.last_practiced) : null) : 0;
    const attempts = memory?.attempts ?? 0;
    const half = memory?.half_life_est ?? computeHalfLife(0, 0, 0, concept.difficulty_level, concept.base_weight);
    return { ...concept, memory, recall, status: getStatus(attempts, recall), daysUntilReview: getDaysUntilThreshold(half, memory?.last_practiced ? new Date(memory.last_practiced) : null) };
  });
}

export function unitStrength(concepts: ConceptWithMemory[]) {
  if (!concepts.length) return 0;
  return concepts.reduce((sum, c) => sum + ((c.memory?.attempts ?? 0) === 0 ? 0 : c.recall), 0) / concepts.length;
}

export async function updateMemory(concept: Concept, isCorrect: boolean, currentMemory: Memory | undefined, userId: string) {
  const newAttempts = (currentMemory?.attempts ?? 0) + 1;
  const newCorrect = (currentMemory?.correct ?? 0) + (isCorrect ? 1 : 0);
  const newIncorrect = (currentMemory?.incorrect ?? 0) + (isCorrect ? 0 : 1);
  const now = new Date();
  const newHalfLife = computeHalfLife(newAttempts, newCorrect, newIncorrect, concept.difficulty_level, concept.base_weight);
  const newRecall = computeRecallProb(newHalfLife, now);
  const daysSince = currentMemory?.last_practiced ? (Date.now() - new Date(currentMemory.last_practiced).getTime()) / 86400000 : 0;
  const newAdaptiveWeight = computeAdaptiveWeight(concept.base_weight, newIncorrect, daysSince);
  const row = { user_id: userId, concept_id: concept.concept_id, attempts: newAttempts, correct: newCorrect, incorrect: newIncorrect, last_practiced: now.toISOString(), half_life_est: newHalfLife, recall_prob: newRecall, adaptive_weight: newAdaptiveWeight };
  const { data, error } = await supabase.from("user_memory").upsert(row, { onConflict: "user_id,concept_id" }).select("*").single();
  if (error) throw error;
  return data as Memory;
}

export function isCloseEnough(input: string, expected: string): boolean {
  input = input.trim().toLowerCase();
  expected = expected.trim().toLowerCase();
  if (input === expected) return true;
  if (Math.abs(input.length - expected.length) > 1) return false;
  let diff = 0;
  for (let i = 0; i < Math.max(input.length, expected.length); i++) {
    if ((input[i] || "") !== (expected[i] || "")) diff++;
    if (diff > 1) return false;
  }
  return true;
}

export function speakSpanish(text: string, onDone?: () => void) {
  if (!("speechSynthesis" in window)) return;
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = "es-ES";
  utter.onend = () => onDone?.();
  speechSynthesis.cancel();
  speechSynthesis.speak(utter);
}

export function formatDays(days: number) {
  if (days <= 0) return "Due now";
  if (days < 1) return "Due today";
  return `in ${Math.ceil(days)} days`;
}
