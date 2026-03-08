import { NextResponse } from "next/server";
import { getLibraryConfig } from "@/lib/scanner/config";
import { scanLibraryPaths } from "@/lib/scanner/scanner";
import { validateLibrary } from "@/lib/validator/validate";
import type { ScanError } from "@/lib/scanner/types";

export async function GET() {
  const config = getLibraryConfig();
  const errors: ScanError[] = [];

  const [tvRoots, movieRoots] = await Promise.all([
    scanLibraryPaths(config.tvPaths, errors),
    scanLibraryPaths(config.moviesPaths, errors),
  ]);

  const result = validateLibrary(tvRoots, movieRoots, errors);
  return NextResponse.json(result);
}
