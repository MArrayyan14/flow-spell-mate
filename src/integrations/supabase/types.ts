export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      concepts: {
        Row: {
          base_weight: number
          concept_id: string
          difficulty_level: number
          emoji: string | null
          frequency: string
          gender: string | null
          mnemonic: string | null
          part_of_speech: string
          skill_affinity: string[] | null
          surface_form: string
          topic: string
          translation: string
          unit_id: number | null
        }
        Insert: {
          base_weight: number
          concept_id: string
          difficulty_level: number
          emoji?: string | null
          frequency: string
          gender?: string | null
          mnemonic?: string | null
          part_of_speech: string
          skill_affinity?: string[] | null
          surface_form: string
          topic: string
          translation: string
          unit_id?: number | null
        }
        Update: {
          base_weight?: number
          concept_id?: string
          difficulty_level?: number
          emoji?: string | null
          frequency?: string
          gender?: string | null
          mnemonic?: string | null
          part_of_speech?: string
          skill_affinity?: string[] | null
          surface_form?: string
          topic?: string
          translation?: string
          unit_id?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "concepts_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          completed: boolean
          created_at: string
          id: string
          session_type: string
          unit_id: number | null
          user_id: string
          xp_earned: number
        }
        Insert: {
          completed?: boolean
          created_at?: string
          id?: string
          session_type: string
          unit_id?: number | null
          user_id: string
          xp_earned?: number
        }
        Update: {
          completed?: boolean
          created_at?: string
          id?: string
          session_type?: string
          unit_id?: number | null
          user_id?: string
          xp_earned?: number
        }
        Relationships: [
          {
            foreignKeyName: "sessions_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      units: {
        Row: {
          cefr_level: string
          description: string
          emoji: string | null
          id: number
          order_index: number
          topic: string
        }
        Insert: {
          cefr_level: string
          description: string
          emoji?: string | null
          id: number
          order_index: number
          topic: string
        }
        Update: {
          cefr_level?: string
          description?: string
          emoji?: string | null
          id?: number
          order_index?: number
          topic?: string
        }
        Relationships: []
      }
      user_memory: {
        Row: {
          adaptive_weight: number
          attempts: number
          concept_id: string
          correct: number
          half_life_est: number
          id: string
          incorrect: number
          last_practiced: string | null
          recall_prob: number
          user_id: string
        }
        Insert: {
          adaptive_weight?: number
          attempts?: number
          concept_id: string
          correct?: number
          half_life_est?: number
          id?: string
          incorrect?: number
          last_practiced?: string | null
          recall_prob?: number
          user_id: string
        }
        Update: {
          adaptive_weight?: number
          attempts?: number
          concept_id?: string
          correct?: number
          half_life_est?: number
          id?: string
          incorrect?: number
          last_practiced?: string | null
          recall_prob?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_memory_concept_id_fkey"
            columns: ["concept_id"]
            isOneToOne: false
            referencedRelation: "concepts"
            referencedColumns: ["concept_id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          created_at: string
          display_name: string | null
          gems: number
          hearts: number
          id: string
          last_practiced: string | null
          last_streak_date: string | null
          league: string
          streak_days: number
          weekly_xp: number
          xp_total: number
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          gems?: number
          hearts?: number
          id: string
          last_practiced?: string | null
          last_streak_date?: string | null
          league?: string
          streak_days?: number
          weekly_xp?: number
          xp_total?: number
        }
        Update: {
          created_at?: string
          display_name?: string | null
          gems?: number
          hearts?: number
          id?: string
          last_practiced?: string | null
          last_streak_date?: string | null
          league?: string
          streak_days?: number
          weekly_xp?: number
          xp_total?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
