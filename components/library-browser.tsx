"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type {
  LibraryValidationResult,
  ValidatedFile,
  ValidatedMovie,
  ValidatedSeason,
  ValidatedShow,
  ValidationIssue,
} from "@/lib/validator/types";
import { StatusBadge, getStatus, worstStatus, type Status } from "./status-badge";
import { suggestName } from "@/lib/renamer/suggestions";

// ---- Bulk Selection Context ----

type SelectionOp = { from: string; to: string };

type BulkSelectionCtx = {
  selected: Map<string, SelectionOp>;
  toggle: (op: SelectionOp) => void;
  selectAll: (ops: SelectionOp[]) => void;
  clear: () => void;
};

const BulkSelectionContext = createContext<BulkSelectionCtx>({
  selected: new Map(),
  toggle: () => {},
  selectAll: () => {},
  clear: () => {},
});

// ---- Refresh context ----

const RefreshContext = createContext<() => void>(() => {});

// ---- Status helpers ----

function seasonStatus(season: ValidatedSeason): Status {
  return worstStatus(getStatus(season.issues), ...season.episodes.map((e) => getStatus(e.issues)));
}

function showStatus(show: ValidatedShow): Status {
  return worstStatus(getStatus(show.issues), ...show.seasons.map((s) => seasonStatus(s)));
}

// ---- Selection op helpers ----

function makeOp(itemPath: string, name: string, issueCodes: string[]): SelectionOp | null {
  const suggestion = suggestName(name, issueCodes);
  if (!suggestion) return null;
  const fromDir = itemPath.substring(0, itemPath.lastIndexOf("/"));
  return { from: itemPath, to: `${fromDir}/${suggestion}` };
}

function collectMovieOps(movies: ValidatedMovie[]): SelectionOp[] {
  return movies.flatMap((movie) => {
    const op = makeOp(movie.path, movie.name, movie.issues.map((i) => i.code));
    return op ? [op] : [];
  });
}

function collectTvOps(shows: ValidatedShow[]): SelectionOp[] {
  const ops: SelectionOp[] = [];
  for (const show of shows) {
    const showOp = makeOp(show.path, show.name, show.issues.map((i) => i.code));
    if (showOp) ops.push(showOp);
    for (const season of show.seasons) {
      const seasonOp = makeOp(season.path, season.name, season.issues.map((i) => i.code));
      if (seasonOp) ops.push(seasonOp);
      for (const ep of season.episodes) {
        const epOp = makeOp(ep.path, ep.name, ep.issues.map((i) => i.code));
        if (epOp) ops.push(epOp);
      }
    }
  }
  return ops;
}

// ---- IssueList ----

function IssueList({ issues }: { issues: ValidationIssue[] }) {
  return (
    <ul className="mt-1 space-y-1 pl-4">
      {issues.map((issue, i) => (
        <li key={i} className="flex items-start gap-2 text-sm">
          <span className={issue.severity === "error" ? "text-red-500" : "text-amber-500"}>
            {issue.severity === "error" ? "✕" : "⚠"}
          </span>
          <span className="text-gray-600">
            <span className="font-mono text-xs text-gray-400">{issue.code}</span> {issue.message}
          </span>
        </li>
      ))}
    </ul>
  );
}

// ---- RenamePanel ----

function RenamePanel({
  currentPath,
  currentName,
  issues,
}: {
  currentPath: string;
  currentName: string;
  issues: ValidationIssue[];
}) {
  const refresh = useContext(RefreshContext);
  const issueCodes = issues.map((i) => i.code);
  const suggestion = suggestName(currentName, issueCodes);

  const [newName, setNewName] = useState(suggestion ?? currentName);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const fromDir = currentPath.substring(0, currentPath.lastIndexOf("/"));
  const toPath = `${fromDir}/${newName}`;
  const hasChange = newName !== currentName && newName.trim() !== "";

  async function applyRename() {
    setStatus("loading");
    setErrorMsg("");
    try {
      const res = await fetch("/api/library/rename", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ from: currentPath, to: toPath }),
      });
      const data = (await res.json()) as { success?: boolean; error?: string };
      if (!res.ok || !data.success) {
        setStatus("error");
        setErrorMsg(data.error ?? "Unknown error");
      } else {
        setStatus("success");
        setTimeout(() => refresh(), 800);
      }
    } catch (err) {
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "Network error");
    }
  }

  return (
    <div className="mx-2 mb-2 rounded-md border border-gray-200 bg-gray-50 p-3">
      <p className="mb-1.5 text-xs font-medium tracking-wide text-gray-500 uppercase">Rename</p>
      <div className="mb-1 font-mono text-xs text-gray-400 line-through">{currentName}</div>
      <div className="flex gap-2">
        <input
          data-testid="rename-input"
          className="flex-1 rounded border border-gray-300 bg-white px-2 py-1 font-mono text-xs text-gray-800 focus:border-blue-400 focus:outline-none"
          value={newName}
          onChange={(e) => {
            setNewName(e.target.value);
            setStatus("idle");
          }}
        />
        <button
          data-testid="rename-apply"
          disabled={!hasChange || status === "loading"}
          onClick={applyRename}
          className="shrink-0 rounded bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {status === "loading" ? "Applying…" : "Apply"}
        </button>
      </div>
      {status === "success" && (
        <p data-testid="rename-success" className="mt-1.5 text-xs font-medium text-green-600">
          Renamed successfully. Refreshing…
        </p>
      )}
      {status === "error" && (
        <p data-testid="rename-error" className="mt-1.5 text-xs text-red-600">
          Error: {errorMsg}
        </p>
      )}
    </div>
  );
}

