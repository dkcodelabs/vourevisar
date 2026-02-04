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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      api_usage: {
        Row: {
          created_at: string | null
          endpoint: string
          id: string
          last_request: string
          request_count: number
          user_id: string
          window_start: string
        }
        Insert: {
          created_at?: string | null
          endpoint: string
          id?: string
          last_request?: string
          request_count?: number
          user_id: string
          window_start?: string
        }
        Update: {
          created_at?: string | null
          endpoint?: string
          id?: string
          last_request?: string
          request_count?: number
          user_id?: string
          window_start?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          changes: Json | null
          created_at: string | null
          id: string
          ip_address: unknown
          new_values: Json | null
          old_values: Json | null
          record_id: string | null
          table_name: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          changes?: Json | null
          created_at?: string | null
          id?: string
          ip_address?: unknown
          new_values?: Json | null
          old_values?: Json | null
          record_id?: string | null
          table_name?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          changes?: Json | null
          created_at?: string | null
          id?: string
          ip_address?: unknown
          new_values?: Json | null
          old_values?: Json | null
          record_id?: string | null
          table_name?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      comments: {
        Row: {
          author_id: string
          content: string
          created_at: string | null
          id: string
          likes_count: number | null
          parent_id: string | null
          post_id: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string | null
          id?: string
          likes_count?: number | null
          parent_id?: string | null
          post_id: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string | null
          id?: string
          likes_count?: number | null
          parent_id?: string | null
          post_id?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      general_notes: {
        Row: {
          content: string | null
          created_at: string | null
          id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          content?: string | null
          created_at?: string | null
          id?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          content?: string | null
          created_at?: string | null
          id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      general_reminders: {
        Row: {
          completed: boolean | null
          created_at: string | null
          id: string
          reminder_date: string | null
          text: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          completed?: boolean | null
          created_at?: string | null
          id?: string
          reminder_date?: string | null
          text: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          completed?: boolean | null
          created_at?: string | null
          id?: string
          reminder_date?: string | null
          text?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          action_url: string | null
          created_at: string | null
          expires_at: string | null
          id: string
          message: string | null
          metadata: Json | null
          read: boolean | null
          title: string
          type: string | null
          user_id: string
        }
        Insert: {
          action_url?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          message?: string | null
          metadata?: Json | null
          read?: boolean | null
          title: string
          type?: string | null
          user_id: string
        }
        Update: {
          action_url?: string | null
          created_at?: string | null
          expires_at?: string | null
          id?: string
          message?: string | null
          metadata?: Json | null
          read?: boolean | null
          title?: string
          type?: string | null
          user_id?: string
        }
        Relationships: []
      }
      organization_members: {
        Row: {
          id: string
          joined_at: string | null
          organization_id: string | null
          role: string | null
          user_id: string | null
        }
        Insert: {
          id?: string
          joined_at?: string | null
          organization_id?: string | null
          role?: string | null
          user_id?: string | null
        }
        Update: {
          id?: string
          joined_at?: string | null
          organization_id?: string | null
          role?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_public: boolean | null
          name: string
          owner_id: string
          settings: Json | null
          slug: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_public?: boolean | null
          name: string
          owner_id: string
          settings?: Json | null
          slug: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_public?: boolean | null
          name?: string
          owner_id?: string
          settings?: Json | null
          slug?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      payment_history: {
        Row: {
          amount: number
          created_at: string | null
          currency: string | null
          id: string
          paid_at: string | null
          payment_status: string | null
          period_end: string
          period_start: string
          plan: Database["public"]["Enums"]["subscription_plan"]
          stripe_invoice_id: string | null
          stripe_payment_intent_id: string | null
          subscription_id: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          currency?: string | null
          id?: string
          paid_at?: string | null
          payment_status?: string | null
          period_end: string
          period_start: string
          plan: Database["public"]["Enums"]["subscription_plan"]
          stripe_invoice_id?: string | null
          stripe_payment_intent_id?: string | null
          subscription_id: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          currency?: string | null
          id?: string
          paid_at?: string | null
          payment_status?: string | null
          period_end?: string
          period_start?: string
          plan?: Database["public"]["Enums"]["subscription_plan"]
          stripe_invoice_id?: string | null
          stripe_payment_intent_id?: string | null
          subscription_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_history_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "user_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
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
      posts: {
        Row: {
          author_id: string
          content: string | null
          created_at: string | null
          id: string
          metadata: Json | null
          published_at: string | null
          status: string | null
          tags: string[] | null
          title: string
          updated_at: string | null
          visibility: string | null
        }
        Insert: {
          author_id: string
          content?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          published_at?: string | null
          status?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string | null
          visibility?: string | null
        }
        Update: {
          author_id?: string
          content?: string | null
          created_at?: string | null
          id?: string
          metadata?: Json | null
          published_at?: string | null
          status?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string | null
          visibility?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          is_public: boolean | null
          location: string | null
          name: string | null
          phone: string | null
          preferences: Json | null
          provider_type: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id: string
          is_public?: boolean | null
          location?: string | null
          name?: string | null
          phone?: string | null
          preferences?: Json | null
          provider_type?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          is_public?: boolean | null
          location?: string | null
          name?: string | null
          phone?: string | null
          preferences?: Json | null
          provider_type?: string | null
          updated_at?: string
          website?: string | null
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
          completed_at: string
          created_at: string | null
          cycle_position: number | null
          day_of_week: number
          hour_of_day: number
          id: string
          is_weekend: boolean
          session_duration_minutes: number | null
          started_at: string | null
          study_date: string
          subject_id: string | null
          subject_name: string
          topics_count: number | null
          topics_studied: string[] | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          completed_at?: string
          created_at?: string | null
          cycle_position?: number | null
          day_of_week?: number
          hour_of_day?: number
          id?: string
          is_weekend?: boolean
          session_duration_minutes?: number | null
          started_at?: string | null
          study_date?: string
          subject_id?: string | null
          subject_name: string
          topics_count?: number | null
          topics_studied?: string[] | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          completed_at?: string
          created_at?: string | null
          cycle_position?: number | null
          day_of_week?: number
          hour_of_day?: number
          id?: string
          is_weekend?: boolean
          session_duration_minutes?: number | null
          started_at?: string | null
          study_date?: string
          subject_id?: string | null
          subject_name?: string
          topics_count?: number | null
          topics_studied?: string[] | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "study_sessions_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      subjects: {
        Row: {
          color: string | null
          completed_at: string | null
          created_at: string
          id: string
          name: string
          notes: Json | null
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
          notes?: Json | null
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
          notes?: Json | null
          priority?: number | null
          status?: string
          total_study_time_minutes?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          description: string | null
          id: string
          key: string
          updated_at: string | null
          updated_by: string | null
          value: Json | null
          visible_to_users: boolean | null
        }
        Insert: {
          description?: string | null
          id?: string
          key: string
          updated_at?: string | null
          updated_by?: string | null
          value?: Json | null
          visible_to_users?: boolean | null
        }
        Update: {
          description?: string | null
          id?: string
          key?: string
          updated_at?: string | null
          updated_by?: string | null
          value?: Json | null
          visible_to_users?: boolean | null
        }
        Relationships: []
      }
      topic_review_history: {
        Row: {
          created_at: string | null
          id: string
          review_stage: string
          reviewed_at: string
          study_duration_minutes: number | null
          topic_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          review_stage: string
          reviewed_at?: string
          study_duration_minutes?: number | null
          topic_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          review_stage?: string
          reviewed_at?: string
          study_duration_minutes?: number | null
          topic_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "topic_review_history_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      topics: {
        Row: {
          completed: boolean
          created_at: string
          difficulty_level: number | null
          difficulty_set_at: string | null
          first_studied_at: string | null
          id: string
          is_marked_for_review: boolean | null
          is_skipped: boolean | null
          last_audit_log: Json | null
          last_reviewed_at: string | null
          last_search_context: string | null
          last_session_duration: number | null
          last_trend_check_at: string | null
          last_used_query: string | null
          marked_for_review_at: string | null
          name: string
          next_review: string | null
          notes: Json | null
          position: number | null
          review_count: number
          review_stage: string | null
          skip_reason: string | null
          status: string | null
          subject_id: string
          subtopics: Json | null
          total_reviews: number | null
          total_volume: number | null
          updated_at: string
        }
        Insert: {
          completed?: boolean
          created_at?: string
          difficulty_level?: number | null
          difficulty_set_at?: string | null
          first_studied_at?: string | null
          id?: string
          is_marked_for_review?: boolean | null
          is_skipped?: boolean | null
          last_audit_log?: Json | null
          last_reviewed_at?: string | null
          last_search_context?: string | null
          last_session_duration?: number | null
          last_trend_check_at?: string | null
          last_used_query?: string | null
          marked_for_review_at?: string | null
          name: string
          next_review?: string | null
          notes?: Json | null
          position?: number | null
          review_count?: number
          review_stage?: string | null
          skip_reason?: string | null
          status?: string | null
          subject_id: string
          subtopics?: Json | null
          total_reviews?: number | null
          total_volume?: number | null
          updated_at?: string
        }
        Update: {
          completed?: boolean
          created_at?: string
          difficulty_level?: number | null
          difficulty_set_at?: string | null
          first_studied_at?: string | null
          id?: string
          is_marked_for_review?: boolean | null
          is_skipped?: boolean | null
          last_audit_log?: Json | null
          last_reviewed_at?: string | null
          last_search_context?: string | null
          last_session_duration?: number | null
          last_trend_check_at?: string | null
          last_used_query?: string | null
          marked_for_review_at?: string | null
          name?: string
          next_review?: string | null
          notes?: Json | null
          position?: number | null
          review_count?: number
          review_stage?: string | null
          skip_reason?: string | null
          status?: string | null
          subject_id?: string
          subtopics?: Json | null
          total_reviews?: number | null
          total_volume?: number | null
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
          data_ultimo_reset: string | null
          disciplinas_do_dia: string[] | null
          id: string
          indice_atual: number | null
          materias_estudadas_ciclo: string[] | null
          materias_estudadas_hoje: string[] | null
          materias_pendentes: string[] | null
          materias_por_dia: number | null
          skipped_subjects: string[] | null
          streak_dias_consecutivos: number | null
          user_id: string
        }
        Insert: {
          atualizado_em?: string | null
          ciclo_atual?: string[] | null
          ciclos_realizados?: number | null
          created_at?: string | null
          data_fim_ciclo?: string | null
          data_inicio_ciclo?: string | null
          data_ultimo_reset?: string | null
          disciplinas_do_dia?: string[] | null
          id?: string
          indice_atual?: number | null
          materias_estudadas_ciclo?: string[] | null
          materias_estudadas_hoje?: string[] | null
          materias_pendentes?: string[] | null
          materias_por_dia?: number | null
          skipped_subjects?: string[] | null
          streak_dias_consecutivos?: number | null
          user_id: string
        }
        Update: {
          atualizado_em?: string | null
          ciclo_atual?: string[] | null
          ciclos_realizados?: number | null
          created_at?: string | null
          data_fim_ciclo?: string | null
          data_inicio_ciclo?: string | null
          data_ultimo_reset?: string | null
          disciplinas_do_dia?: string[] | null
          id?: string
          indice_atual?: number | null
          materias_estudadas_ciclo?: string[] | null
          materias_estudadas_hoje?: string[] | null
          materias_pendentes?: string[] | null
          materias_por_dia?: number | null
          skipped_subjects?: string[] | null
          streak_dias_consecutivos?: number | null
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
      user_roles: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_settings: {
        Row: {
          created_at: string
          data_prova_meta: string | null
          notification_time: string
          notifications_enabled: boolean
          review_profile: string | null
          subjects_per_day: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data_prova_meta?: string | null
          notification_time?: string
          notifications_enabled?: boolean
          review_profile?: string | null
          subjects_per_day?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          data_prova_meta?: string | null
          notification_time?: string
          notifications_enabled?: boolean
          review_profile?: string | null
          subjects_per_day?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_study_analytics: {
        Row: {
          calculado_em: string | null
          created_at: string | null
          dias_mais_produtivos: number[] | null
          horario_mais_produtivo: number | null
          horarios_pico: number[] | null
          id: string
          maior_streak: number | null
          media_duracao_sessao: number | null
          media_sessoes_por_dia: number | null
          melhor_dia_semana: number | null
          melhor_horario_fim: string | null
          melhor_horario_inicio: string | null
          pior_dia_semana: number | null
          streak_atual: number | null
          total_horas_estudadas: number | null
          total_sessoes: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          calculado_em?: string | null
          created_at?: string | null
          dias_mais_produtivos?: number[] | null
          horario_mais_produtivo?: number | null
          horarios_pico?: number[] | null
          id?: string
          maior_streak?: number | null
          media_duracao_sessao?: number | null
          media_sessoes_por_dia?: number | null
          melhor_dia_semana?: number | null
          melhor_horario_fim?: string | null
          melhor_horario_inicio?: string | null
          pior_dia_semana?: number | null
          streak_atual?: number | null
          total_horas_estudadas?: number | null
          total_sessoes?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          calculado_em?: string | null
          created_at?: string | null
          dias_mais_produtivos?: number[] | null
          horario_mais_produtivo?: number | null
          horarios_pico?: number[] | null
          id?: string
          maior_streak?: number | null
          media_duracao_sessao?: number | null
          media_sessoes_por_dia?: number | null
          melhor_dia_semana?: number | null
          melhor_horario_fim?: string | null
          melhor_horario_inicio?: string | null
          pior_dia_semana?: number | null
          streak_atual?: number | null
          total_horas_estudadas?: number | null
          total_sessoes?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      user_subscriptions: {
        Row: {
          created_at: string | null
          id: string
          last_payment_at: string | null
          next_billing_date: string | null
          plan: Database["public"]["Enums"]["subscription_plan"]
          status: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_ends_at: string | null
          subscription_started_at: string | null
          trial_ends_at: string | null
          trial_started_at: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          last_payment_at?: string | null
          next_billing_date?: string | null
          plan?: Database["public"]["Enums"]["subscription_plan"]
          status?: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_ends_at?: string | null
          subscription_started_at?: string | null
          trial_ends_at?: string | null
          trial_started_at?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          last_payment_at?: string | null
          next_billing_date?: string | null
          plan?: Database["public"]["Enums"]["subscription_plan"]
          status?: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_ends_at?: string | null
          subscription_started_at?: string | null
          trial_ends_at?: string | null
          trial_started_at?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      user_difficulty_overview: {
        Row: {
          avg_difficulty: number | null
          easy_count: number | null
          hard_count: number | null
          hard_topics_mastered: number | null
          medium_count: number | null
          rated_topics: number | null
          total_topics: number | null
          user_id: string | null
          very_easy_count: number | null
          very_hard_count: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      activate_paid_subscription: {
        Args: { plan_type: string; target_user_id: string }
        Returns: Json
      }
      activate_trial_subscription: {
        Args: { target_user_id: string; trial_days?: number }
        Returns: Json
      }
      assign_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _target_user_id: string
        }
        Returns: undefined
      }
      assign_user_role_admin: {
        Args: {
          new_role: Database["public"]["Enums"]["app_role"]
          target_user_id: string
        }
        Returns: boolean
      }
      calculate_difficulty_points: {
        Args: { p_start_date?: string; p_user_id: string }
        Returns: {
          avg_difficulty: number
          points_breakdown: Json
          topics_completed: number
          total_points: number
        }[]
      }
      calculate_user_analytics: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      check_email_exists: {
        Args: { email_to_check: string }
        Returns: {
          email_exists: boolean
          provider_type: string
        }[]
      }
      check_rate_limit: {
        Args: { p_endpoint: string; p_max_per_hour: number; p_user_id: string }
        Returns: boolean
      }
      cleanup_old_audit_logs: {
        Args: { _days_to_keep?: number }
        Returns: number
      }
      deactivate_subscription: {
        Args: { target_user_id: string }
        Returns: Json
      }
      get_all_topics_admin: {
        Args: { page_number: number; page_size: number }
        Returns: {
          created_at: string
          id: string
          is_skipped: boolean
          last_trend_check_at: string
          name: string
          skip_reason: string
          subject_name: string
          total_count: number
          total_volume: number
          user_email: string
        }[]
      }
      get_all_user_roles_admin: {
        Args: never
        Returns: {
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }[]
      }
      get_daily_progress: {
        Args: { p_user_id: string }
        Returns: {
          daily_goal: number
          progress_percentage: number
          remaining_count: number
          studied_count: number
          studied_subjects: string[]
        }[]
      }
      get_estimated_time_by_difficulty: {
        Args: { p_difficulty: number }
        Returns: number
      }
      get_highest_user_role: {
        Args: { target_user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      get_organization_role: {
        Args: { _org_id: string; _user_id?: string }
        Returns: string
      }
      get_points_by_difficulty: {
        Args: { p_difficulty: number }
        Returns: number
      }
      get_role_audit_log: {
        Args: { _limit?: number }
        Returns: {
          assigned_at: string
          assigned_by: string
          assigned_by_email: string
          role: Database["public"]["Enums"]["app_role"]
          user_email: string
          user_id: string
        }[]
      }
      get_subscription_info: { Args: { check_user_id?: string }; Returns: Json }
      get_user_difficulty_stats: {
        Args: { p_user_id: string }
        Returns: {
          avg_difficulty: number
          difficulty_distribution: Json
          estimated_study_time: number
          topics_with_difficulty: number
          total_topics: number
        }[]
      }
      get_user_info: {
        Args: { _user_id: string }
        Returns: {
          created_at: string
          email: string
          highest_role: Database["public"]["Enums"]["app_role"]
          last_sign_in_at: string
          role_history: Json
          roles: string[]
          user_id: string
        }[]
      }
      get_user_roles: {
        Args: { user_id: string }
        Returns: {
          role: Database["public"]["Enums"]["app_role"]
        }[]
      }
      get_weighted_reviews: {
        Args: { p_limit?: number; p_offset?: number; p_user_id: string }
        Returns: {
          completed: boolean
          difficulty_level: number
          first_studied_at: string
          id: string
          last_reviewed_at: string
          name: string
          next_review: string
          notes: Json
          priority_score: number
          review_count: number
          review_stage: string
          subject_color: string
          subject_id: string
          subject_name: string
        }[]
      }
      has_active_subscription: {
        Args: { check_user_id?: string }
        Returns: boolean
      }
      has_role:
        | {
            Args: {
              _role: Database["public"]["Enums"]["app_role"]
              _user_id: string
            }
            Returns: boolean
          }
        | {
            Args: {
              check_role: Database["public"]["Enums"]["app_role"]
              check_user_id?: string
            }
            Returns: boolean
          }
      has_role_or_higher:
        | {
            Args: {
              _min_role: Database["public"]["Enums"]["app_role"]
              _user_id: string
            }
            Returns: boolean
          }
        | {
            Args: {
              check_user_id?: string
              min_role: Database["public"]["Enums"]["app_role"]
            }
            Returns: boolean
          }
      is_organization_member: {
        Args: { _org_id: string; _user_id?: string }
        Returns: boolean
      }
      is_owner: { Args: { _user_id: string }; Returns: boolean }
      list_users_with_roles: {
        Args: never
        Returns: {
          created_at: string
          email: string
          highest_role: Database["public"]["Enums"]["app_role"]
          last_sign_in_at: string
          roles: string[]
          user_id: string
        }[]
      }
      log_api_usage: {
        Args: { p_endpoint: string; p_user_id: string }
        Returns: undefined
      }
      log_custom_action: {
        Args: {
          _action: string
          _metadata?: Json
          _record_id?: string
          _table_name?: string
        }
        Returns: undefined
      }
      remove_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _target_user_id: string
        }
        Returns: undefined
      }
      remove_user_role_admin: {
        Args: {
          role_to_remove: Database["public"]["Enums"]["app_role"]
          target_user_id: string
        }
        Returns: boolean
      }
      reset_daily_progress: { Args: never; Returns: undefined }
      set_user_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _target_user_id: string
        }
        Returns: undefined
      }
      suggest_topics_by_time: {
        Args: { p_available_minutes?: number; p_user_id: string }
        Returns: {
          difficulty_level: number
          estimated_minutes: number
          priority_score: number
          subject_name: string
          topic_id: string
          topic_name: string
        }[]
      }
      test_difficulty_system: { Args: never; Returns: string }
      test_owner_access: { Args: never; Returns: boolean }
      update_daily_progress: {
        Args: { p_subject_id: string; p_user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "owner" | "admin" | "moderator" | "user"
      subscription_plan: "free_trial" | "monthly" | "annual"
      subscription_status:
        | "trial"
        | "active"
        | "expired"
        | "canceled"
        | "suspended"
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
    Enums: {
      app_role: ["owner", "admin", "moderator", "user"],
      subscription_plan: ["free_trial", "monthly", "annual"],
      subscription_status: [
        "trial",
        "active",
        "expired",
        "canceled",
        "suspended",
      ],
    },
  },
} as const
