import { useQuery } from "@tanstack/react-query";
import {
  fetchVocabularyData,
  searchVocabulary,
  filterByTopic,
  sortVocabulary,
  getVocabularyStats,
  getTopics,
} from "@/services/vocabService";
import { fetchAllConcepts } from "@/services/lessonService";

/**
 * Hook to fetch vocabulary data
 */
export function useVocabulary(userId: string | undefined) {
  return useQuery({
    queryKey: ["vocabulary", userId],
    enabled: !!userId,
    queryFn: async () => {
      if (!userId) throw new Error("User ID required");
      return fetchVocabularyData(userId);
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to get all concepts (for filtering/searching)
 */
export function useAllConcepts() {
  return useQuery({
    queryKey: ["allConcepts"],
    queryFn: fetchAllConcepts,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Helper functions for vocabulary operations (can be used with the hook data)
 */
export const VocabHelpers = {
  search: searchVocabulary,
  filterByTopic,
  sort: sortVocabulary,
  getStats: getVocabularyStats,
  getTopics,
};
