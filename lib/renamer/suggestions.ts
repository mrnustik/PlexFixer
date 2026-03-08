/**
 * Generates a suggested Plex-correct name based on validation issue codes.
 * Returns null if no suggestion can be made (e.g. missing year with no year present).
 */
export function suggestName(name: string, issueCodes: string[]): string | null {
  if (issueCodes.length === 0) return null;

  const extMatch = name.match(/(\.[a-zA-Z0-9]+)$/);
  const ext = extMatch ? extMatch[1] : "";
  let base = ext ? name.slice(0, -ext.length) : name;

  for (const code of issueCodes) {
    switch (code) {
      case "MOVIE_WRONG_YEAR_FORMAT":
        // "Movie Name 2020" → "Movie Name (2020)"
        base = base.replace(/(?<!\()\b((19|20)\d{2})\b(?!\))/g, "($1)");
        break;

      case "MOVIE_DOTS_INSTEAD_OF_SPACES":
      case "SHOW_DOTS_INSTEAD_OF_SPACES":
      case "EPISODE_DOTS_INSTEAD_OF_SPACES":
        base = base.replace(/\./g, " ");
        break;

      case "SEASON_WRONG_FORMAT": {
        const numMatch = base.match(/(?:S(?:eries)?\s*)(\d+)/i);
        if (numMatch) {
          const num = parseInt(numMatch[1], 10);
          base = `Season ${String(num).padStart(2, "0")}`;
        }
        break;
      }

      case "SEASON_UNPADDED_NUMBER":
        base = base.replace(
          /^(Season\s+)(\d+)$/i,
          (_, prefix, n: string) => `${prefix}${n.padStart(2, "0")}`
        );
        break;

      case "EPISODE_LEGACY_FORMAT":
        // "1x01" → "S01E01", then fix dots
        base = base.replace(
          /\b(\d{1,2})x(\d{2})\b/gi,
          (_, s: string, e: string) => `S${s.padStart(2, "0")}E${e}`
        );
        base = base.replace(/\./g, " ");
        break;
    }
  }

  const suggested = base + ext;
  return suggested !== name ? suggested : null;
}
