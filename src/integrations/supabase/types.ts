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
      active_study_timers: {
        Row: {
          accumulated_ms: number
          started_at: string | null
          status: string
          topic_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          accumulated_ms?: number
          started_at?: string | null
          status?: string
          topic_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          accumulated_ms?: number
          started_at?: string | null
          status?: string
          topic_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "active_study_timers_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_alert_events: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          alert_type: string
          created_at: string | null
          id: string
          message: string
          metadata: Json | null
          resolved_at: string | null
          status: string | null
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_type: string
          created_at?: string | null
          id?: string
          message: string
          metadata?: Json | null
          resolved_at?: string | null
          status?: string | null
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_type?: string
          created_at?: string | null
          id?: string
          message?: string
          metadata?: Json | null
          resolved_at?: string | null
          status?: string | null
        }
        Relationships: []
      }
      admin_error_events: {
        Row: {
          action: string
          actor_email: string | null
          actor_user_id: string | null
          assigned_at: string | null
          assigned_to: string | null
          category: string | null
          classification_feedback: boolean | null
          code: string | null
          context_label: string | null
          created_at: string
          environment: string | null
          error_id: string
          feature_area: string | null
          fingerprint: string | null
          fingerprint_version: string | null
          first_response_at: string | null
          first_seen_at: string
          id: string
          is_user_visible: boolean | null
          last_seen_at: string
          metadata: Json
          module: string
          occurrence_count: number
          recommended_action: string | null
          recoverability: string | null
          request_id: string | null
          resolved_at: string | null
          retryable: boolean
          route_path: string | null
          scope: string
          session_id: string | null
          severity: string
          severity_feedback: boolean | null
          status: string
          suggested_category: string | null
          target_email: string | null
          target_user_id: string | null
          technical_message: string
          triage_note: string | null
          updated_at: string
          user_message: string
        }
        Insert: {
          action: string
          actor_email?: string | null
          actor_user_id?: string | null
          assigned_at?: string | null
          assigned_to?: string | null
          category?: string | null
          classification_feedback?: boolean | null
          code?: string | null
          context_label?: string | null
          created_at?: string
          environment?: string | null
          error_id: string
          feature_area?: string | null
          fingerprint?: string | null
          fingerprint_version?: string | null
          first_response_at?: string | null
          first_seen_at?: string
          id?: string
          is_user_visible?: boolean | null
          last_seen_at?: string
          metadata?: Json
          module: string
          occurrence_count?: number
          recommended_action?: string | null
          recoverability?: string | null
          request_id?: string | null
          resolved_at?: string | null
          retryable?: boolean
          route_path?: string | null
          scope?: string
          session_id?: string | null
          severity: string
          severity_feedback?: boolean | null
          status?: string
          suggested_category?: string | null
          target_email?: string | null
          target_user_id?: string | null
          technical_message: string
          triage_note?: string | null
          updated_at?: string
          user_message: string
        }
        Update: {
          action?: string
          actor_email?: string | null
          actor_user_id?: string | null
          assigned_at?: string | null
          assigned_to?: string | null
          category?: string | null
          classification_feedback?: boolean | null
          code?: string | null
          context_label?: string | null
          created_at?: string
          environment?: string | null
          error_id?: string
          feature_area?: string | null
          fingerprint?: string | null
          fingerprint_version?: string | null
          first_response_at?: string | null
          first_seen_at?: string
          id?: string
          is_user_visible?: boolean | null
          last_seen_at?: string
          metadata?: Json
          module?: string
          occurrence_count?: number
          recommended_action?: string | null
          recoverability?: string | null
          request_id?: string | null
          resolved_at?: string | null
          retryable?: boolean
          route_path?: string | null
          scope?: string
          session_id?: string | null
          severity?: string
          severity_feedback?: boolean | null
          status?: string
          suggested_category?: string | null
          target_email?: string | null
          target_user_id?: string | null
          technical_message?: string
          triage_note?: string | null
          updated_at?: string
          user_message?: string
        }
        Relationships: []
      }
      ai_error_logs: {
        Row: {
          context: string | null
          created_at: string | null
          error_code: string | null
          error_message: string | null
          id: string
        }
        Insert: {
          context?: string | null
          created_at?: string | null
          error_code?: string | null
          error_message?: string | null
          id?: string
        }
        Update: {
          context?: string | null
          created_at?: string | null
          error_code?: string | null
          error_message?: string | null
          id?: string
        }
        Relationships: []
      }
      ai_status: {
        Row: {
          error_message: string | null
          id: string
          last_check: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          error_message?: string | null
          id?: string
          last_check?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          error_message?: string | null
          id?: string
          last_check?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
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
      coupon_uses: {
        Row: {
          asaas_subscription_id: string | null
          coupon_id: string
          id: string
          used_at: string
          user_id: string
        }
        Insert: {
          asaas_subscription_id?: string | null
          coupon_id: string
          id?: string
          used_at?: string
          user_id: string
        }
        Update: {
          asaas_subscription_id?: string | null
          coupon_id?: string
          id?: string
          used_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coupon_uses_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
        ]
      }
      coupons: {
        Row: {
          active: boolean
          code: string
          created_at: string | null
          discount_type: string
          discount_value: number
          id: string
          max_uses: number | null
          updated_at: string | null
          uses_count: number
          valid_until: string | null
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string | null
          discount_type: string
          discount_value: number
          id?: string
          max_uses?: number | null
          updated_at?: string | null
          uses_count?: number
          valid_until?: string | null
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string | null
          discount_type?: string
          discount_value?: number
          id?: string
          max_uses?: number | null
          updated_at?: string | null
          uses_count?: number
          valid_until?: string | null
        }
        Relationships: []
      }
      cycle_rotations: {
        Row: {
          completed_at: string | null
          cycle_id: string
          id: string
          rotation_number: number
          started_at: string
        }
        Insert: {
          completed_at?: string | null
          cycle_id: string
          id?: string
          rotation_number?: number
          started_at?: string
        }
        Update: {
          completed_at?: string | null
          cycle_id?: string
          id?: string
          rotation_number?: number
          started_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cycle_rotations_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "study_cycles_v2"
            referencedColumns: ["id"]
          },
        ]
      }
      cycle_study_logs: {
        Row: {
          id: string
          rotation_id: string
          studied_at: string
          subject_id: string
          user_id: string
        }
        Insert: {
          id?: string
          rotation_id: string
          studied_at?: string
          subject_id: string
          user_id: string
        }
        Update: {
          id?: string
          rotation_id?: string
          studied_at?: string
          subject_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cycle_study_logs_rotation_id_fkey"
            columns: ["rotation_id"]
            isOneToOne: false
            referencedRelation: "cycle_rotations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cycle_study_logs_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      cycle_subject_states: {
        Row: {
          completed_in_current_rotation: boolean
          created_at: string
          cycle_id: string
          id: string
          last_studied_date: string | null
          subject_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_in_current_rotation?: boolean
          created_at?: string
          cycle_id: string
          id?: string
          last_studied_date?: string | null
          subject_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_in_current_rotation?: boolean
          created_at?: string
          cycle_id?: string
          id?: string
          last_studied_date?: string | null
          subject_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cycle_subject_states_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "study_cycles_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cycle_subject_states_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      edital_suggestions: {
        Row: {
          concurso: string
          created_at: string | null
          id: string
          responded_at: string | null
          response_message: string | null
          status: string | null
          user_id: string | null
        }
        Insert: {
          concurso: string
          created_at?: string | null
          id?: string
          responded_at?: string | null
          response_message?: string | null
          status?: string | null
          user_id?: string | null
        }
        Update: {
          concurso?: string
          created_at?: string | null
          id?: string
          responded_at?: string | null
          response_message?: string | null
          status?: string | null
          user_id?: string | null
        }
        Relationships: []
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
      incident_action_log: {
        Row: {
          action_type: string
          actor_email: string | null
          actor_role: string | null
          actor_user_id: string
          created_at: string
          id: string
          incident_id: string
          incident_type: string
          new_value: string | null
          note: string | null
          old_value: string | null
        }
        Insert: {
          action_type: string
          actor_email?: string | null
          actor_role?: string | null
          actor_user_id: string
          created_at?: string
          id?: string
          incident_id: string
          incident_type: string
          new_value?: string | null
          note?: string | null
          old_value?: string | null
        }
        Update: {
          action_type?: string
          actor_email?: string | null
          actor_role?: string | null
          actor_user_id?: string
          created_at?: string
          id?: string
          incident_id?: string
          incident_type?: string
          new_value?: string | null
          note?: string | null
          old_value?: string | null
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
      pending_ai_extractions: {
        Row: {
          ai_result: Json
          analysis_result: Json | null
          created_at: string | null
          edital_name: string
          id: string
          origin: string | null
          pdf_url: string | null
          position: string | null
          selected_cargo: string | null
          source_type: string | null
          updated_at: string | null
          user_id: string
          year: string | null
        }
        Insert: {
          ai_result: Json
          analysis_result?: Json | null
          created_at?: string | null
          edital_name: string
          id?: string
          origin?: string | null
          pdf_url?: string | null
          position?: string | null
          selected_cargo?: string | null
          source_type?: string | null
          updated_at?: string | null
          user_id: string
          year?: string | null
        }
        Update: {
          ai_result?: Json
          analysis_result?: Json | null
          created_at?: string | null
          edital_name?: string
          id?: string
          origin?: string | null
          pdf_url?: string | null
          position?: string | null
          selected_cargo?: string | null
          source_type?: string | null
          updated_at?: string | null
          user_id?: string
          year?: string | null
        }
        Relationships: []
      }
      pending_cycle_merges: {
        Row: {
          created_at: string | null
          edital_id: string | null
          id: string
          state_data: Json
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          edital_id?: string | null
          id?: string
          state_data: Json
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          edital_id?: string | null
          id?: string
          state_data?: Json
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pending_cycle_merges_edital_id_fkey"
            columns: ["edital_id"]
            isOneToOne: false
            referencedRelation: "user_editais"
            referencedColumns: ["id"]
          },
        ]
      }
      pending_merge_suggestions: {
        Row: {
          created_at: string | null
          cycle_id: string | null
          id: string
          original_ids: Json | null
          original_names: Json
          reviewed_at: string | null
          status: string | null
          suggested_name: string
          suggestion_type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          cycle_id?: string | null
          id?: string
          original_ids?: Json | null
          original_names: Json
          reviewed_at?: string | null
          status?: string | null
          suggested_name: string
          suggestion_type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          cycle_id?: string | null
          id?: string
          original_ids?: Json | null
          original_names?: Json
          reviewed_at?: string | null
          status?: string | null
          suggested_name?: string
          suggestion_type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pending_merge_suggestions_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "user_cycles"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_configs: {
        Row: {
          active: boolean
          badge: string | null
          created_at: string | null
          description: string
          features: Json
          id: string
          name: string
          slug: string
          updated_at: string | null
          value: number
        }
        Insert: {
          active?: boolean
          badge?: string | null
          created_at?: string | null
          description?: string
          features?: Json
          id?: string
          name: string
          slug: string
          updated_at?: string | null
          value: number
        }
        Update: {
          active?: boolean
          badge?: string | null
          created_at?: string | null
          description?: string
          features?: Json
          id?: string
          name?: string
          slug?: string
          updated_at?: string | null
          value?: number
        }
        Relationships: []
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
          deactivated_at: string | null
          deactivated_by: string | null
          deleted_at: string | null
          display_name: string | null
          email: string | null
          id: string
          is_active: boolean
          is_public: boolean | null
          last_access_at: string | null
          last_sign_in_at: string | null
          location: string | null
          marketing_opt_in: boolean
          marketing_opt_in_at: string | null
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
          deactivated_at?: string | null
          deactivated_by?: string | null
          deleted_at?: string | null
          display_name?: string | null
          email?: string | null
          id: string
          is_active?: boolean
          is_public?: boolean | null
          last_access_at?: string | null
          last_sign_in_at?: string | null
          location?: string | null
          marketing_opt_in?: boolean
          marketing_opt_in_at?: string | null
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
          deactivated_at?: string | null
          deactivated_by?: string | null
          deleted_at?: string | null
          display_name?: string | null
          email?: string | null
          id?: string
          is_active?: boolean
          is_public?: boolean | null
          last_access_at?: string | null
          last_sign_in_at?: string | null
          location?: string | null
          marketing_opt_in?: boolean
          marketing_opt_in_at?: string | null
          name?: string | null
          phone?: string | null
          preferences?: Json | null
          provider_type?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      public_editais: {
        Row: {
          category: string
          created_at: string | null
          exam_date: string | null
          id: string
          is_public: boolean | null
          organ: string
          position: string
          status: string
          subjects: Json
          updated_at: string | null
          year: string
        }
        Insert: {
          category: string
          created_at?: string | null
          exam_date?: string | null
          id?: string
          is_public?: boolean | null
          organ: string
          position: string
          status: string
          subjects?: Json
          updated_at?: string | null
          year: string
        }
        Update: {
          category?: string
          created_at?: string | null
          exam_date?: string | null
          id?: string
          is_public?: boolean | null
          organ?: string
          position?: string
          status?: string
          subjects?: Json
          updated_at?: string | null
          year?: string
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
      study_cycles_v2: {
        Row: {
          created_at: string
          id: string
          status: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          status?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          status?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      study_sessions: {
        Row: {
          completed_at: string
          created_at: string | null
          cycle_id: string | null
          cycle_position: number | null
          day_of_week: number
          edital_id: string | null
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
          cycle_id?: string | null
          cycle_position?: number | null
          day_of_week?: number
          edital_id?: string | null
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
          cycle_id?: string | null
          cycle_position?: number | null
          day_of_week?: number
          edital_id?: string | null
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
            foreignKeyName: "study_sessions_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "user_cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_sessions_edital_id_fkey"
            columns: ["edital_id"]
            isOneToOne: false
            referencedRelation: "user_editais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_sessions_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      subject_merges: {
        Row: {
          created_at: string | null
          created_by_ai: boolean | null
          cycle_id: string | null
          display_name: string
          id: string
          match_type: string | null
          merged_subject_ids: Json
          primary_subject_id: string
          reverted_at: string | null
          source_edital_ids: string[] | null
          status: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          created_by_ai?: boolean | null
          cycle_id?: string | null
          display_name: string
          id?: string
          match_type?: string | null
          merged_subject_ids?: Json
          primary_subject_id: string
          reverted_at?: string | null
          source_edital_ids?: string[] | null
          status?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          created_by_ai?: boolean | null
          cycle_id?: string | null
          display_name?: string
          id?: string
          match_type?: string | null
          merged_subject_ids?: Json
          primary_subject_id?: string
          reverted_at?: string | null
          source_edital_ids?: string[] | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subject_merges_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "user_cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subject_merges_primary_subject_id_fkey"
            columns: ["primary_subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      subject_relations: {
        Row: {
          created_at: string | null
          id: string
          main_subject_id: string
          merged_subject_ids: string[]
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          main_subject_id: string
          merged_subject_ids: string[]
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          main_subject_id?: string
          merged_subject_ids?: string[]
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      subjects: {
        Row: {
          color: string | null
          completed_at: string | null
          created_at: string
          edital_id: string | null
          exam_weight_percentage: number | null
          exam_weight_points: number | null
          exam_weight_questions: number | null
          exam_weight_raw: string | null
          id: string
          is_unified: boolean | null
          is_visible: boolean | null
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
          edital_id?: string | null
          exam_weight_percentage?: number | null
          exam_weight_points?: number | null
          exam_weight_questions?: number | null
          exam_weight_raw?: string | null
          id?: string
          is_unified?: boolean | null
          is_visible?: boolean | null
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
          edital_id?: string | null
          exam_weight_percentage?: number | null
          exam_weight_points?: number | null
          exam_weight_questions?: number | null
          exam_weight_raw?: string | null
          id?: string
          is_unified?: boolean | null
          is_visible?: boolean | null
          name?: string
          notes?: Json | null
          priority?: number | null
          status?: string
          total_study_time_minutes?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subjects_edital_id_fkey"
            columns: ["edital_id"]
            isOneToOne: false
            referencedRelation: "user_editais"
            referencedColumns: ["id"]
          },
        ]
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
      topic_merges: {
        Row: {
          created_at: string | null
          created_by_ai: boolean | null
          cycle_id: string | null
          display_name: string
          id: string
          match_type: string | null
          merged_topic_ids: Json
          primary_topic_id: string
          reverted_at: string | null
          source_edital_ids: string[] | null
          status: string
          subject_merge_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          created_by_ai?: boolean | null
          cycle_id?: string | null
          display_name: string
          id?: string
          match_type?: string | null
          merged_topic_ids?: Json
          primary_topic_id: string
          reverted_at?: string | null
          source_edital_ids?: string[] | null
          status?: string
          subject_merge_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          created_by_ai?: boolean | null
          cycle_id?: string | null
          display_name?: string
          id?: string
          match_type?: string | null
          merged_topic_ids?: Json
          primary_topic_id?: string
          reverted_at?: string | null
          source_edital_ids?: string[] | null
          status?: string
          subject_merge_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "topic_merges_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "user_cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "topic_merges_primary_topic_id_fkey"
            columns: ["primary_topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "topic_merges_subject_merge_id_fkey"
            columns: ["subject_merge_id"]
            isOneToOne: false
            referencedRelation: "subject_merges"
            referencedColumns: ["id"]
          },
        ]
      }
      topic_review_history: {
        Row: {
          created_at: string | null
          cycle_id: string | null
          difficulty_numeric: number | null
          edital_id: string | null
          id: string
          interval_after_review: number | null
          memory_stability_after_review: number | null
          review_stage: string
          reviewed_at: string
          study_duration_minutes: number | null
          topic_id: string
          trend_delta: number | null
          trend_label: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          cycle_id?: string | null
          difficulty_numeric?: number | null
          edital_id?: string | null
          id?: string
          interval_after_review?: number | null
          memory_stability_after_review?: number | null
          review_stage: string
          reviewed_at?: string
          study_duration_minutes?: number | null
          topic_id: string
          trend_delta?: number | null
          trend_label?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          cycle_id?: string | null
          difficulty_numeric?: number | null
          edital_id?: string | null
          id?: string
          interval_after_review?: number | null
          memory_stability_after_review?: number | null
          review_stage?: string
          reviewed_at?: string
          study_duration_minutes?: number | null
          topic_id?: string
          trend_delta?: number | null
          trend_label?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "topic_review_history_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "user_cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "topic_review_history_edital_id_fkey"
            columns: ["edital_id"]
            isOneToOne: false
            referencedRelation: "user_editais"
            referencedColumns: ["id"]
          },
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
          current_interval: number | null
          difficulty_level: number | null
          difficulty_set_at: string | null
          edital_id: string | null
          first_studied_at: string | null
          id: string
          is_active: boolean | null
          is_hidden: boolean | null
          is_marked_for_review: boolean | null
          is_skipped: boolean | null
          last_audit_log: Json | null
          last_reviewed_at: string | null
          last_search_context: string | null
          last_session_duration: number | null
          last_trend_check_at: string | null
          last_used_query: string | null
          marked_for_review_at: string | null
          memory_stability: number | null
          merged_with_ia: boolean | null
          name: string
          next_review: string | null
          notes: Json | null
          parent_topic_id: string | null
          position: number | null
          retention_score: number | null
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
          current_interval?: number | null
          difficulty_level?: number | null
          difficulty_set_at?: string | null
          edital_id?: string | null
          first_studied_at?: string | null
          id?: string
          is_active?: boolean | null
          is_hidden?: boolean | null
          is_marked_for_review?: boolean | null
          is_skipped?: boolean | null
          last_audit_log?: Json | null
          last_reviewed_at?: string | null
          last_search_context?: string | null
          last_session_duration?: number | null
          last_trend_check_at?: string | null
          last_used_query?: string | null
          marked_for_review_at?: string | null
          memory_stability?: number | null
          merged_with_ia?: boolean | null
          name: string
          next_review?: string | null
          notes?: Json | null
          parent_topic_id?: string | null
          position?: number | null
          retention_score?: number | null
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
          current_interval?: number | null
          difficulty_level?: number | null
          difficulty_set_at?: string | null
          edital_id?: string | null
          first_studied_at?: string | null
          id?: string
          is_active?: boolean | null
          is_hidden?: boolean | null
          is_marked_for_review?: boolean | null
          is_skipped?: boolean | null
          last_audit_log?: Json | null
          last_reviewed_at?: string | null
          last_search_context?: string | null
          last_session_duration?: number | null
          last_trend_check_at?: string | null
          last_used_query?: string | null
          marked_for_review_at?: string | null
          memory_stability?: number | null
          merged_with_ia?: boolean | null
          name?: string
          next_review?: string | null
          notes?: Json | null
          parent_topic_id?: string | null
          position?: number | null
          retention_score?: number | null
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
            foreignKeyName: "topics_edital_id_fkey"
            columns: ["edital_id"]
            isOneToOne: false
            referencedRelation: "user_editais"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "topics_parent_topic_id_fkey"
            columns: ["parent_topic_id"]
            isOneToOne: false
            referencedRelation: "topics"
            referencedColumns: ["id"]
          },
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
          name: string | null
          skipped_subjects: string[] | null
          status: string | null
          streak_dias_consecutivos: number | null
          unification_map: Json | null
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
          name?: string | null
          skipped_subjects?: string[] | null
          status?: string | null
          streak_dias_consecutivos?: number | null
          unification_map?: Json | null
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
          name?: string | null
          skipped_subjects?: string[] | null
          status?: string | null
          streak_dias_consecutivos?: number | null
          unification_map?: Json | null
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
      user_editais: {
        Row: {
          active_subject_ids: string[] | null
          category: string | null
          created_at: string
          exam_date: string | null
          id: string
          is_imported: boolean
          last_sync_snapshot: Json | null
          merged_into_cycle: boolean | null
          merged_with: string[] | null
          name: string
          organ: string | null
          position: string | null
          source_id: string | null
          subject_ids: string[]
          updated_at: string
          user_id: string
          year: string | null
        }
        Insert: {
          active_subject_ids?: string[] | null
          category?: string | null
          created_at?: string
          exam_date?: string | null
          id?: string
          is_imported?: boolean
          last_sync_snapshot?: Json | null
          merged_into_cycle?: boolean | null
          merged_with?: string[] | null
          name: string
          organ?: string | null
          position?: string | null
          source_id?: string | null
          subject_ids?: string[]
          updated_at?: string
          user_id: string
          year?: string | null
        }
        Update: {
          active_subject_ids?: string[] | null
          category?: string | null
          created_at?: string
          exam_date?: string | null
          id?: string
          is_imported?: boolean
          last_sync_snapshot?: Json | null
          merged_into_cycle?: boolean | null
          merged_with?: string[] | null
          name?: string
          organ?: string | null
          position?: string | null
          source_id?: string | null
          subject_ids?: string[]
          updated_at?: string
          user_id?: string
          year?: string | null
        }
        Relationships: []
      }
      user_events: {
        Row: {
          actor_user_id: string | null
          created_at: string
          event_type: string
          id: number
          ip: unknown
          metadata: Json
          occurred_at: string
          source: string | null
          status: string | null
          target_user_id: string | null
          tz: string | null
          user_agent: string | null
          user_id: string
          utc_offset_minutes: number | null
        }
        Insert: {
          actor_user_id?: string | null
          created_at?: string
          event_type: string
          id?: number
          ip?: unknown
          metadata?: Json
          occurred_at?: string
          source?: string | null
          status?: string | null
          target_user_id?: string | null
          tz?: string | null
          user_agent?: string | null
          user_id: string
          utc_offset_minutes?: number | null
        }
        Update: {
          actor_user_id?: string | null
          created_at?: string
          event_type?: string
          id?: number
          ip?: unknown
          metadata?: Json
          occurred_at?: string
          source?: string | null
          status?: string | null
          target_user_id?: string | null
          tz?: string | null
          user_agent?: string | null
          user_id?: string
          utc_offset_minutes?: number | null
        }
        Relationships: []
      }
      user_feedback_events: {
        Row: {
          actor_email: string | null
          actor_user_id: string
          admin_notes: string | null
          admin_reason: string | null
          admin_reply: string | null
          admin_reply_at: string | null
          assigned_at: string | null
          assigned_to: string | null
          context_label: string | null
          created_at: string
          description: string
          feature_area: string | null
          feedback_id: string
          first_response_at: string | null
          id: string
          impact: string
          metadata: Json | null
          protocol_code: string | null
          related_error_id: string | null
          resolved_at: string | null
          response_note: string | null
          route_path: string | null
          session_id: string | null
          sla_breached_first_response: boolean | null
          sla_breached_resolution: boolean | null
          sla_first_response_due_at: string | null
          sla_resolution_due_at: string | null
          status: string
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          actor_email?: string | null
          actor_user_id: string
          admin_notes?: string | null
          admin_reason?: string | null
          admin_reply?: string | null
          admin_reply_at?: string | null
          assigned_at?: string | null
          assigned_to?: string | null
          context_label?: string | null
          created_at?: string
          description: string
          feature_area?: string | null
          feedback_id: string
          first_response_at?: string | null
          id?: string
          impact?: string
          metadata?: Json | null
          protocol_code?: string | null
          related_error_id?: string | null
          resolved_at?: string | null
          response_note?: string | null
          route_path?: string | null
          session_id?: string | null
          sla_breached_first_response?: boolean | null
          sla_breached_resolution?: boolean | null
          sla_first_response_due_at?: string | null
          sla_resolution_due_at?: string | null
          status?: string
          title: string
          type: string
          updated_at?: string
        }
        Update: {
          actor_email?: string | null
          actor_user_id?: string
          admin_notes?: string | null
          admin_reason?: string | null
          admin_reply?: string | null
          admin_reply_at?: string | null
          assigned_at?: string | null
          assigned_to?: string | null
          context_label?: string | null
          created_at?: string
          description?: string
          feature_area?: string | null
          feedback_id?: string
          first_response_at?: string | null
          id?: string
          impact?: string
          metadata?: Json | null
          protocol_code?: string | null
          related_error_id?: string | null
          resolved_at?: string | null
          response_note?: string | null
          route_path?: string | null
          session_id?: string | null
          sla_breached_first_response?: boolean | null
          sla_breached_resolution?: boolean | null
          sla_first_response_due_at?: string | null
          sla_resolution_due_at?: string | null
          status?: string
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_notifications: {
        Row: {
          action_url: string | null
          category: string | null
          created_at: string
          data: Json | null
          id: string
          message: string
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          action_url?: string | null
          category?: string | null
          created_at?: string
          data?: Json | null
          id?: string
          message: string
          read?: boolean
          title: string
          type: string
          user_id: string
        }
        Update: {
          action_url?: string | null
          category?: string | null
          created_at?: string
          data?: Json | null
          id?: string
          message?: string
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
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
          asaas_customer_id: string | null
          asaas_subscription_id: string | null
          billing_type: string | null
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
          asaas_customer_id?: string | null
          asaas_subscription_id?: string | null
          billing_type?: string | null
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
          asaas_customer_id?: string | null
          asaas_subscription_id?: string | null
          billing_type?: string | null
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
      admin_deactivate_user: {
        Args: { target_user_id: string }
        Returns: undefined
      }
      admin_reactivate_user: {
        Args: { target_user_id: string }
        Returns: undefined
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
      atomic_cycle_load: {
        Args: {
          p_mode: string
          p_new_edital_id: string
          p_new_subject_ids: string[]
          p_old_edital_ids: string[]
          p_user_id: string
        }
        Returns: Json
      }
      atomic_cycle_unload_or_delete: {
        Args: { p_edital_id: string; p_user_id: string }
        Returns: Json
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
      calculate_slo_metrics: { Args: { p_days_window?: number }; Returns: Json }
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
      check_error_alerts: { Args: never; Returns: undefined }
      check_rate_limit: {
        Args: { p_endpoint: string; p_max_per_hour: number; p_user_id: string }
        Returns: boolean
      }
      cleanup_error_logs: {
        Args: { p_days_retention?: number }
        Returns: string
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
      get_audit_logs: {
        Args: {
          p_actor_user_id?: string
          p_end_date?: string
          p_event_type?: string
          p_limit?: number
          p_offset?: number
          p_start_date?: string
          p_status?: string
          p_target_user_id?: string
        }
        Returns: {
          actor_user_email: string
          actor_user_id: string
          actor_user_name: string
          event_type: string
          id: number
          metadata: Json
          occurred_at: string
          source: string
          status: string
          target_user_email: string
          target_user_id: string
          target_user_name: string
          total_count: number
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
      get_unified_subject_name: {
        Args: { subject_id: string; user_id: string }
        Returns: string
      }
      get_unified_topic_name: {
        Args: { topic_id: string; user_id: string }
        Returns: string
      }
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
      get_users_by_edital_source: {
        Args: { source_uuid: string }
        Returns: {
          user_id: string
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
      is_admin: { Args: never; Returns: boolean }
      is_organization_member: {
        Args: { _org_id: string; _user_id?: string }
        Returns: boolean
      }
      is_owner: { Args: { _user_id: string }; Returns: boolean }
      is_user_active: { Args: never; Returns: boolean }
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
      log_admin_error: {
        Args: {
          p_action: string
          p_actor_email?: string
          p_actor_user_id?: string
          p_category?: string
          p_code?: string
          p_context_label?: string
          p_environment?: string
          p_error_id: string
          p_feature_area?: string
          p_fingerprint?: string
          p_fingerprint_version?: string
          p_is_user_visible?: boolean
          p_metadata?: Json
          p_module: string
          p_recommended_action?: string
          p_recoverability?: string
          p_request_id?: string
          p_retryable?: boolean
          p_route_path?: string
          p_scope?: string
          p_session_id?: string
          p_severity?: string
          p_target_email?: string
          p_target_user_id?: string
          p_technical_message: string
          p_user_message: string
        }
        Returns: string
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
      log_user_event: {
        Args: {
          p_actor_user_id?: string
          p_event_type: string
          p_metadata?: Json
          p_origin?: string
          p_status?: string
          p_target_user_id?: string
        }
        Returns: Json
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
      revert_subject_merge: { Args: { merge_id: string }; Returns: undefined }
      revert_topic_merge: { Args: { merge_id: string }; Returns: undefined }
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
      use_coupon: {
        Args: {
          target_coupon_code: string
          target_sub_id?: string
          target_user_id: string
        }
        Returns: Json
      }
      validate_coupon: { Args: { target_coupon_code: string }; Returns: Json }
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
