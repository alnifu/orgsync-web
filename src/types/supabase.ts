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
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      event_evaluations: {
        Row: {
          benefits: string
          comments: string
          created_at: string
          design: number
          facilities: number
          id: string
          overall: number
          participation: number
          post_id: string
          problems: string
          speakers: number
          user_id: string
        }
        Insert: {
          benefits: string
          comments: string
          created_at?: string
          design: number
          facilities: number
          id?: string
          overall: number
          participation: number
          post_id?: string
          problems: string
          speakers: number
          user_id?: string
        }
        Update: {
          benefits?: string
          comments?: string
          created_at?: string
          design?: number
          facilities?: number
          id?: string
          overall?: number
          participation?: number
          post_id?: string
          problems?: string
          speakers?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_evaluations_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_evaluation_registration"
            columns: ["post_id", "user_id"]
            isOneToOne: false
            referencedRelation: "event_registrations"
            referencedColumns: ["post_id", "user_id"]
          },
        ]
      }
      event_registrations: {
        Row: {
          college: string
          created_at: string
          email: string
          first_name: string
          id: string
          last_name: string
          middle_initial: string
          post_id: string
          program: string
          section: string
          user_id: string
        }
        Insert: {
          college: string
          created_at?: string
          email: string
          first_name: string
          id?: string
          last_name: string
          middle_initial: string
          post_id?: string
          program: string
          section: string
          user_id?: string
        }
        Update: {
          college?: string
          created_at?: string
          email?: string
          first_name?: string
          id?: string
          last_name?: string
          middle_initial?: string
          post_id?: string
          program?: string
          section?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_registrations_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          created_at: string
          event_date: string
          event_time: string
          event_type: string
          id: string
          location: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          event_date: string
          event_time: string
          event_type: string
          id?: string
          location: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          event_date?: string
          event_time?: string
          event_type?: string
          id?: string
          location?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      form_responses: {
        Row: {
          id: string
          post_id: string
          responses: Json
          submitted_at: string | null
          user_id: string
        }
        Insert: {
          id?: string
          post_id: string
          responses: Json
          submitted_at?: string | null
          user_id: string
        }
        Update: {
          id?: string
          post_id?: string
          responses?: Json
          submitted_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "form_responses_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      game_rooms: {
        Row: {
          coins: number | null
          created_at: string | null
          id: number
          save_data: Json
          updated_at: string | null
          user_id: string
        }
        Insert: {
          coins?: number | null
          created_at?: string | null
          id?: number
          save_data?: Json
          updated_at?: string | null
          user_id: string
        }
        Update: {
          coins?: number | null
          created_at?: string | null
          id?: number
          save_data?: Json
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      gamification_logs: {
        Row: {
          action_type: string
          created_at: string
          event_id: number | null
          id: number
          points_awarded: number
          user_id: string
        }
        Insert: {
          action_type: string
          created_at?: string
          event_id?: number | null
          id?: never
          points_awarded: number
          user_id: string
        }
        Update: {
          action_type?: string
          created_at?: string
          event_id?: number | null
          id?: never
          points_awarded?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gamification_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          date_sent: string
          id: number
          message: string
          read: boolean
          user_id: string
        }
        Insert: {
          date_sent?: string
          id?: never
          message: string
          read?: boolean
          user_id: string
        }
        Update: {
          date_sent?: string
          id?: never
          message?: string
          read?: boolean
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      officer_profiles: {
        Row: {
          assigned_at: string
          officer_contact_number: string | null
          officer_email: string | null
          org_id: string
          position_title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_at?: string
          officer_contact_number?: string | null
          officer_email?: string | null
          org_id: string
          position_title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_at?: string
          officer_contact_number?: string | null
          officer_email?: string | null
          org_id?: string
          position_title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "officer_profiles_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "officer_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      org_managers: {
        Row: {
          assigned_at: string
          manager_role: string
          org_id: string
          position: string | null
          user_id: string
        }
        Insert: {
          assigned_at?: string
          manager_role: string
          org_id: string
          position?: string | null
          user_id: string
        }
        Update: {
          assigned_at?: string
          manager_role?: string
          org_id?: string
          position?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_managers_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_managers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      org_members: {
        Row: {
          is_active: boolean | null
          joined_at: string
          org_id: string
          user_id: string
        }
        Insert: {
          is_active?: boolean | null
          joined_at?: string
          org_id: string
          user_id: string
        }
        Update: {
          is_active?: boolean | null
          joined_at?: string
          org_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_members_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          abbrev_name: string
          adviser_id: string | null
          created_at: string
          date_established: string
          department: string | null
          description: string | null
          email: string | null
          id: string
          name: string
          org_code: string
          org_pic: string | null
          org_type: string
          status: string
          updated_at: string
        }
        Insert: {
          abbrev_name: string
          adviser_id?: string | null
          created_at?: string
          date_established: string
          department?: string | null
          description?: string | null
          email?: string | null
          id?: string
          name: string
          org_code: string
          org_pic?: string | null
          org_type: string
          status?: string
          updated_at?: string
        }
        Update: {
          abbrev_name?: string
          adviser_id?: string | null
          created_at?: string
          date_established?: string
          department?: string | null
          description?: string | null
          email?: string | null
          id?: string
          name?: string
          org_code?: string
          org_pic?: string | null
          org_type?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      poll_votes: {
        Row: {
          created_at: string | null
          id: string
          option_index: number
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          option_index: number
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          option_index?: number
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "poll_votes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_likes: {
        Row: {
          created_at: string | null
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          content: string
          created_at: string
          end_time: string | null
          event_date: string | null
          id: string
          is_pinned: boolean | null
          location: string | null
          media: Json | null
          media_urls: string | null
          org_id: string | null
          post_type: string
          start_time: string | null
          status: string | null
          tags: string[] | null
          title: string
          type: string | null
          updated_at: string | null
          user_id: string
          view_count: number | null
        }
        Insert: {
          content: string
          created_at?: string
          end_time?: string | null
          event_date?: string | null
          id?: string
          is_pinned?: boolean | null
          location?: string | null
          media?: Json | null
          media_urls?: string | null
          org_id?: string | null
          post_type?: string
          start_time?: string | null
          status?: string | null
          tags?: string[] | null
          title: string
          type?: string | null
          updated_at?: string | null
          user_id: string
          view_count?: number | null
        }
        Update: {
          content?: string
          created_at?: string
          end_time?: string | null
          event_date?: string | null
          id?: string
          is_pinned?: boolean | null
          location?: string | null
          media?: Json | null
          media_urls?: string | null
          org_id?: string | null
          post_type?: string
          start_time?: string | null
          status?: string | null
          tags?: string[] | null
          title?: string
          type?: string | null
          updated_at?: string | null
          user_id?: string
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "posts_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      quizzes: {
        Row: {
          created_at: string
          data: Json | null
          id: number
          org_id: string | null
          title: string | null
        }
        Insert: {
          created_at?: string
          data?: Json | null
          id?: number
          org_id?: string | null
          title?: string | null
        }
        Update: {
          created_at?: string
          data?: Json | null
          id?: number
          org_id?: string | null
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quizzes_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      reward_log: {
        Row: {
          action: string
          created_at: string | null
          id: string
          points: number
          post_id: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          id?: string
          points?: number
          post_id?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          id?: string
          points?: number
          post_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reward_log_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reward_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      rsvps: {
        Row: {
          created_at: string | null
          id: string
          post_id: string | null
          status: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          post_id?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          post_id?: string | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rsvps_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          granted_at: string
          role: string
          user_id: string
        }
        Insert: {
          granted_at?: string
          role: string
          user_id: string
        }
        Update: {
          granted_at?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          avatar_url: string | null
          college: string | null
          created_at: string
          department: string | null
          email: string | null
          employee_id: string | null
          first_name: string | null
          id: string
          last_name: string | null
          points: number | null
          position: string | null
          preferences: Json | null
          program: string | null
          student_number: string | null
          updated_at: string
          user_type: string | null
          year_level: number | null
        }
        Insert: {
          avatar_url?: string | null
          college?: string | null
          created_at?: string
          department?: string | null
          email?: string | null
          employee_id?: string | null
          first_name?: string | null
          id: string
          last_name?: string | null
          points?: number | null
          position?: string | null
          preferences?: Json | null
          program?: string | null
          student_number?: string | null
          updated_at?: string
          user_type?: string | null
          year_level?: number | null
        }
        Update: {
          avatar_url?: string | null
          college?: string | null
          created_at?: string
          department?: string | null
          email?: string | null
          employee_id?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          points?: number | null
          position?: string | null
          preferences?: Json | null
          program?: string | null
          student_number?: string | null
          updated_at?: string
          user_type?: string | null
          year_level?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      assign_adviser: {
        Args: { m_id: string; o_id: string }
        Returns: undefined
      }
      award_like_coins: {
        Args: { p_post_id: string; p_user_id: string }
        Returns: undefined
      }
      award_user_coins_once: {
        Args:
          | {
              p_action?: string
              p_points?: number
              p_post_id: string
              p_user_id: string
            }
          | { p_post_id: string; p_user_id: string }
        Returns: number
      }
      complete_user_profile: {
        Args: {
          p_college?: string
          p_department?: string
          p_employee_id?: string
          p_first_name: string
          p_last_name: string
          p_position?: string
          p_program?: string
          p_student_number?: string
          p_user_id: string
          p_user_type: string
          p_year_level?: number
        }
        Returns: undefined
      }
      delete_organization: {
        Args: { org_code_input: string; organization_id: string }
        Returns: undefined
      }
      demote_to_member: {
        Args: { officer_id: string; organization_id?: string }
        Returns: undefined
      }
      increment_view_count: {
        Args: { post_id: string }
        Returns: undefined
      }
      is_officer: {
        Args: { member_id: string; organization_id?: string }
        Returns: boolean
      }
      promote_to_officer: {
        Args: {
          member_id: string
          officer_position: string
          organization_id: string
        }
        Returns: undefined
      }
      remove_adviser: {
        Args: { m_id: string; o_id: string }
        Returns: undefined
      }
    }
    Enums: {
      user_role: "Member" | "Officer" | "Admin"
      user_type: "student" | "faculty"
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
      user_role: ["Member", "Officer", "Admin"],
      user_type: ["student", "faculty"],
    },
  },
} as const
