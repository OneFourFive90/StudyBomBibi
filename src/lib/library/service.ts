import { authenticatedFetch } from "@/lib/authenticatedFetch";
import { FolderRecord, FileRecord } from "@/lib/library/types";

// --- Library Data Fetching ---

export async function fetchFolders(): Promise<FolderRecord[]> {
  const res = await authenticatedFetch("/api/folders?action=get-all");
  if (!res.ok) throw new Error("Failed to fetch folders");
  const data = await res.json();
  return data.folders || [];
}

export async function fetchFiles(): Promise<FileRecord[]> {
  const res = await authenticatedFetch("/api/get-files");
  if (!res.ok) throw new Error("Failed to fetch files");
  const data = await res.json();
  return data.files || [];
}

// --- Folder Management ---

export async function createFolderApi(name: string, parentFolderId: string | null): Promise<void> {
  const response = await authenticatedFetch("/api/folders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "create-folder",
      name,
      parentFolderId,
    }),
  });

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || "Failed to create folder");
  }
}

export async function renameFolderApi(folderId: string, name: string): Promise<void> {
  const response = await authenticatedFetch("/api/folders", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "rename-folder", folderId, name }),
  });
  if (!response.ok) throw new Error("Failed to rename folder");
}

export async function deleteFolderApi(folderId: string): Promise<void> {
  const res = await authenticatedFetch("/api/folders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "delete-folder", folderId })
  });
  if (!res.ok) throw new Error("Failed to delete folder");
}

export async function moveFolderApi(folderId: string, targetFolderId: string | null): Promise<void> {
  const res = await authenticatedFetch("/api/folders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "move-folder", folderId, targetFolderId })
  });
  if (!res.ok) throw new Error("Failed to move folder");
}

// --- File Management ---

export async function renameFileApi(fileId: string, name: string): Promise<void> {
  const response = await authenticatedFetch("/api/folders", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "rename-file", fileId, name }),
  });
  if (!response.ok) throw new Error("Failed to rename file");
}

export async function deleteFileApi(fileId: string): Promise<void> {
  const res = await authenticatedFetch("/api/folders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "delete-file", fileId })
  });
  if (!res.ok) throw new Error("Failed to delete file");
}

export async function moveFileApi(fileId: string, folderId: string | null): Promise<void> {
  const res = await authenticatedFetch("/api/folders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "move-file", fileId, folderId })
  });
  if (!res.ok) throw new Error("Failed to move file");
}

export async function uploadFileApi(file: File, folderId: string | null): Promise<void> {
  const formData = new FormData();
  formData.append("file", file);
  if (folderId) {
    formData.append("folderId", folderId);
  }

  const uploadResponse = await authenticatedFetch("/api/upload-file", {
    method: "POST",
    body: formData,
  });

  if (!uploadResponse.ok) {
    throw new Error("Failed to upload file");
  }
}

export async function getFilePreviewApi(params: {
  url: string;
  mimeType: string;
  fileName: string;
}): Promise<{ kind: string; text?: string; error?: string }> {
  const query = new URLSearchParams({
    url: params.url,
    mimeType: params.mimeType,
    fileName: params.fileName,
  });

  const res = await authenticatedFetch(`/api/file-preview?${query.toString()}`);
  if (!res.ok) throw new Error("Failed to load text");
  return res.json();
}

// --- Note Management ---

export async function createNoteApi(name: string, folderId: string | null, content: string = "", attachedFileIds: string[] = []): Promise<void> {
  const response = await authenticatedFetch("/api/notes/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: name,
      folderId,
      content,
      attachedFileIds,
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to create note");
  }
}

export async function updateNoteApi(fileId: string, content: string): Promise<void> {
  const res = await authenticatedFetch("/api/notes/update", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fileId,
      content
    })
  });
  if (!res.ok) throw new Error("Failed to save note");
}

// --- AI Features ---

export async function explainTextApi(text: string, contextNotes: string | undefined): Promise<string> {
  const res = await authenticatedFetch("/api/quick-explain", {
    method: "POST",
    body: JSON.stringify({
      highlightedWord: text,
      contextNotes,
      action: "explain",
    }),
  });
  if (!res.ok) throw new Error("Failed to explain");
  const data = await res.json();
  return data.explanation;
}

export async function summariseTextApi(text: string, contextNotes: string | undefined): Promise<string> {
  const res = await authenticatedFetch("/api/quick-explain", {
    method: "POST",
    body: JSON.stringify({
      highlightedWord: text,
      contextNotes,
      action: "summarise",
    }),
  });
  if (!res.ok) throw new Error("Failed to summarise");
  const data = await res.json();
  return data.explanation;
}
