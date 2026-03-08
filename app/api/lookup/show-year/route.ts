import { NextResponse } from "next/server";

type TVMazeShow = {
  show: {
    name: string;
    premiered: string | null;
  };
};

type ShowYearResult = {
  name: string;
  year: number;
};

function cleanShowName(raw: string): string {
  return raw.replace(/\./g, " ").replace(/_/g, " ").trim();
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q");

  if (!q || q.trim() === "") {
    return NextResponse.json({ error: "Missing query parameter: q" }, { status: 400 });
  }

  const cleanName = cleanShowName(q.trim());

  let tvMazeRes: Response;
  try {
    tvMazeRes = await fetch(
      `https://api.tvmaze.com/search/shows?q=${encodeURIComponent(cleanName)}`
    );
  } catch {
    return NextResponse.json({ error: "Failed to reach TVMaze API" }, { status: 502 });
  }

  if (!tvMazeRes.ok) {
    return NextResponse.json({ error: `TVMaze API error: ${tvMazeRes.status}` }, { status: 502 });
  }

  const results = (await tvMazeRes.json()) as TVMazeShow[];

  const shows: ShowYearResult[] = results
    .filter((r) => r.show.premiered !== null)
    .map((r) => ({
      name: r.show.name,
      year: new Date(r.show.premiered!).getFullYear(),
    }))
    .slice(0, 5);

  return NextResponse.json(shows);
}
