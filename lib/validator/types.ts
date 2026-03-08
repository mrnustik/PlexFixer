import type { ScanError } from "@/lib/scanner/types";

export type ValidationSeverity = "error" | "warning";

export type ValidationIssue = {
  severity: ValidationSeverity;
  code: string;
  message: string;
};

export type ValidatedFile = {
  name: string;
  path: string;
  issues: ValidationIssue[];
};

export type ValidatedSeason = {
  name: string;
  path: string;
  issues: ValidationIssue[];
  episodes: ValidatedFile[];
};

export type ValidatedShow = {
  name: string;
  path: string;
  issues: ValidationIssue[];
  seasons: ValidatedSeason[];
};

export type ValidatedMovie = {
  name: string;
  path: string;
  issues: ValidationIssue[];
};

export type LibraryValidationResult = {
  tv: ValidatedShow[];
  movies: ValidatedMovie[];
  errors: ScanError[];
};
