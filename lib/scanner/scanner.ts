import { promises as fs } from "fs";
import path from "path";
import { type MediaFile, type MediaFolder, type ScanError, SUPPORTED_EXTENSIONS } from "./types";

async function scanDirectory(dirPath: string, errors: ScanError[]): Promise<MediaFolder> {
  const folder: MediaFolder = {
    name: path.basename(dirPath),
    path: dirPath,
    files: [],
    subfolders: [],
  };

  let entries;
  try {
    entries = await fs.readdir(dirPath, { withFileTypes: true });
  } catch (err) {
    errors.push({ path: dirPath, message: (err as NodeJS.ErrnoException).message });
    return folder;
  }

  for (const entry of entries) {
    if (entry.name.startsWith(".")) continue;

    const entryPath = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      const subfolder = await scanDirectory(entryPath, errors);
      folder.subfolders.push(subfolder);
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).slice(1).toLowerCase();
      if (!SUPPORTED_EXTENSIONS.has(ext)) continue;

      let stat;
      try {
        stat = await fs.stat(entryPath);
      } catch (err) {
        errors.push({ path: entryPath, message: (err as NodeJS.ErrnoException).message });
        continue;
      }

      const file: MediaFile = {
        name: entry.name,
        path: entryPath,
        size: stat.size,
        extension: ext,
        modifiedAt: stat.mtime,
      };
      folder.files.push(file);
    }
  }

  return folder;
}

export async function scanLibraryPaths(
  dirPaths: string[],
  errors: ScanError[]
): Promise<MediaFolder[]> {
  return Promise.all(dirPaths.map((p) => scanDirectory(p, errors)));
}
