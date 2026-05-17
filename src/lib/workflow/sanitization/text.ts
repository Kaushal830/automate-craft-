/**
 * Text sanitization utilities.
 *
 * Operate on raw, untrusted strings produced by the AI before they
 * reach the Zod schema parser. Sanitization is preventive — its goal
 * is to prevent malformed-but-recoverable input from triggering
 * schema rejection AND to remove dangerous content (HTML, control
 * characters) that schema validation would otherwise allow through.
 *
 * Defense-in-depth: Zod regex on individual fields is the second gate;
 * frontend rendering is the third (React escapes by default). This
 * module is the first line.
 */

/** Strip HTML tags and decode entities to plain text. */
export function stripHtml(input: string): string {
  return input
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

/**
 * Remove ASCII control characters except common whitespace
 * (tab, newline, carriage return).
 */
export function removeControlChars(input: string): string {
  // eslint-disable-next-line no-control-regex
  return input.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");
}

/** Collapse runs of whitespace, trim ends. */
export function normalizeWhitespace(input: string): string {
  return input.replace(/\s+/g, " ").trim();
}

/** Hard-cap string length, preserving prefix. */
export function clampLength(input: string, max: number): string {
  if (input.length <= max) return input;
  return input.slice(0, max);
}

/**
 * Full pipeline for free-form display text (workflow names, step
 * names, descriptions, field labels, helpText).
 *
 * Applies: HTML strip → control char removal → whitespace normalize
 * → length clamp.
 */
export function sanitizeDisplayText(input: unknown, maxLength: number): string {
  const raw = typeof input === "string" ? input : "";
  const cleaned = normalizeWhitespace(removeControlChars(stripHtml(raw)));
  return clampLength(cleaned, maxLength);
}

/**
 * Slug sanitization for identifiers (step IDs, field keys, operations).
 * Lowercases, replaces non-alphanumeric with underscore, strips
 * leading digits/symbols, clamps length.
 */
export function sanitizeIdentifier(
  input: unknown,
  maxLength: number,
  fallback: string,
): string {
  const raw = typeof input === "string" ? input : "";
  let cleaned = raw
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");

  // Identifiers cannot start with a digit.
  cleaned = cleaned.replace(/^[0-9]+/, "");

  if (!cleaned) cleaned = fallback;
  return clampLength(cleaned, maxLength);
}

/**
 * Allow only safe punctuation in template strings. Templates may
 * contain mustache `{{...}}` syntax which we preserve, but we strip
 * raw HTML and control characters.
 */
export function sanitizeTemplate(input: unknown, maxLength: number): string {
  const raw = typeof input === "string" ? input : "";
  const cleaned = removeControlChars(stripHtml(raw));
  return clampLength(cleaned, maxLength).trim();
}
