import { describe, it, expect } from "vitest";
import { validateShowFolder, validateSeasonFolder, validateEpisodeFile } from "../tv";

// ---- Show folder ----
describe("validateShowFolder", () => {
  it("passes a correctly named show folder", () => {
    expect(validateShowFolder("Breaking Bad (2008)")).toEqual([]);
    expect(validateShowFolder("The Office (2005)")).toEqual([]);
    expect(validateShowFolder("S.W.A.T. (2017)")).toEqual([]);
  });

  it("errors when year is missing", () => {
    const issues = validateShowFolder("Breaking Bad");
    expect(issues).toHaveLength(1);
    expect(issues[0].code).toBe("SHOW_MISSING_YEAR");
    expect(issues[0].severity).toBe("error");
  });

  it("errors when year uses square brackets", () => {
    const issues = validateShowFolder("Breaking Bad [2008]");
    expect(issues.some((i) => i.code === "SHOW_MISSING_YEAR")).toBe(true);
  });

  it("warns when dots are used instead of spaces", () => {
    const issues = validateShowFolder("Breaking.Bad.(2008)");
    expect(issues.some((i) => i.code === "SHOW_DOTS_INSTEAD_OF_SPACES")).toBe(true);
    expect(issues.some((i) => i.severity === "warning")).toBe(true);
  });

  it("can have both missing year and dots issues", () => {
    const issues = validateShowFolder("Breaking.Bad");
    expect(issues.some((i) => i.code === "SHOW_MISSING_YEAR")).toBe(true);
    expect(issues.some((i) => i.code === "SHOW_DOTS_INSTEAD_OF_SPACES")).toBe(true);
  });
});

// ---- Season folder ----
describe("validateSeasonFolder", () => {
  it("passes correctly padded season folders", () => {
    expect(validateSeasonFolder("Season 01")).toEqual([]);
    expect(validateSeasonFolder("Season 12")).toEqual([]);
  });

  it("passes 'Specials' folder", () => {
    expect(validateSeasonFolder("Specials")).toEqual([]);
    expect(validateSeasonFolder("specials")).toEqual([]);
  });

  it("warns on unpadded season number", () => {
    const issues = validateSeasonFolder("Season 1");
    expect(issues).toHaveLength(1);
    expect(issues[0].code).toBe("SEASON_UNPADDED_NUMBER");
    expect(issues[0].severity).toBe("warning");
  });

  it("errors on legacy 'S01' format", () => {
    const issues = validateSeasonFolder("S01");
    expect(issues).toHaveLength(1);
    expect(issues[0].code).toBe("SEASON_WRONG_FORMAT");
    expect(issues[0].severity).toBe("error");
  });

  it("errors on 'Series 1' format", () => {
    const issues = validateSeasonFolder("Series 1");
    expect(issues).toHaveLength(1);
    expect(issues[0].code).toBe("SEASON_WRONG_FORMAT");
  });

  it("errors on completely wrong format", () => {
    const issues = validateSeasonFolder("season one");
    expect(issues).toHaveLength(1);
    expect(issues[0].code).toBe("SEASON_WRONG_FORMAT");
  });
});

// ---- Episode file ----
describe("validateEpisodeFile", () => {
  it("passes standard episode format", () => {
    expect(validateEpisodeFile("Show Name - S01E01 - Pilot.mkv")).toEqual([]);
    expect(validateEpisodeFile("Show Name - S01E01.mkv")).toEqual([]);
  });

  it("passes multi-episode file", () => {
    expect(validateEpisodeFile("Show Name - S01E01E02.mkv")).toEqual([]);
  });

  it("errors on legacy 1x01 format", () => {
    const issues = validateEpisodeFile("Show Name - 1x01 - Pilot.mkv");
    expect(issues).toHaveLength(1);
    expect(issues[0].code).toBe("EPISODE_LEGACY_FORMAT");
    expect(issues[0].severity).toBe("error");
  });

  it("errors when no episode identifier is present", () => {
    const issues = validateEpisodeFile("Pilot.mkv");
    expect(issues).toHaveLength(1);
    expect(issues[0].code).toBe("EPISODE_MISSING_IDENTIFIER");
    expect(issues[0].severity).toBe("error");
  });

  it("warns when dots are used instead of spaces", () => {
    const issues = validateEpisodeFile("Show.Name.S01E01.Pilot.mkv");
    expect(issues).toHaveLength(1);
    expect(issues[0].code).toBe("EPISODE_DOTS_INSTEAD_OF_SPACES");
    expect(issues[0].severity).toBe("warning");
  });

  it("supports uppercase and lowercase SxxExx", () => {
    expect(validateEpisodeFile("Show Name - s01e01.mkv")).toEqual([]);
  });
});
