import { useQuery } from "@tanstack/react-query";
import {
  fetchLessonsData,
  fetchLessonData,
  fetchConceptsByUnit,
  fetchUnits,
} from "@/services/lessonService";
import { enrichConcepts, type Unit } from "@/lib/lingua";

/**
 * Hook to fetch lessons data for home page
 */
export function useLessons(userId: string | undefined) {
  return useQuery({
    queryKey: ["lessons", userId],
    enabled: !!userId,
    queryFn: async () => {
      if (!userId) throw new Error("User ID required");
      return fetchLessonsData(userId);
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to fetch a single lesson with concepts
 */
export function useLesson(unitId: number | string | undefined, userId: string | undefined) {
  return useQuery({
    queryKey: ["lesson", unitId, userId],
    enabled: !!unitId && !!userId,
    queryFn: async () => {
      if (!unitId || !userId) throw new Error("Unit ID and User ID required");
      const { concepts, memories } = await fetchLessonData(Number(unitId), userId);
      return {
        concepts: enrichConcepts(concepts, memories),
        raw: { concepts, memories },
      };
    },
  });
}

/**
 * Hook to fetch all units
 */
export function useUnits() {
  return useQuery({
    queryKey: ["units"],
    queryFn: fetchUnits,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}

/**
 * Hook to fetch concepts for a unit
 */
export function useUnitConcepts(unitId: number | undefined) {
  return useQuery({
    queryKey: ["concepts", unitId],
    enabled: unitId !== undefined,
    queryFn: async () => {
      if (unitId === undefined) throw new Error("Unit ID required");
      return fetchConceptsByUnit(unitId);
    },
  });
}