// ---- BulkCheckbox ----

function BulkCheckbox({ op }: { op: SelectionOp }) {
  const { selected, toggle } = useContext(BulkSelectionContext);
  const isSelected = selected.has(op.from);
  return (
    <input
      type="checkbox"
      data-testid={`bulk-select-${op.from}`}
      checked={isSelected}
      onChange={() => toggle(op)}
      onClick={(e) => e.stopPropagation()}
      className="shrink-0 accent-blue-600"
      aria-label="Select for bulk rename"
    />
  );
}

// ---- EpisodeRow ----

function EpisodeRow({ episode, onlyIssues }: { episode: ValidatedFile; onlyIssues: boolean }) {
  const [open, setOpen] = useState(false);
  const status = getStatus(episode.issues);
  if (onlyIssues && status === "valid") return null;

  const op = makeOp(episode.path, episode.name, episode.issues.map((i) => i.code));

  return (
    <div className="pl-2">
      <div className="flex w-full items-center gap-2 rounded px-2 py-1 hover:bg-gray-50">
        {op && <BulkCheckbox op={op} />}
        <button
          className="flex flex-1 items-center gap-2 text-left text-sm"
          onClick={() => episode.issues.length > 0 && setOpen((o) => !o)}
        >
          <StatusBadge status={status} />
          <span className="flex-1 truncate font-mono text-xs text-gray-700">{episode.name}</span>
          {episode.issues.length > 0 && (
            <span className="shrink-0 text-xs text-gray-400">
              {episode.issues.length} issue{episode.issues.length > 1 ? "s" : ""}
            </span>
          )}
        </button>
      </div>
      {open && <IssueList issues={episode.issues} />}
      {open && episode.issues.length > 0 && (
        <RenamePanel
          currentPath={episode.path}
          currentName={episode.name}
          issues={episode.issues}
        />
      )}
    </div>
  );
}

// ---- SeasonRow ----

function SeasonRow({ season, onlyIssues }: { season: ValidatedSeason; onlyIssues: boolean }) {
  const status = seasonStatus(season);
  const [open, setOpen] = useState(false);

  if (onlyIssues && status === "valid") return null;

  const visibleEpisodes = season.episodes.filter(
    (e) => !onlyIssues || getStatus(e.issues) !== "valid"
  );

  const op = makeOp(season.path, season.name, season.issues.map((i) => i.code));

  // Loose episode files — no season header, just render episodes
  if (season.name === "__loose__") {
    return (
      <div className="pl-4">
        <p className="px-2 py-0.5 font-mono text-xs text-gray-400 italic">Loose episode files</p>
        {visibleEpisodes.map((ep) => (
          <EpisodeRow key={ep.path} episode={ep} onlyIssues={onlyIssues} />
        ))}
      </div>
    );
  }

  return (
    <div className="pl-4">
      <div className="flex w-full items-center gap-2 rounded px-2 py-1 hover:bg-gray-50">
        {op && <BulkCheckbox op={op} />}
        <button
          className="flex flex-1 items-center gap-2 text-left text-sm"
          onClick={() => setOpen((o) => !o)}
        >
          <span className="w-3 shrink-0 text-center text-gray-400">{open ? "▾" : "▸"}</span>
          <StatusBadge status={status} />
          <span className="flex-1 font-medium text-gray-700">{season.name}</span>
          {season.issues.length > 0 && (
            <span className="shrink-0 text-xs text-gray-400">{season.issues.length} own</span>
          )}
          <span className="shrink-0 text-xs text-gray-400">
            {visibleEpisodes.length} ep{visibleEpisodes.length !== 1 ? "s" : ""}
          </span>
        </button>
      </div>
      {open && season.issues.length > 0 && (
        <div className="px-2 pb-1">
          <IssueList issues={season.issues} />
          <RenamePanel currentPath={season.path} currentName={season.name} issues={season.issues} />
        </div>
      )}
      {open &&
        visibleEpisodes.map((ep) => (
          <EpisodeRow key={ep.path} episode={ep} onlyIssues={onlyIssues} />
        ))}
    </div>
  );
}

