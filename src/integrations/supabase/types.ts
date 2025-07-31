export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      pomodoro_sessions: {
        Row: {
          created_at: string | null
          date: string
          id: string
          sessions_completed: number | null
          total_minutes_studied: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          date: string
          id?: string
          sessions_completed?: number | null
          total_minutes_studied?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          date?: string
          id?: string
          sessions_completed?: number | null
          total_minutes_studied?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          id: string
          name: string | null
          phone: string | null
          provider_type: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          id: string
          name?: string | null
          phone?: string | null
          provider_type?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string | null
          phone?: string | null
          provider_type?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      question_attempts: {
        Row: {
          attempted_at: string
          bank: string
          correct_answer: string
          created_at: string
          difficulty: string
          id: string
          is_correct: boolean
          question_text: string
          question_type: string
          subject: string
          topic: string
          user_answer: string | null
          user_id: string
        }
        Insert: {
          attempted_at?: string
          bank: string
          correct_answer: string
          created_at?: string
          difficulty: string
          id?: string
          is_correct: boolean
          question_text: string
          question_type: string
          subject: string
          topic: string
          user_answer?: string | null
          user_id: string
        }
        Update: {
          attempted_at?: string
          bank?: string
          correct_answer?: string
          created_at?: string
          difficulty?: string
          id?: string
          is_correct?: boolean
          question_text?: string
          question_type?: string
          subject?: string
          topic?: string
          user_answer?: string | null
          user_id?: string
        }
        Relationships: []
      }
      study_sessions: {
        Row: {
          created_at: string
          id: string
          session_date: string
          session_duration_minutes: number | null
          subjects_worked: Json | null
          topics_studied: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          session_date?: string
          session_duration_minutes?: number | null
          subjects_worked?: Json | null
          topics_studied?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          session_date?: string
          session_duration_minutes?: number | null
          subjects_worked?: Json | null
          topics_studied?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      subjects: {
        Row: {
          color: string | null
          completed_at: string | null
          created_at: string
          id: string
          name: string
          priority: number | null
          status: string
          total_study_time_minutes: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string | null
          completed_at?: string | null
          created_at?: string
          id?: string
          name: string
          priority?: number | null
          status?: string
          total_study_time_minutes?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string | null
          completed_at?: string | null
          created_at?: string
          id?: string
          name?: string
          priority?: number | null
          status?: string
          total_study_time_minutes?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      topics: {
        Row: {
          completed: boolean
          created_at: string
          difficulty_level: string | null
          difficulty_set_at: string | null
          first_studied_at: string | null
          id: string
          is_marked_for_review: boolean | null
          last_reviewed_at: string | null
          marked_for_review_at: string | null
          name: string
          next_review: string | null
          notes: Json | null
          review_count: number
          review_notes: Json | null
          review_stage: string | null
          subject_id: string
          subtopics: Json | null
          total_reviews: number | null
          updated_at: string
        }
        Insert: {
          completed?: boolean
          created_at?: string
          difficulty_level?: string | null
          difficulty_set_at?: string | null
          first_studied_at?: string | null
          id?: string
          is_marked_for_review?: boolean | null
          last_reviewed_at?: string | null
          marked_for_review_at?: string | null
          name: string
          next_review?: string | null
          notes?: Json | null
          review_count?: number
          review_notes?: Json | null
          review_stage?: string | null
          subject_id: string
          subtopics?: Json | null
          total_reviews?: number | null
          updated_at?: string
        }
        Update: {
          completed?: boolean
          created_at?: string
          difficulty_level?: string | null
          difficulty_set_at?: string | null
          first_studied_at?: string | null
          id?: string
          is_marked_for_review?: boolean | null
          last_reviewed_at?: string | null
          marked_for_review_at?: string | null
          name?: string
          next_review?: string | null
          notes?: Json | null
          review_count?: number
          review_notes?: Json | null
          review_stage?: string | null
          subject_id?: string
          subtopics?: Json | null
          total_reviews?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "topics_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      user_cycles: {
        Row: {
          atualizado_em: string | null
          ciclo_atual: string[] | null
          ciclos_realizados: number | null
          created_at: string | null
          data_fim_ciclo: string | null
          data_inicio_ciclo: string | null
          disciplinas_do_dia: string[] | null
          id: string
          materias_pendentes: string[] | null
          skipped_subjects: string[] | null
          user_id: string
        }
        Insert: {
          atualizado_em?: string | null
          ciclo_atual?: string[] | null
          ciclos_realizados?: number | null
          created_at?: string | null
          data_fim_ciclo?: string | null
          data_inicio_ciclo?: string | null
          disciplinas_do_dia?: string[] | null
          id?: string
          materias_pendentes?: string[] | null
          skipped_subjects?: string[] | null
          user_id: string
        }
        Update: {
          atualizado_em?: string | null
          ciclo_atual?: string[] | null
          ciclos_realizados?: number | null
          created_at?: string | null
          data_fim_ciclo?: string | null
          data_inicio_ciclo?: string | null
          disciplinas_do_dia?: string[] | null
          id?: string
          materias_pendentes?: string[] | null
          skipped_subjects?: string[] | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_cycles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_settings: {
        Row: {
          created_at: string
          notification_time: string
          notifications_enabled: boolean
          review_profile: string | null
          subjects_per_day: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          notification_time?: string
          notifications_enabled?: boolean
          review_profile?: string | null
          subjects_per_day?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          notification_time?: string
          notifications_enabled?: boolean
          review_profile?: string | null
          subjects_per_day?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_email_exists: {
        Args: { email_to_check: string }
        Returns: {
          email_exists: boolean
          provider_type: string
        }[]
      }
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
