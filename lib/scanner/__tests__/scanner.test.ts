import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Dirent, Stats } from "fs";
import { scanLibraryPaths } from "../scanner";
import type { ScanError } from "../types";

vi.mock("fs", () => ({
  promises: {
    readdir: vi.fn(),
    stat: vi.fn(),
  },
}));

import { promises as fs } from "fs";

const mockReaddir = vi.mocked(fs.readdir);
const mockStat = vi.mocked(fs.stat);

function makeDirent(name: string, isDir: boolean): Dirent {
  return {
    name,
    isDirectory: () => isDir,
    isFile: () => !isDir,
    isSymbolicLink: () => false,
  } as unknown as Dirent;
}

function makeStats(size: number, mtime = new Date("2024-01-01")): Stats {
  return { size, mtime } as Stats;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("scanLibraryPaths", () => {
  it("returns an empty folder when the directory is empty", async () => {
    mockReaddir.mockResolvedValueOnce([]);

    const errors: ScanError[] = [];
    const result = await scanLibraryPaths(["/media/tv"], errors);

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("tv");
    expect(result[0].files).toEqual([]);
    expect(result[0].subfolders).toEqual([]);
    expect(errors).toEqual([]);
  });

  it("collects video files with correct metadata", async () => {
    mockReaddir.mockResolvedValueOnce([makeDirent("episode.mkv", false)] as Dirent[]);
    mockStat.mockResolvedValueOnce(makeStats(1024 * 1024 * 500));

    const errors: ScanError[] = [];
    const [folder] = await scanLibraryPaths(["/media/tv"], errors);

    expect(folder.files).toHaveLength(1);
    expect(folder.files[0]).toMatchObject({
      name: "episode.mkv",
      path: "/media/tv/episode.mkv",
      extension: "mkv",
      size: 1024 * 1024 * 500,
    });
  });

  it("ignores unsupported file extensions", async () => {
    mockReaddir.mockResolvedValueOnce([
      makeDirent("cover.jpg", false),
      makeDirent("info.nfo", false),
      makeDirent("subtitle.srt", false),
    ] as Dirent[]);

    const errors: ScanError[] = [];
    const [folder] = await scanLibraryPaths(["/media/tv"], errors);

    expect(folder.files).toEqual([]);
  });

  it("ignores hidden files and folders", async () => {
    mockReaddir.mockResolvedValueOnce([
      makeDirent(".hidden", false),
      makeDirent(".DS_Store", false),
    ] as Dirent[]);

    const errors: ScanError[] = [];
    const [folder] = await scanLibraryPaths(["/media/tv"], errors);

    expect(folder.files).toEqual([]);
    expect(folder.subfolders).toEqual([]);
  });

  it("recursively scans subdirectories", async () => {
    // Root: one subfolder
    mockReaddir.mockResolvedValueOnce([makeDirent("Show Name (2020)", true)] as Dirent[]);
    // Subfolder: one video file
    mockReaddir.mockResolvedValueOnce([makeDirent("episode.mp4", false)] as Dirent[]);
    mockStat.mockResolvedValueOnce(makeStats(2048));

    const errors: ScanError[] = [];
    const [folder] = await scanLibraryPaths(["/media/tv"], errors);

    expect(folder.subfolders).toHaveLength(1);
    expect(folder.subfolders[0].name).toBe("Show Name (2020)");
    expect(folder.subfolders[0].files).toHaveLength(1);
    expect(folder.subfolders[0].files[0].name).toBe("episode.mp4");
  });

  it("records an error and returns empty folder when readdir fails", async () => {
    mockReaddir.mockRejectedValueOnce(new Error("EACCES: permission denied"));

    const errors: ScanError[] = [];
    const [folder] = await scanLibraryPaths(["/media/tv"], errors);

    expect(folder.files).toEqual([]);
    expect(errors).toHaveLength(1);
    expect(errors[0].path).toBe("/media/tv");
    expect(errors[0].message).toContain("EACCES");
  });

  it("skips a file and records an error when stat fails", async () => {
    mockReaddir.mockResolvedValueOnce([makeDirent("episode.mkv", false)] as Dirent[]);
    mockStat.mockRejectedValueOnce(new Error("ENOENT: no such file"));

    const errors: ScanError[] = [];
    const [folder] = await scanLibraryPaths(["/media/tv"], errors);

    expect(folder.files).toEqual([]);
    expect(errors).toHaveLength(1);
    expect(errors[0].path).toBe("/media/tv/episode.mkv");
  });

  it("scans multiple root paths independently", async () => {
    mockReaddir.mockResolvedValueOnce([makeDirent("movie.mkv", false)] as Dirent[]);
    mockStat.mockResolvedValueOnce(makeStats(100));
    mockReaddir.mockResolvedValueOnce([makeDirent("show.mp4", false)] as Dirent[]);
    mockStat.mockResolvedValueOnce(makeStats(200));

    const errors: ScanError[] = [];
    const result = await scanLibraryPaths(["/media/movies", "/media/tv"], errors);

    expect(result).toHaveLength(2);
    expect(result[0].files[0].name).toBe("movie.mkv");
    expect(result[1].files[0].name).toBe("show.mp4");
  });
});