// ---- ShowRow ----

function ShowRow({ show, onlyIssues }: { show: ValidatedShow; onlyIssues: boolean }) {
  const status = showStatus(show);
  const [open, setOpen] = useState(false);

  if (onlyIssues && status === "valid") return null;

  const visibleSeasons = show.seasons.filter((s) => !onlyIssues || seasonStatus(s) !== "valid");

  const op = makeOp(show.path, show.name, show.issues.map((i) => i.code));

  return (
    <div className="border-b border-gray-100 last:border-b-0">
      <div className="flex w-full items-center gap-2 rounded px-2 py-2 hover:bg-gray-50">
        {op && <BulkCheckbox op={op} />}
        <button
          className="flex flex-1 items-center gap-2 text-left"
          onClick={() => setOpen((o) => !o)}
        >
          <span className="w-3 shrink-0 text-center text-sm text-gray-400">
            {open ? "▾" : "▸"}
          </span>
          <StatusBadge status={status} size="md" />
          <span className="flex-1 font-semibold text-gray-800">{show.name}</span>
          {show.issues.length > 0 && (
            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                status === "error" ? "bg-red-100 text-red-600" : "bg-amber-100 text-amber-600"
              }`}
            >
              {show.issues.length} issue{show.issues.length > 1 ? "s" : ""}
            </span>
          )}
        </button>
      </div>
      {open && show.issues.length > 0 && (
        <div className="px-6 pb-1">
          <IssueList issues={show.issues} />
          <RenamePanel currentPath={show.path} currentName={show.name} issues={show.issues} />
        </div>
      )}
      {open &&
        visibleSeasons.map((s) => <SeasonRow key={s.path} season={s} onlyIssues={onlyIssues} />)}
    </div>
  );
}

// ---- MovieRow ----

function MovieRow({ movie, onlyIssues }: { movie: ValidatedMovie; onlyIssues: boolean }) {
  const [open, setOpen] = useState(false);
  const status = getStatus(movie.issues);
  if (onlyIssues && status === "valid") return null;

  const op = makeOp(movie.path, movie.name, movie.issues.map((i) => i.code));

  return (
    <div className="border-b border-gray-100 last:border-b-0">
      <div className="flex w-full items-center gap-2 rounded px-2 py-2 hover:bg-gray-50">
        {op && <BulkCheckbox op={op} />}
        <button
          className="flex flex-1 items-center gap-2 text-left"
          onClick={() => movie.issues.length > 0 && setOpen((o) => !o)}
        >
          <StatusBadge status={status} size="md" />
          <span className="flex-1 font-medium text-gray-800">{movie.name}</span>
          {movie.issues.length > 0 && (
            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                status === "error" ? "bg-red-100 text-red-600" : "bg-amber-100 text-amber-600"
              }`}
            >
              {movie.issues.length} issue{movie.issues.length > 1 ? "s" : ""}
            </span>
          )}
        </button>
      </div>
      {open && <IssueList issues={movie.issues} />}
      {open && movie.issues.length > 0 && (
        <RenamePanel currentPath={movie.path} currentName={movie.name} issues={movie.issues} />
      )}
    </div>
  );
}

// ---- BulkPreviewModal ----

type OpResult = { from: string; to: string; success: boolean; error?: string };
type ModalPhase = "preview" | "running" | "done" | "undone";

