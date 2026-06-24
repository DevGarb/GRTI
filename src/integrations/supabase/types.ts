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
      api_tokens: {
        Row: {
          created_at: string
          created_by: string
          expires_at: string | null
          id: string
          is_active: boolean
          last_used_at: string | null
          name: string
          organization_id: string | null
          token: string
        }
        Insert: {
          created_at?: string
          created_by: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          last_used_at?: string | null
          name: string
          organization_id?: string | null
          token: string
        }
        Update: {
          created_at?: string
          created_by?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          last_used_at?: string | null
          name?: string
          organization_id?: string | null
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "api_tokens_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          entity_id: string | null
          entity_type: string
          id: string
          organization_id: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type: string
          id?: string
          organization_id?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          organization_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          level: string
          name: string
          organization_id: string
          parent_id: string | null
          score: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          level?: string
          name: string
          organization_id: string
          parent_id?: string | null
          score?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          level?: string
          name?: string
          organization_id?: string
          parent_id?: string | null
          score?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_insights_cache: {
        Row: {
          created_at: string
          highlights: Json
          id: string
          insights: Json
          op_status: string
          organization_id: string
          reference_from: string
          reference_to: string
          risks: Json
          technician_summaries: Json
          updated_at: string
          whatsapp_message: string | null
        }
        Insert: {
          created_at?: string
          highlights?: Json
          id?: string
          insights?: Json
          op_status?: string
          organization_id: string
          reference_from: string
          reference_to: string
          risks?: Json
          technician_summaries?: Json
          updated_at?: string
          whatsapp_message?: string | null
        }
        Update: {
          created_at?: string
          highlights?: Json
          id?: string
          insights?: Json
          op_status?: string
          organization_id?: string
          reference_from?: string
          reference_to?: string
          risks?: Json
          technician_summaries?: Json
          updated_at?: string
          whatsapp_message?: string | null
        }
        Relationships: []
      }
      delivery_reschedules: {
        Row: {
          created_at: string
          id: string
          new_date: string
          old_date: string | null
          reason: string
          task_id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          new_date: string
          old_date?: string | null
          reason: string
          task_id: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          new_date?: string
          old_date?: string | null
          reason?: string
          task_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "delivery_reschedules_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "project_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      evaluations: {
        Row: {
          comment: string | null
          created_at: string
          evaluator_id: string
          id: string
          score: number
          ticket_id: string
          type: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          evaluator_id: string
          id?: string
          score: number
          ticket_id: string
          type?: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          evaluator_id?: string
          id?: string
          score?: number
          ticket_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "evaluations_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_intervals: {
        Row: {
          created_at: string
          equipment_type: string
          id: string
          interval_days: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          equipment_type: string
          id?: string
          interval_days?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          equipment_type?: string
          id?: string
          interval_days?: number
          updated_at?: string
        }
        Relationships: []
      }
      management_report_config: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          last_sent_at: string | null
          organization_id: string
          send_time: string
          timezone: string
          updated_at: string
          webhook_url: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          last_sent_at?: string | null
          organization_id: string
          send_time?: string
          timezone?: string
          updated_at?: string
          webhook_url?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          last_sent_at?: string | null
          organization_id?: string
          send_time?: string
          timezone?: string
          updated_at?: string
          webhook_url?: string | null
        }
        Relationships: []
      }
      mvp_awards: {
        Row: {
          amount_brl: number
          approved_at: string | null
          approved_by: string | null
          award_level: string
          created_at: string
          final_score: number
          id: string
          month: number
          notes: string | null
          on_time_rate: number
          organization_id: string
          quality_rate: number
          rework_rate: number
          status: string
          updated_at: string
          user_id: string
          year: number
        }
        Insert: {
          amount_brl?: number
          approved_at?: string | null
          approved_by?: string | null
          award_level?: string
          created_at?: string
          final_score?: number
          id?: string
          month: number
          notes?: string | null
          on_time_rate?: number
          organization_id: string
          quality_rate?: number
          rework_rate?: number
          status?: string
          updated_at?: string
          user_id: string
          year: number
        }
        Update: {
          amount_brl?: number
          approved_at?: string | null
          approved_by?: string | null
          award_level?: string
          created_at?: string
          final_score?: number
          id?: string
          month?: number
          notes?: string | null
          on_time_rate?: number
          organization_id?: string
          quality_rate?: number
          rework_rate?: number
          status?: string
          updated_at?: string
          user_id?: string
          year?: number
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          organization_id: string | null
          read_at: string | null
          ticket_id: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          organization_id?: string | null
          read_at?: string | null
          ticket_id?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          organization_id?: string | null
          read_at?: string | null
          ticket_id?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      op_card_notes: {
        Row: {
          author_id: string
          body: string
          card_id: string
          created_at: string
          id: string
          mentioned_users: string[]
          module: string
          organization_id: string
        }
        Insert: {
          author_id: string
          body: string
          card_id: string
          created_at?: string
          id?: string
          mentioned_users?: string[]
          module: string
          organization_id: string
        }
        Update: {
          author_id?: string
          body?: string
          card_id?: string
          created_at?: string
          id?: string
          mentioned_users?: string[]
          module?: string
          organization_id?: string
        }
        Relationships: []
      }
      op_checklist_executions: {
        Row: {
          created_at: string
          executed_at: string
          executed_by: string
          id: string
          notes: string | null
          organization_id: string
          responses: Json
          site_id: string | null
          template_id: string
        }
        Insert: {
          created_at?: string
          executed_at?: string
          executed_by: string
          id?: string
          notes?: string | null
          organization_id: string
          responses?: Json
          site_id?: string | null
          template_id: string
        }
        Update: {
          created_at?: string
          executed_at?: string
          executed_by?: string
          id?: string
          notes?: string | null
          organization_id?: string
          responses?: Json
          site_id?: string | null
          template_id?: string
        }
        Relationships: []
      }
      op_checklist_items: {
        Row: {
          created_at: string
          id: string
          label: string
          position: number
          template_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          label: string
          position?: number
          template_id: string
        }
        Update: {
          created_at?: string
          id?: string
          label?: string
          position?: number
          template_id?: string
        }
        Relationships: []
      }
      op_checklist_templates: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          organization_id: string
          site_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          organization_id: string
          site_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          organization_id?: string
          site_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      op_companies: {
        Row: {
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          created_by: string
          id: string
          is_active: boolean
          name: string
          organization_id: string
          updated_at: string
        }
        Insert: {
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          created_by: string
          id?: string
          is_active?: boolean
          name: string
          organization_id: string
          updated_at?: string
        }
        Update: {
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          created_by?: string
          id?: string
          is_active?: boolean
          name?: string
          organization_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      op_deliveries: {
        Row: {
          address: string | null
          associated_name: string | null
          closed_at: string | null
          closed_by: string | null
          closure_summary: string | null
          company_id: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          created_by: string
          driver_id: string | null
          id: string
          notes: string | null
          organization_id: string
          period: string
          scheduled_date: string
          status: string
          type: string
          updated_at: string
          vehicle_id: string | null
        }
        Insert: {
          address?: string | null
          associated_name?: string | null
          closed_at?: string | null
          closed_by?: string | null
          closure_summary?: string | null
          company_id?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          created_by: string
          driver_id?: string | null
          id?: string
          notes?: string | null
          organization_id: string
          period?: string
          scheduled_date: string
          status?: string
          type?: string
          updated_at?: string
          vehicle_id?: string | null
        }
        Update: {
          address?: string | null
          associated_name?: string | null
          closed_at?: string | null
          closed_by?: string | null
          closure_summary?: string | null
          company_id?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          created_by?: string
          driver_id?: string | null
          id?: string
          notes?: string | null
          organization_id?: string
          period?: string
          scheduled_date?: string
          status?: string
          type?: string
          updated_at?: string
          vehicle_id?: string | null
        }
        Relationships: []
      }
      op_drivers: {
        Row: {
          created_at: string
          created_by: string
          default_vehicle_type: string
          id: string
          is_active: boolean
          name: string
          organization_id: string
          phone: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          default_vehicle_type?: string
          id?: string
          is_active?: boolean
          name: string
          organization_id: string
          phone?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          default_vehicle_type?: string
          id?: string
          is_active?: boolean
          name?: string
          organization_id?: string
          phone?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      op_maintenance_orders: {
        Row: {
          category: string
          closed_by: string | null
          closure_summary: string | null
          created_at: string
          created_by: string
          deadline: string | null
          description: string | null
          finished_at: string | null
          id: string
          notes: string | null
          om_number: number
          opened_at: string
          organization_id: string
          priority: string
          responsible: string | null
          site_id: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          category?: string
          closed_by?: string | null
          closure_summary?: string | null
          created_at?: string
          created_by: string
          deadline?: string | null
          description?: string | null
          finished_at?: string | null
          id?: string
          notes?: string | null
          om_number?: number
          opened_at?: string
          organization_id: string
          priority?: string
          responsible?: string | null
          site_id?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          closed_by?: string | null
          closure_summary?: string | null
          created_at?: string
          created_by?: string
          deadline?: string | null
          description?: string | null
          finished_at?: string | null
          id?: string
          notes?: string | null
          om_number?: number
          opened_at?: string
          organization_id?: string
          priority?: string
          responsible?: string | null
          site_id?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      op_maintenance_photos: {
        Row: {
          created_at: string
          id: string
          maintenance_order_id: string
          photo_type: string
          photo_url: string
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          id?: string
          maintenance_order_id: string
          photo_type?: string
          photo_url: string
          uploaded_by: string
        }
        Update: {
          created_at?: string
          id?: string
          maintenance_order_id?: string
          photo_type?: string
          photo_url?: string
          uploaded_by?: string
        }
        Relationships: []
      }
      op_mechanics: {
        Row: {
          created_at: string
          created_by: string
          id: string
          is_active: boolean
          name: string
          organization_id: string
          phone: string | null
          specialty: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          is_active?: boolean
          name: string
          organization_id: string
          phone?: string | null
          specialty?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          is_active?: boolean
          name?: string
          organization_id?: string
          phone?: string | null
          specialty?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      op_parts: {
        Row: {
          code: string | null
          created_at: string
          created_by: string
          default_price: number
          id: string
          is_active: boolean
          name: string
          organization_id: string
          updated_at: string
        }
        Insert: {
          code?: string | null
          created_at?: string
          created_by: string
          default_price?: number
          id?: string
          is_active?: boolean
          name: string
          organization_id: string
          updated_at?: string
        }
        Update: {
          code?: string | null
          created_at?: string
          created_by?: string
          default_price?: number
          id?: string
          is_active?: boolean
          name?: string
          organization_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      op_service_order_parts: {
        Row: {
          created_at: string
          id: string
          part_id: string | null
          part_name: string
          quantity: number
          service_order_id: string
          unit_price: number
        }
        Insert: {
          created_at?: string
          id?: string
          part_id?: string | null
          part_name: string
          quantity?: number
          service_order_id: string
          unit_price?: number
        }
        Update: {
          created_at?: string
          id?: string
          part_id?: string | null
          part_name?: string
          quantity?: number
          service_order_id?: string
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "op_service_order_parts_service_order_id_fkey"
            columns: ["service_order_id"]
            isOneToOne: false
            referencedRelation: "op_service_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      op_service_order_photos: {
        Row: {
          created_at: string
          id: string
          photo_type: string
          photo_url: string
          service_order_id: string
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          id?: string
          photo_type?: string
          photo_url: string
          service_order_id: string
          uploaded_by: string
        }
        Update: {
          created_at?: string
          id?: string
          photo_type?: string
          photo_url?: string
          service_order_id?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "op_service_order_photos_service_order_id_fkey"
            columns: ["service_order_id"]
            isOneToOne: false
            referencedRelation: "op_service_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      op_service_orders: {
        Row: {
          closed_by: string | null
          closure_summary: string | null
          company_id: string | null
          created_at: string
          created_by: string
          deadline: string | null
          description: string | null
          diagnosis: string | null
          finished_at: string | null
          id: string
          mechanic_id: string | null
          notes: string | null
          opened_at: string
          organization_id: string
          os_number: number
          status: string
          total_cost: number
          updated_at: string
          vehicle_id: string | null
          vehicle_model: string | null
          vehicle_plate: string | null
        }
        Insert: {
          closed_by?: string | null
          closure_summary?: string | null
          company_id?: string | null
          created_at?: string
          created_by: string
          deadline?: string | null
          description?: string | null
          diagnosis?: string | null
          finished_at?: string | null
          id?: string
          mechanic_id?: string | null
          notes?: string | null
          opened_at?: string
          organization_id: string
          os_number?: number
          status?: string
          total_cost?: number
          updated_at?: string
          vehicle_id?: string | null
          vehicle_model?: string | null
          vehicle_plate?: string | null
        }
        Update: {
          closed_by?: string | null
          closure_summary?: string | null
          company_id?: string | null
          created_at?: string
          created_by?: string
          deadline?: string | null
          description?: string | null
          diagnosis?: string | null
          finished_at?: string | null
          id?: string
          mechanic_id?: string | null
          notes?: string | null
          opened_at?: string
          organization_id?: string
          os_number?: number
          status?: string
          total_cost?: number
          updated_at?: string
          vehicle_id?: string | null
          vehicle_model?: string | null
          vehicle_plate?: string | null
        }
        Relationships: []
      }
      op_sites: {
        Row: {
          address: string | null
          created_at: string
          created_by: string
          id: string
          is_active: boolean
          name: string
          organization_id: string
          phone: string | null
          responsible: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          created_by: string
          id?: string
          is_active?: boolean
          name: string
          organization_id: string
          phone?: string | null
          responsible?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          created_by?: string
          id?: string
          is_active?: boolean
          name?: string
          organization_id?: string
          phone?: string | null
          responsible?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      op_vehicles: {
        Row: {
          created_at: string
          created_by: string
          id: string
          is_active: boolean
          model: string | null
          organization_id: string
          plate: string
          updated_at: string
          vehicle_type: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          is_active?: boolean
          model?: string | null
          organization_id: string
          plate: string
          updated_at?: string
          vehicle_type?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          is_active?: boolean
          model?: string | null
          organization_id?: string
          plate?: string
          updated_at?: string
          vehicle_type?: string
        }
        Relationships: []
      }
      organization_integrations: {
        Row: {
          api_token: string | null
          api_url: string | null
          created_at: string
          id: string
          instance_id: string | null
          integration_type: string
          is_active: boolean
          notify_on_assign: boolean
          notify_on_resolve: boolean
          organization_id: string
          updated_at: string
        }
        Insert: {
          api_token?: string | null
          api_url?: string | null
          created_at?: string
          id?: string
          instance_id?: string | null
          integration_type?: string
          is_active?: boolean
          notify_on_assign?: boolean
          notify_on_resolve?: boolean
          organization_id: string
          updated_at?: string
        }
        Update: {
          api_token?: string | null
          api_url?: string | null
          created_at?: string
          id?: string
          instance_id?: string | null
          integration_type?: string
          is_active?: boolean
          notify_on_assign?: boolean
          notify_on_resolve?: boolean
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_integrations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_webhooks: {
        Row: {
          created_at: string
          events: Json
          id: string
          is_active: boolean
          name: string
          organization_id: string
          secret: string | null
          updated_at: string
          url: string
        }
        Insert: {
          created_at?: string
          events?: Json
          id?: string
          is_active?: boolean
          name?: string
          organization_id: string
          secret?: string | null
          updated_at?: string
          url: string
        }
        Update: {
          created_at?: string
          events?: Json
          id?: string
          is_active?: boolean
          name?: string
          organization_id?: string
          secret?: string | null
          updated_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_webhooks_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          favicon_url: string | null
          id: string
          logo_url: string | null
          name: string
          plan_id: string | null
          primary_color: string | null
          secondary_color: string | null
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          favicon_url?: string | null
          id?: string
          logo_url?: string | null
          name: string
          plan_id?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          favicon_url?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          plan_id?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organizations_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      patrimonio: {
        Row: {
          asset_tag: string
          brand: string | null
          created_at: string
          created_by: string
          equipment_type: string
          id: string
          location: string | null
          model: string | null
          notes: string | null
          organization_id: string | null
          photo_url: string | null
          responsible: string | null
          sector: string | null
          serial_number: string | null
          status: string
          updated_at: string
        }
        Insert: {
          asset_tag: string
          brand?: string | null
          created_at?: string
          created_by: string
          equipment_type: string
          id?: string
          location?: string | null
          model?: string | null
          notes?: string | null
          organization_id?: string | null
          photo_url?: string | null
          responsible?: string | null
          sector?: string | null
          serial_number?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          asset_tag?: string
          brand?: string | null
          created_at?: string
          created_by?: string
          equipment_type?: string
          id?: string
          location?: string | null
          model?: string | null
          notes?: string | null
          organization_id?: string | null
          photo_url?: string | null
          responsible?: string | null
          sector?: string | null
          serial_number?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "patrimonio_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      patrimonio_history: {
        Row: {
          changed_at: string
          changed_by: string | null
          field: string
          id: string
          new_value: string | null
          old_value: string | null
          organization_id: string | null
          patrimonio_id: string
        }
        Insert: {
          changed_at?: string
          changed_by?: string | null
          field: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          organization_id?: string | null
          patrimonio_id: string
        }
        Update: {
          changed_at?: string
          changed_by?: string | null
          field?: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          organization_id?: string | null
          patrimonio_id?: string
        }
        Relationships: []
      }
      performance_goals: {
        Row: {
          created_at: string
          created_by: string
          id: string
          metric: string
          organization_id: string | null
          period: string
          reference_month: number | null
          reference_year: number
          target_id: string
          target_label: string
          target_type: string
          target_value: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          metric: string
          organization_id?: string | null
          period?: string
          reference_month?: number | null
          reference_year?: number
          target_id: string
          target_label?: string
          target_type?: string
          target_value?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          metric?: string
          organization_id?: string | null
          period?: string
          reference_month?: number | null
          reference_year?: number
          target_id?: string
          target_label?: string
          target_type?: string
          target_value?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "performance_goals_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      preventive_maintenance: {
        Row: {
          asset_tag: string
          checklist: Json
          created_at: string
          created_by: string
          equipment_type: string
          execution_date: string
          id: string
          notes: string | null
          organization_id: string | null
          responsible: string | null
          sector: string | null
          updated_at: string
        }
        Insert: {
          asset_tag: string
          checklist?: Json
          created_at?: string
          created_by: string
          equipment_type: string
          execution_date: string
          id?: string
          notes?: string | null
          organization_id?: string | null
          responsible?: string | null
          sector?: string | null
          updated_at?: string
        }
        Update: {
          asset_tag?: string
          checklist?: Json
          created_at?: string
          created_by?: string
          equipment_type?: string
          execution_date?: string
          id?: string
          notes?: string | null
          organization_id?: string | null
          responsible?: string | null
          sector?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "preventive_maintenance_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          cpf: string | null
          created_at: string
          email: string | null
          full_name: string
          id: string
          organization_id: string | null
          phone: string | null
          updated_at: string
          user_id: string
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          cpf?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          organization_id?: string | null
          phone?: string | null
          updated_at?: string
          user_id: string
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          cpf?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          organization_id?: string | null
          phone?: string | null
          updated_at?: string
          user_id?: string
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      project_tasks: {
        Row: {
          assignee_id: string | null
          co_assignee_id: string | null
          created_at: string
          created_by: string
          delivered_date: string | null
          description: string | null
          id: string
          organization_id: string | null
          planned_date: string | null
          priority: string
          project_id: string
          reopened_at: string | null
          rework_count: number
          sprint_id: string | null
          status: string
          story_points: number
          title: string
          updated_at: string
        }
        Insert: {
          assignee_id?: string | null
          co_assignee_id?: string | null
          created_at?: string
          created_by: string
          delivered_date?: string | null
          description?: string | null
          id?: string
          organization_id?: string | null
          planned_date?: string | null
          priority?: string
          project_id: string
          reopened_at?: string | null
          rework_count?: number
          sprint_id?: string | null
          status?: string
          story_points?: number
          title: string
          updated_at?: string
        }
        Update: {
          assignee_id?: string | null
          co_assignee_id?: string | null
          created_at?: string
          created_by?: string
          delivered_date?: string | null
          description?: string | null
          id?: string
          organization_id?: string | null
          planned_date?: string | null
          priority?: string
          project_id?: string
          reopened_at?: string | null
          rework_count?: number
          sprint_id?: string | null
          status?: string
          story_points?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          co_owner_id: string | null
          code: string | null
          created_at: string
          description: string | null
          end_date: string | null
          goal: string | null
          id: string
          name: string
          organization_id: string | null
          owner_id: string | null
          planned_end_date: string | null
          priority: string
          progress_percent: number
          start_date: string | null
          status: string
          updated_at: string
        }
        Insert: {
          co_owner_id?: string | null
          code?: string | null
          created_at?: string
          description?: string | null
          end_date?: string | null
          goal?: string | null
          id?: string
          name: string
          organization_id?: string | null
          owner_id?: string | null
          planned_end_date?: string | null
          priority?: string
          progress_percent?: number
          start_date?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          co_owner_id?: string | null
          code?: string | null
          created_at?: string
          description?: string | null
          end_date?: string | null
          goal?: string | null
          id?: string
          name?: string
          organization_id?: string | null
          owner_id?: string | null
          planned_end_date?: string | null
          priority?: string
          progress_percent?: number
          start_date?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      sectors: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          organization_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          organization_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          organization_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sectors_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      sprint_quality_checks: {
        Row: {
          backlog_ok: boolean
          checked_at: string
          checked_by: string | null
          doc_ok: boolean
          evidence_ok: boolean
          homolog_ok: boolean
          id: string
          sprint_id: string
          standards_ok: boolean
        }
        Insert: {
          backlog_ok?: boolean
          checked_at?: string
          checked_by?: string | null
          doc_ok?: boolean
          evidence_ok?: boolean
          homolog_ok?: boolean
          id?: string
          sprint_id: string
          standards_ok?: boolean
        }
        Update: {
          backlog_ok?: boolean
          checked_at?: string
          checked_by?: string | null
          doc_ok?: boolean
          evidence_ok?: boolean
          homolog_ok?: boolean
          id?: string
          sprint_id?: string
          standards_ok?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "sprint_quality_checks_sprint_id_fkey"
            columns: ["sprint_id"]
            isOneToOne: true
            referencedRelation: "sprints"
            referencedColumns: ["id"]
          },
        ]
      }
      sprints: {
        Row: {
          activated_at: string | null
          closed_at: string | null
          created_at: string
          created_by: string
          end_date: string | null
          goal: string | null
          id: string
          name: string
          organization_id: string | null
          owner_id: string | null
          project_id: string
          quality_score: number | null
          start_date: string | null
          status: string
          updated_at: string
        }
        Insert: {
          activated_at?: string | null
          closed_at?: string | null
          created_at?: string
          created_by: string
          end_date?: string | null
          goal?: string | null
          id?: string
          name: string
          organization_id?: string | null
          owner_id?: string | null
          project_id: string
          quality_score?: number | null
          start_date?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          activated_at?: string | null
          closed_at?: string | null
          created_at?: string
          created_by?: string
          end_date?: string | null
          goal?: string | null
          id?: string
          name?: string
          organization_id?: string | null
          owner_id?: string | null
          project_id?: string
          quality_score?: number | null
          start_date?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      subscription_plans: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          max_tickets_month: number
          max_users: number
          name: string
          price_monthly: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          max_tickets_month?: number
          max_users?: number
          name: string
          price_monthly?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          max_tickets_month?: number
          max_users?: number
          name?: string
          price_monthly?: number
          updated_at?: string
        }
        Relationships: []
      }
      task_status_history: {
        Row: {
          changed_at: string
          changed_by: string | null
          id: string
          new_status: string
          old_status: string | null
          task_id: string
        }
        Insert: {
          changed_at?: string
          changed_by?: string | null
          id?: string
          new_status: string
          old_status?: string | null
          task_id: string
        }
        Update: {
          changed_at?: string
          changed_by?: string | null
          id?: string
          new_status?: string
          old_status?: string | null
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_status_history_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "project_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_attachments: {
        Row: {
          created_at: string
          file_name: string | null
          file_url: string
          id: string
          ticket_id: string
        }
        Insert: {
          created_at?: string
          file_name?: string | null
          file_url: string
          id?: string
          ticket_id: string
        }
        Update: {
          created_at?: string
          file_name?: string | null
          file_url?: string
          id?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_attachments_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          is_public: boolean
          ticket_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_public?: boolean
          ticket_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_public?: boolean
          ticket_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_comments_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      ticket_history: {
        Row: {
          action: string
          created_at: string
          id: string
          new_value: string | null
          old_value: string | null
          ticket_id: string
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          ticket_id: string
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          ticket_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_history_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets: {
        Row: {
          assigned_to: string | null
          category_id: string | null
          closed_at: string | null
          created_at: string
          created_by: string
          description: string | null
          id: string
          last_seen_by_requester_at: string | null
          organization_id: string | null
          original_assigned_to: string | null
          picked_at: string | null
          priority: string
          project_id: string | null
          sector: string | null
          sla_deadline: string | null
          sprint_id: string | null
          started_at: string | null
          status: string
          story_points: number | null
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          category_id?: string | null
          closed_at?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          last_seen_by_requester_at?: string | null
          organization_id?: string | null
          original_assigned_to?: string | null
          picked_at?: string | null
          priority?: string
          project_id?: string | null
          sector?: string | null
          sla_deadline?: string | null
          sprint_id?: string | null
          started_at?: string | null
          status?: string
          story_points?: number | null
          title: string
          type?: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          category_id?: string | null
          closed_at?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          last_seen_by_requester_at?: string | null
          organization_id?: string | null
          original_assigned_to?: string | null
          picked_at?: string | null
          priority?: string
          project_id?: string | null
          sector?: string | null
          sla_deadline?: string | null
          sprint_id?: string | null
          started_at?: string | null
          status?: string
          story_points?: number | null
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tickets_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tickets_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_menu_overrides: {
        Row: {
          created_at: string
          created_by: string | null
          granted: boolean
          id: string
          menu_key: string
          organization_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          granted: boolean
          id?: string
          menu_key: string
          organization_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          granted?: boolean
          id?: string
          menu_key?: string
          organization_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_organization_roles: {
        Row: {
          created_at: string
          id: string
          organization_id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_organizations: {
        Row: {
          created_at: string
          id: string
          organization_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
          user_id?: string
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
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_todo_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          todo_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          todo_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          todo_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_todo_comments_todo_id_fkey"
            columns: ["todo_id"]
            isOneToOne: false
            referencedRelation: "user_todos"
            referencedColumns: ["id"]
          },
        ]
      }
      user_todo_history: {
        Row: {
          created_at: string
          field: string
          id: string
          new_value: string | null
          old_value: string | null
          todo_id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          field: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          todo_id: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          field?: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          todo_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_todo_history_todo_id_fkey"
            columns: ["todo_id"]
            isOneToOne: false
            referencedRelation: "user_todos"
            referencedColumns: ["id"]
          },
        ]
      }
      user_todos: {
        Row: {
          completed_at: string | null
          created_at: string
          description: string | null
          due_date: string | null
          eisenhower_quadrant: number | null
          id: string
          organization_id: string | null
          priority: string
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          eisenhower_quadrant?: number | null
          id?: string
          organization_id?: string | null
          priority?: string
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          eisenhower_quadrant?: number | null
          id?: string
          organization_id?: string | null
          priority?: string
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      webhook_logs: {
        Row: {
          created_at: string
          event_type: string
          id: string
          response: Json | null
          status_code: number | null
          technician_name: string | null
          ticket_id: string | null
          ticket_title: string | null
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          response?: Json | null
          status_code?: number | null
          technician_name?: string | null
          ticket_id?: string | null
          ticket_title?: string | null
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          response?: Json | null
          status_code?: number | null
          technician_name?: string | null
          ticket_id?: string | null
          ticket_title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "webhook_logs_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      approve_mvp_award: {
        Args: { _approve: boolean; _id: string; _notes: string }
        Returns: undefined
      }
      business_minutes_between: {
        Args: { _end: string; _start: string }
        Returns: number
      }
      close_sprint_with_checklist: {
        Args: {
          _backlog_ok: boolean
          _doc_ok: boolean
          _evidence_ok: boolean
          _homolog_ok: boolean
          _sprint_id: string
          _standards_ok: boolean
        }
        Returns: number
      }
      compute_mvp_awards: {
        Args: { _month: number; _organization_id: string; _year: number }
        Returns: number
      }
      current_org_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      get_executive_overview: {
        Args: { _organization_id: string }
        Returns: {
          active_technicians: number
          awaiting_approval_count: number
          backlog_total: number
          in_progress_count: number
          open_count: number
        }[]
      }
      get_management_metrics: {
        Args: { _from: string; _organization_id?: string; _to: string }
        Returns: {
          avg_csat: number
          avg_handle_minutes: number
          awaiting_approval: number
          closed_in_period: number
          csat_count: number
          full_name: string
          in_progress_now: number
          points: number
          rework_count: number
          rework_percent: number
          total_assigned: number
          user_id: string
        }[]
      }
      get_management_metrics_admin: {
        Args: { _from: string; _organization_id: string; _to: string }
        Returns: {
          avg_csat: number
          avg_handle_minutes: number
          awaiting_approval: number
          closed_in_period: number
          csat_count: number
          full_name: string
          in_progress_now: number
          points: number
          rework_count: number
          rework_percent: number
          total_assigned: number
          user_id: string
        }[]
      }
      get_metas_tecnicos: {
        Args: { _month: number; _year: number }
        Returns: {
          avg_score: number
          evaluations_count: number
          full_name: string
          preventivas_done: number
          rework_count: number
          tickets: Json
          total_closed: number
          total_points: number
          total_work_minutes: number
          user_id: string
        }[]
      }
      get_mvp_metrics: {
        Args: { _month: number; _organization_id: string; _year: number }
        Returns: {
          amount_brl: number
          award_level: string
          final_score: number
          full_name: string
          on_time: number
          on_time_rate: number
          op_efficiency: number
          quality_rate: number
          rework_rate: number
          reworks: number
          total_deliveries: number
          user_id: string
        }[]
      }
      get_org_technicians: {
        Args: never
        Returns: {
          avatar_url: string
          email: string
          full_name: string
          user_id: string
        }[]
      }
      get_projects_dashboard: {
        Args: { _from: string; _organization_id: string; _to: string }
        Returns: Json
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_role_in_org: {
        Args: {
          _org: string
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_member_of_org: { Args: { _org: string }; Returns: boolean }
      is_op_staff: { Args: { _org: string }; Returns: boolean }
      is_same_organization: {
        Args: { _organization_id: string }
        Returns: boolean
      }
      is_staff_user: { Args: { _user_id: string }; Returns: boolean }
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
      move_ticket_to_organization: {
        Args: { _target_org: string; _ticket_id: string }
        Returns: undefined
      }
      recompute_project_progress: {
        Args: { _project_id: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "tecnico"
        | "solicitante"
        | "super_admin"
        | "auditor"
        | "desenvolvedor"
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
      app_role: [
        "admin",
        "tecnico",
        "solicitante",
        "super_admin",
        "auditor",
        "desenvolvedor",
      ],
    },
  },
} as const
