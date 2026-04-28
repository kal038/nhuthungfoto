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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      credit_history: {
        Row: {
          amount: number
          created_at: string | null
          id: string
          metadata: Json | null
          type: Database["public"]["Enums"]["transaction_type"]
          user_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          id?: string
          metadata?: Json | null
          type: Database["public"]["Enums"]["transaction_type"]
          user_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          id?: string
          metadata?: Json | null
          type?: Database["public"]["Enums"]["transaction_type"]
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "credit_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      modules: {
        Row: {
          content_markdown: string | null
          content_url: string | null
          created_at: string | null
          description: string | null
          id: string
          is_free: boolean | null
          level: Database["public"]["Enums"]["skill_level"] | null
          sequence_order: number | null
          slug: string
          title: string
          track: Database["public"]["Enums"]["specialty_track"] | null
          updated_at: string | null
        }
        Insert: {
          content_markdown?: string | null
          content_url?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_free?: boolean | null
          level?: Database["public"]["Enums"]["skill_level"] | null
          sequence_order?: number | null
          slug: string
          title: string
          track?: Database["public"]["Enums"]["specialty_track"] | null
          updated_at?: string | null
        }
        Update: {
          content_markdown?: string | null
          content_url?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_free?: boolean | null
          level?: Database["public"]["Enums"]["skill_level"] | null
          sequence_order?: number | null
          slug?: string
          title?: string
          track?: Database["public"]["Enums"]["specialty_track"] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          created_at: string | null
          external_ref: string
          id: string
          provider: string
          raw_payload: Json | null
          status: Database["public"]["Enums"]["payment_status"] | null
          user_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          external_ref: string
          id?: string
          provider: string
          raw_payload?: Json | null
          status?: Database["public"]["Enums"]["payment_status"] | null
          user_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          external_ref?: string
          id?: string
          provider?: string
          raw_payload?: Json | null
          status?: Database["public"]["Enums"]["payment_status"] | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          credits_balance: number | null
          full_name: string | null
          id: string
          locale: string | null
          phone_verified: boolean | null
          skill_level: Database["public"]["Enums"]["skill_level"] | null
          updated_at: string | null
        }
        Insert: {
          credits_balance?: number | null
          full_name?: string | null
          id: string
          locale?: string | null
          phone_verified?: boolean | null
          skill_level?: Database["public"]["Enums"]["skill_level"] | null
          updated_at?: string | null
        }
        Update: {
          credits_balance?: number | null
          full_name?: string | null
          id?: string
          locale?: string | null
          phone_verified?: boolean | null
          skill_level?: Database["public"]["Enums"]["skill_level"] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      reviews: {
        Row: {
          ai_feedback: string | null
          annotation_data: Json | null
          audio_url: string | null
          category_scores: Json | null
          created_at: string | null
          hung_comments: string | null
          id: string
          overall_score: number | null
          submission_id: string | null
        }
        Insert: {
          ai_feedback?: string | null
          annotation_data?: Json | null
          audio_url?: string | null
          category_scores?: Json | null
          created_at?: string | null
          hung_comments?: string | null
          id?: string
          overall_score?: number | null
          submission_id?: string | null
        }
        Update: {
          ai_feedback?: string | null
          annotation_data?: Json | null
          audio_url?: string | null
          category_scores?: Json | null
          created_at?: string | null
          hung_comments?: string | null
          id?: string
          overall_score?: number | null
          submission_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      submissions: {
        Row: {
          created_at: string | null
          id: string
          module_id: string | null
          original_photo_url: string | null
          processed_photo_url: string | null
          review_type: Database["public"]["Enums"]["review_type"] | null
          status: Database["public"]["Enums"]["submission_status"] | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          module_id?: string | null
          original_photo_url?: string | null
          processed_photo_url?: string | null
          review_type?: Database["public"]["Enums"]["review_type"] | null
          status?: Database["public"]["Enums"]["submission_status"] | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          module_id?: string | null
          original_photo_url?: string | null
          processed_photo_url?: string | null
          review_type?: Database["public"]["Enums"]["review_type"] | null
          status?: Database["public"]["Enums"]["submission_status"] | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "submissions_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submissions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      spend_credits: {
        Args: { amount: number; user_id: string }
        Returns: number
      }
    }
    Enums: {
      payment_status: "PENDING" | "SUCCESS" | "EXPIRED" | "CANCELLED"
      review_type: "AI" | "HUNG"
      skill_level: "BEGINNER" | "INTERMEDIATE" | "ADVANCED"
      specialty_track: "PORTRAIT" | "STREET" | "TRAVEL" | "PRODUCT"
      submission_status:
        | "UPLOADED"
        | "GRADING"
        | "AWAITING_HUNG"
        | "COMPLETED"
        | "FAILED"
      transaction_type: "PURCHASE" | "SPEND" | "REFUND" | "STARTER_BONUS"
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
      payment_status: ["PENDING", "SUCCESS", "EXPIRED", "CANCELLED"],
      review_type: ["AI", "HUNG"],
      skill_level: ["BEGINNER", "INTERMEDIATE", "ADVANCED"],
      specialty_track: ["PORTRAIT", "STREET", "TRAVEL", "PRODUCT"],
      submission_status: [
        "UPLOADED",
        "GRADING",
        "AWAITING_HUNG",
        "COMPLETED",
        "FAILED",
      ],
      transaction_type: ["PURCHASE", "SPEND", "REFUND", "STARTER_BONUS"],
    },
  },
} as const
