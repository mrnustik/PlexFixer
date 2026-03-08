import type { ValidationIssue } from "./types";

// "Movie Name (2020)" or "Movie Name (2020) {edition-Director's Cut}"
const MOVIE_YEAR_PARENS_RE = /\(\d{4}\)/;
// Bare year without parentheses, e.g. "Movie Name 2020"
const MOVIE_BARE_YEAR_RE = /(?<!\()\b(19|20)\d{2}\b(?!\))/;
// Dots-instead-of-spaces: only flag when dots join multi-char segments
const MOVIE_DOTS_RE = /[a-zA-Z]{2,}\.[a-zA-Z0-9]{2,}/;

export function validateMovieName(name: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  // Strip file extension for file names
  const nameWithoutExt = name.replace(/\.[^.]+$/, "");

  if (!MOVIE_YEAR_PARENS_RE.test(nameWithoutExt)) {
    if (MOVIE_BARE_YEAR_RE.test(nameWithoutExt)) {
      issues.push({
        severity: "error",
        code: "MOVIE_WRONG_YEAR_FORMAT",
        message: 'Year must be wrapped in parentheses. Expected: "Movie Name (2020)"',
      });
    } else {
      issues.push({
        severity: "error",
        code: "MOVIE_MISSING_YEAR",
        message: 'Movie is missing a year. Expected format: "Movie Name (Year)"',
      });
    }
  }

  if (MOVIE_DOTS_RE.test(nameWithoutExt)) {
    issues.push({
      severity: "warning",
      code: "MOVIE_DOTS_INSTEAD_OF_SPACES",
      message: "Movie name uses dots instead of spaces",
    });
  }

  return issues;
}
