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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      entries: {
        Row: {
          allow_typing: boolean
          content: string
          created_at: string
          id: number
          journal_id: number
          kind: Database["public"]["Enums"]["piece_kind"]
          published_at: string | null
          scheduled_at: string | null
          status: Database["public"]["Enums"]["entry_status"]
          title: string | null
          updated_at: string
          visibility: Database["public"]["Enums"]["visibility"]
        }
        Insert: {
          allow_typing?: boolean
          content: string
          created_at?: string
          id?: never
          journal_id: number
          kind?: Database["public"]["Enums"]["piece_kind"]
          published_at?: string | null
          scheduled_at?: string | null
          status?: Database["public"]["Enums"]["entry_status"]
          title?: string | null
          updated_at?: string
          visibility?: Database["public"]["Enums"]["visibility"]
        }
        Update: {
          allow_typing?: boolean
          content?: string
          created_at?: string
          id?: never
          journal_id?: number
          kind?: Database["public"]["Enums"]["piece_kind"]
          published_at?: string | null
          scheduled_at?: string | null
          status?: Database["public"]["Enums"]["entry_status"]
          title?: string | null
          updated_at?: string
          visibility?: Database["public"]["Enums"]["visibility"]
        }
        Relationships: [
          {
            foreignKeyName: "entries_journal_id_fkey"
            columns: ["journal_id"]
            isOneToOne: false
            referencedRelation: "journals"
            referencedColumns: ["id"]
          },
        ]
      }
      friendships: {
        Row: {
          created_at: string
          friend_id: string
          id: number
          status: Database["public"]["Enums"]["friendship_status"]
          user_id: string
        }
        Insert: {
          created_at?: string
          friend_id: string
          id?: never
          status?: Database["public"]["Enums"]["friendship_status"]
          user_id?: string
        }
        Update: {
          created_at?: string
          friend_id?: string
          id?: never
          status?: Database["public"]["Enums"]["friendship_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "friendships_friend_id_fkey"
            columns: ["friend_id"]
            isOneToOne: false
            referencedRelation: "entries_with_author"
            referencedColumns: ["author_id"]
          },
          {
            foreignKeyName: "friendships_friend_id_fkey"
            columns: ["friend_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "friendships_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "entries_with_author"
            referencedColumns: ["author_id"]
          },
          {
            foreignKeyName: "friendships_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_read_state: {
        Row: {
          journal_id: number
          last_seen_entry_id: number
          updated_at: string
          user_id: string
        }
        Insert: {
          journal_id: number
          last_seen_entry_id: number
          updated_at?: string
          user_id?: string
        }
        Update: {
          journal_id?: number
          last_seen_entry_id?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "journal_read_state_journal_id_fkey"
            columns: ["journal_id"]
            isOneToOne: false
            referencedRelation: "journals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_read_state_last_seen_entry_id_fkey"
            columns: ["last_seen_entry_id"]
            isOneToOne: false
            referencedRelation: "entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_read_state_last_seen_entry_id_fkey"
            columns: ["last_seen_entry_id"]
            isOneToOne: false
            referencedRelation: "entries_with_author"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_read_state_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "entries_with_author"
            referencedColumns: ["author_id"]
          },
          {
            foreignKeyName: "journal_read_state_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      journals: {
        Row: {
          created_at: string
          description: string | null
          id: number
          title: string
          user_id: string
          visibility: Database["public"]["Enums"]["visibility"]
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: never
          title: string
          user_id?: string
          visibility?: Database["public"]["Enums"]["visibility"]
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: never
          title?: string
          user_id?: string
          visibility?: Database["public"]["Enums"]["visibility"]
        }
        Relationships: [
          {
            foreignKeyName: "journals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "entries_with_author"
            referencedColumns: ["author_id"]
          },
          {
            foreignKeyName: "journals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      message_encrypted_payloads: {
        Row: {
          cipher: string
          id: number
          message_id: number
          nonce: string | null
          recipient_id: string
          version: number
        }
        Insert: {
          cipher: string
          id?: never
          message_id: number
          nonce?: string | null
          recipient_id: string
          version?: number
        }
        Update: {
          cipher?: string
          id?: never
          message_id?: number
          nonce?: string | null
          recipient_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "message_encrypted_payloads_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_encrypted_payloads_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "entries_with_author"
            referencedColumns: ["author_id"]
          },
          {
            foreignKeyName: "message_encrypted_payloads_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      message_room_members: {
        Row: {
          joined_at: string
          role: Database["public"]["Enums"]["room_role"]
          room_id: number
          user_id: string
        }
        Insert: {
          joined_at?: string
          role?: Database["public"]["Enums"]["room_role"]
          room_id: number
          user_id: string
        }
        Update: {
          joined_at?: string
          role?: Database["public"]["Enums"]["room_role"]
          room_id?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_room_members_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "message_rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_room_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "entries_with_author"
            referencedColumns: ["author_id"]
          },
          {
            foreignKeyName: "message_room_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      message_rooms: {
        Row: {
          created_at: string
          created_by: string
          id: number
          room_type: Database["public"]["Enums"]["room_type"]
          title: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string
          id?: never
          room_type?: Database["public"]["Enums"]["room_type"]
          title?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: never
          room_type?: Database["public"]["Enums"]["room_type"]
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "message_rooms_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "entries_with_author"
            referencedColumns: ["author_id"]
          },
          {
            foreignKeyName: "message_rooms_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          created_at: string
          e2ee_nonce: string | null
          id: number
          room_id: number
          sender_id: string
          text_content: string | null
        }
        Insert: {
          created_at?: string
          e2ee_nonce?: string | null
          id?: never
          room_id: number
          sender_id?: string
          text_content?: string | null
        }
        Update: {
          created_at?: string
          e2ee_nonce?: string | null
          id?: never
          room_id?: number
          sender_id?: string
          text_content?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "message_rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "entries_with_author"
            referencedColumns: ["author_id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          bio: string | null
          created_at: string
          id: string
          image: string | null
          is_private: boolean
          name: string | null
          type: Database["public"]["Enums"]["user_type"]
          updated_at: string
          xp: number
        }
        Insert: {
          bio?: string | null
          created_at?: string
          id: string
          image?: string | null
          is_private?: boolean
          name?: string | null
          type?: Database["public"]["Enums"]["user_type"]
          updated_at?: string
          xp?: number
        }
        Update: {
          bio?: string | null
          created_at?: string
          id?: string
          image?: string | null
          is_private?: boolean
          name?: string | null
          type?: Database["public"]["Enums"]["user_type"]
          updated_at?: string
          xp?: number
        }
        Relationships: []
      }
      streaks: {
        Row: {
          last_post_date: string | null
          streak_count: number
          user_id: string
        }
        Insert: {
          last_post_date?: string | null
          streak_count?: number
          user_id: string
        }
        Update: {
          last_post_date?: string | null
          streak_count?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "streaks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "entries_with_author"
            referencedColumns: ["author_id"]
          },
          {
            foreignKeyName: "streaks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      typing_scores: {
        Row: {
          accuracy: number
          chars_correct: number | null
          chars_incorrect: number | null
          consistency: number | null
          created_at: string
          duration_seconds: number
          entry_id: number | null
          id: number
          match_id: string | null
          mode: string
          mode_value: number | null
          placement: number | null
          raw_wpm: number | null
          user_id: string
          wpm: number
        }
        Insert: {
          accuracy: number
          chars_correct?: number | null
          chars_incorrect?: number | null
          consistency?: number | null
          created_at?: string
          duration_seconds: number
          entry_id?: number | null
          id?: never
          match_id?: string | null
          mode: string
          mode_value?: number | null
          placement?: number | null
          raw_wpm?: number | null
          user_id?: string
          wpm: number
        }
        Update: {
          accuracy?: number
          chars_correct?: number | null
          chars_incorrect?: number | null
          consistency?: number | null
          created_at?: string
          duration_seconds?: number
          entry_id?: number | null
          id?: never
          match_id?: string | null
          mode?: string
          mode_value?: number | null
          placement?: number | null
          raw_wpm?: number | null
          user_id?: string
          wpm?: number
        }
        Relationships: [
          {
            foreignKeyName: "typing_scores_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "typing_scores_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "entries_with_author"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "typing_scores_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "entries_with_author"
            referencedColumns: ["author_id"]
          },
          {
            foreignKeyName: "typing_scores_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_achievements: {
        Row: {
          achievement_code: string
          unlocked_at: string
          user_id: string
        }
        Insert: {
          achievement_code: string
          unlocked_at?: string
          user_id: string
        }
        Update: {
          achievement_code?: string
          unlocked_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_achievements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "entries_with_author"
            referencedColumns: ["author_id"]
          },
          {
            foreignKeyName: "user_achievements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      entries_with_author: {
        Row: {
          allow_typing: boolean | null
          author_id: string | null
          author_image: string | null
          author_name: string | null
          author_private: boolean | null
          content: string | null
          created_at: string | null
          id: number | null
          journal_id: number | null
          journal_title: string | null
          journal_visibility: Database["public"]["Enums"]["visibility"] | null
          kind: Database["public"]["Enums"]["piece_kind"] | null
          published_at: string | null
          scheduled_at: string | null
          status: Database["public"]["Enums"]["entry_status"] | null
          title: string | null
          updated_at: string | null
          visibility: Database["public"]["Enums"]["visibility"] | null
        }
        Relationships: [
          {
            foreignKeyName: "entries_journal_id_fkey"
            columns: ["journal_id"]
            isOneToOne: false
            referencedRelation: "journals"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      achievement_progress: {
        Args: { p_user_id: string }
        Returns: {
          owned: string[]
          pieces_published: number
          pieces_shared: number
          pieces_typed: number
          poems_published: number
          races_completed: number
          races_won: number
          tests_completed: number
          times_typed_by_others: number
        }[]
      }
      are_friends: { Args: { a: string; b: string }; Returns: boolean }
      can_view_entry: {
        Args: {
          p_journal_id: number
          p_status: Database["public"]["Enums"]["entry_status"]
          p_visibility: Database["public"]["Enums"]["visibility"]
        }
        Returns: boolean
      }
      can_view_journal: { Args: { p_journal_id: number }; Returns: boolean }
      friend_suggestions: {
        Args: { p_limit?: number }
        Returns: {
          co_reads: number
          id: string
          image: string
          mutual_friends: number
          name: string
          score: number
        }[]
      }
      get_or_create_dm: { Args: { p_other: string }; Returns: number }
      grant_progress: {
        Args: {
          p_code_xp: number[]
          p_codes: string[]
          p_extra_xp?: number
          p_user_id: string
        }
        Returns: string[]
      }
      is_room_member: { Args: { p_room_id: number }; Returns: boolean }
      leaderboard: {
        Args: { p_mode: string; p_mode_value?: number; p_period?: string }
        Returns: {
          accuracy: number
          created_at: string
          image: string
          name: string
          user_id: string
          wpm: number
          xp: number
        }[]
      }
      my_profile_stats: {
        Args: never
        Returns: {
          achievements: number
          avg_wpm_last10: number
          best_wpm: number
          pieces: number
          tests: number
        }[]
      }
      my_rooms: {
        Args: { p_cursor_id?: number; p_cursor_ts?: string; p_limit?: number }
        Returns: {
          g_img1: string
          g_img2: string
          id: number
          kind: Database["public"]["Enums"]["room_type"]
          last_id: number
          last_ts: string
          other_user_id: string
          other_user_image: string
          other_user_name: string
          title: string
        }[]
      }
      my_typing_bests: {
        Args: never
        Returns: {
          avg_accuracy: number
          mode: string
          mode_value: number
          tests: number
          wpm: number
        }[]
      }
      owns_journal: { Args: { p_journal_id: number }; Returns: boolean }
      publish_due_entries: { Args: never; Returns: undefined }
      random_typing_pieces: {
        Args: {
          p_exclude?: number
          p_id?: number
          p_kind?: Database["public"]["Enums"]["piece_kind"]
        }
        Returns: {
          allow_typing: boolean | null
          author_id: string | null
          author_image: string | null
          author_name: string | null
          author_private: boolean | null
          content: string | null
          created_at: string | null
          id: number | null
          journal_id: number | null
          journal_title: string | null
          journal_visibility: Database["public"]["Enums"]["visibility"] | null
          kind: Database["public"]["Enums"]["piece_kind"] | null
          published_at: string | null
          scheduled_at: string | null
          status: Database["public"]["Enums"]["entry_status"] | null
          title: string | null
          updated_at: string | null
          visibility: Database["public"]["Enums"]["visibility"] | null
        }[]
        SetofOptions: {
          from: "*"
          to: "entries_with_author"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      send_message: {
        Args: {
          p_ciphertexts?: Json
          p_e2ee_nonce?: string
          p_room_id: number
          p_text?: string
        }
        Returns: number
      }
    }
    Enums: {
      entry_status: "draft" | "published" | "scheduled"
      friendship_status: "pending" | "accepted" | "blocked"
      piece_kind:
        | "story"
        | "poetry"
        | "riddle"
        | "novel"
        | "phrase"
        | "thought"
        | "article"
        | "blog"
        | "diary"
      room_role: "owner" | "admin" | "member"
      room_type: "dm" | "group"
      user_type: "business" | "page" | "admin" | "default"
      visibility: "public" | "friends" | "private"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      entry_status: ["draft", "published", "scheduled"],
      friendship_status: ["pending", "accepted", "blocked"],
      piece_kind: [
        "story",
        "poetry",
        "riddle",
        "novel",
        "phrase",
        "thought",
        "article",
        "blog",
        "diary",
      ],
      room_role: ["owner", "admin", "member"],
      room_type: ["dm", "group"],
      user_type: ["business", "page", "admin", "default"],
      visibility: ["public", "friends", "private"],
    },
  },
} as const
