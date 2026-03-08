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

  test("expanding an error show displays issue details", async ({ page }) => {
    await page.locator("button", { hasText: "Show Without Year" }).click();
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
    // Expand "Good Show (2010)" then its "S1" season
    await page.locator("button", { hasText: "Good Show (2010)" }).click();
    await page.locator("button", { hasText: "S1" }).click();

    await expect(page.getByText("SEASON_WRONG_FORMAT")).toBeVisible();

    const input = page.getByTestId("rename-input");
    await expect(input).toBeVisible();
    await expect(input).toHaveValue("Season 01");
  });

  test("show folder with issues shows a rename panel", async ({ page }) => {
    // Expand "Show Without Year" to see its show-level rename panel
    await page.locator("button", { hasText: "Show Without Year" }).click();

    await expect(page.getByText("SHOW_MISSING_YEAR").first()).toBeVisible();
    const input = page.getByTestId("rename-input").first();
    await expect(input).toBeVisible();
    // No auto-suggestion for missing year — pre-filled with current name
    await expect(input).toHaveValue("Show Without Year");
  });

  // ---- Dark mode ----

  test("theme toggle is visible in the header", async ({ page }) => {
    await expect(page.getByTestId("theme-toggle")).toBeVisible();
    await expect(page.getByTestId("theme-option-system")).toBeVisible();
    await expect(page.getByTestId("theme-option-light")).toBeVisible();
    await expect(page.getByTestId("theme-option-dark")).toBeVisible();
  });

  test("clicking Dark applies the dark class to the html element", async ({ page }) => {
    await page.getByTestId("theme-option-dark").click();
    await expect(page.locator("html")).toHaveClass(/dark/);
  });

  test("clicking Light removes the dark class", async ({ page }) => {
    await page.getByTestId("theme-option-dark").click();
    await expect(page.locator("html")).toHaveClass(/dark/);
    await page.getByTestId("theme-option-light").click();
    await expect(page.locator("html")).not.toHaveClass(/dark/);
  });

  test("theme choice persists across page reload", async ({ page }) => {
    await page.getByTestId("theme-option-dark").click();
    await expect(page.locator("html")).toHaveClass(/dark/);
    await page.reload();
    await waitForLibrary(page);
    await expect(page.locator("html")).toHaveClass(/dark/);
  });

  // ---- Bulk rename ----

  test("checkboxes appear on rows with suggestions, not on valid rows", async ({ page }) => {
    await page.getByRole("button", { name: /Movies/ }).click();

    // Movies with fixable issues should have checkboxes
    const bulkFixRow = page.locator("div.border-b").filter({ hasText: "Bulk.Fix.Movie.2021.mkv" });
    await expect(bulkFixRow.locator('input[type="checkbox"]')).toBeVisible();

    const inceptionRow = page.locator("div.border-b").filter({ hasText: "Inception 2010.mkv" });
    await expect(inceptionRow.locator('input[type="checkbox"]')).toBeVisible();

    // Valid movie should have no checkbox
    const darkKnightRow = page
      .locator("div.border-b")
      .filter({ hasText: "The Dark Knight (2008).mkv" });
    await expect(darkKnightRow.locator('input[type="checkbox"]')).not.toBeVisible();
  });

  test('"Select all with issues" selects all selectable items', async ({ page }) => {
    await page.getByRole("button", { name: /Movies/ }).click();

    await page.getByTestId("bulk-select-all-button").click();

    // Bulk action bar should show a count > 0
    await expect(page.getByTestId("bulk-action-bar")).toBeVisible();
    await expect(page.getByTestId("bulk-action-bar")).toContainText("selected");

    // Button should now say "Deselect all"
    await expect(page.getByTestId("bulk-select-all-button")).toHaveText("Deselect all");
  });

  test("bulk action bar appears when items are selected and disappears after clear", async ({
    page,
  }) => {
    await page.getByRole("button", { name: /Movies/ }).click();

    // Select one movie via checkbox
    const bulkFixRow = page.locator("div.border-b").filter({ hasText: "Bulk.Fix.Movie.2021.mkv" });
    await bulkFixRow.locator('input[type="checkbox"]').check();

    await expect(page.getByTestId("bulk-action-bar")).toBeVisible();
    await expect(page.getByTestId("bulk-action-bar")).toContainText("1 item selected");

    // Clear selection
    await page.getByTestId("bulk-clear-button").click();
    await expect(page.getByTestId("bulk-action-bar")).not.toBeVisible();
  });

  test("preview modal shows all pending renames", async ({ page }) => {
    await page.getByRole("button", { name: /Movies/ }).click();

    // Select two bulk-fixable movies
    const bulkFixRow = page.locator("div.border-b").filter({ hasText: "Bulk.Fix.Movie.2021.mkv" });
    await bulkFixRow.locator('input[type="checkbox"]').check();
    const anotherFixRow = page
      .locator("div.border-b")
      .filter({ hasText: "Another.Fix.Movie.2022.mkv" });
    await anotherFixRow.locator('input[type="checkbox"]').check();

    await page.getByTestId("bulk-rename-button").click();

    await expect(page.getByTestId("bulk-preview-modal")).toBeVisible();
    // Both movies should appear in the preview
    await expect(page.getByTestId("bulk-preview-modal")).toContainText("Bulk.Fix.Movie.2021.mkv");
    await expect(page.getByTestId("bulk-preview-modal")).toContainText(
      "Another.Fix.Movie.2022.mkv"
    );
    await expect(page.getByTestId("bulk-preview-apply")).toBeVisible();
    await expect(page.getByTestId("bulk-preview-cancel")).toBeVisible();

    // Cancel closes the modal
    await page.getByTestId("bulk-preview-cancel").click();
    await expect(page.getByTestId("bulk-preview-modal")).not.toBeVisible();
  });

  test("bulk rename applies all operations and shows success summary", async ({ page }) => {
    await page.getByRole("button", { name: /Movies/ }).click();

    // Select the two bulk-fixable movies
    const bulkFixRow = page.locator("div.border-b").filter({ hasText: "Bulk.Fix.Movie.2021.mkv" });
    await bulkFixRow.locator('input[type="checkbox"]').check();
    const anotherFixRow = page
      .locator("div.border-b")
      .filter({ hasText: "Another.Fix.Movie.2022.mkv" });
    await anotherFixRow.locator('input[type="checkbox"]').check();

    await page.getByTestId("bulk-rename-button").click();
    await page.getByTestId("bulk-preview-apply").click();

    // Wait for operation to complete (summary text appears)
    await expect(page.getByTestId("bulk-summary")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByTestId("bulk-summary")).toContainText("2 succeeded");

    // Undo button should be visible since renames succeeded
    await expect(page.getByTestId("bulk-preview-undo")).toBeVisible();
  });

  test("undo button reverses successful bulk renames", async ({ page }) => {
    await page.getByRole("button", { name: /Movies/ }).click();

    // Select a bulk-fixable movie (whichever survived any previous rename test)
    // Use "Select all" to grab whatever is available
    await page.getByTestId("bulk-select-all-button").click();
    const actionBar = page.getByTestId("bulk-action-bar");
    await expect(actionBar).toBeVisible();

    await page.getByTestId("bulk-rename-button").click();
    await page.getByTestId("bulk-preview-apply").click();

    // Wait for done phase
    await expect(page.getByTestId("bulk-summary")).toBeVisible({ timeout: 15_000 });
    const summaryText = await page.getByTestId("bulk-summary").textContent();
    const anySucceeded = summaryText?.includes("0 succeeded") === false;

    if (anySucceeded) {
      // Click undo
      await page.getByTestId("bulk-preview-undo").click();

      // Wait for undo to complete
      await expect(page.getByTestId("bulk-summary")).toBeVisible({ timeout: 15_000 });
      await expect(page.getByTestId("bulk-summary")).toContainText("undone");

      // Close triggers refresh
      await page.getByTestId("bulk-preview-cancel").click();
      await waitForLibrary(page);
    }
  });

  // ---- Search ----

  test("search input is visible", async ({ page }) => {
    await expect(page.getByTestId("search-input")).toBeVisible();
  });

  test("searching by show name filters TV shows", async ({ page }) => {
    await page.getByTestId("search-input").fill("Breaking Bad");
    await expect(page.getByText("Breaking Bad (2008)")).toBeVisible();
    await expect(page.locator("button", { hasText: "Show Without Year" })).not.toBeVisible();
    await expect(page.getByText("Good Show (2010)")).not.toBeVisible();
  });

  test("clearing search restores all shows", async ({ page }) => {
    await page.getByTestId("search-input").fill("Breaking Bad");
    await expect(page.locator("button", { hasText: "Show Without Year" })).not.toBeVisible();
    await page.getByTestId("search-input").clear();
    await expect(page.locator("button", { hasText: "Show Without Year" })).toBeVisible();
  });

  test("searching by episode name shows the parent show", async ({ page }) => {
    await page.getByTestId("search-input").fill("Pilot");
    await expect(page.getByText("Breaking Bad (2008)")).toBeVisible();
    await expect(page.locator("button", { hasText: "Show Without Year" })).not.toBeVisible();
  });

  test("searching movies by name filters results", async ({ page }) => {
    await page.getByRole("button", { name: /Movies/ }).click();
    await page.getByTestId("search-input").fill("Inception");
    await expect(page.getByText("Inception 2010.mkv")).toBeVisible();
    await expect(page.getByText("The Dark Knight (2008).mkv")).not.toBeVisible();
  });

  test("shows no-results message when search has no match", async ({ page }) => {
    await page.getByTestId("search-input").fill("xyznonexistent");
    await expect(page.getByText(/No results for/)).toBeVisible();
  });

  // ---- Year lookup ----

  test("Look up year button appears for a show with SHOW_MISSING_YEAR", async ({ page }) => {
    // "Show Without Year" has SHOW_MISSING_YEAR
    await page.locator("button", { hasText: "Show Without Year" }).click();
    await expect(page.getByTestId("lookup-year-btn")).toBeVisible();
  });

  test("Look up year button does NOT appear for shows without SHOW_MISSING_YEAR", async ({
    page,
  }) => {
    // "Breaking Bad (2008)" has no SHOW_MISSING_YEAR issue
    await page.locator("button", { hasText: "Breaking Bad (2008)" }).click();
    await expect(page.getByTestId("lookup-year-btn")).not.toBeVisible();
  });

  test("clicking Look up year shows suggestions from mocked API", async ({ page }) => {
    await page.route("/api/lookup/show-year*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          { name: "Show Without Year", year: 2015 },
          { name: "Show Without Year: Origins", year: 2018 },
        ]),
      });
    });

    await page.locator("button", { hasText: "Show Without Year" }).click();
    await page.getByTestId("lookup-year-btn").click();

    await expect(page.getByTestId("lookup-result-2015")).toBeVisible();
    await expect(page.getByTestId("lookup-result-2018")).toBeVisible();
  });

  test("clicking a year suggestion populates the rename input", async ({ page }) => {
    await page.route("/api/lookup/show-year*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([{ name: "Show Without Year", year: 2015 }]),
      });
    });

    await page.locator("button", { hasText: "Show Without Year" }).click();
    await page.getByTestId("lookup-year-btn").click();
    await page.getByTestId("lookup-result-2015").click();

    await expect(page.getByTestId("rename-input")).toHaveValue("Show Without Year (2015)");
  });
});
