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
      chk_assignments: {
        Row: {
          assigned_user_id: string
          company_id: string
          created_at: string
          created_by: string | null
          end_date: string | null
          frequency: Database["public"]["Enums"]["chk_frequency"]
          id: string
          is_active: boolean
          notes: string | null
          organization_id: string
          start_date: string
          template_id: string
          updated_at: string
        }
        Insert: {
          assigned_user_id: string
          company_id: string
          created_at?: string
          created_by?: string | null
          end_date?: string | null
          frequency?: Database["public"]["Enums"]["chk_frequency"]
          id?: string
          is_active?: boolean
          notes?: string | null
          organization_id: string
          start_date?: string
          template_id: string
          updated_at?: string
        }
        Update: {
          assigned_user_id?: string
          company_id?: string
          created_at?: string
          created_by?: string | null
          end_date?: string | null
          frequency?: Database["public"]["Enums"]["chk_frequency"]
          id?: string
          is_active?: boolean
          notes?: string | null
          organization_id?: string
          start_date?: string
          template_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chk_assignments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "chk_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chk_assignments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chk_assignments_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "chk_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      chk_companies: {
        Row: {
          contact: string | null
          created_at: string
          created_by: string | null
          document: string | null
          id: string
          is_active: boolean
          name: string
          organization_id: string
          sector_id: string | null
          updated_at: string
        }
        Insert: {
          contact?: string | null
          created_at?: string
          created_by?: string | null
          document?: string | null
          id?: string
          is_active?: boolean
          name: string
          organization_id: string
          sector_id?: string | null
          updated_at?: string
        }
        Update: {
          contact?: string | null
          created_at?: string
          created_by?: string | null
          document?: string | null
          id?: string
          is_active?: boolean
          name?: string
          organization_id?: string
          sector_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chk_companies_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chk_companies_sector_id_fkey"
            columns: ["sector_id"]
            isOneToOne: false
            referencedRelation: "chk_sectors"
            referencedColumns: ["id"]
          },
        ]
      }
      chk_execution_items: {
        Row: {
          answered_at: string | null
          answered_by: string | null
          created_at: string
          done: boolean
          execution_id: string
          id: string
          not_applicable: boolean
          observation: string | null
          organization_id: string
          photo_path: string | null
          template_item_id: string
          updated_at: string
        }
        Insert: {
          answered_at?: string | null
          answered_by?: string | null
          created_at?: string
          done?: boolean
          execution_id: string
          id?: string
          not_applicable?: boolean
          observation?: string | null
          organization_id: string
          photo_path?: string | null
          template_item_id: string
          updated_at?: string
        }
        Update: {
          answered_at?: string | null
          answered_by?: string | null
          created_at?: string
          done?: boolean
          execution_id?: string
          id?: string
          not_applicable?: boolean
          observation?: string | null
          organization_id?: string
          photo_path?: string | null
          template_item_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chk_execution_items_execution_id_fkey"
            columns: ["execution_id"]
            isOneToOne: false
            referencedRelation: "chk_executions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chk_execution_items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chk_execution_items_template_item_id_fkey"
            columns: ["template_item_id"]
            isOneToOne: false
            referencedRelation: "chk_template_items"
            referencedColumns: ["id"]
          },
        ]
      }
      chk_executions: {
        Row: {
          assigned_user_id: string
          assignment_id: string
          company_id: string
          completed_at: string | null
          created_at: string
          id: string
          notes: string | null
          organization_id: string
          score: number | null
          started_at: string | null
          status: Database["public"]["Enums"]["chk_execution_status"]
          target_date: string
          template_id: string
          updated_at: string
        }
        Insert: {
          assigned_user_id: string
          assignment_id: string
          company_id: string
          completed_at?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          organization_id: string
          score?: number | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["chk_execution_status"]
          target_date: string
          template_id: string
          updated_at?: string
        }
        Update: {
          assigned_user_id?: string
          assignment_id?: string
          company_id?: string
          completed_at?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          organization_id?: string
          score?: number | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["chk_execution_status"]
          target_date?: string
          template_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chk_executions_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "chk_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chk_executions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "chk_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chk_executions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chk_executions_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "chk_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      chk_imp_categories: {
        Row: {
          checklist_id: number
          created_at: string
          description: string | null
          id: number
          name: string
          organization_id: string
          parent_id: number | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          checklist_id: number
          created_at?: string
          description?: string | null
          id: number
          name: string
          organization_id: string
          parent_id?: number | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          checklist_id?: number
          created_at?: string
          description?: string | null
          id?: number
          name?: string
          organization_id?: string
          parent_id?: number | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chk_imp_categories_checklist_id_fkey"
            columns: ["checklist_id"]
            isOneToOne: false
            referencedRelation: "chk_imp_checklists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chk_imp_categories_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      chk_imp_checklists: {
        Row: {
          active: boolean
          created_at: string
          description: string | null
          id: number
          name: string
          organization_id: string
          type: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string | null
          id: number
          name: string
          organization_id: string
          type?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: number
          name?: string
          organization_id?: string
          type?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chk_imp_checklists_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      chk_imp_item_options: {
        Row: {
          created_at: string
          id: number
          item_id: number
          organization_id: string
          sort_order: number
          text: string
          updated_at: string
          value: number | null
        }
        Insert: {
          created_at?: string
          id: number
          item_id: number
          organization_id: string
          sort_order?: number
          text: string
          updated_at?: string
          value?: number | null
        }
        Update: {
          created_at?: string
          id?: number
          item_id?: number
          organization_id?: string
          sort_order?: number
          text?: string
          updated_at?: string
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "chk_imp_item_options_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "chk_imp_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chk_imp_item_options_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      chk_imp_items: {
        Row: {
          category_id: number
          created_at: string
          id: number
          name: string
          organization_id: string
          required: boolean
          scale: number | null
          sort_order: number
          updated_at: string
          weight: number
        }
        Insert: {
          category_id: number
          created_at?: string
          id: number
          name: string
          organization_id: string
          required?: boolean
          scale?: number | null
          sort_order?: number
          updated_at?: string
          weight?: number
        }
        Update: {
          category_id?: number
          created_at?: string
          id?: number
          name?: string
          organization_id?: string
          required?: boolean
          scale?: number | null
          sort_order?: number
          updated_at?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "chk_imp_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "chk_imp_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chk_imp_items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      chk_sectors: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          name: string
          organization_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          organization_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chk_sectors_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      chk_template_items: {
        Row: {
          created_at: string
          id: string
          observation: string | null
          organization_id: string
          requires_photo: boolean
          sort_order: number
          template_id: string
          title: string
          updated_at: string
          weight: number
        }
        Insert: {
          created_at?: string
          id?: string
          observation?: string | null
          organization_id: string
          requires_photo?: boolean
          sort_order?: number
          template_id: string
          title: string
          updated_at?: string
          weight?: number
        }
        Update: {
          created_at?: string
          id?: string
          observation?: string | null
          organization_id?: string
          requires_photo?: boolean
          sort_order?: number
          template_id?: string
          title?: string
          updated_at?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "chk_template_items_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chk_template_items_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "chk_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      chk_templates: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          frequency: Database["public"]["Enums"]["chk_frequency"]
          id: string
          import_checklist_id: number | null
          is_active: boolean
          organization_id: string
          sector_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          frequency?: Database["public"]["Enums"]["chk_frequency"]
          id?: string
          import_checklist_id?: number | null
          is_active?: boolean
          organization_id: string
          sector_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          frequency?: Database["public"]["Enums"]["chk_frequency"]
          id?: string
          import_checklist_id?: number | null
          is_active?: boolean
          organization_id?: string
          sector_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chk_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chk_templates_sector_id_fkey"
            columns: ["sector_id"]
            isOneToOne: false
            referencedRelation: "chk_sectors"
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
      menu_permission_presets: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          name: string
          organization_id: string
          overrides: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          organization_id: string
          overrides?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          organization_id?: string
          overrides?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "menu_permission_presets_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
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
          track: string
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
          track?: string
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
          track?: string
          updated_at?: string
          user_id?: string
          year?: number
        }
        Relationships: []
      }
      mvp_penalties: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          disqualify: boolean
          evidence_url: string | null
          id: string
          justification: string
          month: number
          notes: string | null
          organization_id: string
          percent_impact: number
          project_id: string | null
          quality_impact: number
          reference_date: string
          requested_by: string
          scope: string
          sprint_id: string | null
          status: string
          task_id: string | null
          type: string
          updated_at: string
          user_id: string
          year: number
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          disqualify?: boolean
          evidence_url?: string | null
          id?: string
          justification: string
          month: number
          notes?: string | null
          organization_id: string
          percent_impact?: number
          project_id?: string | null
          quality_impact?: number
          reference_date?: string
          requested_by: string
          scope: string
          sprint_id?: string | null
          status?: string
          task_id?: string | null
          type: string
          updated_at?: string
          user_id: string
          year: number
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          disqualify?: boolean
          evidence_url?: string | null
          id?: string
          justification?: string
          month?: number
          notes?: string | null
          organization_id?: string
          percent_impact?: number
          project_id?: string | null
          quality_impact?: number
          reference_date?: string
          requested_by?: string
          scope?: string
          sprint_id?: string | null
          status?: string
          task_id?: string | null
          type?: string
          updated_at?: string
          user_id?: string
          year?: number
        }
        Relationships: []
      }
      mvp_penalty_history: {
        Row: {
          changed_by: string | null
          created_at: string
          id: string
          new_status: string | null
          old_status: string | null
          penalty_id: string
          snapshot: Json | null
        }
        Insert: {
          changed_by?: string | null
          created_at?: string
          id?: string
          new_status?: string | null
          old_status?: string | null
          penalty_id: string
          snapshot?: Json | null
        }
        Update: {
          changed_by?: string | null
          created_at?: string
          id?: string
          new_status?: string | null
          old_status?: string | null
          penalty_id?: string
          snapshot?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "mvp_penalty_history_penalty_id_fkey"
            columns: ["penalty_id"]
            isOneToOne: false
            referencedRelation: "mvp_penalties"
            referencedColumns: ["id"]
          },
        ]
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
          is_workshop: boolean
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
          is_workshop?: boolean
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
          is_workshop?: boolean
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
          category_id: string | null
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
          kanban_position: number | null
          notes: string | null
          organization_id: string
          period: string
          photos: string[]
          receiver_document: string | null
          receiver_name: string | null
          receiver_phone: string | null
          requester_name: string | null
          scheduled_date: string
          status: string
          type: string
          updated_at: string
          vehicle_id: string | null
          vehicle_required: string
        }
        Insert: {
          address?: string | null
          associated_name?: string | null
          category_id?: string | null
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
          kanban_position?: number | null
          notes?: string | null
          organization_id: string
          period?: string
          photos?: string[]
          receiver_document?: string | null
          receiver_name?: string | null
          receiver_phone?: string | null
          requester_name?: string | null
          scheduled_date: string
          status?: string
          type?: string
          updated_at?: string
          vehicle_id?: string | null
          vehicle_required?: string
        }
        Update: {
          address?: string | null
          associated_name?: string | null
          category_id?: string | null
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
          kanban_position?: number | null
          notes?: string | null
          organization_id?: string
          period?: string
          photos?: string[]
          receiver_document?: string | null
          receiver_name?: string | null
          receiver_phone?: string | null
          requester_name?: string | null
          scheduled_date?: string
          status?: string
          type?: string
          updated_at?: string
          vehicle_id?: string | null
          vehicle_required?: string
        }
        Relationships: [
          {
            foreignKeyName: "op_deliveries_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "op_delivery_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      op_delivery_categories: {
        Row: {
          color: string
          created_at: string
          created_by: string
          icon: string
          id: string
          is_active: boolean
          name: string
          organization_id: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          color?: string
          created_at?: string
          created_by: string
          icon?: string
          id?: string
          is_active?: boolean
          name: string
          organization_id: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          color?: string
          created_at?: string
          created_by?: string
          icon?: string
          id?: string
          is_active?: boolean
          name?: string
          organization_id?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      op_delivery_ratings: {
        Row: {
          comment: string | null
          created_at: string
          delivery_id: string
          id: string
          organization_id: string
          rated_by_name: string | null
          rated_by_type: string
          rated_by_user: string | null
          rating: number
        }
        Insert: {
          comment?: string | null
          created_at?: string
          delivery_id: string
          id?: string
          organization_id: string
          rated_by_name?: string | null
          rated_by_type: string
          rated_by_user?: string | null
          rating: number
        }
        Update: {
          comment?: string | null
          created_at?: string
          delivery_id?: string
          id?: string
          organization_id?: string
          rated_by_name?: string | null
          rated_by_type?: string
          rated_by_user?: string | null
          rating?: number
        }
        Relationships: [
          {
            foreignKeyName: "op_delivery_ratings_delivery_id_fkey"
            columns: ["delivery_id"]
            isOneToOne: false
            referencedRelation: "op_deliveries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "op_delivery_ratings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      op_delivery_requesters: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          name: string
          organization_id: string
          phone: string | null
          pin: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name: string
          organization_id: string
          phone?: string | null
          pin?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name?: string
          organization_id?: string
          phone?: string | null
          pin?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "op_delivery_requesters_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
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
          pin: string | null
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
          pin?: string | null
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
          pin?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      op_maint_technicians: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          name: string
          organization_id: string
          phone: string | null
          pin: string | null
          specialty: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name: string
          organization_id: string
          phone?: string | null
          pin?: string | null
          specialty?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name?: string
          organization_id?: string
          phone?: string | null
          pin?: string | null
          specialty?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "op_maint_technicians_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      op_maintenance_orders: {
        Row: {
          assigned_mechanic_id: string | null
          assigned_technician_id: string | null
          category: string
          closed_by: string | null
          closure_summary: string | null
          created_at: string
          created_by: string
          deadline: string | null
          description: string | null
          finished_at: string | null
          id: string
          kanban_position: number | null
          notes: string | null
          om_number: number
          opened_at: string
          organization_id: string
          priority: string
          requester_id: string | null
          responsible: string | null
          sector: string | null
          site_id: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          assigned_mechanic_id?: string | null
          assigned_technician_id?: string | null
          category?: string
          closed_by?: string | null
          closure_summary?: string | null
          created_at?: string
          created_by: string
          deadline?: string | null
          description?: string | null
          finished_at?: string | null
          id?: string
          kanban_position?: number | null
          notes?: string | null
          om_number?: number
          opened_at?: string
          organization_id: string
          priority?: string
          requester_id?: string | null
          responsible?: string | null
          sector?: string | null
          site_id?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          assigned_mechanic_id?: string | null
          assigned_technician_id?: string | null
          category?: string
          closed_by?: string | null
          closure_summary?: string | null
          created_at?: string
          created_by?: string
          deadline?: string | null
          description?: string | null
          finished_at?: string | null
          id?: string
          kanban_position?: number | null
          notes?: string | null
          om_number?: number
          opened_at?: string
          organization_id?: string
          priority?: string
          requester_id?: string | null
          responsible?: string | null
          sector?: string | null
          site_id?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "op_maintenance_orders_assigned_mechanic_id_fkey"
            columns: ["assigned_mechanic_id"]
            isOneToOne: false
            referencedRelation: "op_mechanics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "op_maintenance_orders_assigned_technician_id_fkey"
            columns: ["assigned_technician_id"]
            isOneToOne: false
            referencedRelation: "op_maint_technicians"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "op_maintenance_orders_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "op_delivery_requesters"
            referencedColumns: ["id"]
          },
        ]
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
      op_maintenance_ratings: {
        Row: {
          comment: string | null
          created_at: string
          id: string
          maintenance_order_id: string
          organization_id: string
          rated_by_name: string | null
          rated_by_type: string
          rated_by_user: string | null
          rating: number
        }
        Insert: {
          comment?: string | null
          created_at?: string
          id?: string
          maintenance_order_id: string
          organization_id: string
          rated_by_name?: string | null
          rated_by_type: string
          rated_by_user?: string | null
          rating: number
        }
        Update: {
          comment?: string | null
          created_at?: string
          id?: string
          maintenance_order_id?: string
          organization_id?: string
          rated_by_name?: string | null
          rated_by_type?: string
          rated_by_user?: string | null
          rating?: number
        }
        Relationships: [
          {
            foreignKeyName: "op_maintenance_ratings_maintenance_order_id_fkey"
            columns: ["maintenance_order_id"]
            isOneToOne: false
            referencedRelation: "op_maintenance_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "op_maintenance_ratings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
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
          pin: string | null
          role: string
          specialty: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          is_active?: boolean
          name: string
          organization_id: string
          phone?: string | null
          pin?: string | null
          role?: string
          specialty?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          is_active?: boolean
          name?: string
          organization_id?: string
          phone?: string | null
          pin?: string | null
          role?: string
          specialty?: string | null
          updated_at?: string
          user_id?: string | null
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
          notes: string | null
          part_id: string | null
          part_name: string
          part_status: string
          quantity: number
          service_order_id: string
          unit_price: number
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          part_id?: string | null
          part_name: string
          part_status?: string
          quantity?: number
          service_order_id: string
          unit_price?: number
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          part_id?: string | null
          part_name?: string
          part_status?: string
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
          award_amount: number
          award_notes: string | null
          award_sent_at: string | null
          award_status: string
          award_validated_at: string | null
          award_validated_by: string | null
          closed_by: string | null
          closure_summary: string | null
          company_id: string | null
          created_at: string
          created_by: string
          customer_name: string | null
          deadline: string | null
          description: string | null
          diagnosis: string | null
          finished_at: string | null
          id: string
          kanban_position: number
          mechanic_id: string | null
          notes: string | null
          opened_at: string
          organization_id: string
          os_number: number
          parts_arrived_at: string | null
          stage: string
          status: string
          supervisor_action_at: string | null
          supervisor_action_by: string | null
          supervisor_action_due: string | null
          supervisor_action_plan: string | null
          supervisor_alert: boolean
          supervisor_alert_at: string | null
          supervisor_alert_by: string | null
          supervisor_alert_note: string | null
          supervisor_alert_reason: string | null
          supervisor_alert_resolved_at: string | null
          total_cost: number
          updated_at: string
          vehicle_color: string | null
          vehicle_id: string | null
          vehicle_model: string | null
          vehicle_plate: string | null
          vehicle_year: string | null
        }
        Insert: {
          award_amount?: number
          award_notes?: string | null
          award_sent_at?: string | null
          award_status?: string
          award_validated_at?: string | null
          award_validated_by?: string | null
          closed_by?: string | null
          closure_summary?: string | null
          company_id?: string | null
          created_at?: string
          created_by: string
          customer_name?: string | null
          deadline?: string | null
          description?: string | null
          diagnosis?: string | null
          finished_at?: string | null
          id?: string
          kanban_position?: number
          mechanic_id?: string | null
          notes?: string | null
          opened_at?: string
          organization_id: string
          os_number?: number
          parts_arrived_at?: string | null
          stage?: string
          status?: string
          supervisor_action_at?: string | null
          supervisor_action_by?: string | null
          supervisor_action_due?: string | null
          supervisor_action_plan?: string | null
          supervisor_alert?: boolean
          supervisor_alert_at?: string | null
          supervisor_alert_by?: string | null
          supervisor_alert_note?: string | null
          supervisor_alert_reason?: string | null
          supervisor_alert_resolved_at?: string | null
          total_cost?: number
          updated_at?: string
          vehicle_color?: string | null
          vehicle_id?: string | null
          vehicle_model?: string | null
          vehicle_plate?: string | null
          vehicle_year?: string | null
        }
        Update: {
          award_amount?: number
          award_notes?: string | null
          award_sent_at?: string | null
          award_status?: string
          award_validated_at?: string | null
          award_validated_by?: string | null
          closed_by?: string | null
          closure_summary?: string | null
          company_id?: string | null
          created_at?: string
          created_by?: string
          customer_name?: string | null
          deadline?: string | null
          description?: string | null
          diagnosis?: string | null
          finished_at?: string | null
          id?: string
          kanban_position?: number
          mechanic_id?: string | null
          notes?: string | null
          opened_at?: string
          organization_id?: string
          os_number?: number
          parts_arrived_at?: string | null
          stage?: string
          status?: string
          supervisor_action_at?: string | null
          supervisor_action_by?: string | null
          supervisor_action_due?: string | null
          supervisor_action_plan?: string | null
          supervisor_alert?: boolean
          supervisor_alert_at?: string | null
          supervisor_alert_by?: string | null
          supervisor_alert_note?: string | null
          supervisor_alert_reason?: string | null
          supervisor_alert_resolved_at?: string | null
          total_cost?: number
          updated_at?: string
          vehicle_color?: string | null
          vehicle_id?: string | null
          vehicle_model?: string | null
          vehicle_plate?: string | null
          vehicle_year?: string | null
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
      organization_menu_config: {
        Row: {
          created_at: string
          enabled: boolean
          menu_key: string
          organization_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          menu_key: string
          organization_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          menu_key?: string
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_menu_config_organization_id_fkey"
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
          phone: string | null
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
          phone?: string | null
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
          phone?: string | null
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
          reason: string | null
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
          reason?: string | null
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
          reason?: string | null
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
          sector_id: string | null
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
          sector_id?: string | null
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
          sector_id?: string | null
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
          {
            foreignKeyName: "profiles_sector_id_fkey"
            columns: ["sector_id"]
            isOneToOne: false
            referencedRelation: "sectors"
            referencedColumns: ["id"]
          },
        ]
      }
      project_tasks: {
        Row: {
          assignee_id: string | null
          co_assignee_id: string | null
          converted_to_ticket: boolean
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
          rework_category: string | null
          rework_count: number
          rework_notes: string | null
          rework_reason: string | null
          rework_requested_by: string | null
          sprint_id: string | null
          status: string
          story_points: number
          title: string
          updated_at: string
        }
        Insert: {
          assignee_id?: string | null
          co_assignee_id?: string | null
          converted_to_ticket?: boolean
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
          rework_category?: string | null
          rework_count?: number
          rework_notes?: string | null
          rework_reason?: string | null
          rework_requested_by?: string | null
          sprint_id?: string | null
          status?: string
          story_points?: number
          title: string
          updated_at?: string
        }
        Update: {
          assignee_id?: string | null
          co_assignee_id?: string | null
          converted_to_ticket?: boolean
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
          rework_category?: string | null
          rework_count?: number
          rework_notes?: string | null
          rework_reason?: string | null
          rework_requested_by?: string | null
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
          completed_at: string | null
          completed_by: string | null
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
          size: string | null
          start_date: string | null
          status: string
          updated_at: string
          value_brl: number | null
        }
        Insert: {
          co_owner_id?: string | null
          code?: string | null
          completed_at?: string | null
          completed_by?: string | null
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
          size?: string | null
          start_date?: string | null
          status?: string
          updated_at?: string
          value_brl?: number | null
        }
        Update: {
          co_owner_id?: string | null
          code?: string | null
          completed_at?: string | null
          completed_by?: string | null
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
          size?: string | null
          start_date?: string | null
          status?: string
          updated_at?: string
          value_brl?: number | null
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
      sprint_closure_categories: {
        Row: {
          active: boolean
          created_at: string
          id: string
          name: string
          organization_id: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          name: string
          organization_id?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          name?: string
          organization_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sprint_closure_categories_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      sprint_history: {
        Row: {
          action: string
          changed_by: string | null
          created_at: string
          from_status: string | null
          id: string
          notes: string | null
          organization_id: string | null
          project_id: string | null
          score: number | null
          sprint_id: string
          to_status: string | null
        }
        Insert: {
          action: string
          changed_by?: string | null
          created_at?: string
          from_status?: string | null
          id?: string
          notes?: string | null
          organization_id?: string | null
          project_id?: string | null
          score?: number | null
          sprint_id: string
          to_status?: string | null
        }
        Update: {
          action?: string
          changed_by?: string | null
          created_at?: string
          from_status?: string | null
          id?: string
          notes?: string | null
          organization_id?: string | null
          project_id?: string | null
          score?: number | null
          sprint_id?: string
          to_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sprint_history_sprint_id_fkey"
            columns: ["sprint_id"]
            isOneToOne: false
            referencedRelation: "sprints"
            referencedColumns: ["id"]
          },
        ]
      }
      sprint_quality_checks: {
        Row: {
          backlog_ok: boolean
          category_id: string | null
          checked_at: string
          checked_by: string | null
          doc_ok: boolean
          evidence_ok: boolean
          evidences: Json
          homolog_ok: boolean
          id: string
          sprint_id: string
          standards_ok: boolean
        }
        Insert: {
          backlog_ok?: boolean
          category_id?: string | null
          checked_at?: string
          checked_by?: string | null
          doc_ok?: boolean
          evidence_ok?: boolean
          evidences?: Json
          homolog_ok?: boolean
          id?: string
          sprint_id: string
          standards_ok?: boolean
        }
        Update: {
          backlog_ok?: boolean
          category_id?: string | null
          checked_at?: string
          checked_by?: string | null
          doc_ok?: boolean
          evidence_ok?: boolean
          evidences?: Json
          homolog_ok?: boolean
          id?: string
          sprint_id?: string
          standards_ok?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "sprint_quality_checks_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "sprint_closure_categories"
            referencedColumns: ["id"]
          },
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
          delivered_late: boolean | null
          end_date: string | null
          goal: string | null
          id: string
          late_approved_by: string | null
          late_justification: string | null
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
          delivered_late?: boolean | null
          end_date?: string | null
          goal?: string | null
          id?: string
          late_approved_by?: string | null
          late_justification?: string | null
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
          delivered_late?: boolean | null
          end_date?: string | null
          goal?: string | null
          id?: string
          late_approved_by?: string | null
          late_justification?: string | null
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
      ticket_tma_anomalies: {
        Row: {
          anomaly_type: string
          assigned_to: string | null
          created_at: string
          details: Json
          detected_at: string
          dismissed: boolean
          id: string
          notes: string | null
          organization_id: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          severity: string
          ticket_id: string
          updated_at: string
        }
        Insert: {
          anomaly_type: string
          assigned_to?: string | null
          created_at?: string
          details?: Json
          detected_at?: string
          dismissed?: boolean
          id?: string
          notes?: string | null
          organization_id?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          severity: string
          ticket_id: string
          updated_at?: string
        }
        Update: {
          anomaly_type?: string
          assigned_to?: string | null
          created_at?: string
          details?: Json
          detected_at?: string
          dismissed?: boolean
          id?: string
          notes?: string | null
          organization_id?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          severity?: string
          ticket_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_tma_anomalies_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets: {
        Row: {
          aguardando_aprovacao_at: string | null
          assigned_to: string | null
          category_id: string | null
          closed_at: string | null
          created_at: string
          created_by: string
          description: string | null
          due_date: string | null
          due_date_set_at: string | null
          due_date_set_by: string | null
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
          ticket_number: number | null
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          aguardando_aprovacao_at?: string | null
          assigned_to?: string | null
          category_id?: string | null
          closed_at?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          due_date?: string | null
          due_date_set_at?: string | null
          due_date_set_by?: string | null
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
          ticket_number?: number | null
          title: string
          type?: string
          updated_at?: string
        }
        Update: {
          aguardando_aprovacao_at?: string | null
          assigned_to?: string | null
          category_id?: string | null
          closed_at?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          due_date?: string | null
          due_date_set_at?: string | null
          due_date_set_by?: string | null
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
          ticket_number?: number | null
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
      user_applied_presets: {
        Row: {
          applied_by: string | null
          created_at: string
          id: string
          organization_id: string
          preset_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          applied_by?: string | null
          created_at?: string
          id?: string
          organization_id: string
          preset_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          applied_by?: string | null
          created_at?: string
          id?: string
          organization_id?: string
          preset_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_applied_presets_preset_id_fkey"
            columns: ["preset_id"]
            isOneToOne: false
            referencedRelation: "menu_permission_presets"
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
      approve_penalty: {
        Args: { _approve: boolean; _id: string; _notes?: string }
        Returns: undefined
      }
      business_minutes_between: {
        Args: { _end: string; _start: string }
        Returns: number
      }
      chk_import_generate_templates: {
        Args: { _organization_id: string }
        Returns: number
      }
      close_sprint_with_checklist: {
        Args: {
          _backlog_ok: boolean
          _category_id?: string
          _doc_ok: boolean
          _evidence_ok: boolean
          _evidences?: Json
          _finished_by: string
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
      detect_tma_anomalies: {
        Args: { _lookback_days?: number }
        Returns: {
          result_inserted: number
          result_type: string
          result_updated: number
        }[]
      }
      generate_recurring_executions: {
        Args: never
        Returns: {
          created: number
          overdue: number
        }[]
      }
      get_checklists_report: {
        Args: { _from?: string; _organization_id: string; _to?: string }
        Returns: Json
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
        Args: { _month?: number; _year?: number }
        Returns: {
          avg_score: number
          evaluations_count: number
          full_name: string
          preventivas_done: number
          rework_count: number
          tickets: Json
          timed_tickets_count: number
          total_closed: number
          total_points: number
          total_work_minutes: number
          user_id: string
        }[]
      }
      get_mvp_chamados_metrics: {
        Args: { _month: number; _organization_id: string; _year: number }
        Returns: {
          amount_brl: number
          award_level: string
          category_points: number
          csat_avg: number
          csat_count: number
          csat_rate: number
          final_score: number
          full_name: string
          on_time: number
          on_time_rate: number
          rework_rate: number
          reworks: number
          total_closed: number
          user_id: string
        }[]
      }
      get_mvp_evolution_v2: {
        Args: {
          _months_back?: number
          _organization_id: string
          _track: string
        }
        Returns: {
          avg_final: number
          avg_on_time: number
          avg_rework: number
          label: string
          month: number
          total_deliveries: number
          total_value: number
          year: number
        }[]
      }
      get_mvp_individual: {
        Args: {
          _month: number
          _organization_id: string
          _user_id: string
          _year: number
        }
        Returns: Json
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
      get_mvp_team_evolution: {
        Args: { _months_back?: number; _organization_id: string }
        Returns: {
          avg_final: number
          avg_quality: number
          month: number
          total_deliveries: number
          total_reworks: number
          year: number
        }[]
      }
      get_mvp_team_ranking: {
        Args: { _month: number; _organization_id: string; _year: number }
        Returns: Json
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
      get_tv_goals_summary: {
        Args: { _month: number; _organization_id: string; _year: number }
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
      invalidate_ticket_rework: {
        Args: { _history_id: string; _reason: string }
        Returns: undefined
      }
      is_member_of_org: { Args: { _org: string }; Returns: boolean }
      is_op_staff: { Args: { _org: string }; Returns: boolean }
      is_same_organization: {
        Args: { _organization_id: string }
        Returns: boolean
      }
      is_staff_user: { Args: { _user_id: string }; Returns: boolean }
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
      jsonb_object_keys_count: { Args: { _j: Json }; Returns: number }
      move_ticket_to_organization: {
        Args: { _target_org: string; _ticket_id: string }
        Returns: undefined
      }
      penalty_defaults: {
        Args: { _type: string }
        Returns: {
          disqualify: boolean
          percent_impact: number
          quality_impact: number
          scope: string
        }[]
      }
      recompute_project_progress: {
        Args: { _project_id: string }
        Returns: undefined
      }
      reopen_sprint_and_clear_credit: {
        Args: { _sprint_id: string }
        Returns: undefined
      }
      request_penalty: {
        Args: {
          _evidence_url: string
          _justification: string
          _notes?: string
          _organization_id: string
          _project_id?: string
          _reference_date: string
          _sprint_id?: string
          _task_id?: string
          _type: string
          _user_id: string
        }
        Returns: string
      }
      reserve_ticket_number: { Args: never; Returns: number }
      sync_started_at: {
        Args: { _new_started_at: string; _ticket_id: string }
        Returns: undefined
      }
      transfer_patrimonio_responsible: {
        Args: {
          _new_responsible: string
          _patrimonio_id: string
          _reason?: string
        }
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
      chk_execution_status:
        | "pendente"
        | "em_andamento"
        | "concluida"
        | "atrasada"
      chk_frequency: "unica" | "diaria" | "semanal" | "mensal"
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
      chk_execution_status: [
        "pendente",
        "em_andamento",
        "concluida",
        "atrasada",
      ],
      chk_frequency: ["unica", "diaria", "semanal", "mensal"],
    },
  },
} as const
