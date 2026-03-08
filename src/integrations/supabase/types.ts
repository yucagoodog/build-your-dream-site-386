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
      batch_jobs: {
        Row: {
          completed_count: number
          created_at: string
          failed_count: number
          id: string
          negative_prompt: string | null
          parameters: Json | null
          project_id: string
          prompt: string | null
          source_image_ids: string[] | null
          status: string
          total_cost: number | null
          total_count: number
          user_id: string
        }
        Insert: {
          completed_count?: number
          created_at?: string
          failed_count?: number
          id?: string
          negative_prompt?: string | null
          parameters?: Json | null
          project_id: string
          prompt?: string | null
          source_image_ids?: string[] | null
          status?: string
          total_cost?: number | null
          total_count?: number
          user_id: string
        }
        Update: {
          completed_count?: number
          created_at?: string
          failed_count?: number
          id?: string
          negative_prompt?: string | null
          parameters?: Json | null
          project_id?: string
          prompt?: string | null
          source_image_ids?: string[] | null
          status?: string
          total_cost?: number | null
          total_count?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "batch_jobs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      characters: {
        Row: {
          best_seed: number | null
          created_at: string
          description: string | null
          id: string
          name: string
          notes: string | null
          project_id: string
          prompt_tokens: string | null
          reference_image_url: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          best_seed?: number | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
          notes?: string | null
          project_id: string
          prompt_tokens?: string | null
          reference_image_url?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          best_seed?: number | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          notes?: string | null
          project_id?: string
          prompt_tokens?: string | null
          reference_image_url?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "characters_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      companion_assets: {
        Row: {
          asset_type: string
          atlas_task_id: string | null
          companion_id: string
          created_at: string | null
          id: string
          image_url: string | null
          prompt_used: string | null
          status: string | null
          tags: Json | null
          user_id: string
        }
        Insert: {
          asset_type?: string
          atlas_task_id?: string | null
          companion_id: string
          created_at?: string | null
          id?: string
          image_url?: string | null
          prompt_used?: string | null
          status?: string | null
          tags?: Json | null
          user_id: string
        }
        Update: {
          asset_type?: string
          atlas_task_id?: string | null
          companion_id?: string
          created_at?: string | null
          id?: string
          image_url?: string | null
          prompt_used?: string | null
          status?: string | null
          tags?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "companion_assets_companion_id_fkey"
            columns: ["companion_id"]
            isOneToOne: false
            referencedRelation: "companions"
            referencedColumns: ["id"]
          },
        ]
      }
      companion_interactions: {
        Row: {
          ai_response: string | null
          companion_id: string
          content: string | null
          created_at: string | null
          id: string
          interaction_type: string | null
          metadata: Json | null
          mood_change: number | null
          scene_image_url: string | null
          user_id: string
          xp_earned: number | null
        }
        Insert: {
          ai_response?: string | null
          companion_id: string
          content?: string | null
          created_at?: string | null
          id?: string
          interaction_type?: string | null
          metadata?: Json | null
          mood_change?: number | null
          scene_image_url?: string | null
          user_id: string
          xp_earned?: number | null
        }
        Update: {
          ai_response?: string | null
          companion_id?: string
          content?: string | null
          created_at?: string | null
          id?: string
          interaction_type?: string | null
          metadata?: Json | null
          mood_change?: number | null
          scene_image_url?: string | null
          user_id?: string
          xp_earned?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "companion_interactions_companion_id_fkey"
            columns: ["companion_id"]
            isOneToOne: false
            referencedRelation: "companions"
            referencedColumns: ["id"]
          },
        ]
      }
      companion_room_variants: {
        Row: {
          atlas_task_id: string | null
          created_at: string | null
          id: string
          image_url: string | null
          prompt_used: string | null
          room_id: string
          status: string | null
          time_of_day: string | null
          user_id: string
          weather: string | null
        }
        Insert: {
          atlas_task_id?: string | null
          created_at?: string | null
          id?: string
          image_url?: string | null
          prompt_used?: string | null
          room_id: string
          status?: string | null
          time_of_day?: string | null
          user_id: string
          weather?: string | null
        }
        Update: {
          atlas_task_id?: string | null
          created_at?: string | null
          id?: string
          image_url?: string | null
          prompt_used?: string | null
          room_id?: string
          status?: string | null
          time_of_day?: string | null
          user_id?: string
          weather?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "companion_room_variants_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "companion_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      companion_rooms: {
        Row: {
          base_prompt: string | null
          companion_id: string
          created_at: string | null
          icon: string | null
          id: string
          room_name: string
          room_type: string | null
          sort_order: number | null
          user_id: string
        }
        Insert: {
          base_prompt?: string | null
          companion_id: string
          created_at?: string | null
          icon?: string | null
          id?: string
          room_name: string
          room_type?: string | null
          sort_order?: number | null
          user_id: string
        }
        Update: {
          base_prompt?: string | null
          companion_id?: string
          created_at?: string | null
          icon?: string | null
          id?: string
          room_name?: string
          room_type?: string | null
          sort_order?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "companion_rooms_companion_id_fkey"
            columns: ["companion_id"]
            isOneToOne: false
            referencedRelation: "companions"
            referencedColumns: ["id"]
          },
        ]
      }
      companion_scenarios: {
        Row: {
          companion_id: string
          created_at: string | null
          id: string
          images: string[] | null
          prompt_template: string | null
          required_emotion: string | null
          required_outfit: string | null
          required_room: string | null
          scenario_name: string
          scenario_type: string | null
          status: string | null
          user_id: string
          videos: string[] | null
        }
        Insert: {
          companion_id: string
          created_at?: string | null
          id?: string
          images?: string[] | null
          prompt_template?: string | null
          required_emotion?: string | null
          required_outfit?: string | null
          required_room?: string | null
          scenario_name: string
          scenario_type?: string | null
          status?: string | null
          user_id: string
          videos?: string[] | null
        }
        Update: {
          companion_id?: string
          created_at?: string | null
          id?: string
          images?: string[] | null
          prompt_template?: string | null
          required_emotion?: string | null
          required_outfit?: string | null
          required_room?: string | null
          scenario_name?: string
          scenario_type?: string | null
          status?: string | null
          user_id?: string
          videos?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "companion_scenarios_companion_id_fkey"
            columns: ["companion_id"]
            isOneToOne: false
            referencedRelation: "companions"
            referencedColumns: ["id"]
          },
        ]
      }
      companions: {
        Row: {
          avatar_urls: string[] | null
          created_at: string | null
          current_emotion: string | null
          current_outfit: string | null
          current_room: string | null
          daily_schedule: Json | null
          description: string | null
          id: string
          is_active: boolean | null
          last_interaction_at: string | null
          mood_level: number | null
          name: string
          personality: string | null
          relationship_level: number | null
          relationship_xp: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          avatar_urls?: string[] | null
          created_at?: string | null
          current_emotion?: string | null
          current_outfit?: string | null
          current_room?: string | null
          daily_schedule?: Json | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          last_interaction_at?: string | null
          mood_level?: number | null
          name: string
          personality?: string | null
          relationship_level?: number | null
          relationship_xp?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          avatar_urls?: string[] | null
          created_at?: string | null
          current_emotion?: string | null
          current_outfit?: string | null
          current_room?: string | null
          daily_schedule?: Json | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          last_interaction_at?: string | null
          mood_level?: number | null
          name?: string
          personality?: string | null
          relationship_level?: number | null
          relationship_xp?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      flow_executions: {
        Row: {
          completed_at: string | null
          created_at: string
          current_step: number
          flow_id: string
          id: string
          mode: string
          started_at: string | null
          status: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          current_step?: number
          flow_id: string
          id?: string
          mode?: string
          started_at?: string | null
          status?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          current_step?: number
          flow_id?: string
          id?: string
          mode?: string
          started_at?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "flow_executions_flow_id_fkey"
            columns: ["flow_id"]
            isOneToOne: false
            referencedRelation: "flows"
            referencedColumns: ["id"]
          },
        ]
      }
      flow_step_executions: {
        Row: {
          completed_at: string | null
          config_snapshot: Json | null
          created_at: string
          error_message: string | null
          execution_id: string
          id: string
          input_artifact_url: string | null
          output_artifact_url: string | null
          prompt_used: string | null
          started_at: string | null
          status: string
          step_id: string
          step_number: number
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          config_snapshot?: Json | null
          created_at?: string
          error_message?: string | null
          execution_id: string
          id?: string
          input_artifact_url?: string | null
          output_artifact_url?: string | null
          prompt_used?: string | null
          started_at?: string | null
          status?: string
          step_id: string
          step_number?: number
          user_id: string
        }
        Update: {
          completed_at?: string | null
          config_snapshot?: Json | null
          created_at?: string
          error_message?: string | null
          execution_id?: string
          id?: string
          input_artifact_url?: string | null
          output_artifact_url?: string | null
          prompt_used?: string | null
          started_at?: string | null
          status?: string
          step_id?: string
          step_number?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "flow_step_executions_execution_id_fkey"
            columns: ["execution_id"]
            isOneToOne: false
            referencedRelation: "flow_executions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "flow_step_executions_step_id_fkey"
            columns: ["step_id"]
            isOneToOne: false
            referencedRelation: "flow_steps"
            referencedColumns: ["id"]
          },
        ]
      }
      flow_steps: {
        Row: {
          config: Json | null
          created_at: string
          flow_id: string
          id: string
          step_number: number
          step_type: string
          user_id: string
        }
        Insert: {
          config?: Json | null
          created_at?: string
          flow_id: string
          id?: string
          step_number?: number
          step_type?: string
          user_id: string
        }
        Update: {
          config?: Json | null
          created_at?: string
          flow_id?: string
          id?: string
          step_number?: number
          step_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "flow_steps_flow_id_fkey"
            columns: ["flow_id"]
            isOneToOne: false
            referencedRelation: "flows"
            referencedColumns: ["id"]
          },
        ]
      }
      flows: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      generations: {
        Row: {
          atlas_result_url: string | null
          atlas_task_id: string | null
          cost: number | null
          created_at: string
          error_message: string | null
          id: string
          is_favorite: boolean
          is_final: boolean
          negative_prompt_used: string | null
          parameters: Json | null
          prompt_used: string | null
          scene_id: string | null
          status: string
          updated_at: string
          user_id: string
          video_url: string | null
        }
        Insert: {
          atlas_result_url?: string | null
          atlas_task_id?: string | null
          cost?: number | null
          created_at?: string
          error_message?: string | null
          id?: string
          is_favorite?: boolean
          is_final?: boolean
          negative_prompt_used?: string | null
          parameters?: Json | null
          prompt_used?: string | null
          scene_id?: string | null
          status?: string
          updated_at?: string
          user_id: string
          video_url?: string | null
        }
        Update: {
          atlas_result_url?: string | null
          atlas_task_id?: string | null
          cost?: number | null
          created_at?: string
          error_message?: string | null
          id?: string
          is_favorite?: boolean
          is_final?: boolean
          negative_prompt_used?: string | null
          parameters?: Json | null
          prompt_used?: string | null
          scene_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "generations_scene_id_fkey"
            columns: ["scene_id"]
            isOneToOne: false
            referencedRelation: "scenes"
            referencedColumns: ["id"]
          },
        ]
      }
      image_edits: {
        Row: {
          atlas_result_url: string | null
          atlas_task_id: string | null
          character_ids: string[] | null
          cost: number | null
          created_at: string
          enable_prompt_expansion: boolean | null
          error_message: string | null
          id: string
          is_favorite: boolean
          is_final: boolean
          model: string
          negative_prompt: string | null
          output_image_url: string | null
          output_size: string | null
          parent_edit_id: string | null
          project_id: string | null
          prompt: string | null
          seed: number | null
          source_image_id: string | null
          source_image_urls: string[] | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          atlas_result_url?: string | null
          atlas_task_id?: string | null
          character_ids?: string[] | null
          cost?: number | null
          created_at?: string
          enable_prompt_expansion?: boolean | null
          error_message?: string | null
          id?: string
          is_favorite?: boolean
          is_final?: boolean
          model?: string
          negative_prompt?: string | null
          output_image_url?: string | null
          output_size?: string | null
          parent_edit_id?: string | null
          project_id?: string | null
          prompt?: string | null
          seed?: number | null
          source_image_id?: string | null
          source_image_urls?: string[] | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          atlas_result_url?: string | null
          atlas_task_id?: string | null
          character_ids?: string[] | null
          cost?: number | null
          created_at?: string
          enable_prompt_expansion?: boolean | null
          error_message?: string | null
          id?: string
          is_favorite?: boolean
          is_final?: boolean
          model?: string
          negative_prompt?: string | null
          output_image_url?: string | null
          output_size?: string | null
          parent_edit_id?: string | null
          project_id?: string | null
          prompt?: string | null
          seed?: number | null
          source_image_id?: string | null
          source_image_urls?: string[] | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "image_edits_parent_edit_id_fkey"
            columns: ["parent_edit_id"]
            isOneToOne: false
            referencedRelation: "image_edits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "image_edits_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "image_edits_source_image_id_fkey"
            columns: ["source_image_id"]
            isOneToOne: false
            referencedRelation: "source_images"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          project_type: string
          script: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          project_type?: string
          script?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          project_type?: string
          script?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      prompt_blocks: {
        Row: {
          category: string
          created_at: string
          id: string
          is_builtin: boolean
          label: string
          sort_order: number
          user_id: string | null
          value: string
        }
        Insert: {
          category: string
          created_at?: string
          id?: string
          is_builtin?: boolean
          label: string
          sort_order?: number
          user_id?: string | null
          value: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          is_builtin?: boolean
          label?: string
          sort_order?: number
          user_id?: string | null
          value?: string
        }
        Relationships: []
      }
      scenes: {
        Row: {
          audio_enabled: boolean
          audio_url: string | null
          character_ids: string[] | null
          cost_estimate: number | null
          created_at: string
          direction: string | null
          duration: number
          id: string
          negative_prompt: string | null
          project_id: string
          prompt: string | null
          prompt_expansion: boolean
          resolution: string
          scene_number: number
          seed: number | null
          seed_image_url: string | null
          shot_type: string | null
          sort_order: number
          status: string
          updated_at: string
          use_random_seed: boolean
          user_id: string
        }
        Insert: {
          audio_enabled?: boolean
          audio_url?: string | null
          character_ids?: string[] | null
          cost_estimate?: number | null
          created_at?: string
          direction?: string | null
          duration?: number
          id?: string
          negative_prompt?: string | null
          project_id: string
          prompt?: string | null
          prompt_expansion?: boolean
          resolution?: string
          scene_number?: number
          seed?: number | null
          seed_image_url?: string | null
          shot_type?: string | null
          sort_order?: number
          status?: string
          updated_at?: string
          use_random_seed?: boolean
          user_id: string
        }
        Update: {
          audio_enabled?: boolean
          audio_url?: string | null
          character_ids?: string[] | null
          cost_estimate?: number | null
          created_at?: string
          direction?: string | null
          duration?: number
          id?: string
          negative_prompt?: string | null
          project_id?: string
          prompt?: string | null
          prompt_expansion?: boolean
          resolution?: string
          scene_number?: number
          seed?: number | null
          seed_image_url?: string | null
          shot_type?: string | null
          sort_order?: number
          status?: string
          updated_at?: string
          use_random_seed?: boolean
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scenes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      source_images: {
        Row: {
          approved_edit_id: string | null
          created_at: string
          file_size: number | null
          height: number | null
          id: string
          image_url: string
          original_filename: string | null
          project_id: string
          status: string
          tags: string[] | null
          updated_at: string
          user_id: string
          width: number | null
        }
        Insert: {
          approved_edit_id?: string | null
          created_at?: string
          file_size?: number | null
          height?: number | null
          id?: string
          image_url: string
          original_filename?: string | null
          project_id: string
          status?: string
          tags?: string[] | null
          updated_at?: string
          user_id: string
          width?: number | null
        }
        Update: {
          approved_edit_id?: string | null
          created_at?: string
          file_size?: number | null
          height?: number | null
          id?: string
          image_url?: string
          original_filename?: string | null
          project_id?: string
          status?: string
          tags?: string[] | null
          updated_at?: string
          user_id?: string
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "source_images_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      tamagotchi_events: {
        Row: {
          action_name: string
          created_at: string
          event_type: string
          id: string
          pet_id: string
          prompt_used: string | null
          result_image_url: string | null
          result_video_url: string | null
          stat_changes: Json | null
          user_id: string
          xp_earned: number | null
        }
        Insert: {
          action_name?: string
          created_at?: string
          event_type?: string
          id?: string
          pet_id: string
          prompt_used?: string | null
          result_image_url?: string | null
          result_video_url?: string | null
          stat_changes?: Json | null
          user_id: string
          xp_earned?: number | null
        }
        Update: {
          action_name?: string
          created_at?: string
          event_type?: string
          id?: string
          pet_id?: string
          prompt_used?: string | null
          result_image_url?: string | null
          result_video_url?: string | null
          stat_changes?: Json | null
          user_id?: string
          xp_earned?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "tamagotchi_events_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "tamagotchi_pets"
            referencedColumns: ["id"]
          },
        ]
      }
      tamagotchi_inventory: {
        Row: {
          id: string
          item_image_url: string | null
          item_name: string
          item_type: string
          pet_id: string
          unlocked_at: string
          user_id: string
        }
        Insert: {
          id?: string
          item_image_url?: string | null
          item_name: string
          item_type?: string
          pet_id: string
          unlocked_at?: string
          user_id: string
        }
        Update: {
          id?: string
          item_image_url?: string | null
          item_name?: string
          item_type?: string
          pet_id?: string
          unlocked_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tamagotchi_inventory_pet_id_fkey"
            columns: ["pet_id"]
            isOneToOne: false
            referencedRelation: "tamagotchi_pets"
            referencedColumns: ["id"]
          },
        ]
      }
      tamagotchi_pets: {
        Row: {
          avatar_urls: string[]
          created_at: string
          description: string | null
          energy: number
          happiness: number
          hunger: number
          id: string
          is_active: boolean
          last_interaction_at: string
          level: number
          name: string
          personality: string | null
          updated_at: string
          user_id: string
          xp: number
        }
        Insert: {
          avatar_urls?: string[]
          created_at?: string
          description?: string | null
          energy?: number
          happiness?: number
          hunger?: number
          id?: string
          is_active?: boolean
          last_interaction_at?: string
          level?: number
          name: string
          personality?: string | null
          updated_at?: string
          user_id: string
          xp?: number
        }
        Update: {
          avatar_urls?: string[]
          created_at?: string
          description?: string | null
          energy?: number
          happiness?: number
          hunger?: number
          id?: string
          is_active?: boolean
          last_interaction_at?: string
          level?: number
          name?: string
          personality?: string | null
          updated_at?: string
          user_id?: string
          xp?: number
        }
        Relationships: []
      }
      user_prompt_block_prefs: {
        Row: {
          block_id: string
          created_at: string
          custom_sort_order: number | null
          hidden: boolean
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          block_id: string
          created_at?: string
          custom_sort_order?: number | null
          hidden?: boolean
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          block_id?: string
          created_at?: string
          custom_sort_order?: number | null
          hidden?: boolean
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_prompt_block_prefs_block_id_fkey"
            columns: ["block_id"]
            isOneToOne: false
            referencedRelation: "prompt_blocks"
            referencedColumns: ["id"]
          },
        ]
      }
      user_prompt_category_prefs: {
        Row: {
          category: string
          created_at: string
          custom_sort_order: number | null
          hidden: boolean
          id: string
          user_id: string
        }
        Insert: {
          category: string
          created_at?: string
          custom_sort_order?: number | null
          hidden?: boolean
          id?: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          custom_sort_order?: number | null
          hidden?: boolean
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      user_settings: {
        Row: {
          atlas_api_key: string | null
          created_at: string
          default_audio: boolean
          default_duration: number
          default_image_model: string
          default_image_output_size: string
          default_image_prompt_expansion: boolean
          default_mode: string
          default_model: string
          default_prompt_expansion: boolean
          default_resolution: string
          default_shot_type: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          atlas_api_key?: string | null
          created_at?: string
          default_audio?: boolean
          default_duration?: number
          default_image_model?: string
          default_image_output_size?: string
          default_image_prompt_expansion?: boolean
          default_mode?: string
          default_model?: string
          default_prompt_expansion?: boolean
          default_resolution?: string
          default_shot_type?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          atlas_api_key?: string | null
          created_at?: string
          default_audio?: boolean
          default_duration?: number
          default_image_model?: string
          default_image_output_size?: string
          default_image_prompt_expansion?: boolean
          default_mode?: string
          default_model?: string
          default_prompt_expansion?: boolean
          default_resolution?: string
          default_shot_type?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
