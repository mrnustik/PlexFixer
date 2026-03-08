import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { getLibraryConfig } from "../config";

describe("getLibraryConfig", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("returns empty arrays when env vars are not set", () => {
    delete process.env.PLEX_TV_LIBRARY_PATHS;
    delete process.env.PLEX_MOVIES_LIBRARY_PATHS;

    const config = getLibraryConfig();

    expect(config.tvPaths).toEqual([]);
    expect(config.moviesPaths).toEqual([]);
  });

  it("parses a single TV path", () => {
    process.env.PLEX_TV_LIBRARY_PATHS = "/media/tv";

    const config = getLibraryConfig();

    expect(config.tvPaths).toEqual(["/media/tv"]);
  });

  it("parses multiple comma-separated paths", () => {
    process.env.PLEX_TV_LIBRARY_PATHS = "/media/tv1,/media/tv2";
    process.env.PLEX_MOVIES_LIBRARY_PATHS = "/media/movies1,/media/movies2";

    const config = getLibraryConfig();

    expect(config.tvPaths).toEqual(["/media/tv1", "/media/tv2"]);
    expect(config.moviesPaths).toEqual(["/media/movies1", "/media/movies2"]);
  });

  it("trims whitespace around paths", () => {
    process.env.PLEX_TV_LIBRARY_PATHS = " /media/tv1 , /media/tv2 ";

    const config = getLibraryConfig();

    expect(config.tvPaths).toEqual(["/media/tv1", "/media/tv2"]);
  });

  it("ignores empty entries from double commas", () => {
    process.env.PLEX_TV_LIBRARY_PATHS = "/media/tv1,,/media/tv2";

    const config = getLibraryConfig();

    expect(config.tvPaths).toEqual(["/media/tv1", "/media/tv2"]);
  });
});
