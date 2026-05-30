import { supabase } from "@/integrations/supabase/client";
import { enrichConcepts, type Concept, type Memory } from "@/lib/lingua";
import { fetchAllConcepts, fetchUserMemory } from "./lessonService";

/**
 * Get vocabulary data for a user with all enrichment
 */
export async function fetchVocabularyData(userId: string) {
  try {
    const [concepts, memory] = await Promise.all([
      fetchAllConcepts(),
      fetchUserMemory(userId),
    ]);
    
    return {
      concepts: enrichConcepts(concepts, memory),
      raw: { concepts, memory },
    };
  } catch (err) {
    console.error("[Vocab Service] Failed to fetch vocabulary data:", err);
    return {
      concepts: [],
      raw: { concepts: [], memory: [] },
    };
  }
}

/**
 * Search vocabulary by Spanish word or English translation
 */
export function searchVocabulary(
  concepts: ReturnType<typeof enrichConcepts>,
  query: string
): ReturnType<typeof enrichConcepts> {
  const lowerQuery = query.toLowerCase();
  return concepts.filter(c =>
    `${c.surface_form} ${c.translation}`.toLowerCase().includes(lowerQuery)
  );
}

/**
 * Filter vocabulary by topic
 */
export function filterByTopic(
  concepts: ReturnType<typeof enrichConcepts>,
  topic: string
): ReturnType<typeof enrichConcepts> {
  if (topic === "All") return concepts;
  if (topic === "Forgotten") {
    return concepts.filter(c => c.status === "forgotten");
  }
  return concepts.filter(c => c.topic === topic);
}

/**
 * Sort vocabulary by different criteria
 */
export function sortVocabulary(
  concepts: ReturnType<typeof enrichConcepts>,
  sortBy: "due" | "weak" | "recent" | "az"
): ReturnType<typeof enrichConcepts> {
  const sorted = [...concepts];
  
  switch (sortBy) {
    case "weak":
      return sorted.sort((a, b) => a.recall - b.recall);
    case "recent":
      return sorted.sort(
        (a, b) =>
          +new Date(b.memory?.last_practiced ?? 0) -
          +new Date(a.memory?.last_practiced ?? 0)
      );
    case "az":
      return sorted.sort((a, b) =>
        a.surface_form.localeCompare(b.surface_form)
      );
    case "due":
    default:
      return sorted.sort((a, b) => a.daysUntilReview - b.daysUntilReview);
  }
}

/**
 * Get vocabulary statistics
 */
export function getVocabularyStats(concepts: ReturnType<typeof enrichConcepts>) {
  const learned = concepts.filter(c => (c.memory?.attempts ?? 0) > 0);
  const dueForReview = learned.filter(c => c.status === "fading" || c.status === "weak");
  const strong = learned.filter(c => c.status === "strong");
  const forgotten = learned.filter(c => c.status === "forgotten");
  
  return {
    total: concepts.length,
    learned: learned.length,
    dueForReview: dueForReview.length,
    strong: strong.length,
    forgotten: forgotten.length,
  };
}

/**
 * Get unique topics from concepts
 */
export function getTopics(concepts: Concept[]): string[] {
  const topics = new Set(concepts.map(c => c.topic));
  return Array.from(topics).sort();
}
