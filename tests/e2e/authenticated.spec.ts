import { expect, test, type Page } from "@playwright/test";

/**
 * Full user journey against a real Supabase (local `supabase start` or a dev project).
 * Skipped unless E2E_SUPABASE=1 — CI runs it in the `full-journey` job.
 * Local email confirmation must be disabled (the default in supabase/config.toml).
 */
test.skip(!process.env.E2E_SUPABASE, "requires a running Supabase instance");
test.describe.configure({ mode: "serial" });

const stamp = Date.now();
const email = `e2e-${stamp}@example.com`;
const password = "correct-horse-battery";
let opportunityUrl = "";

async function completeOnboarding(page: Page) {
  await page.getByLabel("Find a job").check();
  await page.getByRole("button", { name: /save & continue/i }).click();
  await page.getByRole("button", { name: "+ Data Scientist" }).click();
  await page.getByRole("button", { name: /save & continue/i }).click();
  for (let i = 0; i < 4; i++) await page.getByRole("button", { name: /^skip$/i }).click();
  await page.getByRole("button", { name: /finish setup/i }).click();
  await expect(page).toHaveURL(/\/analytics\/new/);
}

test("new user: sign up → onboarding → add analytics → dashboard → opportunity", async ({ page }) => {
  await page.goto("/signup");
  await page.getByLabel("Full name").fill("E2E Tester");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/onboarding/);

  await completeOnboarding(page);

  await page.getByLabel("Period start").fill("2026-10-01");
  await page.getByLabel("Period end").fill("2026-10-31");
  await page.getByLabel("Impressions").fill("1000");
  await page.getByLabel("Reactions").fill("40");
  await page.getByLabel("Comments").fill("8");
  await page.getByLabel("Reposts").fill("2");
  await page.getByRole("button", { name: "Save analytics" }).click();
  await expect(page).toHaveURL(/\/analytics\/[0-9a-f-]{36}/);

  // A duplicate period is rejected, never silently merged.
  await page.goto("/analytics/new");
  await page.getByLabel("Period start").fill("2026-10-01");
  await page.getByLabel("Period end").fill("2026-10-31");
  await page.getByLabel("Impressions").fill("5");
  await page.getByRole("button", { name: "Save analytics" }).click();
  await expect(page.getByText(/already exists/i).first()).toBeVisible();

  await page.goto("/dashboard?range=custom&from=2026-10-01&to=2026-10-31");
  await expect(page.getByText("1,000").first()).toBeVisible();

  await page.goto("/opportunities/new");
  await page.getByLabel("Company").fill("Acme");
  await page.getByRole("button", { name: "Create opportunity" }).click();
  await expect(page.getByRole("heading", { name: "Acme" })).toBeVisible();
  await expect(page.getByText(/Created as New/)).toBeVisible();
  opportunityUrl = new URL(page.url()).pathname;
});

test("a second user cannot open the first user's records", async ({ browser }) => {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto("/signup");
  await page.getByLabel("Full name").fill("Other User");
  await page.getByLabel("Email").fill(`other-${stamp}@example.com`);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/onboarding/);
  await completeOnboarding(page);

  // Under RLS the first user's record is indistinguishable from a non-existent one.
  await page.goto(opportunityUrl);
  await expect(page.getByRole("heading", { name: /page not found/i })).toBeVisible();
  await ctx.close();
});
