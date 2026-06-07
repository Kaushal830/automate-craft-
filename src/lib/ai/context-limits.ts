export const MAX_INITIAL_PROMPT_CHARS = 2_000;
export const MAX_USER_PROMPT_CHARS = 8_000;
export const MAX_DOCUMENT_CHARS_PER_FILE = 4_000;
export const MAX_DOCUMENT_CONTEXT_CHARS = 8_000;
export const MAX_MODEL_TEXT_CONTEXT_CHARS = 16_000;
export const MAX_MODEL_TEXT_PART_CHARS = 6_000;
export const MAX_ASSISTANT_TEXT_PART_CHARS = 2_000;
export const MAX_MODEL_MESSAGES = 8;
export const MAX_MODEL_IMAGE_PARTS = 2;
export const MAX_MODEL_IMAGE_DATA_URL_CHARS = 2_500_000;

export const CONTEXT_WINDOW_ERROR_MESSAGE =
  "Your prompt or attachments are too large for the AI context window. I shortened the request where possible, but this one still needs to be split into smaller parts.";

export function truncateText(
  text: string,
  maxChars: number,
  suffix = "\n[... content truncated to fit the AI context window ...]",
) {
  if (text.length <= maxChars) return text;
  if (maxChars <= suffix.length) return text.slice(0, maxChars);
  return `${text.slice(0, maxChars - suffix.length)}${suffix}`;
}
