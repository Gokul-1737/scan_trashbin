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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      app_settings: {
        Row: {
          description: string | null
          id: string
          setting_key: string
          setting_value: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          description?: string | null
          id?: string
          setting_key: string
          setting_value: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          description?: string | null
          id?: string
          setting_key?: string
          setting_value?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      bins: {
        Row: {
          bin_id: string
          bin_name: string
          created_at: string
          id: string
          location: string | null
          status: boolean
          total_waste_collected: number
          updated_at: string
        }
        Insert: {
          bin_id: string
          bin_name: string
          created_at?: string
          id?: string
          location?: string | null
          status?: boolean
          total_waste_collected?: number
          updated_at?: string
        }
        Update: {
          bin_id?: string
          bin_name?: string
          created_at?: string
          id?: string
          location?: string | null
          status?: boolean
          total_waste_collected?: number
          updated_at?: string
        }
        Relationships: []
      }
      bonus_days: {
        Row: {
          created_at: string
          date: string
          id: string
          is_active: boolean
          multiplier: number
          name: string
        }
        Insert: {
          created_at?: string
          date: string
          id?: string
          is_active?: boolean
          multiplier?: number
          name: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          is_active?: boolean
          multiplier?: number
          name?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          is_blocked: boolean
          total_points: number
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          is_blocked?: boolean
          total_points?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          is_blocked?: boolean
          total_points?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      qr_transactions: {
        Row: {
          bin_id: string | null
          created_at: string
          expires_at: string
          fraud_flagged: boolean
          id: string
          is_duplicate: boolean
          is_valid: boolean
          qr_code: string
          scanned_at: string
          user_id: string | null
          waste_log_id: string | null
        }
        Insert: {
          bin_id?: string | null
          created_at?: string
          expires_at: string
          fraud_flagged?: boolean
          id?: string
          is_duplicate?: boolean
          is_valid?: boolean
          qr_code: string
          scanned_at?: string
          user_id?: string | null
          waste_log_id?: string | null
        }
        Update: {
          bin_id?: string | null
          created_at?: string
          expires_at?: string
          fraud_flagged?: boolean
          id?: string
          is_duplicate?: boolean
          is_valid?: boolean
          qr_code?: string
          scanned_at?: string
          user_id?: string | null
          waste_log_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "qr_transactions_bin_id_fkey"
            columns: ["bin_id"]
            isOneToOne: false
            referencedRelation: "bins"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qr_transactions_waste_log_id_fkey"
            columns: ["waste_log_id"]
            isOneToOne: false
            referencedRelation: "waste_logs"
            referencedColumns: ["id"]
          },
        ]
      }
      reward_requests: {
        Row: {
          admin_notes: string | null
          created_at: string
          id: string
          points_used: number
          processed_at: string | null
          processed_by: string | null
          reward_id: string
          status: Database["public"]["Enums"]["request_status"]
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          id?: string
          points_used: number
          processed_at?: string | null
          processed_by?: string | null
          reward_id: string
          status?: Database["public"]["Enums"]["request_status"]
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          id?: string
          points_used?: number
          processed_at?: string | null
          processed_by?: string | null
          reward_id?: string
          status?: Database["public"]["Enums"]["request_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reward_requests_reward_id_fkey"
            columns: ["reward_id"]
            isOneToOne: false
            referencedRelation: "rewards"
            referencedColumns: ["id"]
          },
        ]
      }
      rewards: {
        Row: {
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_enabled: boolean
          points_required: number
          reward_name: string
          reward_type: Database["public"]["Enums"]["reward_type"]
          stock: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_enabled?: boolean
          points_required: number
          reward_name: string
          reward_type: Database["public"]["Enums"]["reward_type"]
          stock?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_enabled?: boolean
          points_required?: number
          reward_name?: string
          reward_type?: Database["public"]["Enums"]["reward_type"]
          stock?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      waste_logs: {
        Row: {
          bin_id: string | null
          created_at: string
          id: string
          is_valid: boolean
          points_earned: number
          qr_code: string | null
          qr_used_at: string | null
          user_id: string | null
          waste_type_id: string | null
          weight_kg: number
        }
        Insert: {
          bin_id?: string | null
          created_at?: string
          id?: string
          is_valid?: boolean
          points_earned: number
          qr_code?: string | null
          qr_used_at?: string | null
          user_id?: string | null
          waste_type_id?: string | null
          weight_kg: number
        }
        Update: {
          bin_id?: string | null
          created_at?: string
          id?: string
          is_valid?: boolean
          points_earned?: number
          qr_code?: string | null
          qr_used_at?: string | null
          user_id?: string | null
          waste_type_id?: string | null
          weight_kg?: number
        }
        Relationships: [
          {
            foreignKeyName: "waste_logs_bin_id_fkey"
            columns: ["bin_id"]
            isOneToOne: false
            referencedRelation: "bins"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waste_logs_waste_type_id_fkey"
            columns: ["waste_type_id"]
            isOneToOne: false
            referencedRelation: "waste_types"
            referencedColumns: ["id"]
          },
        ]
      }
      waste_types: {
        Row: {
          created_at: string
          icon: string | null
          id: string
          is_enabled: boolean
          name: string
          points_per_kg: number
          type: Database["public"]["Enums"]["waste_type"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          icon?: string | null
          id?: string
          is_enabled?: boolean
          name: string
          points_per_kg?: number
          type: Database["public"]["Enums"]["waste_type"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          icon?: string | null
          id?: string
          is_enabled?: boolean
          name?: string
          points_per_kg?: number
          type?: Database["public"]["Enums"]["waste_type"]
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      credit_waste_qr_scan: {
        Args: {
          p_bin_id?: string
          p_expires_at?: string
          p_points: number
          p_qr_code: string
          p_user_id: string
          p_waste_name: string
          p_weight_kg?: number
        }
        Returns: Json
      }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
      request_status: "pending" | "approved" | "rejected"
      reward_type: "cash" | "coupon" | "gift"
      waste_type: "wet" | "dry" | "plastic" | "metal" | "glass" | "ewaste"
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
      app_role: ["admin", "user"],
      request_status: ["pending", "approved", "rejected"],
      reward_type: ["cash", "coupon", "gift"],
      waste_type: ["wet", "dry", "plastic", "metal", "glass", "ewaste"],
    },
  },
} as const
