import { NextResponse } from "next/server";
import { getLibraryConfig } from "@/lib/scanner/config";
import { scanLibraryPaths } from "@/lib/scanner/scanner";
import type { LibraryScanResult } from "@/lib/scanner/types";

export async function GET() {
  const config = getLibraryConfig();
  const errors: LibraryScanResult["errors"] = [];

  const [tv, movies] = await Promise.all([
    scanLibraryPaths(config.tvPaths, errors),
    scanLibraryPaths(config.moviesPaths, errors),
  ]);

  const result: LibraryScanResult = { tv, movies, errors };
  return NextResponse.json(result);
}
