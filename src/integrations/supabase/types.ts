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
      activity_logs: {
        Row: {
          action: string
          actor: string
          company_id: string
          created_at: string
          entity: string
          entity_id: string | null
          id: string
        }
        Insert: {
          action: string
          actor?: string
          company_id?: string
          created_at?: string
          entity?: string
          entity_id?: string | null
          id?: string
        }
        Update: {
          action?: string
          actor?: string
          company_id?: string
          created_at?: string
          entity?: string
          entity_id?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      customers: {
        Row: {
          address: string
          city: string
          company_id: string
          contact_person: string
          country: string
          created_at: string
          customer_type: string
          designation: string
          email: string
          id: string
          industry: string
          mobile: string
          name: string
          notes: string
          salesperson: string
          trn: string
          website: string
        }
        Insert: {
          address?: string
          city?: string
          company_id?: string
          contact_person?: string
          country?: string
          created_at?: string
          customer_type?: string
          designation?: string
          email?: string
          id?: string
          industry?: string
          mobile?: string
          name: string
          notes?: string
          salesperson?: string
          trn?: string
          website?: string
        }
        Update: {
          address?: string
          city?: string
          company_id?: string
          contact_person?: string
          country?: string
          created_at?: string
          customer_type?: string
          designation?: string
          email?: string
          id?: string
          industry?: string
          mobile?: string
          name?: string
          notes?: string
          salesperson?: string
          trn?: string
          website?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      follow_ups: {
        Row: {
          company_id: string
          created_at: string
          customer_id: string | null
          done: boolean
          due_date: string
          due_time: string
          id: string
          next_action: string
          notes: string
          owner: string
          quotation_id: string | null
          rfq_id: string | null
          type: string
        }
        Insert: {
          company_id?: string
          created_at?: string
          customer_id?: string | null
          done?: boolean
          due_date?: string
          due_time?: string
          id?: string
          next_action?: string
          notes?: string
          owner?: string
          quotation_id?: string | null
          rfq_id?: string | null
          type?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          customer_id?: string | null
          done?: boolean
          due_date?: string
          due_time?: string
          id?: string
          next_action?: string
          notes?: string
          owner?: string
          quotation_id?: string | null
          rfq_id?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "follow_ups_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follow_ups_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follow_ups_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "quotations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follow_ups_rfq_id_fkey"
            columns: ["rfq_id"]
            isOneToOne: false
            referencedRelation: "rfqs"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          company_id: string
          company_name: string
          contact_person: string
          created_at: string
          customer_id: string | null
          email: string
          expected_value: number
          id: string
          lead_date: string
          lead_no: string
          mobile: string
          next_followup: string | null
          notes: string
          probability: number
          requirement: string
          salesperson: string
          source: string
          status: string
        }
        Insert: {
          company_id?: string
          company_name: string
          contact_person?: string
          created_at?: string
          customer_id?: string | null
          email?: string
          expected_value?: number
          id?: string
          lead_date?: string
          lead_no: string
          mobile?: string
          next_followup?: string | null
          notes?: string
          probability?: number
          requirement?: string
          salesperson?: string
          source?: string
          status?: string
        }
        Update: {
          company_id?: string
          company_name?: string
          contact_person?: string
          created_at?: string
          customer_id?: string | null
          email?: string
          expected_value?: number
          id?: string
          lead_date?: string
          lead_no?: string
          mobile?: string
          next_followup?: string | null
          notes?: string
          probability?: number
          requirement?: string
          salesperson?: string
          source?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          company_id: string
          created_at: string
          id: string
          kind: string
          message: string
          quotation_id: string | null
          read_at: string | null
          rfq_id: string | null
          sender: string
          target_role: Database["public"]["Enums"]["app_role"] | null
          title: string
        }
        Insert: {
          company_id?: string
          created_at?: string
          id?: string
          kind?: string
          message?: string
          quotation_id?: string | null
          read_at?: string | null
          rfq_id?: string | null
          sender?: string
          target_role?: Database["public"]["Enums"]["app_role"] | null
          title: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          kind?: string
          message?: string
          quotation_id?: string | null
          read_at?: string | null
          rfq_id?: string | null
          sender?: string
          target_role?: Database["public"]["Enums"]["app_role"] | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "quotations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_rfq_id_fkey"
            columns: ["rfq_id"]
            isOneToOne: false
            referencedRelation: "rfqs"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          company_id: string
          created_at: string
          email: string
          full_name: string
          id: string
          job_title: string
        }
        Insert: {
          company_id?: string
          created_at?: string
          email?: string
          full_name?: string
          id: string
          job_title?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          job_title?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      quotation_items: {
        Row: {
          company_id: string
          created_at: string
          description: string
          id: string
          part_number: string
          quantity: number
          quotation_id: string
          unit_cost: number
          unit_price: number
        }
        Insert: {
          company_id?: string
          created_at?: string
          description?: string
          id?: string
          part_number?: string
          quantity?: number
          quotation_id: string
          unit_cost?: number
          unit_price?: number
        }
        Update: {
          company_id?: string
          created_at?: string
          description?: string
          id?: string
          part_number?: string
          quantity?: number
          quotation_id?: string
          unit_cost?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "quotation_items_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotation_items_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "quotations"
            referencedColumns: ["id"]
          },
        ]
      }
      quotations: {
        Row: {
          approval_status: string
          approved_at: string | null
          approved_by: string | null
          company_id: string
          created_at: string
          customer_id: string | null
          delivery_terms: string
          gp_percent: number | null
          id: string
          notes: string
          payment_terms: string
          quotation_no: string
          quote_date: string
          rfq_id: string | null
          salesperson: string
          sent_at: string | null
          status: string
          valid_until: string | null
          vat_percent: number
        }
        Insert: {
          approval_status?: string
          approved_at?: string | null
          approved_by?: string | null
          company_id?: string
          created_at?: string
          customer_id?: string | null
          delivery_terms?: string
          gp_percent?: number | null
          id?: string
          notes?: string
          payment_terms?: string
          quotation_no: string
          quote_date?: string
          rfq_id?: string | null
          salesperson?: string
          sent_at?: string | null
          status?: string
          valid_until?: string | null
          vat_percent?: number
        }
        Update: {
          approval_status?: string
          approved_at?: string | null
          approved_by?: string | null
          company_id?: string
          created_at?: string
          customer_id?: string | null
          delivery_terms?: string
          gp_percent?: number | null
          id?: string
          notes?: string
          payment_terms?: string
          quotation_no?: string
          quote_date?: string
          rfq_id?: string | null
          salesperson?: string
          sent_at?: string | null
          status?: string
          valid_until?: string | null
          vat_percent?: number
        }
        Relationships: [
          {
            foreignKeyName: "quotations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotations_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotations_rfq_id_fkey"
            columns: ["rfq_id"]
            isOneToOne: false
            referencedRelation: "rfqs"
            referencedColumns: ["id"]
          },
        ]
      }
      rfq_items: {
        Row: {
          brand: string
          category: string
          company_id: string
          created_at: string
          description: string
          id: string
          model: string
          notes: string
          part_number: string
          quantity: number
          rfq_id: string
          selected_quote_id: string | null
          selling_price: number
          target_price: number
        }
        Insert: {
          brand?: string
          category?: string
          company_id?: string
          created_at?: string
          description?: string
          id?: string
          model?: string
          notes?: string
          part_number?: string
          quantity?: number
          rfq_id: string
          selected_quote_id?: string | null
          selling_price?: number
          target_price?: number
        }
        Update: {
          brand?: string
          category?: string
          company_id?: string
          created_at?: string
          description?: string
          id?: string
          model?: string
          notes?: string
          part_number?: string
          quantity?: number
          rfq_id?: string
          selected_quote_id?: string | null
          selling_price?: number
          target_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "rfq_items_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rfq_items_rfq_id_fkey"
            columns: ["rfq_id"]
            isOneToOne: false
            referencedRelation: "rfqs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rfq_items_selected_quote_fk"
            columns: ["selected_quote_id"]
            isOneToOne: false
            referencedRelation: "supplier_quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      rfqs: {
        Row: {
          company_id: string
          created_at: string
          customer_id: string | null
          customer_reference: string
          id: string
          notes: string
          other_cost: number
          priority: string
          project_name: string
          ready_at: string | null
          ready_by: string | null
          required_date: string | null
          rfq_date: string
          rfq_no: string
          salesperson: string
          shipping_cost: number
          status: string
          submitted_at: string | null
          submitted_by: string | null
          target_gp_percent: number
        }
        Insert: {
          company_id?: string
          created_at?: string
          customer_id?: string | null
          customer_reference?: string
          id?: string
          notes?: string
          other_cost?: number
          priority?: string
          project_name?: string
          ready_at?: string | null
          ready_by?: string | null
          required_date?: string | null
          rfq_date?: string
          rfq_no: string
          salesperson?: string
          shipping_cost?: number
          status?: string
          submitted_at?: string | null
          submitted_by?: string | null
          target_gp_percent?: number
        }
        Update: {
          company_id?: string
          created_at?: string
          customer_id?: string | null
          customer_reference?: string
          id?: string
          notes?: string
          other_cost?: number
          priority?: string
          project_name?: string
          ready_at?: string | null
          ready_by?: string | null
          required_date?: string | null
          rfq_date?: string
          rfq_no?: string
          salesperson?: string
          shipping_cost?: number
          status?: string
          submitted_at?: string | null
          submitted_by?: string | null
          target_gp_percent?: number
        }
        Relationships: [
          {
            foreignKeyName: "rfqs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rfqs_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_quotes: {
        Row: {
          availability: string
          company_id: string
          created_at: string
          delivery_days: number
          id: string
          notes: string
          payment_terms: string
          quote_ref: string
          rfq_item_id: string
          supplier_id: string
          unit_cost: number
          warranty: string
        }
        Insert: {
          availability?: string
          company_id?: string
          created_at?: string
          delivery_days?: number
          id?: string
          notes?: string
          payment_terms?: string
          quote_ref?: string
          rfq_item_id: string
          supplier_id: string
          unit_cost?: number
          warranty?: string
        }
        Update: {
          availability?: string
          company_id?: string
          created_at?: string
          delivery_days?: number
          id?: string
          notes?: string
          payment_terms?: string
          quote_ref?: string
          rfq_item_id?: string
          supplier_id?: string
          unit_cost?: number
          warranty?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_quotes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_quotes_rfq_item_id_fkey"
            columns: ["rfq_item_id"]
            isOneToOne: false
            referencedRelation: "rfq_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_quotes_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          brands: string
          city: string
          company_id: string
          contact_person: string
          country: string
          created_at: string
          currency: string
          delivery_terms: string
          email: string
          id: string
          mobile: string
          name: string
          payment_terms: string
          reliability_notes: string
        }
        Insert: {
          brands?: string
          city?: string
          company_id?: string
          contact_person?: string
          country?: string
          created_at?: string
          currency?: string
          delivery_terms?: string
          email?: string
          id?: string
          mobile?: string
          name: string
          payment_terms?: string
          reliability_notes?: string
        }
        Update: {
          brands?: string
          city?: string
          company_id?: string
          contact_person?: string
          country?: string
          created_at?: string
          currency?: string
          delivery_terms?: string
          email?: string
          id?: string
          mobile?: string
          name?: string
          payment_terms?: string
          reliability_notes?: string
        }
        Relationships: [
          {
            foreignKeyName: "suppliers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_access_purchase: { Args: never; Returns: boolean }
      can_access_sales: { Args: never; Returns: boolean }
      current_company: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      quotation_item_costs: {
        Args: never
        Returns: {
          id: string
          unit_cost: number
        }[]
      }
    }
    Enums: {
      app_role: "super_admin" | "manager" | "crm" | "purchase"
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
      app_role: ["super_admin", "manager", "crm", "purchase"],
    },
  },
} as const
