/**
 * Common API response types for the frontend.
 * These types mirror the backend Pydantic schemas.
 */

// =============================================================================
// Ability Types
// =============================================================================

export interface AbilityInfo {
  id: string;
  name: string;
  display_order: number;
  description?: string | null;
}

export interface MasterAbilityResponse {
  id: string;
  name: string;
  display_order: number;
  description?: string | null;
}

export interface AbilityCount {
  ability_id: string;
  ability_name: string;
  count: number;
}

export interface DetectedAbility {
  name: string;
  reason?: string | null;
  role: 'strong' | 'sub';
  score: number;
}

// =============================================================================
// Student Types
// =============================================================================

export interface StudentSummary {
  id: string;
  user_id: string;
  name: string;
  email: string;
  grade: number | null;
  class_name: string | null;
  theme_title: string | null;
  current_phase: string | null;
  total_reports: number;
  current_streak: number;
  max_streak: number;
  last_report_date: string | null;
  is_primary: boolean;
  seminar_lab_id: string | null;
  seminar_lab_name: string | null;
  alert_level: number;
  top_abilities: string[];
}

export interface StudentDetail extends StudentSummary {
  ability_counts: AbilityCount[];
}

// =============================================================================
// Report Types
// =============================================================================

export interface Report {
  id: string;
  content: string;
  phase_name: string | null;
  abilities: string[];
  ai_comment: string | null;
  reported_at: string;
  image_url?: string | null;
}

export interface ReportWithPhase extends Report {
  phase?: {
    name: string;
  };
}

// =============================================================================
// Theme Types
// =============================================================================

export interface Theme {
  id: string;
  title: string;
  description?: string | null;
  fiscal_year?: number;
  status?: string;
}

// =============================================================================
// Analysis Types
// =============================================================================

export interface CapabilityScore {
  id: string;
  name: string;
  score: number;
  description?: string | null;
}

export interface AnalysisResult {
  suggested_phase: string | null;
  suggested_phase_id: string | null;
  suggested_abilities: CapabilityScore[];
  ai_comment: string;
}

// =============================================================================
// Dashboard Types
// =============================================================================

export interface ScatterDataPoint {
  student_id: string;
  student_name: string;
  grade: number | null;
  class_name: string | null;
  ability_scores: Record<string, number>;
  ability_points?: Record<string, number>;
}

export interface ScatterDataResponse {
  abilities: AbilityInfo[];
  data_points: ScatterDataPoint[];
}

// =============================================================================
// Book Types
// =============================================================================

export interface Book {
  id?: string;
  title: string;
  author?: string;
  description?: string;
  cover_image_url?: string;
  link?: string;
}

// =============================================================================
// Chat Types
// =============================================================================

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatRequest {
  message: string;
  conversation_history?: ChatMessage[];
}

export interface ChatResponse {
  response: string;
}

// =============================================================================
// Phase Types
// =============================================================================

export interface ResearchPhase {
  id: string;
  name: string;
  display_order: number;
}

// =============================================================================
// Seminar Lab Types
// =============================================================================

export interface SeminarLab {
  id: string;
  name: string;
  description?: string | null;
  teacher_name?: string | null;
  student_count?: number;
  is_active: boolean;
}
