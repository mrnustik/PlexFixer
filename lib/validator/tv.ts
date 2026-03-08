import type { ValidationIssue } from "./types";

// Show folder: "Show Name (2020)"
const SHOW_YEAR_RE = /\(\d{4}\)$/;
// Dots-instead-of-spaces: only flag when dots join multi-char segments (ignores abbreviations like S.W.A.T.)
const SHOW_DOTS_RE = /[a-zA-Z]{2,}\.[a-zA-Z0-9]{2,}/;

// Season folder: "Season 01" or "Specials" / "Season 0"
const SEASON_CORRECT_RE = /^Season\s+\d+$/i;
const SEASON_PADDED_RE = /^Season\s+\d{2,}$/i;
const SEASON_LEGACY_RE = /^S(?:eries)?\s*\d+$/i; // "S01", "Series 1"

// Episode file: "Show Name - S01E01" or "Show Name - S01E01E02"
const EPISODE_SXXEXX_RE = /[Ss]\d{1,2}[Ee]\d{1,2}([Ee]\d{1,2})*/;
const EPISODE_LEGACY_RE = /\b\d{1,2}x\d{2}\b/; // "1x01"
const EPISODE_DOTS_RE = /^[^\s]+(\.[^\s]+)+/;

export function validateShowFolder(name: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!SHOW_YEAR_RE.test(name)) {
    issues.push({
      severity: "error",
      code: "SHOW_MISSING_YEAR",
      message: 'Show folder is missing a year. Expected format: "Show Name (Year)"',
    });
  }

  if (SHOW_DOTS_RE.test(name)) {
    issues.push({
      severity: "warning",
      code: "SHOW_DOTS_INSTEAD_OF_SPACES",
      message: "Show folder name uses dots instead of spaces",
    });
  }

  return issues;
}

export function validateSeasonFolder(name: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // "Specials" is a valid Plex convention
  if (/^specials$/i.test(name)) return issues;

  if (!SEASON_CORRECT_RE.test(name)) {
    if (SEASON_LEGACY_RE.test(name)) {
      issues.push({
        severity: "error",
        code: "SEASON_WRONG_FORMAT",
        message: 'Season folder uses wrong format. Expected: "Season 01"',
      });
    } else {
      issues.push({
        severity: "error",
        code: "SEASON_WRONG_FORMAT",
        message: 'Season folder does not match Plex format. Expected: "Season 01"',
      });
    }
    return issues;
  }

  if (!SEASON_PADDED_RE.test(name)) {
    issues.push({
      severity: "warning",
      code: "SEASON_UNPADDED_NUMBER",
      message: 'Season number should be zero-padded. Expected: "Season 01" not "Season 1"',
    });
  }

  return issues;
}

export function validateEpisodeFile(name: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const nameWithoutExt = name.replace(/\.[^.]+$/, "");

  if (EPISODE_LEGACY_RE.test(nameWithoutExt)) {
    issues.push({
      severity: "error",
      code: "EPISODE_LEGACY_FORMAT",
      message: 'Episode uses legacy "1x01" format. Expected Plex format: "S01E01"',
    });
    return issues;
  }

  if (!EPISODE_SXXEXX_RE.test(nameWithoutExt)) {
    issues.push({
      severity: "error",
      code: "EPISODE_MISSING_IDENTIFIER",
      message: "Episode file has no season/episode identifier. Expected format: S01E01",
    });
    return issues;
  }

  if (EPISODE_DOTS_RE.test(nameWithoutExt)) {
    issues.push({
      severity: "warning",
      code: "EPISODE_DOTS_INSTEAD_OF_SPACES",
      message: "Episode file name uses dots instead of spaces",
    });
  }

  return issues;
}
