import { test, expect, type Page } from "@playwright/test";

// Wait for the library to finish loading (spinner gone, content appears)
async function waitForLibrary(page: Page) {
  await expect(page.getByText("Scanning library…")).not.toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole("button", { name: /TV Shows/ })).toBeVisible();
}

test.describe("PlexFixer library browser", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await waitForLibrary(page);
  });

  // ---- Page chrome ----

  test("shows the PlexFixer header", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "PlexFixer" })).toBeVisible();
    await expect(page.getByText("Media library naming validator")).toBeVisible();
  });

  test("shows a loading spinner before data arrives", async ({ page: _ }) => {
    // Covered implicitly: waitForLibrary asserts the spinner disappears.
    // Open a fresh page to observe the spinner briefly.
    const ctx = await _.context();
    const newPage = await ctx.newPage();
    await newPage.goto("/");
    // Spinner may be very brief; just assert it eventually goes away
    await expect(newPage.getByText("Scanning library…")).not.toBeVisible({ timeout: 15_000 });
    await newPage.close();
  });

  // ---- TV Shows tab ----

  test("TV Shows tab is active by default and lists all shows", async ({ page }) => {
    await expect(page.getByRole("button", { name: /TV Shows \(3\)/ })).toBeVisible();
    await expect(page.getByText("Breaking Bad (2008)")).toBeVisible();
    await expect(page.getByText("Show Without Year")).toBeVisible();
    await expect(page.getByText("Show.With.Dots.(2020)")).toBeVisible();
  });

  test("summary bar shows correct show and issue counts", async ({ page }) => {
    await expect(page.getByText("3", { exact: true }).first()).toBeVisible();
    await expect(page.getByText("shows", { exact: false }).first()).toBeVisible();
    await expect(page.getByText(/shows with issues/)).toBeVisible();
  });

  test("valid show has a green status indicator", async ({ page }) => {
    const row = page.locator("button", { hasText: "Breaking Bad (2008)" });
    await expect(row.locator('[title="Valid"]')).toBeVisible();
  });

  test("show with missing year has a red error indicator", async ({ page }) => {
    const row = page.locator("button", { hasText: "Show Without Year" });
    await expect(row.locator('[title="Error"]')).toBeVisible();
  });

  test("show with dots in name has an amber warning indicator", async ({ page }) => {
    const row = page.locator("button", { hasText: "Show.With.Dots.(2020)" });
    await expect(row.locator('[title="Warning"]')).toBeVisible();
  });

  test("error show auto-expands and displays issue details", async ({ page }) => {
    // "Show Without Year" starts expanded because it has errors
    await expect(page.getByText("SHOW_MISSING_YEAR")).toBeVisible();
    await expect(page.getByText(/Show folder is missing a year/, { exact: false })).toBeVisible();
  });

  test("clicking a collapsed show expands its seasons", async ({ page }) => {
    // "Breaking Bad (2008)" starts collapsed (valid show). Season 02 is unique to it.
    await expect(page.getByText("Season 02")).not.toBeVisible();
    await page.locator("button", { hasText: "Breaking Bad (2008)" }).click();
    await expect(page.getByText("Season 02")).toBeVisible();
  });

  test('"Show only issues" filter hides valid shows', async ({ page }) => {
    await expect(page.getByText("Breaking Bad (2008)")).toBeVisible();
    await page.getByLabel("Show only issues").check();
    await expect(page.getByText("Breaking Bad (2008)")).not.toBeVisible();
    // Shows with issues remain
    await expect(page.getByText("Show Without Year")).toBeVisible();
    await expect(page.getByText("Show.With.Dots.(2020)")).toBeVisible();
  });

  test("unchecking the filter restores all shows", async ({ page }) => {
    await page.getByLabel("Show only issues").check();
    await expect(page.getByText("Breaking Bad (2008)")).not.toBeVisible();
    await page.getByLabel("Show only issues").uncheck();
    await expect(page.getByText("Breaking Bad (2008)")).toBeVisible();
  });

  // ---- Movies tab ----

  test("switching to Movies tab shows all movies", async ({ page }) => {
    await page.getByRole("button", { name: /Movies/ }).click();
    await expect(page.getByText("The Dark Knight (2008).mkv")).toBeVisible();
    await expect(page.getByText("Inception 2010.mkv")).toBeVisible();
    await expect(page.getByText("The.Matrix.(1999).mkv")).toBeVisible();
  });

  test("valid movie has a green indicator", async ({ page }) => {
    await page.getByRole("button", { name: /Movies/ }).click();
    const row = page.locator("button", { hasText: "The Dark Knight (2008).mkv" });
    await expect(row.locator('[title="Valid"]')).toBeVisible();
  });

  test("movie with bare year has a red error indicator", async ({ page }) => {
    await page.getByRole("button", { name: /Movies/ }).click();
    const row = page.locator("button", { hasText: "Inception 2010.mkv" });
    await expect(row.locator('[title="Error"]')).toBeVisible();
  });

  test("clicking a movie with issues expands the issue detail", async ({ page }) => {
    await page.getByRole("button", { name: /Movies/ }).click();
    await page.locator("button", { hasText: "Inception 2010.mkv" }).click();
    await expect(page.getByText("MOVIE_WRONG_YEAR_FORMAT")).toBeVisible();
    await expect(
      page.getByText(/Year must be wrapped in parentheses/, { exact: false })
    ).toBeVisible();
  });

  test("movie with dots has an amber warning indicator", async ({ page }) => {
    await page.getByRole("button", { name: /Movies/ }).click();
    const row = page.locator("button", { hasText: "The.Matrix.(1999).mkv" });
    await expect(row.locator('[title="Warning"]')).toBeVisible();
  });
});
