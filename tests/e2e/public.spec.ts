import { expect, test } from "@playwright/test";

// These specs need no database: they verify the public surface and the auth boundary.

test.describe("public pages", () => {
  test("landing page explains the product and links to sign-up", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Measure the opportunities behind your visibility");
    await expect(page.getByRole("link", { name: /get started/i })).toHaveAttribute("href", "/signup");
    await expect(page.getByText(/not affiliated with or endorsed by LinkedIn/i)).toBeVisible();
  });

  test("sign-in form is accessible and reports problems", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByRole("alert").first()).toBeVisible();
  });

  test("sign-up and password-reset pages render", async ({ page }) => {
    await page.goto("/signup");
    await expect(page.getByLabel("Full name")).toBeVisible();
    await page.goto("/forgot-password");
    await expect(page.getByRole("button", { name: /send reset link/i })).toBeVisible();
  });

  test("unknown routes show the not-found page", async ({ page }) => {
    const res = await page.goto("/definitely-not-a-page");
    expect(res?.status()).toBe(404);
    await expect(page.getByRole("heading", { name: /page not found/i })).toBeVisible();
  });
});

test.describe("auth boundary", () => {
  for (const path of ["/dashboard", "/analytics", "/audience", "/content", "/opportunities", "/insights", "/settings", "/onboarding"]) {
    test(`${path} redirects anonymous visitors to /login`, async ({ page }) => {
      await page.goto(path);
      await expect(page).toHaveURL(/\/login\?next=/);
    });
  }

  test("protected API routes reject anonymous requests", async ({ request }) => {
    const upload = await request.post("/api/uploads", { multipart: { file: { name: "a.png", mimeType: "image/png", buffer: Buffer.from("x") } } });
    expect(upload.status()).toBe(401);
    expect((await request.post("/api/account/delete", { data: { confirm: "x" } })).status()).toBe(401);
  });

  test("responses carry hardening headers", async ({ request }) => {
    const res = await request.get("/");
    expect(res.headers()["x-frame-options"]).toBe("DENY");
    expect(res.headers()["x-content-type-options"]).toBe("nosniff");
  });
});
