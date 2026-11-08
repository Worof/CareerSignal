/**
 * Integration seam for the OFFICIAL LinkedIn API. Disabled by default.
 *
 * CareerSignal never scrapes LinkedIn, never automates a browser session and never uses cookies or hidden
 * endpoints. If LinkedIn grants this application API access, implement `LinkedInAnalyticsSource` and
 * set LINKEDIN_API_ENABLED=true. Imported rows must use data_source = 'linkedin_api'.
 */
export interface LinkedInAnalyticsSource {
  readonly enabled: boolean;
  fetchProfileAnalytics(range: { from: string; to: string }): Promise<unknown>;
}

class DisabledLinkedInSource implements LinkedInAnalyticsSource {
  readonly enabled = false;
  async fetchProfileAnalytics(): Promise<never> {
    throw new Error("The official LinkedIn API integration is not enabled.");
  }
}

export function getLinkedInSource(): LinkedInAnalyticsSource {
  // Intentionally returns the disabled source until an approved implementation exists.
  return new DisabledLinkedInSource();
}

export const isLinkedInApiEnabled = () => process.env.LINKEDIN_API_ENABLED === "true" && getLinkedInSource().enabled;
