export const DIMENSIONS = ["job_title", "industry", "company", "seniority", "location"] as const;
export type Dimension = (typeof DIMENSIONS)[number];

export const DIMENSION_LABELS: Record<Dimension, string> = {
  job_title: "Job titles",
  industry: "Industries",
  company: "Companies",
  seniority: "Seniority",
  location: "Locations",
};

/** Maps each audience dimension to the weight key used in career_goals.scoring_weights. */
export const WEIGHT_KEYS = {
  job_title: "job_titles",
  industry: "industries",
  company: "companies",
  seniority: "seniority",
  location: "locations",
} as const satisfies Record<Dimension, string>;

export type WeightKey = (typeof WEIGHT_KEYS)[Dimension];
export type ScoringWeights = Record<WeightKey, number>;

export const DEFAULT_WEIGHTS: ScoringWeights = {
  job_titles: 35,
  industries: 25,
  companies: 20,
  seniority: 15,
  locations: 5,
};

export const GOAL_TYPES = [
  { value: "find_job", label: "Find a job" },
  { value: "attract_recruiters", label: "Attract recruiters" },
  { value: "attract_hiring_managers", label: "Attract hiring managers" },
  { value: "build_network", label: "Build a professional network" },
  { value: "find_freelance_clients", label: "Find freelance clients" },
  { value: "attract_business", label: "Attract business opportunities" },
  { value: "build_personal_brand", label: "Build a personal brand" },
  { value: "find_collaborations", label: "Find collaborations" },
] as const;

export const JOB_TITLE_SUGGESTIONS = [
  "Data Scientist", "Machine Learning Engineer", "AI Engineer", "Software Engineer",
  "Marketing Data Scientist", "Content Strategist", "Digital Marketing Specialist", "Product Manager",
];
export const INDUSTRY_SUGGESTIONS = [
  "Technology", "Artificial Intelligence", "Software", "SaaS", "Marketing", "E-commerce", "Finance", "Consulting",
];
export const SENIORITY_SUGGESTIONS = [
  "Recruiter", "HR Specialist", "Hiring Manager", "Team Lead", "Head of Department", "Director", "Founder", "Executive",
];
export const LOCATION_SUGGESTIONS = ["Remote", "International opportunities"];

export const SOURCE_TYPES = [
  { value: "profile_analytics", label: "Profile analytics" },
  { value: "search_appearances", label: "Search appearances" },
  { value: "audience_demographics", label: "Audience demographics" },
  { value: "follower_demographics", label: "Follower demographics" },
  { value: "post_analytics", label: "Individual post analytics" },
] as const;
export type SourceType = (typeof SOURCE_TYPES)[number]["value"];

/** Snapshot source types whose visibility metrics are summed on the dashboard. */
export const VISIBILITY_SOURCE_TYPES: SourceType[] = ["profile_analytics", "search_appearances"];

export const DATA_SOURCES = ["manual", "screenshot", "csv", "linkedin_api"] as const;
export type DataSource = (typeof DATA_SOURCES)[number];

export const OPPORTUNITY_TYPES = [
  { value: "recruiter_inquiry", label: "Recruiter inquiry" },
  { value: "hr_contact", label: "HR contact" },
  { value: "hiring_manager_contact", label: "Hiring-manager contact" },
  { value: "interview_invitation", label: "Interview invitation" },
  { value: "referral", label: "Referral" },
  { value: "networking_conversation", label: "Networking conversation" },
  { value: "connection_request", label: "Relevant connection request" },
  { value: "freelance_inquiry", label: "Freelance inquiry" },
  { value: "collaboration", label: "Collaboration" },
  { value: "job_offer", label: "Job offer" },
] as const;

export const OPPORTUNITY_STATUSES = [
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "conversation_started", label: "Conversation started" },
  { value: "interview_scheduled", label: "Interview scheduled" },
  { value: "interview_completed", label: "Interview completed" },
  { value: "offer_received", label: "Offer received" },
  { value: "accepted", label: "Accepted" },
  { value: "rejected", label: "Rejected" },
  { value: "closed", label: "Closed" },
  { value: "archived", label: "Archived" },
] as const;

export const ATTRIBUTION_SOURCES = [
  { value: "linkedin_post", label: "LinkedIn post" },
  { value: "linkedin_search", label: "LinkedIn search" },
  { value: "profile_discovery", label: "Profile discovery" },
  { value: "direct_message", label: "Direct LinkedIn message" },
  { value: "mutual_connection", label: "Mutual connection" },
  { value: "external_referral", label: "External referral" },
  { value: "previous_relationship", label: "Previous relationship" },
  { value: "job_application", label: "Job application" },
  { value: "unknown", label: "Unknown" },
] as const;

/** Attribution sources that point to LinkedIn visibility (used for the conversion metric). */
export const LINKEDIN_ATTRIBUTION = ["linkedin_post", "linkedin_search", "profile_discovery", "direct_message"] as const;

export const CONTENT_TYPES = [
  { value: "text", label: "Text post" },
  { value: "image", label: "Image" },
  { value: "carousel", label: "Carousel / document" },
  { value: "video", label: "Video" },
  { value: "article", label: "Article" },
  { value: "poll", label: "Poll" },
  { value: "other", label: "Other" },
] as const;

export const INSIGHT_TYPES = [
  { value: "weekly_summary", label: "Weekly performance summary" },
  { value: "audience_relevance", label: "Audience relevance analysis" },
  { value: "engagement_vs_impact", label: "Engagement vs professional impact" },
  { value: "content_recommendations", label: "Content performance recommendations" },
  { value: "positioning", label: "Professional positioning recommendations" },
  { value: "historical_comparison", label: "Historical performance comparison" },
] as const;
export type InsightType = (typeof INSIGHT_TYPES)[number]["value"];

export const RANGE_OPTIONS = [
  { value: "7d", label: "Last 7 days", days: 7 },
  { value: "30d", label: "Last 30 days", days: 30 },
  { value: "90d", label: "Last 90 days", days: 90 },
  { value: "6m", label: "Last 6 months", days: 182 },
  { value: "custom", label: "Custom range", days: 0 },
] as const;
export type RangeKey = (typeof RANGE_OPTIONS)[number]["value"];

export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;
export const ALLOWED_IMAGE_MIME = ["image/png", "image/jpeg", "image/webp"] as const;
export const UPLOADS_BUCKET = "analytics-uploads";
export const AVATARS_BUCKET = "avatars";

export function labelFor(list: readonly { value: string; label: string }[], value: string | null | undefined): string {
  if (!value) return "—";
  return list.find((i) => i.value === value)?.label ?? value;
}
