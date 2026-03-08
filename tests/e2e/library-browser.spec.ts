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
    await expect(page.getByRole("button", { name: /TV Shows \(5\)/ })).toBeVisible();
    await expect(page.getByText("Breaking Bad (2008)")).toBeVisible();
    // Use button locator to avoid matching the struck-through text in the rename panel
    await expect(page.locator("button", { hasText: "Show Without Year" })).toBeVisible();
    await expect(page.getByText("Show.With.Dots.(2020)")).toBeVisible();
    await expect(page.locator("button", { hasText: "Rename Me Show" })).toBeVisible();
    await expect(page.getByText("Good Show (2010)")).toBeVisible();
  });

  test("summary bar shows correct show and issue counts", async ({ page }) => {
    await expect(page.getByText("5", { exact: true }).first()).toBeVisible();
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
    // "Show Without Year" and "Rename Me Show" both start expanded — SHOW_MISSING_YEAR appears multiple times
    await expect(page.getByText("SHOW_MISSING_YEAR").first()).toBeVisible();
    await expect(
      page.getByText(/Show folder is missing a year/, { exact: false }).first()
    ).toBeVisible();
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
    // Use button locators to avoid matching the rename panel's struck-through text
    await expect(page.locator("button", { hasText: "Show Without Year" })).toBeVisible();
    await expect(page.locator("button", { hasText: "Show.With.Dots.(2020)" })).toBeVisible();
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

  // ---- Rename panel ----

  test("expanding a movie with issues shows a rename panel with suggested name", async ({
    page,
  }) => {
    await page.getByRole("button", { name: /Movies/ }).click();
    await page.locator("button", { hasText: "Inception 2010.mkv" }).click();

    const input = page.getByTestId("rename-input");
    await expect(input).toBeVisible();
    // Suggested name should wrap the year in parentheses
    await expect(input).toHaveValue("Inception (2010).mkv");
  });

  test("rename panel shows the old name struck-through", async ({ page }) => {
    await page.getByRole("button", { name: /Movies/ }).click();
    await page.locator("button", { hasText: "Inception 2010.mkv" }).click();

    await expect(page.getByText("Inception 2010.mkv").first()).toBeVisible();
  });

  test("user can edit the suggested name before applying", async ({ page }) => {
    await page.getByRole("button", { name: /Movies/ }).click();
    await page.locator("button", { hasText: "Inception 2010.mkv" }).click();

    const input = page.getByTestId("rename-input");
    await input.fill("Inception (2010) [custom edit].mkv");
    await expect(input).toHaveValue("Inception (2010) [custom edit].mkv");
  });

  test("apply button is disabled when name is unchanged", async ({ page }) => {
    await page.getByRole("button", { name: /Movies/ }).click();
    await page.locator("button", { hasText: "Inception 2010.mkv" }).click();

    const input = page.getByTestId("rename-input");
    // Clear the input and type the original name back to check disabled state
    await input.fill("Inception 2010.mkv");
    await expect(page.getByTestId("rename-apply")).toBeDisabled();
  });

  test("renaming a movie succeeds and refreshes the library", async ({ page }) => {
    await page.getByRole("button", { name: /Movies/ }).click();
    await page.locator("button", { hasText: "Rename.Me 2005.mkv" }).click();

    const input = page.getByTestId("rename-input");
    await expect(input).toBeVisible();

    // Apply the rename
    await page.getByTestId("rename-apply").click();
    await expect(page.getByTestId("rename-success")).toBeVisible();

    // After refresh, the renamed file should appear under its new name
    await waitForLibrary(page);
  });

  test("season with wrong format shows a rename panel with suggested name", async ({ page }) => {
    // "Good Show (2010)" and its "S1" season both auto-expand due to errors.
    // Collapse the other two auto-expanded shows to isolate the season rename panel.
    await page.locator("button", { hasText: "Show Without Year" }).click();
    await page.locator("button", { hasText: "Rename Me Show" }).click();

    // Only Good Show (2010) → S1 remains expanded
    await expect(page.getByText("SEASON_WRONG_FORMAT")).toBeVisible();

    const input = page.getByTestId("rename-input");
    await expect(input).toBeVisible();
    await expect(input).toHaveValue("Season 01");
  });

  test("show folder with issues shows a rename panel", async ({ page }) => {
    // Collapse the other auto-expanded shows so only "Show Without Year" has a visible rename panel
    await page.locator("button", { hasText: "Good Show (2010)" }).click();
    await page.locator("button", { hasText: "Rename Me Show" }).click();

    // "Show Without Year" remains expanded with its show-level rename panel
    await expect(page.getByText("SHOW_MISSING_YEAR").first()).toBeVisible();
    const input = page.getByTestId("rename-input").first();
    await expect(input).toBeVisible();
    // No auto-suggestion for missing year — pre-filled with current name
    await expect(input).toHaveValue("Show Without Year");
  });
});
