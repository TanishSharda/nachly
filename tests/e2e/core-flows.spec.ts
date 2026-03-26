import { expect, test } from "@playwright/test";

test.describe("Naachly core smoke flows", () => {
  test("explore page renders", async ({ page }) => {
    await page.goto("/explore");
    await expect(page.getByRole("heading", { name: /explore dance styles/i })).toBeVisible();
  });

  test("practice preflight page loads and can run checks", async ({ page }) => {
    await page.goto("/explore/bollywood/bijuria/practice-check");

    await expect(page.getByRole("heading", { name: /camera check/i })).toBeVisible();
    await page.getByRole("button", { name: /run camera check/i }).click();

    await expect(page.getByText(/secure context:/i)).toBeVisible();
  });

  test("feedback form requires minimum valid fields before enabling submit", async ({ page }) => {
    await page.goto("/dashboard/send-feedback");

    await expect(page.getByRole("heading", { name: /share feedback/i })).toBeVisible();

    const submitButton = page.getByRole("button", { name: /submit feedback/i });
    await expect(submitButton).toBeDisabled();

    await page.getByLabel("Email").fill("dancer@example.com");
    await page.getByLabel("Hip Hop").check();
    await page.getByLabel("Feedback or suggestions").fill(
      "Please add more beginner-friendly hip-hop isolation drills."
    );

    await expect(submitButton).toBeEnabled();
  });

  test("curated reels uses action-first UI without comments", async ({ page }) => {
    await page.goto("/reels");
    await page.waitForLoadState("networkidle");

    const emptyState = page.getByText(/no approved choreographies yet\./i);
    if (await emptyState.isVisible()) {
      await expect(emptyState).toBeVisible();
      return;
    }

    await expect(page.getByRole("button", { name: /like/i }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /share/i }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /save|saved/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /remix/i }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /learn/i }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /comment/i })).toHaveCount(0);
  });

  test("saved page renders curated surface", async ({ page }) => {
    await page.goto("/saved");
    await expect(page.getByRole("heading", { name: /saved for practice/i })).toBeVisible();
  });
});
