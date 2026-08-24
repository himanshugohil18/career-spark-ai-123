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
      achievements: {
        Row: {
          ai_original: Json | null
          category: string | null
          confidence: number | null
          created_at: string
          date: string | null
          description: string
          id: string
          resume_id: string | null
          sort_order: number
          updated_at: string
          user_id: string
          user_verified: boolean
        }
        Insert: {
          ai_original?: Json | null
          category?: string | null
          confidence?: number | null
          created_at?: string
          date?: string | null
          description: string
          id?: string
          resume_id?: string | null
          sort_order?: number
          updated_at?: string
          user_id: string
          user_verified?: boolean
        }
        Update: {
          ai_original?: Json | null
          category?: string | null
          confidence?: number | null
          created_at?: string
          date?: string | null
          description?: string
          id?: string
          resume_id?: string | null
          sort_order?: number
          updated_at?: string
          user_id?: string
          user_verified?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "achievements_resume_id_fkey"
            columns: ["resume_id"]
            isOneToOne: false
            referencedRelation: "resumes"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_application_sessions: {
        Row: {
          approval_required_at: string | null
          approved_at: string | null
          browser_session_id: string | null
          cancelled_at: string | null
          company_id: string | null
          config: Json
          cover_letter_id: string | null
          created_at: string
          current_step: string
          error: string | null
          finished_at: string | null
          id: string
          job_id: string
          progress: number
          resume_version_id: string | null
          started_at: string | null
          status: string
          summary: Json
          updated_at: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          approval_required_at?: string | null
          approved_at?: string | null
          browser_session_id?: string | null
          cancelled_at?: string | null
          company_id?: string | null
          config?: Json
          cover_letter_id?: string | null
          created_at?: string
          current_step?: string
          error?: string | null
          finished_at?: string | null
          id?: string
          job_id: string
          progress?: number
          resume_version_id?: string | null
          started_at?: string | null
          status?: string
          summary?: Json
          updated_at?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          approval_required_at?: string | null
          approved_at?: string | null
          browser_session_id?: string | null
          cancelled_at?: string | null
          company_id?: string | null
          config?: Json
          cover_letter_id?: string | null
          created_at?: string
          current_step?: string
          error?: string | null
          finished_at?: string | null
          id?: string
          job_id?: string
          progress?: number
          resume_version_id?: string | null
          started_at?: string | null
          status?: string
          summary?: Json
          updated_at?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_application_sessions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_application_sessions_cover_letter_id_fkey"
            columns: ["cover_letter_id"]
            isOneToOne: false
            referencedRelation: "cover_letters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_application_sessions_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_application_sessions_resume_version_id_fkey"
            columns: ["resume_version_id"]
            isOneToOne: false
            referencedRelation: "resume_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_application_sessions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "application_workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_generation_history: {
        Row: {
          ai_model: string | null
          created_at: string
          error: string | null
          id: string
          input_hash: string | null
          kind: Database["public"]["Enums"]["generation_kind"]
          metadata: Json
          status: string
          target_id: string | null
          user_id: string
          workspace_id: string | null
        }
        Insert: {
          ai_model?: string | null
          created_at?: string
          error?: string | null
          id?: string
          input_hash?: string | null
          kind: Database["public"]["Enums"]["generation_kind"]
          metadata?: Json
          status?: string
          target_id?: string | null
          user_id: string
          workspace_id?: string | null
        }
        Update: {
          ai_model?: string | null
          created_at?: string
          error?: string | null
          id?: string
          input_hash?: string | null
          kind?: Database["public"]["Enums"]["generation_kind"]
          metadata?: Json
          status?: string
          target_id?: string | null
          user_id?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_generation_history_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "application_workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_session_answers: {
        Row: {
          ai_model: string | null
          answer: string
          confidence: number | null
          created_at: string
          id: string
          question: string
          session_id: string
          source: string | null
          user_id: string
        }
        Insert: {
          ai_model?: string | null
          answer: string
          confidence?: number | null
          created_at?: string
          id?: string
          question: string
          session_id: string
          source?: string | null
          user_id: string
        }
        Update: {
          ai_model?: string | null
          answer?: string
          confidence?: number | null
          created_at?: string
          id?: string
          question?: string
          session_id?: string
          source?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_session_answers_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "ai_application_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_session_events: {
        Row: {
          created_at: string
          data: Json
          id: string
          kind: string
          message: string
          session_id: string
          step: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          data?: Json
          id?: string
          kind?: string
          message: string
          session_id: string
          step?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          data?: Json
          id?: string
          kind?: string
          message?: string
          session_id?: string
          step?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_session_events_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "ai_application_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_session_fields: {
        Row: {
          created_at: string
          filled: boolean
          id: string
          kind: string | null
          label: string
          needs_user: boolean
          note: string | null
          selector: string | null
          session_id: string
          updated_at: string
          user_id: string
          value: string | null
        }
        Insert: {
          created_at?: string
          filled?: boolean
          id?: string
          kind?: string | null
          label: string
          needs_user?: boolean
          note?: string | null
          selector?: string | null
          session_id: string
          updated_at?: string
          user_id: string
          value?: string | null
        }
        Update: {
          created_at?: string
          filled?: boolean
          id?: string
          kind?: string | null
          label?: string
          needs_user?: boolean
          note?: string | null
          selector?: string | null
          session_id?: string
          updated_at?: string
          user_id?: string
          value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_session_fields_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "ai_application_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_session_screenshots: {
        Row: {
          caption: string | null
          created_at: string
          id: string
          image_url: string
          session_id: string
          step: string | null
          user_id: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          id?: string
          image_url: string
          session_id: string
          step?: string | null
          user_id: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          id?: string
          image_url?: string
          session_id?: string
          step?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_session_screenshots_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "ai_application_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      application_analysis: {
        Row: {
          ai_model: string | null
          created_at: string
          id: string
          input_hash: string | null
          job_intelligence: Json | null
          resume_analysis: Json | null
          updated_at: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          ai_model?: string | null
          created_at?: string
          id?: string
          input_hash?: string | null
          job_intelligence?: Json | null
          resume_analysis?: Json | null
          updated_at?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          ai_model?: string | null
          created_at?: string
          id?: string
          input_hash?: string | null
          job_intelligence?: Json | null
          resume_analysis?: Json | null
          updated_at?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "application_analysis_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: true
            referencedRelation: "application_workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      application_notes: {
        Row: {
          body: string | null
          created_at: string
          id: string
          kind: string
          metadata: Json
          remind_at: string | null
          title: string | null
          updated_at: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          kind?: string
          metadata?: Json
          remind_at?: string | null
          title?: string | null
          updated_at?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          kind?: string
          metadata?: Json
          remind_at?: string | null
          title?: string | null
          updated_at?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "application_notes_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "application_workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      application_packages: {
        Row: {
          ats_score: number | null
          cover_letter_id: string | null
          created_at: string
          id: string
          interview_session_id: string | null
          readiness_score: number | null
          resume_version_id: string | null
          screening_answer_ids: string[]
          status: string
          summary: Json
          updated_at: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          ats_score?: number | null
          cover_letter_id?: string | null
          created_at?: string
          id?: string
          interview_session_id?: string | null
          readiness_score?: number | null
          resume_version_id?: string | null
          screening_answer_ids?: string[]
          status?: string
          summary?: Json
          updated_at?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          ats_score?: number | null
          cover_letter_id?: string | null
          created_at?: string
          id?: string
          interview_session_id?: string | null
          readiness_score?: number | null
          resume_version_id?: string | null
          screening_answer_ids?: string[]
          status?: string
          summary?: Json
          updated_at?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "application_packages_cover_letter_id_fkey"
            columns: ["cover_letter_id"]
            isOneToOne: false
            referencedRelation: "cover_letters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "application_packages_interview_session_id_fkey"
            columns: ["interview_session_id"]
            isOneToOne: false
            referencedRelation: "interview_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "application_packages_resume_version_id_fkey"
            columns: ["resume_version_id"]
            isOneToOne: false
            referencedRelation: "resume_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "application_packages_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "application_workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      application_readiness: {
        Row: {
          ai_model: string | null
          ats_compatibility: number | null
          brain_alignment: number | null
          company_alignment: number | null
          competitiveness: string | null
          created_at: string
          experience_match: number | null
          id: string
          overall_score: number
          project_match: number | null
          recommendations: Json | null
          resume_quality: number | null
          skill_match: number | null
          strengths: Json | null
          technology_match: number | null
          top_improvements: Json | null
          updated_at: string
          user_id: string
          weaknesses: Json | null
          workspace_id: string
        }
        Insert: {
          ai_model?: string | null
          ats_compatibility?: number | null
          brain_alignment?: number | null
          company_alignment?: number | null
          competitiveness?: string | null
          created_at?: string
          experience_match?: number | null
          id?: string
          overall_score?: number
          project_match?: number | null
          recommendations?: Json | null
          resume_quality?: number | null
          skill_match?: number | null
          strengths?: Json | null
          technology_match?: number | null
          top_improvements?: Json | null
          updated_at?: string
          user_id: string
          weaknesses?: Json | null
          workspace_id: string
        }
        Update: {
          ai_model?: string | null
          ats_compatibility?: number | null
          brain_alignment?: number | null
          company_alignment?: number | null
          competitiveness?: string | null
          created_at?: string
          experience_match?: number | null
          id?: string
          overall_score?: number
          project_match?: number | null
          recommendations?: Json | null
          resume_quality?: number | null
          skill_match?: number | null
          strengths?: Json | null
          technology_match?: number | null
          top_improvements?: Json | null
          updated_at?: string
          user_id?: string
          weaknesses?: Json | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "application_readiness_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: true
            referencedRelation: "application_workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      application_timeline: {
        Row: {
          created_at: string
          description: string | null
          event_type: string
          id: string
          payload: Json
          stage: string | null
          title: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          event_type: string
          id?: string
          payload?: Json
          stage?: string | null
          title: string
          user_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          event_type?: string
          id?: string
          payload?: Json
          stage?: string | null
          title?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "application_timeline_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "application_workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      application_workspaces: {
        Row: {
          career_brain_version: number | null
          company_id: string | null
          created_at: string
          current_stage: string
          id: string
          job_id: string
          last_opened_at: string
          match_id: string | null
          metadata: Json
          notes: string | null
          progress_percent: number
          readiness_score: number | null
          resume_id: string | null
          resume_version: number | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          career_brain_version?: number | null
          company_id?: string | null
          created_at?: string
          current_stage?: string
          id?: string
          job_id: string
          last_opened_at?: string
          match_id?: string | null
          metadata?: Json
          notes?: string | null
          progress_percent?: number
          readiness_score?: number | null
          resume_id?: string | null
          resume_version?: number | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          career_brain_version?: number | null
          company_id?: string | null
          created_at?: string
          current_stage?: string
          id?: string
          job_id?: string
          last_opened_at?: string
          match_id?: string | null
          metadata?: Json
          notes?: string | null
          progress_percent?: number
          readiness_score?: number | null
          resume_id?: string | null
          resume_version?: number | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "application_workspaces_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "application_workspaces_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "application_workspaces_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "job_matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "application_workspaces_resume_id_fkey"
            columns: ["resume_id"]
            isOneToOne: false
            referencedRelation: "resumes"
            referencedColumns: ["id"]
          },
        ]
      }
      ats_analysis: {
        Row: {
          ai_model: string | null
          created_at: string
          formatting_score: number | null
          id: string
          keyword_coverage: number | null
          keyword_density: number | null
          matched_keywords: string[] | null
          missing_keywords: string[] | null
          overall_score: number
          preferred_skills_coverage: number | null
          required_skills_coverage: number | null
          section_completeness: Json | null
          suggestions: Json | null
          technology_coverage: number | null
          updated_at: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          ai_model?: string | null
          created_at?: string
          formatting_score?: number | null
          id?: string
          keyword_coverage?: number | null
          keyword_density?: number | null
          matched_keywords?: string[] | null
          missing_keywords?: string[] | null
          overall_score?: number
          preferred_skills_coverage?: number | null
          required_skills_coverage?: number | null
          section_completeness?: Json | null
          suggestions?: Json | null
          technology_coverage?: number | null
          updated_at?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          ai_model?: string | null
          created_at?: string
          formatting_score?: number | null
          id?: string
          keyword_coverage?: number | null
          keyword_density?: number | null
          matched_keywords?: string[] | null
          missing_keywords?: string[] | null
          overall_score?: number
          preferred_skills_coverage?: number | null
          required_skills_coverage?: number | null
          section_completeness?: Json | null
          suggestions?: Json | null
          technology_coverage?: number | null
          updated_at?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ats_analysis_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: true
            referencedRelation: "application_workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      career_brain: {
        Row: {
          ai_model: string | null
          career_goals: string[]
          completeness_score: number | null
          created_at: string
          growth_areas: string[]
          identity: Json
          last_generated_at: string | null
          last_source_resume_id: string | null
          learning_priorities: string[]
          location_preferences: string[]
          overall_confidence: number | null
          preferred_companies: string[]
          preferred_industries: string[]
          preferred_roles: string[]
          salary_goals: string | null
          strengths: string[]
          summary: string | null
          technology_interests: string[]
          updated_at: string
          user_id: string
          version: number
          weaknesses: string[]
        }
        Insert: {
          ai_model?: string | null
          career_goals?: string[]
          completeness_score?: number | null
          created_at?: string
          growth_areas?: string[]
          identity?: Json
          last_generated_at?: string | null
          last_source_resume_id?: string | null
          learning_priorities?: string[]
          location_preferences?: string[]
          overall_confidence?: number | null
          preferred_companies?: string[]
          preferred_industries?: string[]
          preferred_roles?: string[]
          salary_goals?: string | null
          strengths?: string[]
          summary?: string | null
          technology_interests?: string[]
          updated_at?: string
          user_id: string
          version?: number
          weaknesses?: string[]
        }
        Update: {
          ai_model?: string | null
          career_goals?: string[]
          completeness_score?: number | null
          created_at?: string
          growth_areas?: string[]
          identity?: Json
          last_generated_at?: string | null
          last_source_resume_id?: string | null
          learning_priorities?: string[]
          location_preferences?: string[]
          overall_confidence?: number | null
          preferred_companies?: string[]
          preferred_industries?: string[]
          preferred_roles?: string[]
          salary_goals?: string | null
          strengths?: string[]
          summary?: string | null
          technology_interests?: string[]
          updated_at?: string
          user_id?: string
          version?: number
          weaknesses?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "career_brain_last_source_resume_id_fkey"
            columns: ["last_source_resume_id"]
            isOneToOne: false
            referencedRelation: "resumes"
            referencedColumns: ["id"]
          },
        ]
      }
      career_dna: {
        Row: {
          ai: number
          architecture: number
          automation: number
          backend: number
          cloud: number
          communication: number
          created_at: string
          devops: number
          frontend: number
          leadership: number
          narrative: string | null
          problem_solving: number
          security: number
          updated_at: string
          user_id: string
        }
        Insert: {
          ai?: number
          architecture?: number
          automation?: number
          backend?: number
          cloud?: number
          communication?: number
          created_at?: string
          devops?: number
          frontend?: number
          leadership?: number
          narrative?: string | null
          problem_solving?: number
          security?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          ai?: number
          architecture?: number
          automation?: number
          backend?: number
          cloud?: number
          communication?: number
          created_at?: string
          devops?: number
          frontend?: number
          leadership?: number
          narrative?: string | null
          problem_solving?: number
          security?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      career_health: {
        Row: {
          career_direction: number | null
          certifications_score: number | null
          consistency: number | null
          created_at: string
          details: Json
          education_score: number | null
          experience_score: number | null
          improvement_areas: string[]
          profile_completion: number | null
          projects_score: number | null
          recommendations: string[]
          resume_quality: number | null
          score: number
          skills_score: number | null
          strengths: string[]
          updated_at: string
          user_id: string
          weaknesses: string[]
        }
        Insert: {
          career_direction?: number | null
          certifications_score?: number | null
          consistency?: number | null
          created_at?: string
          details?: Json
          education_score?: number | null
          experience_score?: number | null
          improvement_areas?: string[]
          profile_completion?: number | null
          projects_score?: number | null
          recommendations?: string[]
          resume_quality?: number | null
          score?: number
          skills_score?: number | null
          strengths?: string[]
          updated_at?: string
          user_id: string
          weaknesses?: string[]
        }
        Update: {
          career_direction?: number | null
          certifications_score?: number | null
          consistency?: number | null
          created_at?: string
          details?: Json
          education_score?: number | null
          experience_score?: number | null
          improvement_areas?: string[]
          profile_completion?: number | null
          projects_score?: number | null
          recommendations?: string[]
          resume_quality?: number | null
          score?: number
          skills_score?: number | null
          strengths?: string[]
          updated_at?: string
          user_id?: string
          weaknesses?: string[]
        }
        Relationships: []
      }
      certifications: {
        Row: {
          ai_original: Json | null
          confidence: number | null
          created_at: string
          credential_id: string | null
          credential_url: string | null
          expiry_date: string | null
          id: string
          issue_date: string | null
          name: string
          organization: string | null
          resume_id: string | null
          sort_order: number
          updated_at: string
          user_id: string
          user_verified: boolean
        }
        Insert: {
          ai_original?: Json | null
          confidence?: number | null
          created_at?: string
          credential_id?: string | null
          credential_url?: string | null
          expiry_date?: string | null
          id?: string
          issue_date?: string | null
          name: string
          organization?: string | null
          resume_id?: string | null
          sort_order?: number
          updated_at?: string
          user_id: string
          user_verified?: boolean
        }
        Update: {
          ai_original?: Json | null
          confidence?: number | null
          created_at?: string
          credential_id?: string | null
          credential_url?: string | null
          expiry_date?: string | null
          id?: string
          issue_date?: string | null
          name?: string
          organization?: string | null
          resume_id?: string | null
          sort_order?: number
          updated_at?: string
          user_id?: string
          user_verified?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "certifications_resume_id_fkey"
            columns: ["resume_id"]
            isOneToOne: false
            referencedRelation: "resumes"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          created_at: string
          description: string | null
          domain: string | null
          id: string
          industry: string | null
          logo_url: string | null
          name: string
          remote_policy: string | null
          size: string | null
          slug: string
          tech_stack: Json
          updated_at: string
          website: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          domain?: string | null
          id?: string
          industry?: string | null
          logo_url?: string | null
          name: string
          remote_policy?: string | null
          size?: string | null
          slug: string
          tech_stack?: Json
          updated_at?: string
          website?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          domain?: string | null
          id?: string
          industry?: string | null
          logo_url?: string | null
          name?: string
          remote_policy?: string | null
          size?: string | null
          slug?: string
          tech_stack?: Json
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      company_intelligence: {
        Row: {
          ai_model: string | null
          company_id: string
          created_at: string
          engineering_culture: string | null
          funding_stage: string | null
          headquarters: string | null
          hiring_style: string | null
          id: string
          industry: string | null
          overview: string | null
          products: string[] | null
          raw: Json
          refreshed_at: string
          remote_policy: string | null
          size: string | null
          tech_stack: string[] | null
          updated_at: string
          values: string[] | null
          website: string | null
        }
        Insert: {
          ai_model?: string | null
          company_id: string
          created_at?: string
          engineering_culture?: string | null
          funding_stage?: string | null
          headquarters?: string | null
          hiring_style?: string | null
          id?: string
          industry?: string | null
          overview?: string | null
          products?: string[] | null
          raw?: Json
          refreshed_at?: string
          remote_policy?: string | null
          size?: string | null
          tech_stack?: string[] | null
          updated_at?: string
          values?: string[] | null
          website?: string | null
        }
        Update: {
          ai_model?: string | null
          company_id?: string
          created_at?: string
          engineering_culture?: string | null
          funding_stage?: string | null
          headquarters?: string | null
          hiring_style?: string | null
          id?: string
          industry?: string | null
          overview?: string | null
          products?: string[] | null
          raw?: Json
          refreshed_at?: string
          remote_policy?: string | null
          size?: string | null
          tech_stack?: string[] | null
          updated_at?: string
          values?: string[] | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_intelligence_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: true
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      cover_letters: {
        Row: {
          ai_model: string | null
          body: string
          closing: string | null
          company_id: string | null
          created_at: string
          greeting: string | null
          highlights: string[]
          id: string
          input_hash: string | null
          is_active: boolean
          job_id: string | null
          resume_version_id: string | null
          style: Database["public"]["Enums"]["cover_letter_style"]
          tone_notes: string | null
          updated_at: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          ai_model?: string | null
          body: string
          closing?: string | null
          company_id?: string | null
          created_at?: string
          greeting?: string | null
          highlights?: string[]
          id?: string
          input_hash?: string | null
          is_active?: boolean
          job_id?: string | null
          resume_version_id?: string | null
          style?: Database["public"]["Enums"]["cover_letter_style"]
          tone_notes?: string | null
          updated_at?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          ai_model?: string | null
          body?: string
          closing?: string | null
          company_id?: string | null
          created_at?: string
          greeting?: string | null
          highlights?: string[]
          id?: string
          input_hash?: string | null
          is_active?: boolean
          job_id?: string | null
          resume_version_id?: string | null
          style?: Database["public"]["Enums"]["cover_letter_style"]
          tone_notes?: string | null
          updated_at?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cover_letters_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cover_letters_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cover_letters_resume_version_id_fkey"
            columns: ["resume_version_id"]
            isOneToOne: false
            referencedRelation: "resume_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cover_letters_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "application_workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      education: {
        Row: {
          ai_original: Json | null
          board: string | null
          cgpa: string | null
          confidence: number | null
          created_at: string
          degree: string
          end_date: string | null
          field_of_study: string | null
          id: string
          institution: string
          percentage: string | null
          resume_id: string | null
          sort_order: number
          start_date: string | null
          updated_at: string
          user_id: string
          user_verified: boolean
        }
        Insert: {
          ai_original?: Json | null
          board?: string | null
          cgpa?: string | null
          confidence?: number | null
          created_at?: string
          degree: string
          end_date?: string | null
          field_of_study?: string | null
          id?: string
          institution: string
          percentage?: string | null
          resume_id?: string | null
          sort_order?: number
          start_date?: string | null
          updated_at?: string
          user_id: string
          user_verified?: boolean
        }
        Update: {
          ai_original?: Json | null
          board?: string | null
          cgpa?: string | null
          confidence?: number | null
          created_at?: string
          degree?: string
          end_date?: string | null
          field_of_study?: string | null
          id?: string
          institution?: string
          percentage?: string | null
          resume_id?: string | null
          sort_order?: number
          start_date?: string | null
          updated_at?: string
          user_id?: string
          user_verified?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "education_resume_id_fkey"
            columns: ["resume_id"]
            isOneToOne: false
            referencedRelation: "resumes"
            referencedColumns: ["id"]
          },
        ]
      }
      email_logs: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          metadata: Json
          provider_message_id: string | null
          recipient: string
          retry_count: number
          status: string
          subject: string | null
          template: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          metadata?: Json
          provider_message_id?: string | null
          recipient: string
          retry_count?: number
          status?: string
          subject?: string | null
          template: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          metadata?: Json
          provider_message_id?: string | null
          recipient?: string
          retry_count?: number
          status?: string
          subject?: string | null
          template?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      gap_analysis: {
        Row: {
          ai_model: string | null
          created_at: string
          high_priority: Json | null
          id: string
          mastered_skills: Json | null
          missing_skills: Json | null
          partial_skills: Json | null
          recommended_next: Json | null
          updated_at: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          ai_model?: string | null
          created_at?: string
          high_priority?: Json | null
          id?: string
          mastered_skills?: Json | null
          missing_skills?: Json | null
          partial_skills?: Json | null
          recommended_next?: Json | null
          updated_at?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          ai_model?: string | null
          created_at?: string
          high_priority?: Json | null
          id?: string
          mastered_skills?: Json | null
          missing_skills?: Json | null
          partial_skills?: Json | null
          recommended_next?: Json | null
          updated_at?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gap_analysis_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: true
            referencedRelation: "application_workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      interview_questions: {
        Row: {
          category: Database["public"]["Enums"]["interview_question_category"]
          common_mistakes: string[]
          confidence_tips: string[]
          created_at: string
          difficulty: Database["public"]["Enums"]["interview_question_difficulty"]
          follow_ups: string[]
          id: string
          key_points: string[]
          ordering: number
          practiced: boolean
          question: string
          session_id: string
          suggested_answer: string | null
          updated_at: string
          user_id: string
          user_notes: string | null
          workspace_id: string
        }
        Insert: {
          category: Database["public"]["Enums"]["interview_question_category"]
          common_mistakes?: string[]
          confidence_tips?: string[]
          created_at?: string
          difficulty?: Database["public"]["Enums"]["interview_question_difficulty"]
          follow_ups?: string[]
          id?: string
          key_points?: string[]
          ordering?: number
          practiced?: boolean
          question: string
          session_id: string
          suggested_answer?: string | null
          updated_at?: string
          user_id: string
          user_notes?: string | null
          workspace_id: string
        }
        Update: {
          category?: Database["public"]["Enums"]["interview_question_category"]
          common_mistakes?: string[]
          confidence_tips?: string[]
          created_at?: string
          difficulty?: Database["public"]["Enums"]["interview_question_difficulty"]
          follow_ups?: string[]
          id?: string
          key_points?: string[]
          ordering?: number
          practiced?: boolean
          question?: string
          session_id?: string
          suggested_answer?: string | null
          updated_at?: string
          user_id?: string
          user_notes?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "interview_questions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "interview_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interview_questions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "application_workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      interview_sessions: {
        Row: {
          ai_model: string | null
          company_id: string | null
          completed_questions: number
          created_at: string
          focus: string | null
          id: string
          input_hash: string | null
          is_active: boolean
          job_id: string | null
          total_questions: number
          updated_at: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          ai_model?: string | null
          company_id?: string | null
          completed_questions?: number
          created_at?: string
          focus?: string | null
          id?: string
          input_hash?: string | null
          is_active?: boolean
          job_id?: string | null
          total_questions?: number
          updated_at?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          ai_model?: string | null
          company_id?: string | null
          completed_questions?: number
          created_at?: string
          focus?: string | null
          id?: string
          input_hash?: string | null
          is_active?: boolean
          job_id?: string | null
          total_questions?: number
          updated_at?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "interview_sessions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interview_sessions_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interview_sessions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "application_workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      job_collection_items: {
        Row: {
          added_at: string
          collection_id: string
          id: string
          job_id: string
          user_id: string
        }
        Insert: {
          added_at?: string
          collection_id: string
          id?: string
          job_id: string
          user_id: string
        }
        Update: {
          added_at?: string
          collection_id?: string
          id?: string
          job_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_collection_items_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "job_collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_collection_items_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      job_collections: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_default: boolean
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_default?: boolean
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_default?: boolean
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      job_matches: {
        Row: {
          ai_model: string | null
          brain_version: number | null
          career_goal_score: number
          computed_at: string
          created_at: string
          education_score: number
          experience_score: number
          explanation: string | null
          id: string
          job_id: string
          location_score: number
          missing_skills: Json
          overall_score: number
          salary_score: number
          skill_score: number
          strengths: string[]
          technology_score: number
          updated_at: string
          user_id: string
          weaknesses: string[]
        }
        Insert: {
          ai_model?: string | null
          brain_version?: number | null
          career_goal_score?: number
          computed_at?: string
          created_at?: string
          education_score?: number
          experience_score?: number
          explanation?: string | null
          id?: string
          job_id: string
          location_score?: number
          missing_skills?: Json
          overall_score?: number
          salary_score?: number
          skill_score?: number
          strengths?: string[]
          technology_score?: number
          updated_at?: string
          user_id: string
          weaknesses?: string[]
        }
        Update: {
          ai_model?: string | null
          brain_version?: number | null
          career_goal_score?: number
          computed_at?: string
          created_at?: string
          education_score?: number
          experience_score?: number
          explanation?: string | null
          id?: string
          job_id?: string
          location_score?: number
          missing_skills?: Json
          overall_score?: number
          salary_score?: number
          skill_score?: number
          strengths?: string[]
          technology_score?: number
          updated_at?: string
          user_id?: string
          weaknesses?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "job_matches_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      job_notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          job_id: string | null
          kind: Database["public"]["Enums"]["notification_kind"]
          link: string | null
          read_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          job_id?: string | null
          kind: Database["public"]["Enums"]["notification_kind"]
          link?: string | null
          read_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          job_id?: string | null
          kind?: Database["public"]["Enums"]["notification_kind"]
          link?: string | null
          read_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_notifications_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      job_provider_ids: {
        Row: {
          created_at: string
          id: string
          job_id: string
          provider: string
          source_id: string
          url: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          job_id: string
          provider: string
          source_id: string
          url?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          job_id?: string
          provider?: string
          source_id?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "job_provider_ids_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_provider_ids_provider_fkey"
            columns: ["provider"]
            isOneToOne: false
            referencedRelation: "job_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      job_sources: {
        Row: {
          avg_response_ms: number | null
          config: Json
          consecutive_failures: number
          created_at: string
          disabled_reason: string | null
          display_name: string
          enabled: boolean
          failure_count: number
          health_status: string
          id: string
          last_attempt_at: string | null
          last_error: string | null
          last_fetched_count: number
          last_run_at: string | null
          last_success_at: string | null
          last_verified_count: number
          source_type: string
          tier: number
          updated_at: string
        }
        Insert: {
          avg_response_ms?: number | null
          config?: Json
          consecutive_failures?: number
          created_at?: string
          disabled_reason?: string | null
          display_name: string
          enabled?: boolean
          failure_count?: number
          health_status?: string
          id: string
          last_attempt_at?: string | null
          last_error?: string | null
          last_fetched_count?: number
          last_run_at?: string | null
          last_success_at?: string | null
          last_verified_count?: number
          source_type?: string
          tier?: number
          updated_at?: string
        }
        Update: {
          avg_response_ms?: number | null
          config?: Json
          consecutive_failures?: number
          created_at?: string
          disabled_reason?: string | null
          display_name?: string
          enabled?: boolean
          failure_count?: number
          health_status?: string
          id?: string
          last_attempt_at?: string | null
          last_error?: string | null
          last_fetched_count?: number
          last_run_at?: string | null
          last_success_at?: string | null
          last_verified_count?: number
          source_type?: string
          tier?: number
          updated_at?: string
        }
        Relationships: []
      }
      jobs: {
        Row: {
          application_url: string
          benefits: string[]
          company_id: string | null
          created_at: string
          description: string | null
          employment_type: Database["public"]["Enums"]["employment_type"]
          experience_level: Database["public"]["Enums"]["experience_level"]
          expires_at: string | null
          fingerprint: string
          first_seen_at: string
          id: string
          is_active: boolean
          last_seen_at: string
          last_verified_at: string
          location: string | null
          location_country: string | null
          posted_at: string | null
          preferred_skills: string[]
          provider: string
          raw_payload: Json | null
          remote_status: Database["public"]["Enums"]["remote_status"]
          required_skills: string[]
          requirements: string[]
          responsibilities: string[]
          salary_currency: string | null
          salary_max: number | null
          salary_min: number | null
          source_id: string
          stale_reason: string | null
          title: string
          updated_at: string
          verification_count: number
        }
        Insert: {
          application_url: string
          benefits?: string[]
          company_id?: string | null
          created_at?: string
          description?: string | null
          employment_type?: Database["public"]["Enums"]["employment_type"]
          experience_level?: Database["public"]["Enums"]["experience_level"]
          expires_at?: string | null
          fingerprint: string
          first_seen_at?: string
          id?: string
          is_active?: boolean
          last_seen_at?: string
          last_verified_at?: string
          location?: string | null
          location_country?: string | null
          posted_at?: string | null
          preferred_skills?: string[]
          provider: string
          raw_payload?: Json | null
          remote_status?: Database["public"]["Enums"]["remote_status"]
          required_skills?: string[]
          requirements?: string[]
          responsibilities?: string[]
          salary_currency?: string | null
          salary_max?: number | null
          salary_min?: number | null
          source_id: string
          stale_reason?: string | null
          title: string
          updated_at?: string
          verification_count?: number
        }
        Update: {
          application_url?: string
          benefits?: string[]
          company_id?: string | null
          created_at?: string
          description?: string | null
          employment_type?: Database["public"]["Enums"]["employment_type"]
          experience_level?: Database["public"]["Enums"]["experience_level"]
          expires_at?: string | null
          fingerprint?: string
          first_seen_at?: string
          id?: string
          is_active?: boolean
          last_seen_at?: string
          last_verified_at?: string
          location?: string | null
          location_country?: string | null
          posted_at?: string | null
          preferred_skills?: string[]
          provider?: string
          raw_payload?: Json | null
          remote_status?: Database["public"]["Enums"]["remote_status"]
          required_skills?: string[]
          requirements?: string[]
          responsibilities?: string[]
          salary_currency?: string | null
          salary_max?: number | null
          salary_min?: number | null
          source_id?: string
          stale_reason?: string | null
          title?: string
          updated_at?: string
          verification_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "jobs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_provider_fkey"
            columns: ["provider"]
            isOneToOne: false
            referencedRelation: "job_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      languages: {
        Row: {
          ai_original: Json | null
          confidence: number | null
          created_at: string
          id: string
          name: string
          proficiency: string | null
          resume_id: string | null
          sort_order: number
          updated_at: string
          user_id: string
          user_verified: boolean
        }
        Insert: {
          ai_original?: Json | null
          confidence?: number | null
          created_at?: string
          id?: string
          name: string
          proficiency?: string | null
          resume_id?: string | null
          sort_order?: number
          updated_at?: string
          user_id: string
          user_verified?: boolean
        }
        Update: {
          ai_original?: Json | null
          confidence?: number | null
          created_at?: string
          id?: string
          name?: string
          proficiency?: string | null
          resume_id?: string | null
          sort_order?: number
          updated_at?: string
          user_id?: string
          user_verified?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "languages_resume_id_fkey"
            columns: ["resume_id"]
            isOneToOne: false
            referencedRelation: "resumes"
            referencedColumns: ["id"]
          },
        ]
      }
      login_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          ip: string | null
          provider: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          event_type?: string
          id?: string
          ip?: string | null
          provider?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          ip?: string | null
          provider?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          currency: string
          id: string
          invoice_issued_at: string | null
          invoice_number: string | null
          method: string | null
          notes: Json | null
          order_id: string
          payment_id: string | null
          plan: string | null
          receipt: string | null
          signature: string | null
          status: string
          subscription_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          id?: string
          invoice_issued_at?: string | null
          invoice_number?: string | null
          method?: string | null
          notes?: Json | null
          order_id: string
          payment_id?: string | null
          plan?: string | null
          receipt?: string | null
          signature?: string | null
          status?: string
          subscription_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          invoice_issued_at?: string | null
          invoice_number?: string | null
          method?: string | null
          notes?: Json | null
          order_id?: string
          payment_id?: string | null
          plan?: string | null
          receipt?: string | null
          signature?: string | null
          status?: string
          subscription_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          ai_original: Json | null
          avatar_url: string | null
          created_at: string
          current_title: string | null
          email: string | null
          expected_salary: string | null
          full_name: string | null
          github_url: string | null
          linkedin_url: string | null
          location: string | null
          onboarding_completed: boolean
          phone: string | null
          portfolio_url: string | null
          preferred_location: string | null
          preferred_role: string | null
          professional_summary: string | null
          updated_at: string
          user_id: string
          verified_fields: string[]
          website_url: string | null
          welcomed_at: string | null
          years_of_experience: number | null
        }
        Insert: {
          ai_original?: Json | null
          avatar_url?: string | null
          created_at?: string
          current_title?: string | null
          email?: string | null
          expected_salary?: string | null
          full_name?: string | null
          github_url?: string | null
          linkedin_url?: string | null
          location?: string | null
          onboarding_completed?: boolean
          phone?: string | null
          portfolio_url?: string | null
          preferred_location?: string | null
          preferred_role?: string | null
          professional_summary?: string | null
          updated_at?: string
          user_id: string
          verified_fields?: string[]
          website_url?: string | null
          welcomed_at?: string | null
          years_of_experience?: number | null
        }
        Update: {
          ai_original?: Json | null
          avatar_url?: string | null
          created_at?: string
          current_title?: string | null
          email?: string | null
          expected_salary?: string | null
          full_name?: string | null
          github_url?: string | null
          linkedin_url?: string | null
          location?: string | null
          onboarding_completed?: boolean
          phone?: string | null
          portfolio_url?: string | null
          preferred_location?: string | null
          preferred_role?: string | null
          professional_summary?: string | null
          updated_at?: string
          user_id?: string
          verified_fields?: string[]
          website_url?: string | null
          welcomed_at?: string | null
          years_of_experience?: number | null
        }
        Relationships: []
      }
      projects: {
        Row: {
          achievements: string[]
          ai_original: Json | null
          confidence: number | null
          created_at: string
          description: string | null
          duration: string | null
          end_date: string | null
          github_url: string | null
          id: string
          live_url: string | null
          name: string
          responsibilities: string[]
          resume_id: string | null
          sort_order: number
          start_date: string | null
          technologies: string[]
          updated_at: string
          user_id: string
          user_verified: boolean
        }
        Insert: {
          achievements?: string[]
          ai_original?: Json | null
          confidence?: number | null
          created_at?: string
          description?: string | null
          duration?: string | null
          end_date?: string | null
          github_url?: string | null
          id?: string
          live_url?: string | null
          name: string
          responsibilities?: string[]
          resume_id?: string | null
          sort_order?: number
          start_date?: string | null
          technologies?: string[]
          updated_at?: string
          user_id: string
          user_verified?: boolean
        }
        Update: {
          achievements?: string[]
          ai_original?: Json | null
          confidence?: number | null
          created_at?: string
          description?: string | null
          duration?: string | null
          end_date?: string | null
          github_url?: string | null
          id?: string
          live_url?: string | null
          name?: string
          responsibilities?: string[]
          resume_id?: string | null
          sort_order?: number
          start_date?: string | null
          technologies?: string[]
          updated_at?: string
          user_id?: string
          user_verified?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "projects_resume_id_fkey"
            columns: ["resume_id"]
            isOneToOne: false
            referencedRelation: "resumes"
            referencedColumns: ["id"]
          },
        ]
      }
      recommendation_history: {
        Row: {
          created_at: string
          id: string
          kind: string
          payload: Json
          seen_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind: string
          payload?: Json
          seen_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          payload?: Json
          seen_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      resume_versions: {
        Row: {
          ai_model: string | null
          ats_score: number | null
          base_resume_id: string | null
          career_brain_version: number | null
          company_id: string | null
          created_at: string
          diff: Json
          generation_reason: string | null
          id: string
          input_hash: string | null
          is_active: boolean
          job_id: string | null
          keywords_added: string[]
          optimized_content: Json
          readiness_score: number | null
          target_company: string | null
          target_job_title: string | null
          updated_at: string
          user_id: string
          version_name: string
          workspace_id: string | null
        }
        Insert: {
          ai_model?: string | null
          ats_score?: number | null
          base_resume_id?: string | null
          career_brain_version?: number | null
          company_id?: string | null
          created_at?: string
          diff?: Json
          generation_reason?: string | null
          id?: string
          input_hash?: string | null
          is_active?: boolean
          job_id?: string | null
          keywords_added?: string[]
          optimized_content?: Json
          readiness_score?: number | null
          target_company?: string | null
          target_job_title?: string | null
          updated_at?: string
          user_id: string
          version_name: string
          workspace_id?: string | null
        }
        Update: {
          ai_model?: string | null
          ats_score?: number | null
          base_resume_id?: string | null
          career_brain_version?: number | null
          company_id?: string | null
          created_at?: string
          diff?: Json
          generation_reason?: string | null
          id?: string
          input_hash?: string | null
          is_active?: boolean
          job_id?: string | null
          keywords_added?: string[]
          optimized_content?: Json
          readiness_score?: number | null
          target_company?: string | null
          target_job_title?: string | null
          updated_at?: string
          user_id?: string
          version_name?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "resume_versions_base_resume_id_fkey"
            columns: ["base_resume_id"]
            isOneToOne: false
            referencedRelation: "resumes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resume_versions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resume_versions_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resume_versions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "application_workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      resumes: {
        Row: {
          ai_model: string | null
          approved_at: string | null
          created_at: string
          error_message: string | null
          file_name: string
          file_path: string
          file_size: number
          id: string
          is_active: boolean
          mime_type: string
          overall_confidence: number | null
          parsed_at: string | null
          parsed_json: Json | null
          raw_text: string | null
          status: string
          updated_at: string
          user_id: string
          version: number
        }
        Insert: {
          ai_model?: string | null
          approved_at?: string | null
          created_at?: string
          error_message?: string | null
          file_name: string
          file_path: string
          file_size: number
          id?: string
          is_active?: boolean
          mime_type: string
          overall_confidence?: number | null
          parsed_at?: string | null
          parsed_json?: Json | null
          raw_text?: string | null
          status?: string
          updated_at?: string
          user_id: string
          version: number
        }
        Update: {
          ai_model?: string | null
          approved_at?: string | null
          created_at?: string
          error_message?: string | null
          file_name?: string
          file_path?: string
          file_size?: number
          id?: string
          is_active?: boolean
          mime_type?: string
          overall_confidence?: number | null
          parsed_at?: string | null
          parsed_json?: Json | null
          raw_text?: string | null
          status?: string
          updated_at?: string
          user_id?: string
          version?: number
        }
        Relationships: []
      }
      saved_jobs: {
        Row: {
          created_at: string
          id: string
          job_id: string
          notes: string | null
          status: Database["public"]["Enums"]["saved_job_status"]
          tags: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          job_id: string
          notes?: string | null
          status?: Database["public"]["Enums"]["saved_job_status"]
          tags?: string[]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          job_id?: string
          notes?: string | null
          status?: Database["public"]["Enums"]["saved_job_status"]
          tags?: string[]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_jobs_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      screening_answers: {
        Row: {
          ai_model: string | null
          answer: string
          created_at: string
          edited: boolean
          id: string
          input_hash: string | null
          job_id: string | null
          key_points: string[]
          kind: Database["public"]["Enums"]["screening_question_kind"]
          question: string
          updated_at: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          ai_model?: string | null
          answer: string
          created_at?: string
          edited?: boolean
          id?: string
          input_hash?: string | null
          job_id?: string | null
          key_points?: string[]
          kind: Database["public"]["Enums"]["screening_question_kind"]
          question: string
          updated_at?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          ai_model?: string | null
          answer?: string
          created_at?: string
          edited?: boolean
          id?: string
          input_hash?: string | null
          job_id?: string | null
          key_points?: string[]
          kind?: Database["public"]["Enums"]["screening_question_kind"]
          question?: string
          updated_at?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "screening_answers_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "screening_answers_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "application_workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      search_history: {
        Row: {
          created_at: string
          id: string
          kind: Database["public"]["Enums"]["search_kind"]
          parsed_filters: Json
          query: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["search_kind"]
          parsed_filters?: Json
          query: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["search_kind"]
          parsed_filters?: Json
          query?: string
          user_id?: string
        }
        Relationships: []
      }
      skills: {
        Row: {
          ai_original: Json | null
          category: string
          confidence: number | null
          created_at: string
          id: string
          name: string
          proficiency: string | null
          resume_id: string | null
          sort_order: number
          updated_at: string
          user_id: string
          user_verified: boolean
        }
        Insert: {
          ai_original?: Json | null
          category: string
          confidence?: number | null
          created_at?: string
          id?: string
          name: string
          proficiency?: string | null
          resume_id?: string | null
          sort_order?: number
          updated_at?: string
          user_id: string
          user_verified?: boolean
        }
        Update: {
          ai_original?: Json | null
          category?: string
          confidence?: number | null
          created_at?: string
          id?: string
          name?: string
          proficiency?: string | null
          resume_id?: string | null
          sort_order?: number
          updated_at?: string
          user_id?: string
          user_verified?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "skills_resume_id_fkey"
            columns: ["resume_id"]
            isOneToOne: false
            referencedRelation: "resumes"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          cancelled_at: string | null
          created_at: string
          expires_at: string | null
          id: string
          plan: string
          razorpay_customer_id: string | null
          razorpay_order_id: string | null
          razorpay_payment_id: string | null
          razorpay_subscription_id: string | null
          started_at: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cancelled_at?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          plan: string
          razorpay_customer_id?: string | null
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          razorpay_subscription_id?: string | null
          started_at?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cancelled_at?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          plan?: string
          razorpay_customer_id?: string | null
          razorpay_order_id?: string | null
          razorpay_payment_id?: string | null
          razorpay_subscription_id?: string | null
          started_at?: string | null
          status?: string
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
      viewed_jobs: {
        Row: {
          id: string
          job_id: string
          user_id: string
          viewed_at: string
        }
        Insert: {
          id?: string
          job_id: string
          user_id: string
          viewed_at?: string
        }
        Update: {
          id?: string
          job_id?: string
          user_id?: string
          viewed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "viewed_jobs_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      work_experiences: {
        Row: {
          achievements: string[]
          ai_original: Json | null
          company: string
          confidence: number | null
          created_at: string
          duration: string | null
          employment_type: string | null
          end_date: string | null
          id: string
          is_current: boolean
          location: string | null
          responsibilities: string[]
          resume_id: string | null
          role: string
          sort_order: number
          start_date: string | null
          technologies: string[]
          updated_at: string
          user_id: string
          user_verified: boolean
        }
        Insert: {
          achievements?: string[]
          ai_original?: Json | null
          company: string
          confidence?: number | null
          created_at?: string
          duration?: string | null
          employment_type?: string | null
          end_date?: string | null
          id?: string
          is_current?: boolean
          location?: string | null
          responsibilities?: string[]
          resume_id?: string | null
          role: string
          sort_order?: number
          start_date?: string | null
          technologies?: string[]
          updated_at?: string
          user_id: string
          user_verified?: boolean
        }
        Update: {
          achievements?: string[]
          ai_original?: Json | null
          company?: string
          confidence?: number | null
          created_at?: string
          duration?: string | null
          employment_type?: string | null
          end_date?: string | null
          id?: string
          is_current?: boolean
          location?: string | null
          responsibilities?: string[]
          resume_id?: string | null
          role?: string
          sort_order?: number
          start_date?: string | null
          technologies?: string[]
          updated_at?: string
          user_id?: string
          user_verified?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "work_experiences_resume_id_fkey"
            columns: ["resume_id"]
            isOneToOne: false
            referencedRelation: "resumes"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      ensure_default_job_collections: {
        Args: { _user_id: string }
        Returns: undefined
      }
      get_active_plan: { Args: { _user_id: string }; Returns: string }
      get_public_stats: { Args: never; Returns: Json }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      sweep_stale_jobs: {
        Args: { _stale_days?: number }
        Returns: {
          expired_count: number
          stale_count: number
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "user"
      cover_letter_style:
        | "professional"
        | "executive"
        | "concise"
        | "enthusiastic"
        | "startup"
        | "enterprise"
      employment_type:
        | "full_time"
        | "part_time"
        | "contract"
        | "internship"
        | "temporary"
        | "freelance"
        | "unknown"
      experience_level:
        | "intern"
        | "entry"
        | "junior"
        | "mid"
        | "senior"
        | "staff"
        | "principal"
        | "lead"
        | "executive"
        | "unknown"
      generation_kind:
        | "resume_optimization"
        | "cover_letter"
        | "screening_answer"
        | "interview_session"
        | "application_package"
        | "custom_question"
      interview_question_category:
        | "technical"
        | "behavioral"
        | "hr"
        | "project"
        | "resume"
        | "scenario"
        | "company"
        | "system_design"
        | "cloud_devops"
        | "coding"
      interview_question_difficulty: "easy" | "medium" | "hard"
      notification_kind:
        | "new_high_match"
        | "saved_updated"
        | "salary_change"
        | "job_closed"
        | "remote_opportunity"
        | "application_reminder"
        | "career_brain_activated"
        | "ai_generation_complete"
        | "ai_generation_failed"
        | "auto_apply_complete"
        | "auto_apply_failed"
        | "auto_apply_needs_approval"
        | "system"
      remote_status: "remote" | "hybrid" | "onsite" | "unknown"
      saved_job_status:
        | "saved"
        | "favorite"
        | "archived"
        | "ignored"
        | "applied_later"
      screening_question_kind:
        | "about_you"
        | "why_company"
        | "why_hire"
        | "challenge"
        | "achievement"
        | "goals"
        | "why_leaving"
        | "strengths"
        | "weaknesses"
        | "custom_short"
        | "custom_paragraph"
        | "custom_essay"
        | "portfolio"
        | "project"
        | "technical"
      search_kind: "natural" | "filter"
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
      cover_letter_style: [
        "professional",
        "executive",
        "concise",
        "enthusiastic",
        "startup",
        "enterprise",
      ],
      employment_type: [
        "full_time",
        "part_time",
        "contract",
        "internship",
        "temporary",
        "freelance",
        "unknown",
      ],
      experience_level: [
        "intern",
        "entry",
        "junior",
        "mid",
        "senior",
        "staff",
        "principal",
        "lead",
        "executive",
        "unknown",
      ],
      generation_kind: [
        "resume_optimization",
        "cover_letter",
        "screening_answer",
        "interview_session",
        "application_package",
        "custom_question",
      ],
      interview_question_category: [
        "technical",
        "behavioral",
        "hr",
        "project",
        "resume",
        "scenario",
        "company",
        "system_design",
        "cloud_devops",
        "coding",
      ],
      interview_question_difficulty: ["easy", "medium", "hard"],
      notification_kind: [
        "new_high_match",
        "saved_updated",
        "salary_change",
        "job_closed",
        "remote_opportunity",
        "application_reminder",
        "career_brain_activated",
        "ai_generation_complete",
        "ai_generation_failed",
        "auto_apply_complete",
        "auto_apply_failed",
        "auto_apply_needs_approval",
        "system",
      ],
      remote_status: ["remote", "hybrid", "onsite", "unknown"],
      saved_job_status: [
        "saved",
        "favorite",
        "archived",
        "ignored",
        "applied_later",
      ],
      screening_question_kind: [
        "about_you",
        "why_company",
        "why_hire",
        "challenge",
        "achievement",
        "goals",
        "why_leaving",
        "strengths",
        "weaknesses",
        "custom_short",
        "custom_paragraph",
        "custom_essay",
        "portfolio",
        "project",
        "technical",
      ],
      search_kind: ["natural", "filter"],
    },
  },
} as const
