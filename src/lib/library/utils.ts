import { Material, FolderRecord, FileRecord, MaterialType, DocumentPreviewKind, PendingMoveAction } from "./types";

export function mapFileType(mimeType: string): MaterialType {
  if (mimeType === "application/pdf") return "PDF";
  if (mimeType.startsWith("text/")) return "Document";
  if (mimeType.startsWith("image/")) return "Document";
  return "Document";
}

export function toFolderMaterial(folder: FolderRecord): Material {
  return {
    id: folder.id,
    source: "folder",
    type: "Folder",
    title: folder.name,
    author: "Folder",
    parentId: folder.parentFolderId,
  };
}

export function toFileMaterial(file: FileRecord): Material {
  const normalizedName = file.originalName.toLowerCase();
  const isMarkdownByName = normalizedName.endsWith(".md") || normalizedName.endsWith(".markdown");
  const isNote = file.category === "note" || file.mimeType === "text/markdown" || isMarkdownByName;

  return {
    id: file.id,
    source: "file",
    type: isNote ? "Note" : mapFileType(file.mimeType),
    title: file.originalName,
    author: "Uploaded file",
    tag: file.mimeType,
    parentId: file.folderId,
    downloadURL: file.downloadURL,
    mimeType: file.mimeType,
    content: isNote ? (file.extractedText || "") : undefined,
    attachedFileIds: file.attachedFileIds || [],
  };
}

export function getDocumentPreviewKind(item: Material): DocumentPreviewKind {
    if (!item.mimeType) return "none";
    if (item.mimeType === "application/pdf") return "pdf";
    if (item.mimeType.startsWith("image/")) return "image";
    if (item.mimeType.startsWith("text/")) return "text";
    return "none";
}

export function getBlockedFolderIds(
    pendingMove: PendingMoveAction | null,
    allFolders: FolderRecord[]
): string[] {
    if (!pendingMove || pendingMove.type !== "folder") {
      return [];
    }
    const blocked = new Set<string>([pendingMove.id]);
    const queue = [pendingMove.id];
    while (queue.length > 0) {
      const currentId = queue.shift();
      if (!currentId) continue;
      const children = allFolders.filter((folder) => folder.parentFolderId === currentId);
      for (const child of children) {
        if (!blocked.has(child.id)) {
            blocked.add(child.id);
            queue.push(child.id);
        }
      }
    }
    return Array.from(blocked);
}

export function checkDuplicateNoteName(
    name: string | null, 
    currentFolderId: string | null, 
    folders: FolderRecord[], 
    files: FileRecord[]
): boolean {
    const normalizedNewNoteName = (name || "").trim().toLowerCase();
    if (normalizedNewNoteName.length === 0) return false;
    
    // We can't use Set here easily because we need to check if it includes the targetName which might have .md appended
    // Actually we can just build the list of names and check.
    
    const existingNames = [
        ...folders
          .filter((folder) => folder.parentFolderId === currentFolderId)
          .map((folder) => folder.name.trim().toLowerCase()),
        ...files
          .filter((file) => file.folderId === currentFolderId)
          .map((file) => file.originalName.trim().toLowerCase()),
    ];
    
    const targetName = normalizedNewNoteName.endsWith(".md")
      ? normalizedNewNoteName
      : `${normalizedNewNoteName}.md`;

    return existingNames.includes(targetName);
}

// --- Drag and Drop Utils ---

export function createDragGhost(e: React.DragEvent): void {
    const cardElement = e.currentTarget as HTMLElement;
    const rect = cardElement.getBoundingClientRect();
    
    // Create a clone to use as drag image
    const dragImage = cardElement.cloneNode(true) as HTMLElement;
    
    // Style it to look like a "ghost" of the card
    dragImage.style.position = "absolute";
    dragImage.style.top = "-9999px"; // Hide it initially
    dragImage.style.width = `${rect.width}px`;
    dragImage.style.height = `${rect.height}px`;
    dragImage.style.opacity = "0.8"; // Slightly transparent
    dragImage.classList.add("bg-background", "shadow-xl", "border-primary", "rounded-lg"); // Ensure it has background/border
    
    document.body.appendChild(dragImage);
    
    // Set the drag image offset slightly from cursor
    e.dataTransfer.setDragImage(dragImage, 10, 10);
    
    // Clean up DOM node after drag start logic completes
    setTimeout(() => {
        if (dragImage.parentNode) dragImage.parentNode.removeChild(dragImage);
    }, 0);
}

// --- Data Filtering Utils ---

export function getFilteredMaterials(
    allFolders: FolderRecord[],
    allFiles: FileRecord[],
    currentFolderId: string | null,
    searchQuery: string
): Material[] {
    if (searchQuery) {
        const lowerQuery = searchQuery.toLowerCase();
        
        const folderMaterials = allFolders
            .map(toFolderMaterial)
            .filter((m) => m.title.toLowerCase().includes(lowerQuery));

        const fileMaterials = allFiles
            .map(toFileMaterial)
            .filter((m) => m.title.toLowerCase().includes(lowerQuery));
            
        return [...folderMaterials, ...fileMaterials].sort((a, b) => a.title.localeCompare(b.title));
    }

    const folderMaterials = allFolders
        .filter((f) => f.parentFolderId === currentFolderId)
        .map(toFolderMaterial)
        .sort((a, b) => a.title.localeCompare(b.title));

    const fileMaterials = allFiles
        .filter((f) => f.folderId === currentFolderId)
        .map(toFileMaterial)
        .sort((a, b) => a.title.localeCompare(b.title));

    return [...folderMaterials, ...fileMaterials];
}