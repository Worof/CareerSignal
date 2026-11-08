import { z } from "zod";

const blankToNull = (v: unknown) => (v === "" || v === undefined ? null : v);

/** "" / missing → null (never 0). Otherwise a non-negative integer. */
export const nullableCount = z.preprocess(
  blankToNull,
  z.coerce.number({ invalid_type_error: "Enter a whole number" }).int("Enter a whole number").min(0, "Must be 0 or more").max(2_000_000_000, "Too large").nullable(),
);

export const nullableSignedInt = z.preprocess(
  blankToNull,
  z.coerce.number({ invalid_type_error: "Enter a whole number" }).int("Enter a whole number").min(-2_000_000_000).max(2_000_000_000).nullable(),
);

export const nullablePercentage = z.preprocess(
  blankToNull,
  z.coerce.number({ invalid_type_error: "Enter a number" }).min(0, "Must be between 0 and 100").max(100, "Must be between 0 and 100").nullable(),
);

export const isoDate = z
  .string({ required_error: "Required" })
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use a valid date")
  .refine((s) => !Number.isNaN(Date.parse(s)), "Use a valid date");

export const nullableIsoDate = z.preprocess(blankToNull, isoDate.nullable());

export const nullableText = (max: number) =>
  z.preprocess((v) => (typeof v === "string" && v.trim() === "" ? null : v), z.string().trim().max(max, `Max ${max} characters`).nullable().optional().transform((v) => v ?? null));

export const checkbox = z.preprocess((v) => v === "on" || v === "true" || v === true, z.boolean());

/** Accepts a JSON-encoded string array or a real array. */
export const stringList = (maxItems = 50, maxLen = 100) =>
  z.preprocess(
    (v) => {
      if (Array.isArray(v)) return v;
      if (typeof v === "string") {
        try {
          const parsed = JSON.parse(v);
          return Array.isArray(parsed) ? parsed : [];
        } catch {
          return v === "" ? [] : [v];
        }
      }
      return [];
    },
    z.array(z.string().trim().min(1).max(maxLen)).max(maxItems).transform((a) => Array.from(new Set(a))),
  );

export const uuid = z.string().uuid("Invalid id");
