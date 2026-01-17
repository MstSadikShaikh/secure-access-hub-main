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
      admin_wallets: {
        Row: {
          balance: number
          id: string
          updated_at: string
        }
        Insert: {
          balance?: number
          id?: string
          updated_at?: string
        }
        Update: {
          balance?: number
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      alerts: {
        Row: {
          alert_type: Database["public"]["Enums"]["alert_type"]
          created_at: string
          id: string
          message: string
          metadata: Json | null
          read_at: string | null
          severity: string
          status: Database["public"]["Enums"]["alert_status"]
          title: string
          transaction_id: string | null
          user_id: string
        }
        Insert: {
          alert_type: Database["public"]["Enums"]["alert_type"]
          created_at?: string
          id?: string
          message: string
          metadata?: Json | null
          read_at?: string | null
          severity?: string
          status?: Database["public"]["Enums"]["alert_status"]
          title: string
          transaction_id?: string | null
          user_id: string
        }
        Update: {
          alert_type?: Database["public"]["Enums"]["alert_type"]
          created_at?: string
          id?: string
          message?: string
          metadata?: Json | null
          read_at?: string | null
          severity?: string
          status?: Database["public"]["Enums"]["alert_status"]
          title?: string
          transaction_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "alerts_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          role: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      emergency_contacts: {
        Row: {
          created_at: string
          email: string | null
          id: string
          is_primary: boolean | null
          name: string
          phone: string
          relationship: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          is_primary?: boolean | null
          name: string
          phone: string
          relationship?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          is_primary?: boolean | null
          name?: string
          phone?: string
          relationship?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      fraud_reports: {
        Row: {
          admin_notes: string | null
          category: Database["public"]["Enums"]["fraud_category"]
          created_at: string
          description: string | null
          evidence_url: string | null
          id: string
          reported_upi_id: string
          reporter_id: string
          resolved_at: string | null
          resolved_by: string | null
          status: Database["public"]["Enums"]["report_status"]
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          category?: Database["public"]["Enums"]["fraud_category"]
          created_at?: string
          description?: string | null
          evidence_url?: string | null
          id?: string
          reported_upi_id: string
          reporter_id: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: Database["public"]["Enums"]["report_status"]
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          category?: Database["public"]["Enums"]["fraud_category"]
          created_at?: string
          description?: string | null
          evidence_url?: string | null
          id?: string
          reported_upi_id?: string
          reporter_id?: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: Database["public"]["Enums"]["report_status"]
          updated_at?: string
        }
        Relationships: []
      }
      known_phishing_domains: {
        Row: {
          domain: string
          first_reported_at: string
          id: string
          is_active: boolean
          last_reported_at: string
          metadata: Json | null
          reported_count: number
          source: string
          threat_type: string
        }
        Insert: {
          domain: string
          first_reported_at?: string
          id?: string
          is_active?: boolean
          last_reported_at?: string
          metadata?: Json | null
          reported_count?: number
          source?: string
          threat_type?: string
        }
        Update: {
          domain?: string
          first_reported_at?: string
          id?: string
          is_active?: boolean
          last_reported_at?: string
          metadata?: Json | null
          reported_count?: number
          source?: string
          threat_type?: string
        }
        Relationships: []
      }
      otp_verifications: {
        Row: {
          created_at: string
          email: string
          expires_at: string
          id: string
          otp_code: string
          verified: boolean | null
        }
        Insert: {
          created_at?: string
          email: string
          expires_at: string
          id?: string
          otp_code: string
          verified?: boolean | null
        }
        Update: {
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          otp_code?: string
          verified?: boolean | null
        }
        Relationships: []
      }
      phishing_attempts: {
        Row: {
          analysis_result: Json | null
          created_at: string
          id: string
          is_phishing: boolean
          risk_score: number
          risk_category: string
          threat_type: string | null
          url: string
          user_id: string
        }
        Insert: {
          analysis_result?: Json | null
          created_at?: string
          id?: string
          is_phishing?: boolean
          risk_score?: number
          risk_category: string
          threat_type?: string | null
          url: string
          user_id: string
        }
        Update: {
          analysis_result?: Json | null
          created_at?: string
          id?: string
          is_phishing?: boolean
          risk_score?: number
          risk_category?: string
          threat_type?: string | null
          url?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          alarm_enabled: boolean | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          notification_email: string | null
          phone: string | null
          shake_detection_enabled: boolean | null
          sos_enabled: boolean | null
          wallet_balance: number
          updated_at: string
          user_id: string
          upi_id: string | null
        }
        Insert: {
          alarm_enabled?: boolean | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          notification_email?: string | null
          phone?: string | null
          shake_detection_enabled?: boolean | null
          sos_enabled?: boolean | null
          wallet_balance?: number
          updated_at?: string
          user_id: string
          upi_id?: string | null
        }
        Update: {
          alarm_enabled?: boolean | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          notification_email?: string | null
          phone?: string | null
          shake_detection_enabled?: boolean | null
          sos_enabled?: boolean | null
          wallet_balance?: number
          updated_at?: string
          user_id?: string
          upi_id?: string | null
        }
        Relationships: []
      }
      sos_alerts: {
        Row: {
          contacts_notified: number | null
          created_at: string
          id: string
          latitude: number | null
          location_address: string | null
          longitude: number | null
          status: string
          trigger_method: string
          user_id: string
        }
        Insert: {
          contacts_notified?: number | null
          created_at?: string
          id?: string
          latitude?: number | null
          location_address?: string | null
          longitude?: number | null
          status?: string
          trigger_method: string
          user_id: string
        }
        Update: {
          contacts_notified?: number | null
          created_at?: string
          id?: string
          latitude?: number | null
          location_address?: string | null
          longitude?: number | null
          status?: string
          trigger_method?: string
          user_id?: string
        }
        Relationships: []
      }
      transaction_analysis: {
        Row: {
          ai_confidence: number
          analysis_reasons: Json | null
          created_at: string
          fraud_category: Database["public"]["Enums"]["fraud_category"] | null
          id: string
          is_anomaly: boolean
          risk_score: number
          transaction_id: string
          user_id: string
        }
        Insert: {
          ai_confidence?: number
          analysis_reasons?: Json | null
          created_at?: string
          fraud_category?: Database["public"]["Enums"]["fraud_category"] | null
          id?: string
          is_anomaly?: boolean
          risk_score?: number
          transaction_id: string
          user_id: string
        }
        Update: {
          ai_confidence?: number
          analysis_reasons?: Json | null
          created_at?: string
          fraud_category?: Database["public"]["Enums"]["fraud_category"] | null
          id?: string
          is_anomaly?: boolean
          risk_score?: number
          transaction_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transaction_analysis_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number
          created_at: string
          day_of_week: number | null
          device_fingerprint: string | null
          device_info: Json | null
          fraud_category: Database["public"]["Enums"]["fraud_category"] | null
          id: string
          is_flagged: boolean | null
          location: string | null
          receiver_upi_id: string
          sender_upi_id: string | null
          risk_score: number | null
          status: Database["public"]["Enums"]["transaction_status"]
          transaction_hour: number | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          day_of_week?: number | null
          device_fingerprint?: string | null
          device_info?: Json | null
          fraud_category?: Database["public"]["Enums"]["fraud_category"] | null
          id?: string
          is_flagged?: boolean | null
          location?: string | null
          receiver_upi_id: string
          sender_upi_id?: string | null
          risk_score?: number | null
          status?: Database["public"]["Enums"]["transaction_status"]
          transaction_hour?: number | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          day_of_week?: number | null
          device_fingerprint?: string | null
          device_info?: Json | null
          fraud_category?: Database["public"]["Enums"]["fraud_category"] | null
          id?: string
          is_flagged?: boolean | null
          location?: string | null
          receiver_upi_id?: string
          sender_upi_id?: string | null
          risk_score?: number | null
          status?: Database["public"]["Enums"]["transaction_status"]
          transaction_hour?: number | null
          user_id?: string
        }
        Relationships: []
      }
      trusted_contacts: {
        Row: {
          contact_name: string | null
          created_at: string
          id: string
          status: Database["public"]["Enums"]["contact_status"]
          updated_at: string
          upi_id: string
          user_id: string
        }
        Insert: {
          contact_name?: string | null
          created_at?: string
          id?: string
          status?: Database["public"]["Enums"]["contact_status"]
          updated_at?: string
          upi_id: string
          user_id: string
        }
        Update: {
          contact_name?: string | null
          created_at?: string
          id?: string
          status?: Database["public"]["Enums"]["contact_status"]
          updated_at?: string
          upi_id?: string
          user_id?: string
        }
        Relationships: []
      }
      upi_blacklist: {
        Row: {
          added_by: string | null
          created_at: string
          id: string
          reason: string | null
          reported_count: number | null
          severity: string | null
          source: string | null
          updated_at: string
          upi_id: string
        }
        Insert: {
          added_by?: string | null
          created_at?: string
          id?: string
          reason?: string | null
          reported_count?: number | null
          severity?: string | null
          source?: string | null
          updated_at?: string
          upi_id: string
        }
        Update: {
          added_by?: string | null
          created_at?: string
          id?: string
          reason?: string | null
          reported_count?: number | null
          severity?: string | null
          source?: string | null
          updated_at?: string
          upi_id?: string
        }
        Relationships: []
      }
      user_behavior_profiles: {
        Row: {
          avg_transaction_amount: number | null
          common_locations: Json | null
          created_at: string
          id: string
          last_transaction_at: string | null
          max_transaction_amount: number | null
          std_dev_amount: number | null
          transaction_count: number | null
          transaction_frequency: Json | null
          trusted_device_ids: string[] | null
          typical_transaction_hours: number[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avg_transaction_amount?: number | null
          common_locations?: Json | null
          created_at?: string
          id?: string
          last_transaction_at?: string | null
          max_transaction_amount?: number | null
          std_dev_amount?: number | null
          transaction_count?: number | null
          transaction_frequency?: Json | null
          trusted_device_ids?: string[] | null
          typical_transaction_hours?: number[] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avg_transaction_amount?: number | null
          common_locations?: Json | null
          created_at?: string
          id?: string
          last_transaction_at?: string | null
          max_transaction_amount?: number | null
          std_dev_amount?: number | null
          transaction_count?: number | null
          transaction_frequency?: Json | null
          trusted_device_ids?: string[] | null
          typical_transaction_hours?: number[] | null
          updated_at?: string
          user_id?: string
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
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
      distribute_funds: {
        Args: {
          target_user_id: string
          amount: number
        }
        Returns: void
      }
      p2p_transfer: {
        Args: {
          sender_id: string
          receiver_upi: string
          amount: number
        }
        Returns: string
      }
    }
    Enums: {
      alert_status: "unread" | "read" | "dismissed" | "actioned"
      alert_type:
      | "fraud_detected"
      | "phishing_attempt"
      | "suspicious_transaction"
      | "new_contact_warning"
      | "high_risk_pattern"
      app_role: "admin" | "user"
      contact_status: "trusted" | "new" | "flagged"
      fraud_category:
      | "phishing"
      | "impersonation"
      | "duplicate_id"
      | "social_engineering"
      | "fake_qr"
      | "suspicious_pattern"
      | "unknown"
      report_status: "pending" | "investigating" | "resolved" | "dismissed"
      transaction_status: "pending" | "completed" | "failed"
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
      alert_status: ["unread", "read", "dismissed", "actioned"],
      alert_type: [
        "fraud_detected",
        "phishing_attempt",
        "suspicious_transaction",
        "new_contact_warning",
        "high_risk_pattern",
      ],
      app_role: ["admin", "user"],
      contact_status: ["trusted", "new", "flagged"],
      fraud_category: [
        "phishing",
        "impersonation",
        "duplicate_id",
        "social_engineering",
        "fake_qr",
        "suspicious_pattern",
        "unknown",
      ],
      report_status: ["pending", "investigating", "resolved", "dismissed"],
      transaction_status: ["pending", "completed", "failed"],
    },
  },
} as const
