export interface PostPerf {
  title: string;
  topics: string[];
  contentType: string;
  fitScore: number | null;
  engagementRate: number | null;
  profileActivity: number | null;
}

export interface Takeaway {
  text: string;
  basis: string; // what the claim is computed from, shown to the user
}

const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

/**
 * Deterministic, data-grounded observations. Every statement is computed from the supplied rows;
 * when there is too little data we say so instead of making a claim. No causal language.
 */
export function contentTakeaways(posts: PostPerf[]): { takeaways: Takeaway[]; insufficient: string | null } {
  const withFit = posts.filter((p) => p.fitScore !== null);
  if (withFit.length < 2) {
    return { takeaways: [], insufficient: "Add audience demographics to at least two posts to compare how well each one reached your target audience." };
  }
  const takeaways: Takeaway[] = [];

  // By topic: compare each topic's average fit with the average of all other posts.
  const topics = new Set(withFit.flatMap((p) => p.topics.map((t) => t.toLowerCase())));
  for (const t of topics) {
    const inT = withFit.filter((p) => p.topics.some((x) => x.toLowerCase() === t));
    const out = withFit.filter((p) => !p.topics.some((x) => x.toLowerCase() === t));
    if (inT.length === 0 || out.length === 0) continue;
    const a = avg(inT.map((p) => p.fitScore as number));
    const b = avg(out.map((p) => p.fitScore as number));
    if (a - b >= 10) {
      takeaways.push({
        text: `Posts tagged “${t}” reached a higher share of your target audience (average fit ${a.toFixed(0)}) than your other posts (${b.toFixed(0)}).`,
        basis: `${inT.length} post(s) vs ${out.length} post(s) with audience data. Observational — not proof the topic caused the difference.`,
      });
    }
  }

  // Engagement vs fit: surface the post that engaged most but fit least.
  const both = withFit.filter((p) => p.engagementRate !== null);
  if (both.length >= 2) {
    const topEng = [...both].sort((a, b) => (b.engagementRate as number) - (a.engagementRate as number))[0];
    const topFit = [...both].sort((a, b) => (b.fitScore as number) - (a.fitScore as number))[0];
    if (topEng && topFit && topEng.title !== topFit.title) {
      takeaways.push({
        text: `“${topEng.title}” had the highest engagement rate (${(topEng.engagementRate as number).toFixed(1)}%), but “${topFit.title}” reached the best-matching audience (fit ${(topFit.fitScore as number).toFixed(0)}).`,
        basis: `Compared across ${both.length} posts that have both engagement and audience data.`,
      });
    }
  }
  return { takeaways, insufficient: takeaways.length === 0 ? "Posts so far show no clear difference in audience fit. More posts with demographics will make comparisons meaningful." : null };
}
