"use client";

import { useState, useEffect, useRef } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusToast } from "@/components/ui/status-toast";
import { useToastMessage } from "@/hooks/use-toast-message";
import {
  Book,
  FileText,
  StickyNote,
  Upload,
  Folder,
  ArrowLeft,
  X,
  Search,
  Sparkles,
  Highlighter,
  Wand2,
  Plus,
  Maximize2,
  Minimize2,
  PenLine,
  Trash2,
  FolderInput,
  ExternalLink,
} from "lucide-react";

type MaterialType = "PDF" | "Note" | "Document" | "Folder";
type MaterialSource = "folder" | "file" | "note";

interface Material {
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
}

interface FolderRecord {
  id: string;
  ownerId: string;
  name: string;
  parentFolderId: string | null;
  path: string[];
}

interface FileRecord {
  id: string;
  ownerId: string;
  originalName: string;
  mimeType: string;
  folderId: string | null;
  downloadURL: string;
}

interface PendingDeleteAction {
  id: string;
  type: "file" | "folder";
  label: string;
}

const TEST_USER_ID = "test-user-123";

function mapFileType(mimeType: string): MaterialType {
  if (mimeType === "application/pdf") return "PDF";
  if (mimeType.startsWith("text/")) return "Document";
  if (mimeType.startsWith("image/")) return "Document";
  return "Document";
}

function toFolderMaterial(folder: FolderRecord): Material {
  return {
    id: folder.id,
    source: "folder",
    type: "Folder",
    title: folder.name,
    author: "Folder",
    parentId: folder.parentFolderId,
  };
}

function toFileMaterial(file: FileRecord): Material {
  return {
    id: file.id,
    source: "file",
    type: mapFileType(file.mimeType),
    title: file.originalName,
    author: "Uploaded file",
    tag: file.mimeType,
    parentId: file.folderId,
    downloadURL: file.downloadURL,
    mimeType: file.mimeType,
  };
}

