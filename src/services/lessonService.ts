import { supabase } from "@/integrations/supabase/client";
import { Concept, Memory, Unit } from "@/lib/lingua";

/**
 * Fetch units from Supabase with fallback to static JSON
 */
export async function fetchUnits(): Promise<Unit[]> {
  try {
    const { data, error } = await supabase
      .from("units")
      .select("*")
      .order("order_index");
    
    if (error) throw error;
    if (!data || data.length === 0) {
      return loadUnitsFromJSON();
    }
    
    return data as Unit[];
  } catch (err) {
    console.warn("[Lesson Service] Failed to fetch units from Supabase, using JSON fallback:", err);
    return loadUnitsFromJSON();
  }
}

/**
 * Fetch concepts for a specific unit
 */
export async function fetchConceptsByUnit(unitId: number): Promise<Concept[]> {
  try {
    const { data, error } = await supabase
      .from("concepts")
      .select("*")
      .eq("unit_id", unitId);
    
    if (error) throw error;
    if (!data || data.length === 0) {
      return (await loadConceptsFromJSON()).filter(c => c.unit_id === unitId);
    }
    
    return data as Concept[];
  } catch (err) {
    console.warn("[Lesson Service] Failed to fetch concepts from Supabase, using JSON fallback:", err);
    return (await loadConceptsFromJSON()).filter(c => c.unit_id === unitId);
  }
}

/**
 * Fetch all concepts from Supabase with fallback to JSON
 */
export async function fetchAllConcepts(): Promise<Concept[]> {
  try {
    const { data, error } = await supabase
      .from("concepts")
      .select("*");
    
    if (error) throw error;
    if (!data || data.length === 0) {
      return loadConceptsFromJSON();
    }
    
    return data as Concept[];
  } catch (err) {
    console.warn("[Lesson Service] Failed to fetch concepts from Supabase, using JSON fallback:", err);
    return loadConceptsFromJSON();
  }
}

/**
 * Fetch user's memory for concepts from Supabase
 */
export async function fetchUserMemory(userId: string): Promise<Memory[]> {
  try {
    const { data, error } = await supabase
      .from("user_memory")
      .select("*")
      .eq("user_id", userId);
    
    if (error) throw error;
    return data as Memory[] || [];
  } catch (err) {
    console.warn("[Lesson Service] Failed to fetch user memory from Supabase:", err);
    return [];
  }
}

/**
 * Load units from static JSON file
 */
async function loadUnitsFromJSON(): Promise<Unit[]> {
  try {
    const response = await fetch("/spanish_concepts.json");
    if (!response.ok) throw new Error("Failed to load JSON");
    const data = await response.json();
    
    if (data.metadata?.units) {
      return data.metadata.units.map((u: any) => ({
        id: u.unit_id,
        topic: u.topic,
        cefr_level: u.cefr_level,
        description: u.description,
        order_index: u.unit_id,
        emoji: null,
      }));
    }
    return [];
  } catch (err) {
    console.error("[Lesson Service] Failed to load units from JSON:", err);
    return [];
  }
}

/**
 * Load concepts from static JSON file
 */
async function loadConceptsFromJSON(): Promise<Concept[]> {
  try {
    const response = await fetch("/spanish_concepts.json");
    if (!response.ok) throw new Error("Failed to load JSON");
    const data = await response.json();
    
    if (data.concepts) {
      return data.concepts.map((c: any) => ({
        concept_id: c.concept_id,
        surface_form: c.surface_form,
        translation: c.translation,
        topic: c.topic,
        part_of_speech: c.part_of_speech,
        difficulty_level: c.difficulty_level,
        frequency: c.frequency,
        base_weight: c.base_weight,
        skill_affinity: c.skill_affinity,
        unit_id: c.unit_id,
        mnemonic: c.mnemonic,
        gender: c.gender,
        emoji: c.emoji,
      }));
    }
    return [];
  } catch (err) {
    console.error("[Lesson Service] Failed to load concepts from JSON:", err);
    return [];
  }
}

/**
 * Get lessons data (units + concepts) for home page
 */
export async function fetchLessonsData(userId: string) {
  const [units, concepts, memory] = await Promise.all([
    fetchUnits(),
    fetchAllConcepts(),
    fetchUserMemory(userId),
  ]);
  
  return { units, concepts, memories: memory };
}

/**
 * Determine the maximum difficulty level a user can see based on XP.
 * <100 → 1; <300 → 2; <700 → 3; ≥700 → 4
 */
export function maxDifficultyForXP(xp: number): number {
  if (xp < 100) return 1;
  if (xp < 300) return 2;
  if (xp < 700) return 3;
  return 4;
}

/**
 * Filter + sort concepts by user's XP-based difficulty band.
 * Within each allowed difficulty band, sort by base_weight DESC.
 */
export function filterConceptsByDifficulty<T extends { difficulty_level: number; base_weight: number }>(
  concepts: T[],
  xpTotal: number
): T[] {
  const maxDiff = maxDifficultyForXP(xpTotal);
  return [...concepts]
    .filter((c) => (c.difficulty_level ?? 1) <= maxDiff)
    .sort((a, b) => {
      const da = a.difficulty_level ?? 1;
      const db = b.difficulty_level ?? 1;
      if (da !== db) return da - db;
      return (b.base_weight ?? 0) - (a.base_weight ?? 0);
    });
}

/**
 * Get lesson content for a specific unit with enriched data,
 * filtered by the user's current XP-based difficulty band.
 */
export async function fetchLessonData(unitId: number, userId: string) {
  const [concepts, memory, profileRes] = await Promise.all([
    fetchConceptsByUnit(unitId),
    fetchUserMemory(userId),
    supabase.from("user_profiles").select("xp_total").eq("id", userId).maybeSingle(),
  ]);

  const xpTotal = (profileRes.data as any)?.xp_total ?? 0;
  const filtered = filterConceptsByDifficulty(concepts, xpTotal);

  return { concepts: filtered, memories: memory };
}
