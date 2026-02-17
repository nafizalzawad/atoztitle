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
      audit_logs: {
        Row: {
          action: string
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          new_value: Json | null
          old_value: Json | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          new_value?: Json | null
          old_value?: Json | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          new_value?: Json | null
          old_value?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      contacts: {
        Row: {
          bd_user_id: string
          company: string | null
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          email: string | null
          engagement_points: number
          first_name: string
          id: string
          intent: string
          is_deleted: boolean
          is_dnc: boolean
          last_name: string
          parent_company: string | null
          phone: string | null
          profession: Database["public"]["Enums"]["profession_type"] | null
          referral_by: string | null
          screenshot_url: string | null
          social_channel: Database["public"]["Enums"]["social_channel"] | null
          source: Database["public"]["Enums"]["client_source"]
          source_other: string | null
          stage: Database["public"]["Enums"]["crm_stage"]
          updated_at: string
          warm_prospect_reason: string | null
          warm_prospect_started_at: string | null
        }
        Insert: {
          bd_user_id: string
          company?: string | null
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          email?: string | null
          engagement_points?: number
          first_name: string
          id?: string
          intent: string
          is_deleted?: boolean
          is_dnc?: boolean
          last_name: string
          parent_company?: string | null
          phone?: string | null
          profession?: Database["public"]["Enums"]["profession_type"] | null
          referral_by?: string | null
          screenshot_url?: string | null
          social_channel?: Database["public"]["Enums"]["social_channel"] | null
          source: Database["public"]["Enums"]["client_source"]
          source_other?: string | null
          stage?: Database["public"]["Enums"]["crm_stage"]
          updated_at?: string
          warm_prospect_reason?: string | null
          warm_prospect_started_at?: string | null
        }
        Update: {
          bd_user_id?: string
          company?: string | null
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          email?: string | null
          engagement_points?: number
          first_name?: string
          id?: string
          intent?: string
          is_deleted?: boolean
          is_dnc?: boolean
          last_name?: string
          parent_company?: string | null
          phone?: string | null
          profession?: Database["public"]["Enums"]["profession_type"] | null
          referral_by?: string | null
          screenshot_url?: string | null
          social_channel?: Database["public"]["Enums"]["social_channel"] | null
          source?: Database["public"]["Enums"]["client_source"]
          source_other?: string | null
          stage?: Database["public"]["Enums"]["crm_stage"]
          updated_at?: string
          warm_prospect_reason?: string | null
          warm_prospect_started_at?: string | null
        }
        Relationships: []
      }
      deals: {
        Row: {
          bd_user_id: string
          contact_id: string
          created_at: string
          deal_date: string
          deal_value: number
          id: string
          notes: string | null
        }
        Insert: {
          bd_user_id: string
          contact_id: string
          created_at?: string
          deal_date: string
          deal_value: number
          id?: string
          notes?: string | null
        }
        Update: {
          bd_user_id?: string
          contact_id?: string
          created_at?: string
          deal_date?: string
          deal_value?: number
          id?: string
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "deals_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          connections_count: number
          created_at: string
          event_date: string
          followup_details: string | null
          id: string
          name: string
          summary: string | null
          user_id: string
        }
        Insert: {
          connections_count?: number
          created_at?: string
          event_date: string
          followup_details?: string | null
          id?: string
          name: string
          summary?: string | null
          user_id: string
        }
        Update: {
          connections_count?: number
          created_at?: string
          event_date?: string
          followup_details?: string | null
          id?: string
          name?: string
          summary?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          category: string
          contact_id: string
          created_at: string
          id: string
          notes: string | null
        }
        Insert: {
          amount: number
          category: string
          contact_id: string
          created_at?: string
          id?: string
          notes?: string | null
        }
        Update: {
          amount?: number
          category?: string
          contact_id?: string
          created_at?: string
          id?: string
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      follow_ups: {
        Row: {
          bd_user_id: string
          completed_at: string | null
          contact_id: string
          created_at: string
          follow_up_date: string
          follow_up_time: string | null
          id: string
          is_completed: boolean
          notes: string | null
          reminder_offset: string | null
        }
        Insert: {
          bd_user_id: string
          completed_at?: string | null
          contact_id: string
          created_at?: string
          follow_up_date: string
          follow_up_time?: string | null
          id?: string
          is_completed?: boolean
          notes?: string | null
          reminder_offset?: string | null
        }
        Update: {
          bd_user_id?: string
          completed_at?: string | null
          contact_id?: string
          created_at?: string
          follow_up_date?: string
          follow_up_time?: string | null
          id?: string
          is_completed?: boolean
          notes?: string | null
          reminder_offset?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "follow_ups_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string
          id: string
          is_active: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name: string
          id: string
          is_active?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          is_active?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      warm_lead_events: {
        Row: {
          contact_id: string
          created_at: string
          event_date: string
          event_type: Database["public"]["Enums"]["event_type"]
          id: string
          where_we_met: string
        }
        Insert: {
          contact_id: string
          created_at?: string
          event_date: string
          event_type: Database["public"]["Enums"]["event_type"]
          id?: string
          where_we_met: string
        }
        Update: {
          contact_id?: string
          created_at?: string
          event_date?: string
          event_type?: Database["public"]["Enums"]["event_type"]
          id?: string
          where_we_met?: string
        }
        Relationships: [
          {
            foreignKeyName: "warm_lead_events_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "bd_user"
      client_source:
      | "event"
      | "referral"
      | "direct_client"
      | "non_direct_client"
      | "social_media"
      | "other"
      crm_stage:
      | "lead"
      | "warm_lead"
      | "prospect"
      | "warm_prospect"
      | "client"
      | "active_client"
      event_type: "type_1" | "type_2" | "type_3"
      profession_type: "agent" | "lender" | "attorney" | "builder" | "other"
      social_channel: "linkedin" | "facebook" | "instagram" | "other"
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
      app_role: ["admin", "bd_user"],
      client_source: [
        "event",
        "referral",
        "direct_client",
        "non_direct_client",
        "social_media",
        "other",
      ],
      crm_stage: [
        "lead",
        "warm_lead",
        "prospect",
        "warm_prospect",
        "client",
        "active_client",
      ],
      event_type: ["type_1", "type_2", "type_3"],
      profession_type: ["agent", "lender", "attorney", "builder", "other"],
      social_channel: ["linkedin", "facebook", "instagram", "other"],
    },
  },
} as const
