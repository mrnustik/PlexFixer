import { describe, it, expect } from "vitest";
import { validateLibrary } from "../validate";
import type { MediaFolder } from "@/lib/scanner/types";

function makeFolder(name: string, path: string, overrides: Partial<MediaFolder> = {}): MediaFolder {
  return { name, path, files: [], subfolders: [], ...overrides };
}

describe("validateLibrary", () => {
  it("returns empty arrays when roots are empty", () => {
    const result = validateLibrary([], [], []);
    expect(result.tv).toEqual([]);
    expect(result.movies).toEqual([]);
    expect(result.errors).toEqual([]);
  });

  it("validates show subfolders inside a TV root", () => {
    const tvRoot = makeFolder("tv", "/media/tv", {
      subfolders: [makeFolder("Breaking Bad (2008)", "/media/tv/Breaking Bad (2008)")],
    });

    const result = validateLibrary([tvRoot], [], []);

    expect(result.tv).toHaveLength(1);
    expect(result.tv[0].name).toBe("Breaking Bad (2008)");
    expect(result.tv[0].issues).toEqual([]);
  });

  it("flags a show with missing year", () => {
    const tvRoot = makeFolder("tv", "/media/tv", {
      subfolders: [makeFolder("Breaking Bad", "/media/tv/Breaking Bad")],
    });

    const result = validateLibrary([tvRoot], [], []);

    expect(result.tv[0].issues).toHaveLength(1);
    expect(result.tv[0].issues[0].code).toBe("SHOW_MISSING_YEAR");
  });

  it("validates season folders inside a show", () => {
    const seasonFolder = makeFolder("Season 01", "/media/tv/Show/Season 01");
    const showFolder = makeFolder("Show (2020)", "/media/tv/Show (2020)", {
      subfolders: [seasonFolder],
    });
    const tvRoot = makeFolder("tv", "/media/tv", { subfolders: [showFolder] });

    const result = validateLibrary([tvRoot], [], []);

    expect(result.tv[0].seasons[0].issues).toEqual([]);
  });

  it("validates episode files inside a season", () => {
    const episode = {
      name: "Show Name - S01E01 - Pilot.mkv",
      path: "/media/tv/Show/Season 01/Show Name - S01E01 - Pilot.mkv",
      size: 1024,
      extension: "mkv",
      modifiedAt: new Date(),
    };
    const seasonFolder = makeFolder("Season 01", "/media/tv/Show/Season 01", {
      files: [episode],
    });
    const showFolder = makeFolder("Show (2020)", "/media/tv/Show (2020)", {
      subfolders: [seasonFolder],
    });
    const tvRoot = makeFolder("tv", "/media/tv", { subfolders: [showFolder] });

    const result = validateLibrary([tvRoot], [], []);

    expect(result.tv[0].seasons[0].episodes[0].issues).toEqual([]);
  });

  it("validates movie files at the root of a movies library", () => {
    const movie = {
      name: "The Dark Knight (2008).mkv",
      path: "/media/movies/The Dark Knight (2008).mkv",
      size: 2048,
      extension: "mkv",
      modifiedAt: new Date(),
    };
    const moviesRoot = makeFolder("movies", "/media/movies", { files: [movie] });

    const result = validateLibrary([], [moviesRoot], []);

    expect(result.movies).toHaveLength(1);
    expect(result.movies[0].issues).toEqual([]);
  });

  it("flags a movie folder with missing year", () => {
    const movieFolder = makeFolder("The Dark Knight", "/media/movies/The Dark Knight");
    const moviesRoot = makeFolder("movies", "/media/movies", { subfolders: [movieFolder] });

    const result = validateLibrary([], [moviesRoot], []);

    expect(result.movies[0].issues).toHaveLength(1);
    expect(result.movies[0].issues[0].code).toBe("MOVIE_MISSING_YEAR");
  });

  it("passes scan errors through to the result", () => {
    const errors = [{ path: "/media/tv", message: "EACCES: permission denied" }];
    const result = validateLibrary([], [], errors);
    expect(result.errors).toEqual(errors);
  });
});
