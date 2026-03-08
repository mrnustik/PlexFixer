export type MediaFile = {
  name: string;
  path: string;
  size: number;
  extension: string;
  modifiedAt: Date;
};

export type MediaFolder = {
  name: string;
  path: string;
  files: MediaFile[];
  subfolders: MediaFolder[];
};

export type LibraryScanResult = {
  tv: MediaFolder[];
  movies: MediaFolder[];
  errors: ScanError[];
};

export type ScanError = {
  path: string;
  message: string;
};

export const SUPPORTED_EXTENSIONS = new Set([
  "mkv",
  "mp4",
  "avi",
  "mov",
  "wmv",
  "m4v",
  "ts",
  "m2ts",
]);
