import { describe, it, expect } from "vitest";
import { validateMovieName } from "../movies";

describe("validateMovieName", () => {
  it("passes a correctly named movie file", () => {
    expect(validateMovieName("The Dark Knight (2008).mkv")).toEqual([]);
  });

  it("passes a correctly named movie folder", () => {
    expect(validateMovieName("The Dark Knight (2008)")).toEqual([]);
  });

  it("passes a movie with an edition tag", () => {
    expect(validateMovieName("Blade Runner 2049 (2017) {edition-Director's Cut}.mkv")).toEqual([]);
  });

  it("errors when year is missing", () => {
    const issues = validateMovieName("The Dark Knight.mkv");
    expect(issues).toHaveLength(1);
    expect(issues[0].code).toBe("MOVIE_MISSING_YEAR");
    expect(issues[0].severity).toBe("error");
  });

  it("errors when year is present but not in parentheses", () => {
    const issues = validateMovieName("The Dark Knight 2008.mkv");
    expect(issues).toHaveLength(1);
    expect(issues[0].code).toBe("MOVIE_WRONG_YEAR_FORMAT");
    expect(issues[0].severity).toBe("error");
  });

  it("errors when year uses square brackets", () => {
    const issues = validateMovieName("The Dark Knight [2008].mkv");
    // Year is present but in the wrong format — square brackets instead of parentheses
    expect(issues.some((i) => i.code === "MOVIE_WRONG_YEAR_FORMAT")).toBe(true);
  });

  it("warns when dots are used instead of spaces", () => {
    const issues = validateMovieName("The.Dark.Knight.(2008).mkv");
    expect(issues.some((i) => i.code === "MOVIE_DOTS_INSTEAD_OF_SPACES")).toBe(true);
    expect(issues.some((i) => i.severity === "warning")).toBe(true);
  });

  it("can have both missing year and dots issues", () => {
    const issues = validateMovieName("The.Dark.Knight.mkv");
    expect(issues.some((i) => i.code === "MOVIE_MISSING_YEAR")).toBe(true);
    expect(issues.some((i) => i.code === "MOVIE_DOTS_INSTEAD_OF_SPACES")).toBe(true);
  });
});
