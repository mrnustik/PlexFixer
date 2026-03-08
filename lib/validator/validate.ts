import type { MediaFolder } from "@/lib/scanner/types";
import type {
  LibraryValidationResult,
  ValidatedFile,
  ValidatedMovie,
  ValidatedSeason,
  ValidatedShow,
} from "./types";
import { validateEpisodeFile, validateSeasonFolder, validateShowFolder } from "./tv";
import { validateMovieName } from "./movies";
import type { ScanError } from "@/lib/scanner/types";

function validateShow(showFolder: MediaFolder): ValidatedShow {
  const seasons: ValidatedSeason[] = showFolder.subfolders.map((seasonFolder) => {
    const episodes: ValidatedFile[] = seasonFolder.files.map((file) => ({
      name: file.name,
      path: file.path,
      issues: validateEpisodeFile(file.name),
    }));

    return {
      name: seasonFolder.name,
      path: seasonFolder.path,
      issues: validateSeasonFolder(seasonFolder.name),
      episodes,
    };
  });

  // Files directly under a show folder are treated as episodes too (loose files)
  const looseEpisodes: ValidatedSeason = {
    name: "__loose__",
    path: showFolder.path,
    issues: [],
    episodes: showFolder.files.map((file) => ({
      name: file.name,
      path: file.path,
      issues: validateEpisodeFile(file.name),
    })),
  };
  if (looseEpisodes.episodes.length > 0) seasons.unshift(looseEpisodes);

  return {
    name: showFolder.name,
    path: showFolder.path,
    issues: validateShowFolder(showFolder.name),
    seasons,
  };
}

function validateMovieEntry(folder: MediaFolder): ValidatedMovie[] {
  const results: ValidatedMovie[] = [];

  // Each file directly in a movies library root is a movie file
  for (const file of folder.files) {
    results.push({
      name: file.name,
      path: file.path,
      issues: validateMovieName(file.name),
    });
  }

  // Each subfolder is a movie folder (e.g. "Movie Name (2020)/")
  for (const sub of folder.subfolders) {
    results.push({
      name: sub.name,
      path: sub.path,
      issues: validateMovieName(sub.name),
    });
  }

  return results;
}

export function validateLibrary(
  tvRoots: MediaFolder[],
  movieRoots: MediaFolder[],
  errors: ScanError[]
): LibraryValidationResult {
  const tv = tvRoots.flatMap((root) => root.subfolders.map(validateShow));
  const movies = movieRoots.flatMap(validateMovieEntry);

  return { tv, movies, errors };
}