export default function LibraryPage() {
  const [userId, setUserId] = useState(TEST_USER_ID);
  const [allFolders, setAllFolders] = useState<FolderRecord[]>([]);
  const [allFiles, setAllFiles] = useState<FileRecord[]>([]);
  const [notes, setNotes] = useState<Material[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const [selectedItem, setSelectedItem] = useState<Material | null>(null);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [isFullView, setIsFullView] = useState(false);

  const [showMenu, setShowMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const [pendingUploadFile, setPendingUploadFile] = useState<File | null>(null);
  const [pendingDelete, setPendingDelete] = useState<PendingDeleteAction | null>(null);
  const editorRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { toast, showToast, showLoading, clearToast } = useToastMessage();

  const currentFolder = allFolders.find((folder) => folder.id === currentFolderId) ?? null;

  const folderMaterials = allFolders.map(toFolderMaterial);
  const fileMaterials = allFiles.map(toFileMaterial);
  const allMaterials = [...folderMaterials, ...fileMaterials, ...notes];

  const displayedMaterials = allMaterials.filter((material) => {
    if (!searchQuery) {
      return material.parentId === currentFolderId;
    }
    return material.title.toLowerCase().includes(searchQuery.toLowerCase());
  });

  async function loadLibraryData(activeUserId: string): Promise<void> {
    setLoading(true);
    setError("");
    try {
      const [foldersResponse, filesResponse] = await Promise.all([
        fetch(`/api/folders?action=get-all&userId=${encodeURIComponent(activeUserId)}`),
        fetch(`/api/get-files?userId=${encodeURIComponent(activeUserId)}`),
      ]);

      if (!foldersResponse.ok) {
        const data = await foldersResponse.json();
        throw new Error(data.error || "Failed to fetch folders");
      }

      if (!filesResponse.ok) {
        const data = await filesResponse.json();
        throw new Error(data.error || "Failed to fetch files");
      }

      const folderData = await foldersResponse.json();
      const fileData = await filesResponse.json();
      setAllFolders(folderData.folders || []);
      setAllFiles(fileData.files || []);
    } catch (fetchError) {
      const message = fetchError instanceof Error ? fetchError.message : "Failed to load library data";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (firebaseUser) => {
      setUserId(firebaseUser?.uid || TEST_USER_ID);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    void loadLibraryData(userId);
  }, [userId]);

  useEffect(() => {
    const handleSelection = () => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed || !selectedItem || selectedItem.type !== "Note") {
        setShowMenu(false);
        return;
      }

      if (editorRef.current && !editorRef.current.contains(selection.anchorNode)) {
        setShowMenu(false);
        return;
      }

      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();

      setMenuPosition({
        top: rect.top - 50,
        left: rect.left + rect.width / 2,
      });
      setShowMenu(true);
    };

    if (selectedItem?.type === "Note") {
      document.addEventListener("selectionchange", handleSelection);
    }

    return () => {
      document.removeEventListener("selectionchange", handleSelection);
    };
  }, [selectedItem]);

  const handleAction = (action: string) => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) return;

    if (action === "highlight") {
      try {
        document.designMode = "on";
        document.execCommand("hiliteColor", false, "#fef08a");
        document.designMode = "off";
        selection.removeAllRanges();
        setShowMenu(false);
      } catch (actionError) {
        console.error("Highlighting failed", actionError);
      }
      return;
    }

    alert(`[Demo] ${action} feature triggered! This would call the AI agent.`);
    setShowMenu(false);
  };

  const getIcon = (type: MaterialType) => {
    switch (type) {
      case "Folder":
        return <Folder className="h-5 w-5 text-blue-500 fill-blue-100" />;
      case "PDF":
        return <Book className="h-5 w-5 text-red-500" />;
      case "Note":
        return <StickyNote className="h-5 w-5 text-yellow-500" />;
      default:
        return <FileText className="h-5 w-5 text-green-500" />;
    }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;

    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create-folder",
          userId,
          name: newFolderName,
          parentFolderId: currentFolderId,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create folder");
      }

      setNewFolderName("");
      setIsCreatingFolder(false);
      await loadLibraryData(userId);
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Failed to create folder");
      setLoading(false);
    }
  };

  const handleRenameFolder = async (folderId: string, currentName: string) => {
    const newName = prompt("Rename folder", currentName)?.trim();
    if (!newName || newName === currentName) return;

    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/folders", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "rename-folder",
          userId,
          folderId,
          name: newName,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to rename folder");
      }

      await loadLibraryData(userId);
    } catch (renameError) {
      setError(renameError instanceof Error ? renameError.message : "Failed to rename folder");
      setLoading(false);
    }
  };

  const handleMoveFolder = async (folderId: string) => {
    const options = ["root", ...allFolders.filter((f) => f.id !== folderId).map((f) => `${f.id}:${f.path.join(" /")}`)];
    const selected = prompt(`Move folder to parent (enter folder id or 'root'):\n${options.join("\n")}`)?.trim();
    if (!selected) return;

    const targetFolderId = selected === "root" ? null : selected.split(":")[0];

    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/folders", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "move-folder",
          userId,
          folderId,
          parentFolderId: targetFolderId,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to move folder");
      }

      await loadLibraryData(userId);
    } catch (moveError) {
      setError(moveError instanceof Error ? moveError.message : "Failed to move folder");
      setLoading(false);
    }
  };

  const handleDeleteFolder = async (folderId: string) => {
    setLoading(true);
    setError("");
    showLoading("Deleting folder...");
    try {
      const url = new URL("/api/folders", window.location.origin);
      url.searchParams.set("userId", userId);
      url.searchParams.set("folderId", folderId);

      const response = await fetch(url.toString(), { method: "DELETE" });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete folder");
      }

      if (currentFolderId === folderId) {
        setCurrentFolderId(null);
      }
      await loadLibraryData(userId);
      setSelectedItem(null);
      showToast("Folder deleted successfully", "success");
    } catch (deleteError) {
      const message = deleteError instanceof Error ? deleteError.message : "Failed to delete folder";
      setError(message);
      showToast(message, "error");
      setLoading(false);
    }
  };

  const handleCreateNote = () => {
    const noteId = typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2);

    const newNote: Material = {
      id: `note-${noteId}`,
      source: "note",
      type: "Note",
      title: "New Note",
      parentId: currentFolderId,
      author: "Me",
      content: "<p>Start writing...</p>",
      tag: "Draft",
    };

    setNotes((prev) => [newNote, ...prev]);
    setSelectedItem(newNote);
    setShowAddMenu(false);
  };

  const handleUpload = () => {
    fileInputRef.current?.click();
    setShowAddMenu(false);
  };

  const handleSelectUploadFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setPendingUploadFile(file);
    event.target.value = "";
  };

  const handleConfirmUpload = async () => {
    const file = pendingUploadFile;
    if (!file) return;

    const fileName = file.name;
    setPendingUploadFile(null);

    setLoading(true);
    setError("");
    showLoading(`Uploading ${fileName}...`);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("userId", userId);

      const uploadResponse = await fetch("/api/upload-file", {
        method: "POST",
        body: formData,
      });

      if (!uploadResponse.ok) {
        const data = await uploadResponse.json();
        throw new Error(data.error || "Upload failed");
      }

      const uploadResult = await uploadResponse.json();
      const uploadedFileId = uploadResult?.fileId as string | undefined;

      if (currentFolderId && uploadedFileId) {
        await fetch("/api/folders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "move-file",
            userId,
            fileId: uploadedFileId,
            folderId: currentFolderId,
          }),
        });
      }

      await loadLibraryData(userId);
      showToast("File uploaded successfully", "success");
    } catch (uploadError) {
      const message = uploadError instanceof Error ? uploadError.message : "Failed to upload file";
      setError(message);
      showToast(message, "error");
      setLoading(false);
    }
  };

  const handleMoveFile = async (fileId: string) => {
    const options = ["root", ...allFolders.map((f) => `${f.id}:${f.path.join(" /")}`)];
    const selected = prompt(`Move file to folder (enter folder id or 'root'):\n${options.join("\n")}`)?.trim();
    if (!selected) return;

    const targetFolderId = selected === "root" ? null : selected.split(":")[0];

    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "move-file",
          userId,
          fileId,
          folderId: targetFolderId,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to move file");
      }

      await loadLibraryData(userId);
      setSelectedItem(null);
    } catch (moveError) {
      setError(moveError instanceof Error ? moveError.message : "Failed to move file");
      setLoading(false);
    }
  };

  const handleDeleteFile = async (fileId: string) => {
    setLoading(true);
    setError("");
    showLoading("Deleting file...");
    try {
      const response = await fetch("/api/folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "delete-file",
          userId,
          fileId,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete file");
      }

      await loadLibraryData(userId);
      setSelectedItem(null);
      showToast("File deleted successfully", "success");
    } catch (deleteError) {
      const message = deleteError instanceof Error ? deleteError.message : "Failed to delete file";
      setError(message);
      showToast(message, "error");
      setLoading(false);
    }
  };

  const requestDeleteFile = (fileId: string) => {
    const file = allFiles.find((item) => item.id === fileId);
    setPendingDelete({
      id: fileId,
      type: "file",
      label: file?.originalName || "this file",
    });
  };

  const requestDeleteFolder = (folderId: string) => {
    const folder = allFolders.find((item) => item.id === folderId);
    setPendingDelete({
      id: folderId,
      type: "folder",
      label: folder?.name || "this folder",
    });
  };

  const handleConfirmDelete = async () => {
    if (!pendingDelete) return;

    const target = pendingDelete;
    setPendingDelete(null);

    if (target.type === "file") {
      await handleDeleteFile(target.id);
      return;
    }

    await handleDeleteFolder(target.id);
  };

  return (
    <div className="flex flex-col md:flex-row h-full gap-0 relative overflow-hidden" onClick={() => setShowAddMenu(false)}>
      <StatusToast toast={toast} onClose={clearToast} />

      {(pendingUploadFile || pendingDelete) && (
        <div className="fixed inset-0 z-[9997] bg-black/20 backdrop-blur-[1px]" />
      )}

      {pendingUploadFile && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9998] w-[min(92vw,560px)]">
          <div className="p-4 border rounded-lg bg-popover shadow-lg flex flex-col gap-3 animate-in fade-in slide-in-from-top-4">
            <div className="text-sm">
              Ready to upload <strong>{pendingUploadFile.name}</strong>
              {currentFolder ? ` into ${currentFolder.name}` : " to Root"}.
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={() => void handleConfirmUpload()} disabled={loading}>
                Confirm Upload
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setPendingUploadFile(null)} disabled={loading}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {pendingDelete && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9998] w-[min(92vw,560px)]">
          <div className="p-4 border rounded-lg bg-popover border-destructive/40 shadow-lg flex flex-col gap-3 animate-in fade-in slide-in-from-top-4">
            <div className="text-sm">
              Delete <strong>{pendingDelete.label}</strong>?
              {pendingDelete.type === "folder" ? " This includes nested files and subfolders." : " This action cannot be undone."}
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="destructive" onClick={() => void handleConfirmDelete()} disabled={loading}>
                Confirm Delete
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setPendingDelete(null)} disabled={loading}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={handleSelectUploadFile}
        accept=".pdf,.png,.jpg,.jpeg,.webp,.txt,.md,.markdown,.csv"
      />

      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden px-4">
        <div className="flex-none flex flex-col gap-4 md:flex-row md:items-center md:justify-between pb-4 border-b shrink-0">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              {currentFolderId && (
                <Button variant="ghost" size="icon" onClick={() => setCurrentFolderId(null)} className="shrink-0">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              )}
              <h1 className="text-3xl font-bold tracking-tight truncate">{currentFolder ? currentFolder.name : "Library"}</h1>
            </div>
            <p className="text-muted-foreground mt-2 truncate">
              {currentFolderId ? "Folder contents" : "Manage your study materials and notes."}
            </p>
            <p className="text-xs text-muted-foreground mt-1">User: {userId}</p>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <div className="relative flex-1 md:w-64 md:flex-none">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search materials..."
                className="pl-8"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
              />
            </div>

            <div className="relative" onClick={(event) => event.stopPropagation()}>
              <Button className="gap-2" onClick={() => setShowAddMenu((prev) => !prev)}>
                <Plus className="h-4 w-4" /> Add New
              </Button>

              {showAddMenu && (
                <div className="absolute right-0 top-12 w-48 bg-popover border rounded-md shadow-md z-50 animate-in fade-in zoom-in-95 duration-200">
                  <div className="p-1">
                    <Button
                      variant="ghost"
                      className="w-full justify-start gap-2 text-sm"
                      onClick={() => {
                        setIsCreatingFolder(true);
                        setShowAddMenu(false);
                      }}
                    >
                      <Folder className="h-4 w-4 text-blue-500" /> New Folder
                    </Button>
                    <Button variant="ghost" className="w-full justify-start gap-2 text-sm" onClick={handleCreateNote}>
                      <StickyNote className="h-4 w-4 text-yellow-500" /> New Note
                    </Button>
                    <Button variant="ghost" className="w-full justify-start gap-2 text-sm" onClick={handleUpload}>
                      <Upload className="h-4 w-4 text-green-500" /> Upload File
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto pt-6">
          {error && <p className="mb-4 text-sm text-destructive">{error}</p>}

          {isCreatingFolder && (
            <div className="mb-6 p-4 border rounded-lg bg-muted/50 flex items-center gap-4 animate-in fade-in slide-in-from-top-4">
              <Folder className="h-6 w-6 text-muted-foreground" />
              <Input
                autoFocus
                placeholder="Folder Name"
                value={newFolderName}
                onChange={(event) => setNewFolderName(event.target.value)}
                className="max-w-xs"
                onKeyDown={(event) => {
                  if (event.key === "Enter") void handleCreateFolder();
                  if (event.key === "Escape") setIsCreatingFolder(false);
                }}
              />
              <Button size="sm" onClick={() => void handleCreateFolder()} disabled={loading}>Create</Button>
              <Button size="sm" variant="ghost" onClick={() => setIsCreatingFolder(false)}>Cancel</Button>
            </div>
          )}

          <div className={`grid gap-6 pb-8 ${selectedItem ? "grid-cols-1 lg:grid-cols-2" : "md:grid-cols-2 lg:grid-cols-3"}`}>
            {displayedMaterials.map((material) => (
              <Card
                key={material.id}
                className="hover:bg-muted/50 transition-colors cursor-pointer group flex flex-col min-w-0"
                onClick={() => {
                  if (material.type === "Folder") {
                    setCurrentFolderId(material.id);
                  } else {
                    setSelectedItem(material);
                  }
                }}
              >
                <CardHeader className="flex flex-row items-center gap-4 pb-2 space-y-0">
                  <div className="p-2 bg-background rounded-md border shadow-sm group-hover:border-primary/50 transition-colors shrink-0">
                    {getIcon(material.type)}
                  </div>
                  <div className="flex flex-col min-w-0 flex-1">
                    <CardTitle className="text-base font-medium leading-none truncate">{material.title}</CardTitle>
                    <CardDescription className="text-sm mt-1 truncate">{material.author || "Unknown Author"}</CardDescription>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <span className="inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold bg-secondary text-secondary-foreground shrink-0">
                      {material.type}
                    </span>
                    {material.tag && (
                      <span className="inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold bg-primary/10 text-primary truncate max-w-full">
                        {material.tag}
                      </span>
                    )}
                  </div>

                  {material.source === "folder" && (
                    <div className="flex gap-2 mt-4" onClick={(event) => event.stopPropagation()}>
                      <Button variant="outline" size="sm" onClick={() => void handleRenameFolder(material.id, material.title)}>
                        <PenLine className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => void handleMoveFolder(material.id)}>
                        <FolderInput className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => requestDeleteFolder(material.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}

                  {material.source === "file" && (
                    <div className="flex gap-2 mt-4" onClick={(event) => event.stopPropagation()}>
                      <Button variant="outline" size="sm" onClick={() => void handleMoveFile(material.id)}>
                        <FolderInput className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => requestDeleteFile(material.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {selectedItem && (
        <>
          <div
            className="md:hidden fixed inset-0 z-40 bg-background/80 backdrop-blur-sm transition-opacity"
            onClick={() => {
              setSelectedItem(null);
              setIsFullView(false);
            }}
          />

          <div
            className={`
              fixed inset-y-0 right-0 z-50 bg-background shadow-2xl animate-in slide-in-from-right duration-300 flex flex-col h-full border-l
              ${isFullView ? "w-full" : "w-full md:relative md:w-1/3 md:shrink-0 md:shadow-none"}
            `}
          >
            {showMenu && selectedItem.type === "Note" && (
              <div
                className="fixed z-60 flex items-center gap-1 p-1 bg-popover text-popover-foreground rounded-lg shadow-xl border animate-in fade-in zoom-in-95 duration-200"
                style={{
                  top: `${menuPosition.top}px`,
                  left: `${menuPosition.left}px`,
                  transform: "translate(-50%, -10px)",
                }}
                onMouseDown={(event) => event.preventDefault()}
              >
                <Button variant="ghost" size="sm" className="h-8 gap-1.5 hover:bg-muted text-xs font-medium" onClick={() => handleAction("explain")}>
                  <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                  Explain
                </Button>
                <div className="w-px h-4 bg-border mx-1" />
                <Button variant="ghost" size="sm" className="h-8 gap-1.5 hover:bg-muted text-xs font-medium" onClick={() => handleAction("summarize")}>
                  <Wand2 className="w-3.5 h-3.5 text-blue-500" />
                  Summarize
                </Button>
                <div className="w-px h-4 bg-border mx-1" />
                <Button variant="ghost" size="sm" className="h-8 gap-1.5 hover:bg-muted text-xs font-medium" onClick={() => handleAction("highlight")}>
                  <Highlighter className="w-3.5 h-3.5 text-amber-500" />
                  Highlight
                </Button>
              </div>
            )}

            <div className="flex items-center justify-between p-6 border-b">
              <div className="flex items-center gap-3 overflow-hidden">
                {getIcon(selectedItem.type)}
                <h2 className="text-xl font-semibold truncate">{selectedItem.title}</h2>
              </div>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="hidden md:inline-flex"
                  onClick={() => setIsFullView(!isFullView)}
                  title={isFullView ? "Collapse" : "Expand"}
                >
                  {isFullView ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setSelectedItem(null);
                    setIsFullView(false);
                  }}
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>

            <div className="flex-1 p-6 overflow-y-auto">
              {selectedItem.type === "Note" ? (
                <div
                  key={selectedItem.id}
                  ref={(element) => {
                    if (element && !element.innerHTML && selectedItem.content) {
                      element.innerHTML = selectedItem.content;
                    }
                    editorRef.current = element;
                  }}
                  contentEditable
                  className="prose dark:prose-invert max-w-none text-base leading-relaxed focus:outline-none min-h-75"
                  suppressContentEditableWarning
                  onBlur={(event) => {
                    const newContent = event.currentTarget.innerHTML;
                    if (newContent !== selectedItem.content) {
                      const updated = { ...selectedItem, content: newContent };
                      setNotes((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
                      setSelectedItem(updated);
                    }
                  }}
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center space-y-4 text-muted-foreground p-8 border-2 border-dashed rounded-lg">
                  <FileText className="h-16 w-16 opacity-20" />
                  <div>
                    <h3 className="text-lg font-medium text-foreground">Document Preview</h3>
                    <p className="text-sm mt-1">
                      Open file: <strong>{selectedItem.title}</strong>
                    </p>
                  </div>
                  {selectedItem.downloadURL ? (
                    <a href={selectedItem.downloadURL} target="_blank" rel="noreferrer" className="inline-flex">
                      <Button variant="outline" className="gap-2">
                        <ExternalLink className="h-4 w-4" /> Open File
                      </Button>
                    </a>
                  ) : (
                    <Button variant="outline" className="mt-4" disabled>
                      No preview URL
                    </Button>
                  )}
                </div>
              )}
            </div>

            <div className="p-4 border-t bg-muted/10 flex justify-between items-center text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                {selectedItem.type === "Note" ? (
                  <span className="flex items-center gap-1 text-xs">
                    <span className="w-2 h-2 rounded-full bg-green-500" /> Saved
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-xs">Read-only</span>
                )}
                <span>{selectedItem.tag ? `#${selectedItem.tag}` : ""}</span>
              </div>
              <div className="flex gap-2">
                {selectedItem.source === "file" && (
                  <Button variant="outline" size="sm" onClick={() => void handleMoveFile(selectedItem.id)}>
                    Move
                  </Button>
                )}
                {selectedItem.source === "file" && (
                  <Button variant="outline" size="sm" onClick={() => requestDeleteFile(selectedItem.id)}>
                    Delete
                  </Button>
                )}
                <Button size="sm" onClick={() => setSelectedItem(null)}>
                  Close
                </Button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