function BulkPreviewModal({
  operations,
  onClose,
  onDone,
}: {
  operations: SelectionOp[];
  onClose: () => void;
  onDone: () => void;
}) {
  const [phase, setPhase] = useState<ModalPhase>("preview");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [opResults, setOpResults] = useState<OpResult[]>([]);
  const [undoResults, setUndoResults] = useState<OpResult[]>([]);

  async function applyAll() {
    setPhase("running");
    setCurrentIndex(0);
    const results: OpResult[] = [];

    for (let i = 0; i < operations.length; i++) {
      setCurrentIndex(i + 1);
      const op = operations[i];
      try {
        const res = await fetch("/api/library/rename", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ from: op.from, to: op.to }),
        });
        const data = (await res.json()) as { success?: boolean; error?: string };
        results.push({ from: op.from, to: op.to, success: data.success === true, error: data.error });
      } catch (err) {
        results.push({
          from: op.from,
          to: op.to,
          success: false,
          error: err instanceof Error ? err.message : "Network error",
        });
      }
      setOpResults([...results]);
    }

    setPhase("done");
  }

  async function undo() {
    const successfulOps = opResults
      .filter((r) => r.success)
      .reverse()
      .map((r) => ({ from: r.to, to: r.from }));

    setPhase("running");
    setCurrentIndex(0);
    const results: OpResult[] = [];

    for (let i = 0; i < successfulOps.length; i++) {
      setCurrentIndex(i + 1);
      const op = successfulOps[i];
      try {
        const res = await fetch("/api/library/rename", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ from: op.from, to: op.to }),
        });
        const data = (await res.json()) as { success?: boolean; error?: string };
        results.push({ from: op.from, to: op.to, success: data.success === true, error: data.error });
      } catch (err) {
        results.push({
          from: op.from,
          to: op.to,
          success: false,
          error: err instanceof Error ? err.message : "Network error",
        });
      }
      setUndoResults([...results]);
    }

    setPhase("undone");
  }

  const succeeded = opResults.filter((r) => r.success).length;
  const failed = opResults.filter((r) => !r.success).length;
  const undoSucceeded = undoResults.filter((r) => r.success).length;
  const totalOps = phase === "running" ? (undoResults.length > 0 ? opResults.filter((r) => r.success).length : operations.length) : 0;

  function fileName(p: string) {
    return p.split("/").pop() ?? p;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div
        data-testid="bulk-preview-modal"
        className="relative mx-4 flex max-h-[80vh] w-full max-w-2xl flex-col rounded-xl bg-white p-6 shadow-xl"
      >
        {/* Preview phase */}
        {phase === "preview" && (
          <>
            <h2 className="mb-4 text-lg font-semibold text-gray-900">Bulk Rename Preview</h2>
            <p className="mb-3 text-sm text-gray-500">
              {operations.length} item{operations.length !== 1 ? "s" : ""} will be renamed:
            </p>
            <div className="mb-4 flex-1 space-y-2 overflow-y-auto">
              {operations.map((op) => (
                <div key={op.from} className="rounded-md bg-gray-50 p-2 text-xs font-mono">
                  <div className="text-gray-400 line-through">{fileName(op.from)}</div>
                  <div className="text-gray-800">→ {fileName(op.to)}</div>
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-3">
              <button
                data-testid="bulk-preview-cancel"
                onClick={onClose}
                className="rounded px-4 py-2 text-sm text-gray-600 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                data-testid="bulk-preview-apply"
                onClick={applyAll}
                className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                Apply All
              </button>
            </div>
          </>
        )}

        {/* Running phase */}
        {phase === "running" && (
          <>
            <h2 className="mb-4 text-lg font-semibold text-gray-900">
              {undoResults.length > 0 ? "Undoing…" : "Renaming…"}
            </h2>
            <div className="flex flex-col items-center gap-4 py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-500" />
              <p data-testid="bulk-progress" className="text-sm text-gray-500">
                Renaming {currentIndex} of {totalOps}…
              </p>
            </div>
          </>
        )}

        {/* Done phase */}
        {phase === "done" && (
          <>
            <h2 className="mb-4 text-lg font-semibold text-gray-900">Rename Complete</h2>
            <p data-testid="bulk-summary" className="mb-4 text-sm text-gray-700">
              {succeeded} succeeded, {failed} failed
            </p>
            <div className="mb-4 flex-1 space-y-2 overflow-y-auto">
              {opResults.map((r) => (
                <div
                  key={r.from}
                  className="flex items-start gap-2 rounded-md bg-gray-50 p-2 text-xs font-mono"
                >
                  <span className={r.success ? "text-green-600" : "text-red-500"}>
                    {r.success ? "✓" : "✕"}
                  </span>
                  <span className="flex-1">
                    <span className="text-gray-400 line-through">{fileName(r.from)}</span>
                    {" → "}
                    <span className="text-gray-800">{fileName(r.to)}</span>
                  </span>
                  {r.error && <span className="text-red-500">{r.error}</span>}
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-3">
              {succeeded > 0 && (
                <button
                  data-testid="bulk-preview-undo"
                  onClick={undo}
                  className="rounded px-4 py-2 text-sm text-gray-600 hover:bg-gray-100"
                >
                  Undo successful renames
                </button>
              )}
              <button
                data-testid="bulk-preview-cancel"
                onClick={() => {
                  if (succeeded > 0) onDone();
                  else onClose();
                }}
                className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                Close
              </button>
            </div>
          </>
        )}

        {/* Undone phase */}
        {phase === "undone" && (
          <>
            <h2 className="mb-4 text-lg font-semibold text-gray-900">Undo Complete</h2>
            <p data-testid="bulk-summary" className="mb-4 text-sm text-gray-700">
              {undoSucceeded} rename{undoSucceeded !== 1 ? "s" : ""} undone
            </p>
            <div className="mb-4 flex-1 space-y-2 overflow-y-auto">
              {undoResults.map((r) => (
                <div
                  key={r.from}
                  className="flex items-start gap-2 rounded-md bg-gray-50 p-2 text-xs font-mono"
                >
                  <span className={r.success ? "text-green-600" : "text-red-500"}>
                    {r.success ? "✓" : "✕"}
                  </span>
                  <span className="flex-1">
                    <span className="text-gray-400 line-through">{fileName(r.from)}</span>
                    {" → "}
                    <span className="text-gray-800">{fileName(r.to)}</span>
                  </span>
                  {r.error && <span className="text-red-500">{r.error}</span>}
                </div>
              ))}
            </div>
            <div className="flex justify-end">
              <button
                data-testid="bulk-preview-cancel"
                onClick={() => {
                  onDone();
                  onClose();
                }}
                className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                Close
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ---- SummaryBar ----

function SummaryBar({ data, tab }: { data: LibraryValidationResult; tab: "tv" | "movies" }) {
  if (tab === "tv") {
    const totalEpisodes = data.tv.flatMap((s) => s.seasons.flatMap((se) => se.episodes)).length;
    const issuesCount = data.tv.filter((s) => showStatus(s) !== "valid").length;
    return (
      <div className="flex flex-wrap gap-4 text-sm text-gray-500">
        <span>
          <span className="font-semibold text-gray-800">{data.tv.length}</span> shows
        </span>
        <span>
          <span className="font-semibold text-gray-800">{totalEpisodes}</span> episodes
        </span>
        {issuesCount > 0 ? (
          <span className="font-semibold text-red-500">
            {issuesCount} show{issuesCount !== 1 ? "s" : ""} with issues
          </span>
        ) : (
          data.tv.length > 0 && <span className="font-semibold text-green-600">All clean ✓</span>
        )}
      </div>
    );
  }

  const issuesCount = data.movies.filter((m) => getStatus(m.issues) !== "valid").length;
  return (
    <div className="flex flex-wrap gap-4 text-sm text-gray-500">
      <span>
        <span className="font-semibold text-gray-800">{data.movies.length}</span> movies
      </span>
      {issuesCount > 0 ? (
        <span className="font-semibold text-red-500">
          {issuesCount} movie{issuesCount !== 1 ? "s" : ""} with issues
        </span>
      ) : (
        data.movies.length > 0 && <span className="font-semibold text-green-600">All clean ✓</span>
      )}
    </div>
  );
}

// ---- LibraryBrowser ----

export default function LibraryBrowser() {
  const [data, setData] = useState<LibraryValidationResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [tab, setTab] = useState<"tv" | "movies">("tv");
  const [onlyIssues, setOnlyIssues] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Bulk selection state
  const [selected, setSelected] = useState<Map<string, SelectionOp>>(new Map());
  const [showModal, setShowModal] = useState(false);

  const refresh = useCallback(() => {
    setLoading(true);
    setRefreshKey((k) => k + 1);
  }, []);

  // Clear selection when switching tabs
  function handleTabChange(newTab: "tv" | "movies") {
    setTab(newTab);
    setSelected(new Map());
  }

  const bulkCtx: BulkSelectionCtx = {
    selected,
    toggle(op) {
      setSelected((prev) => {
        const next = new Map(prev);
        if (next.has(op.from)) {
          next.delete(op.from);
        } else {
          next.set(op.from, op);
        }
        return next;
      });
    },
    selectAll(ops) {
      setSelected(new Map(ops.map((op) => [op.from, op])));
    },
    clear() {
      setSelected(new Map());
    },
  };

  useEffect(() => {
    fetch("/api/library/validate")
      .then((r) => r.json())
      .then((d: LibraryValidationResult) => {
        setFetchError(null);
        setData(d);
      })
      .catch((e: Error) => setFetchError(e.message))
      .finally(() => setLoading(false));
  }, [refreshKey]);

  if (loading) {
    return (
      <div className="flex flex-col items-center gap-3 py-20 text-gray-400">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-500" />
        <p className="text-sm">Scanning library…</p>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        Failed to load library: {fetchError}
      </div>
    );
  }

  if (!data) return null;

  const selectableOps =
    tab === "tv" ? collectTvOps(data.tv) : collectMovieOps(data.movies);
  const allSelected =
    selectableOps.length > 0 && selectableOps.every((op) => selected.has(op.from));

  function handleSelectAll() {
    if (allSelected) {
      bulkCtx.clear();
    } else {
      bulkCtx.selectAll(selectableOps);
    }
  }

  return (
    <RefreshContext.Provider value={refresh}>
      <BulkSelectionContext.Provider value={bulkCtx}>
        <div className="space-y-4">
          {/* Tabs + filter */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex gap-1 rounded-lg bg-gray-100 p-1">
              {(["tv", "movies"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => handleTabChange(t)}
                  className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
                    tab === t
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {t === "tv" ? `TV Shows (${data.tv.length})` : `Movies (${data.movies.length})`}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-3">
              {selectableOps.length > 0 && (
                <button
                  data-testid="bulk-select-all-button"
                  onClick={handleSelectAll}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  {allSelected ? "Deselect all" : "Select all with issues"}
                </button>
              )}
              <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-600 select-none">
                <input
                  type="checkbox"
                  checked={onlyIssues}
                  onChange={(e) => setOnlyIssues(e.target.checked)}
                  className="accent-blue-600"
                />
                Show only issues
              </label>
            </div>
          </div>

          {/* Summary */}
          <SummaryBar data={data} tab={tab} />

          {/* Scan errors */}
          {data.errors.length > 0 && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              <p className="font-medium">Scan errors ({data.errors.length})</p>
              <ul className="mt-1 space-y-0.5">
                {data.errors.map((e, i) => (
                  <li key={i} className="font-mono text-xs">
                    {e.path}: {e.message}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Content */}
          <div className="rounded-lg border border-gray-200 bg-white p-1">
            {tab === "tv" &&
              (data.tv.length === 0 ? (
                <p className="py-12 text-center text-sm text-gray-400">
                  No TV library configured. Set{" "}
                  <code className="font-mono text-xs">PLEX_TV_LIBRARY_PATHS</code> in your
                  environment.
                </p>
              ) : (
                data.tv.map((show) => (
                  <ShowRow key={show.path} show={show} onlyIssues={onlyIssues} />
                ))
              ))}
            {tab === "movies" &&
              (data.movies.length === 0 ? (
                <p className="py-12 text-center text-sm text-gray-400">
                  No movies library configured. Set{" "}
                  <code className="font-mono text-xs">PLEX_MOVIES_LIBRARY_PATHS</code> in your
                  environment.
                </p>
              ) : (
                data.movies.map((movie) => (
                  <MovieRow key={movie.path} movie={movie} onlyIssues={onlyIssues} />
                ))
              ))}
          </div>

          {/* Bulk action bar */}
          {selected.size > 0 && (
            <div
              data-testid="bulk-action-bar"
              className="sticky bottom-4 flex items-center justify-between rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 shadow-lg"
            >
              <span className="text-sm font-medium text-blue-800">
                {selected.size} item{selected.size !== 1 ? "s" : ""} selected
              </span>
              <div className="flex gap-2">
                <button
                  data-testid="bulk-clear-button"
                  onClick={bulkCtx.clear}
                  className="rounded px-3 py-1.5 text-sm text-blue-700 hover:bg-blue-100"
                >
                  Clear
                </button>
                <button
                  data-testid="bulk-rename-button"
                  onClick={() => setShowModal(true)}
                  className="rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
                >
                  Bulk Rename…
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Preview modal */}
        {showModal && (
          <BulkPreviewModal
            operations={[...selected.values()]}
            onClose={() => setShowModal(false)}
            onDone={() => {
              setShowModal(false);
              setSelected(new Map());
              refresh();
            }}
          />
        )}
      </BulkSelectionContext.Provider>
    </RefreshContext.Provider>
  );
}
