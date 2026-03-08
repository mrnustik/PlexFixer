import { NextResponse } from "next/server";
import { rename } from "fs/promises";
import path from "path";
import { getLibraryConfig } from "@/lib/scanner/config";

type RenameOp = { from: string; to: string };
type RenameResult = { from: string; to: string; success: boolean; error?: string };

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { operations } = body as { operations?: unknown };
  if (!Array.isArray(operations)) {
    return NextResponse.json({ error: "operations must be an array" }, { status: 400 });
  }

  const config = getLibraryConfig();
  const allPaths = [...config.tvPaths, ...config.moviesPaths];
  const results: RenameResult[] = [];

  for (const op of operations as RenameOp[]) {
    const { from, to } = op ?? {};

    if (!from || !to || typeof from !== "string" || typeof to !== "string") {
      results.push({
        from: String(from ?? ""),
        to: String(to ?? ""),
        success: false,
        error: "Missing or invalid from/to fields",
      });
      continue;
    }

    // Security: to must be in the same directory as from (rename only, no move)
    const fromDir = path.dirname(path.resolve(from));
    const toDir = path.dirname(path.resolve(to));
    if (fromDir !== toDir) {
      results.push({ from, to, success: false, error: "Rename must stay in the same directory" });
      continue;
    }

    // Security: from must be within a configured library path
    const fromResolved = path.resolve(from);
    const isAllowed = allPaths.some((libPath) => fromResolved.startsWith(path.resolve(libPath)));
    if (!isAllowed) {
      results.push({ from, to, success: false, error: "Path is not within a configured library" });
      continue;
    }

    try {
      await rename(from, to);
      results.push({ from, to, success: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      results.push({ from, to, success: false, error: message });
    }
  }

  return NextResponse.json({ results });
}
