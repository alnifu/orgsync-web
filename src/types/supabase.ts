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
      adviser_assignments: {
        Row: {
          assigned_at: string
          org_id: string
          user_id: string
        }
        Insert: {
          assigned_at?: string
          org_id: string
          user_id: string
        }
        Update: {
          assigned_at?: string
          org_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "adviser_assignments_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "adviser_assignments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      advisers: {
        Row: {
          assigned_at: string | null
          created_at: string | null
          member_id: string
          org_id: string
          updated_at: string | null
        }
        Insert: {
          assigned_at?: string | null
          created_at?: string | null
          member_id: string
          org_id: string
          updated_at?: string | null
        }
        Update: {
          assigned_at?: string | null
          created_at?: string | null
          member_id?: string
          org_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "advisers_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "advisers_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      event_participants: {
        Row: {
          event_id: string
          joined_at: string
          user_id: string
        }
        Insert: {
          event_id: string
          joined_at?: string
          user_id: string
        }
        Update: {
          event_id?: string
          joined_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_participants_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "event_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      event_posts: {
        Row: {
          created_at: string
          current_participants: number | null
          end_date: string
          id: string
          location: string
          max_participants: number | null
          start_date: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string
          current_participants?: number | null
          end_date: string
          id: string
          location: string
          max_participants?: number | null
          start_date: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string
          current_participants?: number | null
          end_date?: string
          id?: string
          location?: string
          max_participants?: number | null
          start_date?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_posts_id_fkey"
            columns: ["id"]
            isOneToOne: true
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
      events1: {
        Row: {
          created_at: string
          description: string | null
          event_time: string
          id: number
          location: string | null
          org_id: number
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          event_time: string
          id?: number
          location?: string | null
          org_id: number
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          event_time?: string
          id?: number
          location?: string | null
          org_id?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      form_posts: {
        Row: {
          created_at: string
          deadline: string | null
          form_url: string
          id: string
          required_fields: string[] | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string
          deadline?: string | null
          form_url: string
          id: string
          required_fields?: string[] | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string
          deadline?: string | null
          form_url?: string
          id?: string
          required_fields?: string[] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "form_posts_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      game_rooms: {
        Row: {
          created_at: string | null
          id: number
          save_data: Json
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: number
          save_data?: Json
          updated_at?: string | null
          user_id: string
        }
        Update: {
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
            foreignKeyName: "gamification_logs_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events1"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gamification_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      likes: {
        Row: {
          created_at: string | null
          id: string
          post_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          post_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          post_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      members: {
        Row: {
          avatar_url: string | null
          course: string
          created_at: string
          department: string
          email: string
          id: string
          name: string
          updated_at: string
          year: string
        }
        Insert: {
          avatar_url?: string | null
          course: string
          created_at?: string
          department: string
          email: string
          id?: string
          name: string
          updated_at?: string
          year: string
        }
        Update: {
          avatar_url?: string | null
          course?: string
          created_at?: string
          department?: string
          email?: string
          id?: string
          name?: string
          updated_at?: string
          year?: string
        }
        Relationships: []
      }
      mini_games: {
        Row: {
          created_at: string
          game_settings: Json | null
          id: number
          org_id: number
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          game_settings?: Json | null
          id?: never
          org_id: number
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          game_settings?: Json | null
          id?: never
          org_id?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      news_feed_posts: {
        Row: {
          content: string
          created_at: string
          date_posted: string
          id: number
          media: Json | null
          org_id: number
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          date_posted?: string
          id?: never
          media?: Json | null
          org_id: number
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          date_posted?: string
          id?: never
          media?: Json | null
          org_id?: number
          updated_at?: string
        }
        Relationships: []
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
      officers: {
        Row: {
          assigned_at: string | null
          id: string
          org_id: string | null
          position: string | null
        }
        Insert: {
          assigned_at?: string | null
          id: string
          org_id?: string | null
          position?: string | null
        }
        Update: {
          assigned_at?: string | null
          id?: string
          org_id?: string | null
          position?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "officers_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "officers_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      org_managers: {
        Row: {
          assigned_at: string
          manager_role: string
          org_id: string
          user_id: string
        }
        Insert: {
          assigned_at?: string
          manager_role: string
          org_id: string
          user_id: string
        }
        Update: {
          assigned_at?: string
          manager_role?: string
          org_id?: string
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
          joined_at: string | null
          org_id: string
          user_id: string
        }
        Insert: {
          is_active?: boolean | null
          joined_at?: string | null
          org_id: string
          user_id: string
        }
        Update: {
          is_active?: boolean | null
          joined_at?: string | null
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
      organization_members: {
        Row: {
          joined_at: string
          member_id: string
          org_id: string
          position: string
        }
        Insert: {
          joined_at?: string
          member_id: string
          org_id: string
          position?: string
        }
        Update: {
          joined_at?: string
          member_id?: string
          org_id?: string
          position?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_members_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
        Relationships: [
          {
            foreignKeyName: "organizations_adviser_id_fkey"
            columns: ["adviser_id"]
            isOneToOne: false
            referencedRelation: "officers"
            referencedColumns: ["id"]
          },
        ]
      }
      poll_options: {
        Row: {
          id: number
          option_text: string
          poll_id: number
        }
        Insert: {
          id?: never
          option_text: string
          poll_id: number
        }
        Update: {
          id?: never
          option_text?: string
          poll_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "poll_options_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "polls"
            referencedColumns: ["id"]
          },
        ]
      }
      poll_posts: {
        Row: {
          created_at: string
          end_date: string | null
          id: string
          multiple_choice: boolean | null
          options: string[]
          results: Json | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string
          end_date?: string | null
          id: string
          multiple_choice?: boolean | null
          options?: string[]
          results?: Json | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string
          end_date?: string | null
          id?: string
          multiple_choice?: boolean | null
          options?: string[]
          results?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "poll_posts_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      poll_votes: {
        Row: {
          id: number
          option_id: number
          poll_id: number
          user_id: string
          voted_at: string
        }
        Insert: {
          id?: never
          option_id: number
          poll_id: number
          user_id: string
          voted_at?: string
        }
        Update: {
          id?: never
          option_id?: number
          poll_id?: number
          user_id?: string
          voted_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "poll_votes_option_id_fkey"
            columns: ["option_id"]
            isOneToOne: false
            referencedRelation: "poll_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "poll_votes_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "polls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "poll_votes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      polls: {
        Row: {
          created_at: string
          id: number
          org_id: number
          question: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: never
          org_id: number
          question: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: never
          org_id?: number
          question?: string
          updated_at?: string
        }
        Relationships: []
      }
      posts: {
        Row: {
          content: string
          created_at: string
          id: string
          is_pinned: boolean | null
          org_id: string | null
          post_type: string
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
          id?: string
          is_pinned?: boolean | null
          org_id?: string | null
          post_type?: string
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
          id?: string
          is_pinned?: boolean | null
          org_id?: string | null
          post_type?: string
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
          title: string | null
        }
        Insert: {
          created_at?: string
          data?: Json | null
          id?: number
          title?: string | null
        }
        Update: {
          created_at?: string
          data?: Json | null
          id?: number
          title?: string | null
        }
        Relationships: []
      }
      rsvps: {
        Row: {
          created_at: string | null
          id: string
          post_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          post_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          post_id?: string | null
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
      survey_answers: {
        Row: {
          answer_text: string | null
          id: number
          question_id: number
          response_id: number
        }
        Insert: {
          answer_text?: string | null
          id?: never
          question_id: number
          response_id: number
        }
        Update: {
          answer_text?: string | null
          id?: never
          question_id?: number
          response_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "survey_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "survey_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_answers_response_id_fkey"
            columns: ["response_id"]
            isOneToOne: false
            referencedRelation: "survey_responses"
            referencedColumns: ["id"]
          },
        ]
      }
      survey_questions: {
        Row: {
          id: number
          question_text: string
          survey_id: number
        }
        Insert: {
          id?: never
          question_text: string
          survey_id: number
        }
        Update: {
          id?: never
          question_text?: string
          survey_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "survey_questions_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "surveys"
            referencedColumns: ["id"]
          },
        ]
      }
      survey_responses: {
        Row: {
          id: number
          responded_at: string
          survey_id: number
          user_id: string
        }
        Insert: {
          id?: never
          responded_at?: string
          survey_id: number
          user_id: string
        }
        Update: {
          id?: never
          responded_at?: string
          survey_id?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "survey_responses_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "surveys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_responses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      surveys: {
        Row: {
          created_at: string
          id: number
          org_id: number
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: never
          org_id: number
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: never
          org_id?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      tables_to_delete: {
        Row: {
          created_at: string
          id: number
          name_of_table: string | null
        }
        Insert: {
          created_at?: string
          id?: number
          name_of_table?: string | null
        }
        Update: {
          created_at?: string
          id?: number
          name_of_table?: string | null
        }
        Relationships: []
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
