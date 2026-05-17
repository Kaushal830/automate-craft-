/**
 * Structural sanitization for raw AI output.
 *
 * Turns an arbitrary `unknown` into a defensible object shape before
 * Zod parsing. Operations are conservative — when in doubt, return a
 * safe default rather than guessing.
 *
 * NEVER trust:
 *   - object key names (could be __proto__, prototype, constructor)
 *   - array length (could be huge)
 *   - nested depth (could be DoS)
 */

const MAX_OBJECT_KEYS = 64;
const MAX_ARRAY_LENGTH = 64;
const MAX_DEPTH = 12;

const FORBIDDEN_KEYS = new Set(["__proto__", "prototype", "constructor"]);

/** Is this a plain JSON-style object (not array, not null, not primitive)? */
export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Object.getPrototypeOf(value) === Object.prototype
  );
}

/**
 * Deep clone with depth/size caps and forbidden-key removal.
 * Cycles are broken (replaced with `null`).
 */
export function safeDeepClone(value: unknown, depth = 0, seen = new WeakSet()): unknown {
  if (depth > MAX_DEPTH) return null;
  if (value === null || value === undefined) return value;
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value;
  }

  if (Array.isArray(value)) {
    if (seen.has(value)) return null;
    seen.add(value);
    const sliced = value.slice(0, MAX_ARRAY_LENGTH);
    return sliced.map((item) => safeDeepClone(item, depth + 1, seen));
  }

  if (typeof value === "object") {
    if (seen.has(value as object)) return null;
    seen.add(value as object);

    const out: Record<string, unknown> = {};
    let keyCount = 0;
    for (const [key, val] of Object.entries(value)) {
      if (FORBIDDEN_KEYS.has(key)) continue;
      if (keyCount++ >= MAX_OBJECT_KEYS) break;
      out[key] = safeDeepClone(val, depth + 1, seen);
    }
    return out;
  }

  // Functions, symbols, bigints — drop.
  return null;
}

/**
 * Coerce a value to a plain object, returning an empty object if the
 * input was something else (null, array, primitive, etc.).
 */
export function asObject(value: unknown): Record<string, unknown> {
  if (isPlainObject(value)) return value;
  return {};
}

/**
 * Coerce a value to an array, returning an empty array if the input
 * was something else. Caps array length at MAX_ARRAY_LENGTH.
 */
export function asArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value.slice(0, MAX_ARRAY_LENGTH);
  return [];
}

/** Drop any object keys not in the allow-list. */
export function pickKeys<T extends Record<string, unknown>>(
  value: Record<string, unknown>,
  allowedKeys: readonly string[],
): Partial<T> {
  const out: Record<string, unknown> = {};
  for (const key of allowedKeys) {
    if (key in value) out[key] = value[key];
  }
  return out as Partial<T>;
}
