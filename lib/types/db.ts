import type { DataSource, Dimension, ScoringWeights, SourceType } from "@/lib/constants";

export interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  timezone: string;
  onboarding_completed: boolean;
  onboarding_step: number;
  created_at: string;
  updated_at: string;
}

export interface CareerGoal {
  id: string;
  user_id: string;
  goal_types: string[];
  target_job_titles: string[];
  target_industries: string[];
  target_companies: string[];
  target_seniority: string[];
  target_locations: string[];
  scoring_weights: ScoringWeights;
  synonyms: Record<string, string[]>;
  created_at: string;
  updated_at: string;
}

export interface AnalyticsSnapshot {
  id: string;
  user_id: string;
  source_type: SourceType;
  data_source: DataSource;
  upload_job_id: string | null;
  reporting_period_start: string;
  reporting_period_end: string;
  impressions: number | null;
  members_reached: number | null;
  profile_views: number | null;
  search_appearances: number | null;
  total_followers: number | null;
  follower_growth: number | null;
  reactions: number | null;
  comments: number | null;
  reposts: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface AudienceSegment {
  id: string;
  user_id: string;
  analytics_snapshot_id: string | null;
  post_id: string | null;
  dimension: Dimension;
  segment_name: string;
  member_count: number | null;
  percentage: number | null;
  is_estimated: boolean;
  data_source: DataSource;
  created_at: string;
}

export interface Post {
  id: string;
  user_id: string;
  title: string;
  post_url: string | null;
  post_text: string | null;
  content_type: string;
  topics: string[];
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PostMetric {
  id: string;
  user_id: string;
  post_id: string;
  reporting_period_start: string;
  reporting_period_end: string;
  impressions: number | null;
  reactions: number | null;
  comments: number | null;
  reposts: number | null;
  clicks: number | null;
  profile_activity: number | null;
  data_source: DataSource;
  created_at: string;
}

export interface Opportunity {
  id: string;
  user_id: string;
  company_name: string;
  contact_name: string | null;
  contact_role: string | null;
  opportunity_type: string;
  related_job_title: string | null;
  received_at: string;
  source: string | null;
  attribution_source: string;
  status: string;
  is_relevant: boolean;
  notes: string | null;
  last_interaction_at: string | null;
  outcome_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface OpportunityEvent {
  id: string;
  opportunity_id: string;
  event_type: string;
  from_status: string | null;
  to_status: string | null;
  note: string | null;
  created_at: string;
}

export type UploadStatus = "pending" | "processing" | "awaiting_review" | "completed" | "failed";

export interface UploadJob {
  id: string;
  user_id: string;
  storage_path: string;
  original_filename: string;
  mime_type: string;
  file_size: number;
  source_type: SourceType | null;
  processing_status: UploadStatus;
  extracted_data: unknown;
  extraction_confidence: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface Insight {
  id: string;
  user_id: string;
  insight_type: string;
  title: string;
  description: string;
  recommendation: string | null;
  evidence: Record<string, unknown>;
  model_name: string;
  prompt_version: string;
  status: "active" | "archived";
  reporting_period_start: string | null;
  reporting_period_end: string | null;
  created_at: string;
}

export interface UserPreferences {
  id: string;
  user_id: string;
  notification_preferences: Record<string, unknown>;
  dashboard_preferences: Record<string, unknown>;
  preferred_reporting_period: string;
  created_at: string;
  updated_at: string;
}
