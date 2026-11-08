/**
 * CSV import — designed, not yet exposed in the UI (later MVP enhancement).
 *
 * Contract: never assume identical headers. The user maps CSV columns to snapshot fields, every row is
 * validated with `snapshotSchema`, and rows import with data_source = 'csv'. Duplicate periods are
 * rejected by the database's unique constraint rather than silently merged.
 */
import type { SnapshotInput } from "@/lib/validations/analytics";

export type SnapshotField = keyof SnapshotInput;
export type ColumnMapping = Partial<Record<SnapshotField, string>>;

export interface CsvRowResult {
  row: number;
  ok: boolean;
  errors?: string[];
}

export interface CsvImporter {
  /** Suggests a mapping from header names; the user confirms or edits it. */
  suggestMapping(headers: string[]): ColumnMapping;
  /** Validates rows without writing anything. */
  validate(rows: Record<string, string>[], mapping: ColumnMapping): CsvRowResult[];
}

const ALIASES: Record<string, SnapshotField> = {
  impressions: "impressions",
  "members reached": "members_reached",
  reach: "members_reached",
  "profile views": "profile_views",
  "search appearances": "search_appearances",
  followers: "total_followers",
  reactions: "reactions",
  comments: "comments",
  reposts: "reposts",
  shares: "reposts",
};

/** Header-name heuristic for the mapping UI's initial guess. */
export function suggestMapping(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {};
  for (const h of headers) {
    const field = ALIASES[h.trim().toLowerCase()];
    if (field && !mapping[field]) mapping[field] = h;
  }
  return mapping;
}
