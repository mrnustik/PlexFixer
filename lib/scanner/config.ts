export type LibraryConfig = {
  tvPaths: string[];
  moviesPaths: string[];
};

function parsePaths(envValue: string | undefined): string[] {
  if (!envValue) return [];
  return envValue
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
}

export function getLibraryConfig(): LibraryConfig {
  return {
    tvPaths: parsePaths(process.env.PLEX_TV_LIBRARY_PATHS),
    moviesPaths: parsePaths(process.env.PLEX_MOVIES_LIBRARY_PATHS),
  };
}
