import { promises as fs } from "fs";
import path from "path";

export const TEST_MEDIA_DIR = path.join(process.cwd(), "__test_media__");

async function touch(filePath: string) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, "");
}

export default async function globalSetup() {
  const tv = path.join(TEST_MEDIA_DIR, "tv");
  const movies = path.join(TEST_MEDIA_DIR, "movies");

  // ---- TV: valid show ----
  await touch(`${tv}/Breaking Bad (2008)/Season 01/Breaking Bad - S01E01 - Pilot.mkv`);
  await touch(`${tv}/Breaking Bad (2008)/Season 01/Breaking Bad - S01E02 - Cat's in the Bag.mkv`);
  await touch(`${tv}/Breaking Bad (2008)/Season 02/Breaking Bad - S02E01.mkv`);

  // ---- TV: show with error (missing year) ----
  await touch(`${tv}/Show Without Year/Season 01/Show Without Year - S01E01.mkv`);

  // ---- TV: show with warnings (dots instead of spaces) ----
  await touch(`${tv}/Show.With.Dots.(2020)/Season 1/Show.With.Dots.S01E01.mkv`);

  // ---- Movies: valid ----
  await touch(`${movies}/The Dark Knight (2008).mkv`);

  // ---- Movies: error (bare year, no parentheses) ----
  await touch(`${movies}/Inception 2010.mkv`);

  // ---- Movies: warning (dots) ----
  await touch(`${movies}/The.Matrix.(1999).mkv`);

  // ---- Rename test fixtures ----
  // A movie with a bare year (rename to wrapped year)
  await touch(`${movies}/Rename.Me 2005.mkv`);
  // A TV show with missing year (rename test)
  await touch(`${tv}/Rename Me Show/Season 01/Rename Me Show - S01E01.mkv`);
  // A season with wrong format
  await touch(`${tv}/Good Show (2010)/S1/Good Show - S01E01.mkv`);

  // ---- Bulk rename test fixtures ----
  // Two movies with dots + bare year — both have auto-fixable suggestions
  await touch(`${movies}/Bulk.Fix.Movie.2021.mkv`);
  await touch(`${movies}/Another.Fix.Movie.2022.mkv`);
}
