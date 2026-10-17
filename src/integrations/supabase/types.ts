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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      ai_conversations: {
        Row: {
          created_at: string
          id: string
          lang: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          lang?: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          lang?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          role: string
          user_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "ai_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      app_settings: {
        Row: {
          id: number
          support_email: string | null
          support_message: string | null
          support_whatsapp: string | null
          updated_at: string
        }
        Insert: {
          id?: number
          support_email?: string | null
          support_message?: string | null
          support_whatsapp?: string | null
          updated_at?: string
        }
        Update: {
          id?: number
          support_email?: string | null
          support_message?: string | null
          support_whatsapp?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          metadata: Json
          team_id: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          metadata?: Json
          team_id?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          metadata?: Json
          team_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      cashbook_entries: {
        Row: {
          cashbook_id: string
          created_at: string
          id: string
        }
        Insert: {
          cashbook_id: string
          created_at?: string
          id?: string
        }
        Update: {
          cashbook_id?: string
          created_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cashbook_entries_cashbook_id_fkey"
            columns: ["cashbook_id"]
            isOneToOne: false
            referencedRelation: "cashbooks"
            referencedColumns: ["id"]
          },
        ]
      }
      cashbooks: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          team_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          team_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          team_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      customers: {
        Row: {
          avatar_url: string | null
          balance: number
          cashbook_id: string
          created_at: string
          email: string | null
          id: string
          name: string
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          balance?: number
          cashbook_id: string
          created_at?: string
          email?: string | null
          id?: string
          name: string
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          balance?: number
          cashbook_id?: string
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_cashbook_id_fkey"
            columns: ["cashbook_id"]
            isOneToOne: false
            referencedRelation: "cashbooks"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback: {
        Row: {
          admin_reply: string | null
          category: string
          created_at: string
          id: string
          message: string
          priority: string
          rating: number | null
          read: boolean
          replied_at: string | null
          status: string
          subject: string | null
          updated_at: string
          user_email: string | null
          user_id: string
        }
        Insert: {
          admin_reply?: string | null
          category?: string
          created_at?: string
          id?: string
          message: string
          priority?: string
          rating?: number | null
          read?: boolean
          replied_at?: string | null
          status?: string
          subject?: string | null
          updated_at?: string
          user_email?: string | null
          user_id: string
        }
        Update: {
          admin_reply?: string | null
          category?: string
          created_at?: string
          id?: string
          message?: string
          priority?: string
          rating?: number | null
          read?: boolean
          replied_at?: string | null
          status?: string
          subject?: string | null
          updated_at?: string
          user_email?: string | null
          user_id?: string
        }
        Relationships: []
      }
      goods_returns: {
        Row: {
          amount: number
          cashbook_id: string
          created_at: string
          id: string
          reason: string | null
          refund_transaction_id: string | null
          return_date: string
          return_type: string
          sale_id: string | null
          supplier: string | null
          treatment: string
          user_id: string
        }
        Insert: {
          amount?: number
          cashbook_id: string
          created_at?: string
          id?: string
          reason?: string | null
          refund_transaction_id?: string | null
          return_date?: string
          return_type: string
          sale_id?: string | null
          supplier?: string | null
          treatment?: string
          user_id: string
        }
        Update: {
          amount?: number
          cashbook_id?: string
          created_at?: string
          id?: string
          reason?: string | null
          refund_transaction_id?: string | null
          return_date?: string
          return_type?: string
          sale_id?: string | null
          supplier?: string | null
          treatment?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "goods_returns_cashbook_id_fkey"
            columns: ["cashbook_id"]
            isOneToOne: false
            referencedRelation: "cashbooks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goods_returns_refund_transaction_id_fkey"
            columns: ["refund_transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goods_returns_sale_id_user_id_cashbook_id_fkey"
            columns: ["sale_id", "user_id", "cashbook_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id", "user_id", "cashbook_id"]
          },
        ]
      }
      inventory_movements: {
        Row: {
          cashbook_id: string
          created_at: string
          id: string
          movement_type: string
          new_stock: number
          note: string | null
          previous_stock: number
          product_id: string
          quantity: number
          reference_id: string | null
          reference_type: string | null
          user_id: string
        }
        Insert: {
          cashbook_id: string
          created_at?: string
          id?: string
          movement_type: string
          new_stock: number
          note?: string | null
          previous_stock: number
          product_id: string
          quantity: number
          reference_id?: string | null
          reference_type?: string | null
          user_id: string
        }
        Update: {
          cashbook_id?: string
          created_at?: string
          id?: string
          movement_type?: string
          new_stock?: number
          note?: string | null
          previous_stock?: number
          product_id?: string
          quantity?: number
          reference_id?: string | null
          reference_type?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_movements_product_id_user_id_cashbook_id_fkey"
            columns: ["product_id", "user_id", "cashbook_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id", "user_id", "cashbook_id"]
          },
        ]
      }
      invoice_payments: {
        Row: {
          amount: number
          cashbook_id: string
          created_at: string
          customer_id: string | null
          id: string
          invoice_id: string
          note: string | null
          payment_date: string
          payment_method: Database["public"]["Enums"]["payment_method"]
          transaction_id: string | null
          user_id: string
        }
        Insert: {
          amount: number
          cashbook_id: string
          created_at?: string
          customer_id?: string | null
          id?: string
          invoice_id: string
          note?: string | null
          payment_date?: string
          payment_method: Database["public"]["Enums"]["payment_method"]
          transaction_id?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          cashbook_id?: string
          created_at?: string
          customer_id?: string | null
          id?: string
          invoice_id?: string
          note?: string | null
          payment_date?: string
          payment_method?: Database["public"]["Enums"]["payment_method"]
          transaction_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoice_payments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_payments_invoice_id_user_id_cashbook_id_fkey"
            columns: ["invoice_id", "user_id", "cashbook_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id", "user_id", "cashbook_id"]
          },
          {
            foreignKeyName: "invoice_payments_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: true
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          balance: number | null
          cashbook_id: string
          created_at: string
          customer_id: string | null
          discount: number
          due_date: string | null
          id: string
          invoice_number: string
          issue_date: string
          paid: number
          sale_id: string
          status: string
          subtotal: number
          total: number
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number | null
          cashbook_id: string
          created_at?: string
          customer_id?: string | null
          discount?: number
          due_date?: string | null
          id?: string
          invoice_number: string
          issue_date?: string
          paid?: number
          sale_id: string
          status?: string
          subtotal: number
          total: number
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number | null
          cashbook_id?: string
          created_at?: string
          customer_id?: string | null
          discount?: number
          due_date?: string | null
          id?: string
          invoice_number?: string
          issue_date?: string
          paid?: number
          sale_id?: string
          status?: string
          subtotal?: number
          total?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_sale_id_user_id_cashbook_id_fkey"
            columns: ["sale_id", "user_id", "cashbook_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id", "user_id", "cashbook_id"]
          },
        ]
      }
      manual_payments: {
        Row: {
          amount: number
          approved_at: string | null
          approved_by: string | null
          billing_cycle: string
          created_at: string
          id: string
          payment_method: string
          phone_number: string
          plan_name: string
          status: string
          transaction_id: string
          user_id: string
        }
        Insert: {
          amount: number
          approved_at?: string | null
          approved_by?: string | null
          billing_cycle: string
          created_at?: string
          id?: string
          payment_method?: string
          phone_number: string
          plan_name: string
          status?: string
          transaction_id: string
          user_id: string
        }
        Update: {
          amount?: number
          approved_at?: string | null
          approved_by?: string | null
          billing_cycle?: string
          created_at?: string
          id?: string
          payment_method?: string
          phone_number?: string
          plan_name?: string
          status?: string
          transaction_id?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          category: string
          created_at: string
          id: string
          link: string | null
          metadata: Json
          read: boolean
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          category?: string
          created_at?: string
          id?: string
          link?: string | null
          metadata?: Json
          read?: boolean
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          category?: string
          created_at?: string
          id?: string
          link?: string | null
          metadata?: Json
          read?: boolean
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      payment_logs: {
        Row: {
          amount: number | null
          created_at: string | null
          id: string
          order_id: string | null
          plan: string | null
          request_payload: Json | null
          response_payload: Json | null
          sid: string | null
          status: string | null
          user_id: string | null
        }
        Insert: {
          amount?: number | null
          created_at?: string | null
          id?: string
          order_id?: string | null
          plan?: string | null
          request_payload?: Json | null
          response_payload?: Json | null
          sid?: string | null
          status?: string | null
          user_id?: string | null
        }
        Update: {
          amount?: number | null
          created_at?: string | null
          id?: string
          order_id?: string | null
          plan?: string | null
          request_payload?: Json | null
          response_payload?: Json | null
          sid?: string | null
          status?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          billing_cycle: string | null
          created_at: string | null
          currency: string | null
          id: string
          order_id: string | null
          payment_method: string | null
          plan: string | null
          plan_id: string | null
          sid: string | null
          sifalo_code: number | null
          sifalo_response: Json | null
          status: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          amount: number
          billing_cycle?: string | null
          created_at?: string | null
          currency?: string | null
          id?: string
          order_id?: string | null
          payment_method?: string | null
          plan?: string | null
          plan_id?: string | null
          sid?: string | null
          sifalo_code?: number | null
          sifalo_response?: Json | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          amount?: number
          billing_cycle?: string | null
          created_at?: string | null
          currency?: string | null
          id?: string
          order_id?: string | null
          payment_method?: string | null
          plan?: string | null
          plan_id?: string | null
          sid?: string | null
          sifalo_code?: number | null
          sifalo_response?: Json | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "pricing_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      pricing_plans: {
        Row: {
          billing_cycle: string
          code: string | null
          created_at: string | null
          currency: string | null
          description: string | null
          features: Json
          highlighted: boolean
          id: string
          is_active: boolean | null
          name: string
          price: number
          sort_order: number
          tagline: string | null
          updated_at: string
        }
        Insert: {
          billing_cycle: string
          code?: string | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          features?: Json
          highlighted?: boolean
          id?: string
          is_active?: boolean | null
          name: string
          price: number
          sort_order?: number
          tagline?: string | null
          updated_at?: string
        }
        Update: {
          billing_cycle?: string
          code?: string | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          features?: Json
          highlighted?: boolean
          id?: string
          is_active?: boolean | null
          name?: string
          price?: number
          sort_order?: number
          tagline?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          buying_price: number
          cashbook_id: string
          category: string | null
          created_at: string
          current_stock: number
          id: string
          is_active: boolean
          minimum_stock: number
          name: string
          selling_price: number
          sku: string | null
          supplier: string | null
          unit: string
          updated_at: string
          user_id: string
        }
        Insert: {
          buying_price?: number
          cashbook_id: string
          category?: string | null
          created_at?: string
          current_stock?: number
          id?: string
          is_active?: boolean
          minimum_stock?: number
          name: string
          selling_price?: number
          sku?: string | null
          supplier?: string | null
          unit?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          buying_price?: number
          cashbook_id?: string
          category?: string | null
          created_at?: string
          current_stock?: number
          id?: string
          is_active?: boolean
          minimum_stock?: number
          name?: string
          selling_price?: number
          sku?: string | null
          supplier?: string | null
          unit?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_cashbook_id_fkey"
            columns: ["cashbook_id"]
            isOneToOne: false
            referencedRelation: "cashbooks"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          active_cashbook_id: string | null
          avatar_url: string | null
          business_name: string | null
          city: string | null
          country: string | null
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          language: string
          plan_type: string
          plan_updated_at: string | null
          subscription_expires: string | null
          trial_ends_at: string | null
          trial_plan: string | null
          updated_at: string
          user_id: string
          whop_user_id: string | null
        }
        Insert: {
          active_cashbook_id?: string | null
          avatar_url?: string | null
          business_name?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          language?: string
          plan_type?: string
          plan_updated_at?: string | null
          subscription_expires?: string | null
          trial_ends_at?: string | null
          trial_plan?: string | null
          updated_at?: string
          user_id: string
          whop_user_id?: string | null
        }
        Update: {
          active_cashbook_id?: string | null
          avatar_url?: string | null
          business_name?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          language?: string
          plan_type?: string
          plan_updated_at?: string | null
          subscription_expires?: string | null
          trial_ends_at?: string | null
          trial_plan?: string | null
          updated_at?: string
          user_id?: string
          whop_user_id?: string | null
        }
        Relationships: []
      }
      purchase_order_items: {
        Row: {
          cashbook_id: string
          id: string
          product_id: string
          purchase_id: string
          quantity: number
          total: number
          unit_cost: number
          user_id: string
        }
        Insert: {
          cashbook_id: string
          id?: string
          product_id: string
          purchase_id: string
          quantity: number
          total: number
          unit_cost: number
          user_id: string
        }
        Update: {
          cashbook_id?: string
          id?: string
          product_id?: string
          purchase_id?: string
          quantity?: number
          total?: number
          unit_cost?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_items_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_orders: {
        Row: {
          cashbook_id: string
          created_at: string
          id: string
          notes: string | null
          order_date: string
          paid: number
          po_number: string
          received_at: string | null
          status: string
          supplier: string
          total: number
          updated_at: string
          user_id: string
        }
        Insert: {
          cashbook_id: string
          created_at?: string
          id?: string
          notes?: string | null
          order_date?: string
          paid?: number
          po_number: string
          received_at?: string | null
          status?: string
          supplier: string
          total?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          cashbook_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          order_date?: string
          paid?: number
          po_number?: string
          received_at?: string | null
          status?: string
          supplier?: string
          total?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_cashbook_id_fkey"
            columns: ["cashbook_id"]
            isOneToOne: false
            referencedRelation: "cashbooks"
            referencedColumns: ["id"]
          },
        ]
      }
      return_items: {
        Row: {
          amount: number
          cashbook_id: string
          id: string
          product_id: string
          quantity: number
          return_id: string
          sale_item_id: string | null
          user_id: string
        }
        Insert: {
          amount: number
          cashbook_id: string
          id?: string
          product_id: string
          quantity: number
          return_id: string
          sale_item_id?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          cashbook_id?: string
          id?: string
          product_id?: string
          quantity?: number
          return_id?: string
          sale_item_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "return_items_product_id_user_id_cashbook_id_fkey"
            columns: ["product_id", "user_id", "cashbook_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id", "user_id", "cashbook_id"]
          },
          {
            foreignKeyName: "return_items_return_id_fkey"
            columns: ["return_id"]
            isOneToOne: false
            referencedRelation: "goods_returns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "return_items_sale_item_id_fkey"
            columns: ["sale_item_id"]
            isOneToOne: false
            referencedRelation: "sale_items"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_items: {
        Row: {
          cashbook_id: string
          cost_price: number
          id: string
          product_id: string
          quantity: number
          sale_id: string
          total: number
          unit_price: number
          user_id: string
        }
        Insert: {
          cashbook_id: string
          cost_price: number
          id?: string
          product_id: string
          quantity: number
          sale_id: string
          total: number
          unit_price: number
          user_id: string
        }
        Update: {
          cashbook_id?: string
          cost_price?: number
          id?: string
          product_id?: string
          quantity?: number
          sale_id?: string
          total?: number
          unit_price?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sale_items_product_id_user_id_cashbook_id_fkey"
            columns: ["product_id", "user_id", "cashbook_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id", "user_id", "cashbook_id"]
          },
          {
            foreignKeyName: "sale_items_sale_id_user_id_cashbook_id_fkey"
            columns: ["sale_id", "user_id", "cashbook_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id", "user_id", "cashbook_id"]
          },
        ]
      }
      sales: {
        Row: {
          cashbook_id: string
          created_at: string
          customer_id: string | null
          discount: number
          id: string
          invoice_number: string
          notes: string | null
          sale_date: string
          subtotal: number
          total: number
          updated_at: string
          user_id: string
        }
        Insert: {
          cashbook_id: string
          created_at?: string
          customer_id?: string | null
          discount?: number
          id?: string
          invoice_number: string
          notes?: string | null
          sale_date?: string
          subtotal: number
          total: number
          updated_at?: string
          user_id: string
        }
        Update: {
          cashbook_id?: string
          created_at?: string
          customer_id?: string | null
          discount?: number
          id?: string
          invoice_number?: string
          notes?: string | null
          sale_date?: string
          subtotal?: number
          total?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_cashbook_id_fkey"
            columns: ["cashbook_id"]
            isOneToOne: false
            referencedRelation: "cashbooks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          amount: number | null
          billing_cycle: string | null
          created_at: string | null
          customer_account: string | null
          expire_date: string | null
          id: string
          order_id: string | null
          payment_gateway: string | null
          plan: string
          plan_id: string | null
          sifalo_sid: string | null
          start_date: string | null
          status: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          amount?: number | null
          billing_cycle?: string | null
          created_at?: string | null
          customer_account?: string | null
          expire_date?: string | null
          id?: string
          order_id?: string | null
          payment_gateway?: string | null
          plan?: string
          plan_id?: string | null
          sifalo_sid?: string | null
          start_date?: string | null
          status?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          amount?: number | null
          billing_cycle?: string | null
          created_at?: string | null
          customer_account?: string | null
          expire_date?: string | null
          id?: string
          order_id?: string | null
          payment_gateway?: string | null
          plan?: string
          plan_id?: string | null
          sifalo_sid?: string | null
          start_date?: string | null
          status?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "pricing_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_payments: {
        Row: {
          amount: number
          cashbook_id: string
          created_at: string
          id: string
          note: string | null
          payment_date: string
          payment_method: Database["public"]["Enums"]["payment_method"]
          purchase_id: string
          transaction_id: string | null
          user_id: string
        }
        Insert: {
          amount: number
          cashbook_id: string
          created_at?: string
          id?: string
          note?: string | null
          payment_date?: string
          payment_method?: Database["public"]["Enums"]["payment_method"]
          purchase_id: string
          transaction_id?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          cashbook_id?: string
          created_at?: string
          id?: string
          note?: string | null
          payment_date?: string
          payment_method?: Database["public"]["Enums"]["payment_method"]
          purchase_id?: string
          transaction_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_payments_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_payments_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: true
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      team_invites: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string | null
          role: Database["public"]["Enums"]["team_role"]
          status: Database["public"]["Enums"]["team_invite_status"]
          team_id: string
          token: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          role?: Database["public"]["Enums"]["team_role"]
          status?: Database["public"]["Enums"]["team_invite_status"]
          team_id: string
          token?: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string | null
          role?: Database["public"]["Enums"]["team_role"]
          status?: Database["public"]["Enums"]["team_invite_status"]
          team_id?: string
          token?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_invites_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          created_at: string
          email: string | null
          id: string
          owner_id: string
          role: Database["public"]["Enums"]["team_role"]
          status: Database["public"]["Enums"]["team_member_status"]
          team_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          owner_id: string
          role?: Database["public"]["Enums"]["team_role"]
          status?: Database["public"]["Enums"]["team_member_status"]
          team_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          owner_id?: string
          role?: Database["public"]["Enums"]["team_role"]
          status?: Database["public"]["Enums"]["team_member_status"]
          team_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          created_at: string
          id: string
          member_limit: number
          name: string
          owner_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          member_limit?: number
          name?: string
          owner_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          member_limit?: number
          name?: string
          owner_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          attachment_url: string | null
          cashbook_id: string
          category: string
          created_at: string
          customer_id: string | null
          date: string
          id: string
          note: string | null
          payment_method: Database["public"]["Enums"]["payment_method"]
          type: Database["public"]["Enums"]["tx_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          attachment_url?: string | null
          cashbook_id: string
          category: string
          created_at?: string
          customer_id?: string | null
          date?: string
          id?: string
          note?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"]
          type: Database["public"]["Enums"]["tx_type"]
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          attachment_url?: string | null
          cashbook_id?: string
          category?: string
          created_at?: string
          customer_id?: string | null
          date?: string
          id?: string
          note?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"]
          type?: Database["public"]["Enums"]["tx_type"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_cashbook_id_fkey"
            columns: ["cashbook_id"]
            isOneToOne: false
            referencedRelation: "cashbooks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
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
          role: Database["public"]["Enums"]["app_role"]
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
      whop_events: {
        Row: {
          created_at: string
          error: string | null
          event_id: string | null
          event_type: string
          id: string
          payload: Json
          plan_type: string | null
          processed: boolean
          user_id: string | null
          whop_user_id: string | null
        }
        Insert: {
          created_at?: string
          error?: string | null
          event_id?: string | null
          event_type: string
          id?: string
          payload: Json
          plan_type?: string | null
          processed?: boolean
          user_id?: string | null
          whop_user_id?: string | null
        }
        Update: {
          created_at?: string
          error?: string | null
          event_id?: string | null
          event_type?: string
          id?: string
          payload?: Json
          plan_type?: string | null
          processed?: boolean
          user_id?: string | null
          whop_user_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_team_invite: { Args: { _token: string }; Returns: Json }
      adjust_inventory: {
        Args: {
          _kind: string
          _note?: string
          _product: string
          _quantity: number
        }
        Returns: Json
      }
      can_access_owner_data: {
        Args: { _owner: string; _user: string }
        Returns: boolean
      }
      can_delete_owner_data: {
        Args: { _owner: string; _user: string }
        Returns: boolean
      }
      can_edit_team: {
        Args: { _team_id: string; _user_id?: string }
        Returns: boolean
      }
      can_manage_members: {
        Args: { _team_id: string; _user_id?: string }
        Returns: boolean
      }
      can_manage_team: {
        Args: { _team_id: string; _user_id?: string }
        Returns: boolean
      }
      can_write_owner_data: {
        Args: { _owner: string; _user: string }
        Returns: boolean
      }
      cancel_purchase_order: { Args: { _po: string }; Returns: undefined }
      create_inventory_sale: {
        Args: {
          _cashbook: string
          _customer: string
          _discount?: number
          _due?: string
          _items: Json
          _method?: Database["public"]["Enums"]["payment_method"]
          _notes?: string
          _paid?: number
        }
        Returns: Json
      }
      create_purchase_order: {
        Args: {
          _cashbook: string
          _items: Json
          _notes?: string
          _receive?: boolean
          _supplier: string
        }
        Returns: Json
      }
      get_invite_preview: { Args: { _token: string }; Returns: Json }
      has_cashbook_access: {
        Args: { _cashbook_id: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_protected_owner: { Args: { _user_id: string }; Returns: boolean }
      is_team_admin: {
        Args: { _owner: string; _user: string }
        Returns: boolean
      }
      is_team_member: {
        Args: { _team_id: string; _user_id?: string }
        Returns: boolean
      }
      log_audit: {
        Args: {
          _action: string
          _entity_id?: string
          _entity_type?: string
          _metadata?: Json
          _team_id: string
        }
        Returns: string
      }
      my_workspace: { Args: never; Returns: Json }
      notify_user: {
        Args: {
          _body?: string
          _category?: string
          _link?: string
          _metadata?: Json
          _title: string
        }
        Returns: string
      }
      process_goods_return: {
        Args: {
          _cashbook?: string
          _items: Json
          _reason?: string
          _sale: string
          _supplier?: string
          _treatment?: string
        }
        Returns: Json
      }
      receive_purchase_order: { Args: { _po: string }; Returns: Json }
      record_invoice_payment: {
        Args: {
          _amount: number
          _date?: string
          _invoice: string
          _method?: Database["public"]["Enums"]["payment_method"]
          _note?: string
        }
        Returns: Json
      }
      record_supplier_payment: {
        Args: {
          _amount: number
          _date?: string
          _method?: Database["public"]["Enums"]["payment_method"]
          _note?: string
          _po: string
        }
        Returns: Json
      }
      revoke_team_member: {
        Args: { _member_user_id: string }
        Returns: undefined
      }
      role_on_owner_data: {
        Args: { _owner: string; _user: string }
        Returns: Database["public"]["Enums"]["team_role"]
      }
      set_team_member_role: {
        Args: {
          _member_user_id: string
          _role: Database["public"]["Enums"]["team_role"]
        }
        Returns: undefined
      }
      team_member_count: { Args: { _team_id: string }; Returns: number }
      team_of_owner: { Args: { _owner: string }; Returns: string }
      team_role_of: {
        Args: { _team_id: string; _user_id?: string }
        Returns: Database["public"]["Enums"]["team_role"]
      }
      update_invoice_details: {
        Args: { _due: string; _invoice: string; _notes: string }
        Returns: undefined
      }
      upgrade_to_team_plan: { Args: { _team_name?: string }; Returns: string }
    }
    Enums: {
      app_role: "admin" | "user" | "viewer"
      billing_cycle: "monthly" | "yearly" | "trial"
      invite_status: "pending" | "accepted" | "revoked" | "expired"
      member_status: "active" | "revoked"
      payment_method: "Cash" | "Card" | "Bank" | "Mobile"
      subscription_status: "trial" | "active" | "expired" | "cancelled"
      team_invite_status: "pending" | "accepted" | "revoked" | "expired"
      team_member_status: "active" | "revoked"
      team_role: "owner" | "admin" | "editor" | "viewer"
      tx_type: "in" | "out" | "credit" | "debit"
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
      app_role: ["admin", "user", "viewer"],
      billing_cycle: ["monthly", "yearly", "trial"],
      invite_status: ["pending", "accepted", "revoked", "expired"],
      member_status: ["active", "revoked"],
      payment_method: ["Cash", "Card", "Bank", "Mobile"],
      subscription_status: ["trial", "active", "expired", "cancelled"],
      team_invite_status: ["pending", "accepted", "revoked", "expired"],
      team_member_status: ["active", "revoked"],
      team_role: ["owner", "admin", "editor", "viewer"],
      tx_type: ["in", "out", "credit", "debit"],
    },
  },
} as const
