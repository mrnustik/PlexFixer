import type { ValidationIssue } from "@/lib/validator/types";

export type Status = "valid" | "warning" | "error";

export function getStatus(issues: ValidationIssue[]): Status {
  if (issues.some((i) => i.severity === "error")) return "error";
  if (issues.some((i) => i.severity === "warning")) return "warning";
  return "valid";
}

export function worstStatus(...statuses: Status[]): Status {
  if (statuses.includes("error")) return "error";
  if (statuses.includes("warning")) return "warning";
  return "valid";
}

const COLORS: Record<Status, string> = {
  valid: "bg-green-500",
  warning: "bg-amber-400",
  error: "bg-red-500",
};

const LABELS: Record<Status, string> = {
  valid: "Valid",
  warning: "Warning",
  error: "Error",
};

export function StatusBadge({ status, size = "sm" }: { status: Status; size?: "sm" | "md" }) {
  const sizeClass = size === "sm" ? "h-2.5 w-2.5" : "h-3 w-3";
  return (
    <span
      className={`inline-block shrink-0 rounded-full ${COLORS[status]} ${sizeClass}`}
      title={LABELS[status]}
    />
  );
}
