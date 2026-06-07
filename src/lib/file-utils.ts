/**
 * Client-side file processing utilities for the attachment system.
 *
 * Handles:
 * - Image → base64 data-URL conversion (for GPT-4o vision)
 * - Text extraction from .txt / .csv / .json / .md documents
 * - File type categorisation & validation (size + MIME)
 */

/* ── Accepted MIME types ─────────────────────────────────────────── */

export const ACCEPTED_IMAGE_TYPES = [
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
] as const;

export const ACCEPTED_DOCUMENT_TYPES = [
  "text/plain",
  "text/csv",
  "text/markdown",
  "application/json",
  "application/pdf",
] as const;

/** Combined accept string for the <input type="file"> element */
export const ACCEPTED_FILE_TYPES = [
  ...ACCEPTED_IMAGE_TYPES,
  ...ACCEPTED_DOCUMENT_TYPES,
  ".md",
  ".csv",
  ".json",
  ".txt",
  ".pdf",
  ".doc",
  ".docx",
].join(",");

/* ── Constants ───────────────────────────────────────────────────── */

export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
export const MAX_IMAGE_COUNT = 10;

/* ── Categorisation ──────────────────────────────────────────────── */

export type FileCategory = "image" | "document" | "unknown";

export function getFileCategory(file: File): FileCategory {
  if (ACCEPTED_IMAGE_TYPES.some((t) => file.type === t)) return "image";

  // Check MIME first, then fall back to extension
  if (ACCEPTED_DOCUMENT_TYPES.some((t) => file.type === t)) return "document";

  const ext = file.name.split(".").pop()?.toLowerCase();
  if (ext && ["txt", "csv", "json", "md", "pdf", "doc", "docx"].includes(ext))
    return "document";

  return "unknown";
}

/* ── Validation ──────────────────────────────────────────────────── */

export interface FileValidationResult {
  valid: boolean;
  error?: string;
}

export function validateFile(
  file: File,
  currentImageCount: number
): FileValidationResult {
  const category = getFileCategory(file);

  if (category === "unknown") {
    return {
      valid: false,
      error: `"${file.name}" is not a supported file type. Use images (PNG, JPG, GIF, WebP) or documents (TXT, CSV, JSON, MD, PDF).`,
    };
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      valid: false,
      error: `"${file.name}" exceeds the 10 MB limit (${formatFileSize(file.size)}).`,
    };
  }

  if (category === "image" && currentImageCount >= MAX_IMAGE_COUNT) {
    return {
      valid: false,
      error: `Maximum ${MAX_IMAGE_COUNT} images allowed. Remove an image before adding more.`,
    };
  }

  return { valid: true };
}

/* ── Base64 conversion ───────────────────────────────────────────── */

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("FileReader did not return a string."));
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

/* ── Text extraction ─────────────────────────────────────────────── */

export function extractTextFromFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const ext = file.name.split(".").pop()?.toLowerCase();

    // PDF — we can't parse PDFs purely client-side without a library.
    // Send a descriptive placeholder so the AI knows a PDF was attached.
    if (file.type === "application/pdf" || ext === "pdf") {
      resolve(
        `[PDF Document: "${file.name}" — ${formatFileSize(file.size)}. PDF text extraction is not available client-side. The file was attached for reference.]`
      );
      return;
    }

    // .doc / .docx — same limitation
    if (ext === "doc" || ext === "docx") {
      resolve(
        `[Word Document: "${file.name}" — ${formatFileSize(file.size)}. Binary document text extraction is not available client-side. The file was attached for reference.]`
      );
      return;
    }

    // Text-based files (.txt, .csv, .json, .md)
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        // Cap extracted text at ~30 000 chars to avoid blowing up context
        const text = reader.result.slice(0, 30_000);
        const truncated = reader.result.length > 30_000;
        resolve(
          truncated
            ? `${text}\n\n[... content truncated — original file: ${formatFileSize(file.size)}]`
            : text
        );
      } else {
        reject(new Error("FileReader did not return text."));
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

/* ── Thumbnail generation ────────────────────────────────────────── */

export function createImageThumbnail(
  file: File,
  maxSize = 64
): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const scale = Math.min(maxSize / img.width, maxSize / img.height, 1);
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        URL.revokeObjectURL(url);
        reject(new Error("Could not get canvas context."));
        return;
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const thumb = canvas.toDataURL("image/jpeg", 0.7);
      URL.revokeObjectURL(url);
      resolve(thumb);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image for thumbnail."));
    };
    img.src = url;
  });
}

/* ── Display helpers ─────────────────────────────────────────────── */

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function getDocumentIcon(file: File): string {
  const ext = file.name.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "pdf":
      return "📄";
    case "csv":
      return "📊";
    case "json":
      return "{ }";
    case "md":
      return "📝";
    case "doc":
    case "docx":
      return "📃";
    default:
      return "📋";
  }
}

/* ── Structured attachment types for the chat hook ────────────────── */

export interface ImageAttachment {
  name: string;
  base64DataUrl: string;
  mimeType: string;
  size: number;
}

export interface DocumentAttachment {
  name: string;
  textContent: string;
  mimeType: string;
  size: number;
}

export interface ProcessedAttachments {
  images: ImageAttachment[];
  documents: DocumentAttachment[];
}

/**
 * Process an array of raw File objects into structured attachments
 * ready for the chat hook.
 */
export async function processFiles(files: File[]): Promise<ProcessedAttachments> {
  const images: ImageAttachment[] = [];
  const documents: DocumentAttachment[] = [];

  await Promise.all(
    files.map(async (file) => {
      const category = getFileCategory(file);

      if (category === "image") {
        const base64DataUrl = await fileToBase64(file);
        images.push({
          name: file.name,
          base64DataUrl,
          mimeType: file.type,
          size: file.size,
        });
      } else if (category === "document") {
        const textContent = await extractTextFromFile(file);
        documents.push({
          name: file.name,
          textContent,
          mimeType: file.type,
          size: file.size,
        });
      }
    })
  );

  return { images, documents };
}
