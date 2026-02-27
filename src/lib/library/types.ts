export type MaterialType = "PDF" | "Note" | "Document" | "Folder";
export type MaterialSource = "folder" | "file" | "note";

export interface Material {
  id: string;
  type: MaterialType;
  source: MaterialSource;
  title: string;
  author?: string;
  content?: string;
  tag?: string;
  parentId: string | null;
  downloadURL?: string;
  mimeType?: string;
  attachedFileIds?: string[];
}

export interface FolderRecord {
  id: string;
  ownerId: string;
  name: string;
  parentFolderId: string | null;
  path: string[];
}

export interface FileRecord {
  id: string;
  ownerId: string;
  originalName: string;
  mimeType: string;
  folderId: string | null;
  downloadURL: string;
  category?: string;
  extractedText?: string;
  attachedFileIds?: string[];
}

export interface PendingDeleteAction {
  id: string;
  type: "file" | "folder";
  label: string;
}

export interface PendingRenameAction {
  id: string;
  type: "file" | "folder";
  parentId: string | null;
  currentName: string;
  newName: string;
}

export interface PendingMoveAction {
  id: string;
  type: "file" | "folder";
  currentParentId: string | null;
}

export type DocumentPreviewKind = "none" | "pdf" | "image" | "text" | "web";
