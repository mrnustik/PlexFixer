import { NextResponse } from "next/server";
import { rename } from "fs/promises";
import path from "path";
import { getLibraryConfig } from "@/lib/scanner/config";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { from, to } = body as { from?: string; to?: string };

  if (!from || !to || typeof from !== "string" || typeof to !== "string") {
    return NextResponse.json({ error: "Missing or invalid from/to fields" }, { status: 400 });
  }

  // Security: to must be in the same directory as from (rename only, no move)
  const fromDir = path.dirname(path.resolve(from));
  const toDir = path.dirname(path.resolve(to));
  if (fromDir !== toDir) {
    return NextResponse.json({ error: "Rename must stay in the same directory" }, { status: 400 });
  }

  // Security: from must be within a configured library path
  const config = getLibraryConfig();
  const allPaths = [...config.tvPaths, ...config.moviesPaths];
  const fromResolved = path.resolve(from);
  const isAllowed = allPaths.some((libPath) => fromResolved.startsWith(path.resolve(libPath)));
  if (!isAllowed) {
    return NextResponse.json({ error: "Path is not within a configured library" }, { status: 403 });
  }

  try {
    await rename(from, to);
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
