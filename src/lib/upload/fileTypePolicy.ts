export const ALLOWED_UPLOAD_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "text/plain",
  "text/markdown",
  "text/csv",
] as const;

export const ALLOWED_UPLOAD_EXTENSIONS = [
  "pdf",
  "jpg",
  "jpeg",
  "png",
  "webp",
  "txt",
  "md",
  "markdown",
  "csv",
] as const;

export const EXTENSION_MIME_MAP: Record<string, string> = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  txt: "text/plain",
  md: "text/markdown",
  markdown: "text/markdown",
  csv: "text/csv",
};

export const UPLOAD_FILE_ACCEPT =
  ".pdf,.jpg,.jpeg,.png,.webp,.txt,.md,.markdown,.csv,application/pdf,image/jpeg,image/jpg,image/png,image/webp,text/plain,text/markdown,text/csv";

export const PDF_UPLOAD_ACCEPT = ".pdf,application/pdf";
export const IMAGE_UPLOAD_ACCEPT = ".jpg,.jpeg,.png,.webp,image/jpeg,image/jpg,image/png,image/webp";
export const DOCUMENT_UPLOAD_ACCEPT = ".txt,.md,.markdown,.csv,text/plain,text/markdown,text/csv";

export const SUPPORTED_UPLOAD_TYPES_LABEL = "PDF, JPG, PNG, WEBP, TXT, MD, CSV";

const ALLOWED_MIME_TYPE_SET = new Set<string>(ALLOWED_UPLOAD_MIME_TYPES);
const ALLOWED_EXTENSION_SET = new Set<string>(ALLOWED_UPLOAD_EXTENSIONS);

const IMAGE_MIME_TYPES = new Set<string>(["image/jpeg", "image/jpg", "image/png", "image/webp"]);
const IMAGE_EXTENSIONS = new Set<string>(["jpg", "jpeg", "png", "webp"]);
const DOCUMENT_MIME_TYPES = new Set<string>(["text/plain", "text/markdown", "text/x-markdown", "text/csv"]);
const DOCUMENT_EXTENSIONS = new Set<string>(["txt", "md", "markdown", "csv"]);

export type UploadFileKind = "pdf" | "image" | "document" | "unsupported";

export function normalizeUploadMimeType(rawType: string, fileName: string): string {
  const normalizedType = (rawType || "").toLowerCase();
  if (ALLOWED_MIME_TYPE_SET.has(normalizedType)) {
    return normalizedType;
  }

  const extension = fileName.split(".").pop()?.toLowerCase() || "";
  return EXTENSION_MIME_MAP[extension] || normalizedType;
}

export function isAllowedUploadFileType(rawType: string, fileName: string): boolean {
  const normalizedType = (rawType || "").toLowerCase();
  if (ALLOWED_MIME_TYPE_SET.has(normalizedType)) {
    return true;
  }

  const extension = fileName.split(".").pop()?.toLowerCase() || "";
  return ALLOWED_EXTENSION_SET.has(extension);
}

export function getUploadFileKind(rawType: string, fileName: string): UploadFileKind {
  const normalizedType = normalizeUploadMimeType(rawType, fileName);
  const extension = fileName.split(".").pop()?.toLowerCase() || "";

  if (normalizedType === "application/pdf" || extension === "pdf") {
    return "pdf";
  }

  if (IMAGE_MIME_TYPES.has(normalizedType) || IMAGE_EXTENSIONS.has(extension)) {
    return "image";
  }

  if (DOCUMENT_MIME_TYPES.has(normalizedType) || DOCUMENT_EXTENSIONS.has(extension)) {
    return "document";
  }

  return "unsupported";
}
