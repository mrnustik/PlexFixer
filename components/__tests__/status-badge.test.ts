import { describe, it, expect } from "vitest";
import { getStatus, worstStatus } from "../status-badge";
import type { ValidationIssue } from "@/lib/validator/types";

function makeIssues(severities: ("error" | "warning")[]): ValidationIssue[] {
  return severities.map((severity) => ({ severity, code: "TEST", message: "test" }));
}

describe("getStatus", () => {
  it("returns valid for empty issues", () => {
    expect(getStatus([])).toBe("valid");
  });

  it("returns warning for warning-only issues", () => {
    expect(getStatus(makeIssues(["warning"]))).toBe("warning");
  });

  it("returns error when any issue is an error", () => {
    expect(getStatus(makeIssues(["error"]))).toBe("error");
    expect(getStatus(makeIssues(["warning", "error"]))).toBe("error");
  });
});

describe("worstStatus", () => {
  it("returns valid when all are valid", () => {
    expect(worstStatus("valid", "valid")).toBe("valid");
  });

  it("returns warning when worst is warning", () => {
    expect(worstStatus("valid", "warning")).toBe("warning");
  });

  it("returns error when any is error", () => {
    expect(worstStatus("valid", "warning", "error")).toBe("error");
    expect(worstStatus("error", "valid")).toBe("error");
  });

  it("handles a single status", () => {
    expect(worstStatus("valid")).toBe("valid");
    expect(worstStatus("error")).toBe("error");
  });
});
