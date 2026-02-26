import { NextResponse } from "next/server";

type PreviewKind = "none" | "pdf" | "image" | "text" | "web";

const ALLOWED_HOSTS = new Set([
  "firebasestorage.googleapis.com",
  "storage.googleapis.com",
]);

function getFileExtension(fileName: string): string {
  const lastDot = fileName.lastIndexOf(".");
  if (lastDot === -1) return "";
  return fileName.slice(lastDot + 1).toLowerCase();
}

function getPreviewKind(mimeType: string, fileName: string, hasUrl: boolean): PreviewKind {
  if (!hasUrl) return "none";

  const normalizedMimeType = (mimeType || "").toLowerCase();
  const extension = getFileExtension(fileName);

  if (normalizedMimeType === "application/pdf" || extension === "pdf") return "pdf";

  if (
    normalizedMimeType.startsWith("image/") ||
    ["png", "jpg", "jpeg", "webp", "gif", "bmp", "svg"].includes(extension)
  ) {
    return "image";
  }

  if (
    normalizedMimeType.startsWith("text/") ||
    ["application/json", "application/xml", "application/csv", "text/csv"].includes(normalizedMimeType) ||
    (normalizedMimeType === "application/vnd.ms-excel" && extension === "csv") ||
    ["txt", "md", "markdown", "json", "xml", "csv"].includes(extension)
  ) {
    return "text";
  }

  return "web";
}

function isTextLikeContentType(contentType: string): boolean {
  const normalized = contentType.toLowerCase();
  return (
    normalized.startsWith("text/") ||
    normalized.includes("application/json") ||
    normalized.includes("application/xml") ||
    normalized.includes("application/csv") ||
    normalized.includes("text/csv")
  );
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const targetUrl = searchParams.get("url") || "";
    const mimeType = searchParams.get("mimeType") || "";
    const fileName = searchParams.get("fileName") || "";

    const kind = getPreviewKind(mimeType, fileName, Boolean(targetUrl));
    if (!targetUrl || kind !== "text") {
      return NextResponse.json({ kind });
    }

    let parsed: URL;
    try {
      parsed = new URL(targetUrl);
    } catch {
      return NextResponse.json({ kind, error: "Invalid URL" });
    }

    if (!["http:", "https:"].includes(parsed.protocol)) {
      return NextResponse.json({ kind, error: "Unsupported URL protocol" });
    }

    if (!ALLOWED_HOSTS.has(parsed.hostname)) {
      return NextResponse.json({ kind, error: "URL host is not allowed" });
    }

    const upstream = await fetch(parsed.toString(), {
      method: "GET",
      redirect: "follow",
      cache: "no-store",
    });

    if (!upstream.ok) {
      return NextResponse.json({ kind, error: "Failed to fetch source file" });
    }

    const contentType = upstream.headers.get("content-type") || "";
    const textByDeclaredType =
      mimeType.startsWith("text/") ||
      ["application/json", "application/xml", "application/csv", "text/csv", "application/vnd.ms-excel"].includes(
        mimeType.toLowerCase()
      ) ||
      ["txt", "md", "markdown", "json", "xml", "csv"].includes(getFileExtension(fileName));

    if (!isTextLikeContentType(contentType) && !textByDeclaredType) {
      return NextResponse.json({ kind, error: "File is not text previewable" });
    }

    const text = await upstream.text();
    const maxPreviewLength = 120_000;
    const truncated = text.length > maxPreviewLength;

    return NextResponse.json({
      kind,
      text: truncated ? text.slice(0, maxPreviewLength) : text,
      truncated,
      contentType,
    });
  } catch (error) {
    const details = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ kind: "web", error: "Failed to load file preview", details });
  }
}
