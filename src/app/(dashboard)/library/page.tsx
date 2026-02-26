"use client";

import { useState, useEffect, useRef } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase/firebase";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusToast } from "@/components/ui/status-toast";
import { RenameModal } from "@/components/ui/rename-modal";
import { MovePickerModal } from "@/components/ui/move-picker-modal";
import { useToastMessage } from "@/hooks/use-toast-message";
import { UPLOAD_FILE_ACCEPT } from "@/lib/upload/fileTypePolicy";
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
  category?: string;
  extractedText?: string;
}

interface PendingDeleteAction {
  id: string;
  type: "file" | "folder";
  label: string;
}

interface PendingRenameAction {
  id: string;
  type: "file" | "folder";
  parentId: string | null;
  currentName: string;
  newName: string;
}

interface PendingMoveAction {
  id: string;
  type: "file" | "folder";
  currentParentId: string | null;
}

type DocumentPreviewKind = "none" | "pdf" | "image" | "text" | "web";

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
  const isNote = file.category === "note" || file.mimeType === "text/markdown";

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
  const [pendingNewNoteName, setPendingNewNoteName] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<PendingDeleteAction | null>(null);
  const [pendingRename, setPendingRename] = useState<PendingRenameAction | null>(null);
  const [pendingMove, setPendingMove] = useState<PendingMoveAction | null>(null);
  const [noteSaveStatus, setNoteSaveStatus] = useState<"idle" | "unsaved" | "saving" | "saved" | "error">("idle");
  const [noteBaselineContent, setNoteBaselineContent] = useState("");
  const [docPreviewText, setDocPreviewText] = useState("");
  const [docPreviewStatus, setDocPreviewStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [docPreviewError, setDocPreviewError] = useState("");
  const [selectedDocumentPreviewKind, setSelectedDocumentPreviewKind] = useState<DocumentPreviewKind>("none");
  const activeNoteIdRef = useRef<string | null>(null);
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
    if (!selectedItem || selectedItem.type !== "Note") {
      setNoteSaveStatus("idle");
      setNoteBaselineContent("");
      activeNoteIdRef.current = null;
      return;
    }

    if (activeNoteIdRef.current !== selectedItem.id) {
      const initialContent = selectedItem.content || "";
      setNoteBaselineContent(initialContent);
      setNoteSaveStatus("saved");
      activeNoteIdRef.current = selectedItem.id;
    }
  }, [selectedItem]);

  useEffect(() => {
    if (!selectedItem || selectedItem.type === "Note") {
      setSelectedDocumentPreviewKind("none");
      setDocPreviewText("");
      setDocPreviewStatus("idle");
      setDocPreviewError("");
      return;
    }

    if (!selectedItem.downloadURL) {
      setSelectedDocumentPreviewKind("none");
      setDocPreviewText("");
      setDocPreviewStatus("idle");
      setDocPreviewError("");
      return;
    }

    let cancelled = false;

    const loadTextPreview = async () => {
      setDocPreviewStatus("idle");
      setDocPreviewError("");
      setDocPreviewText("");

      try {
        const params = new URLSearchParams({
          url: selectedItem.downloadURL as string,
          mimeType: selectedItem.mimeType || "",
          fileName: selectedItem.title,
        });

        const response = await fetch(
          `/api/file-preview?${params.toString()}`
        );

        const data = await response.json();
        if (cancelled) return;

        const nextKind = (data?.kind as DocumentPreviewKind) || "web";
        setSelectedDocumentPreviewKind(nextKind);

        if (nextKind !== "text") {
          setDocPreviewText("");
          setDocPreviewStatus("idle");
          setDocPreviewError("");
          return;
        }

        setDocPreviewStatus("loading");

        if (!response.ok || data?.error) {
          throw new Error(data?.error || "Unable to fetch file content");
        }

        const text = typeof data?.text === "string" ? data.text : "";

        const maxPreviewLength = 120_000;
        const previewContent = text.length > maxPreviewLength ? `${text.slice(0, maxPreviewLength)}\n\n[Preview truncated]` : text;

        setDocPreviewText(previewContent);
        setDocPreviewStatus("ready");
      } catch {
        if (cancelled) return;
        setSelectedDocumentPreviewKind("text");
        setDocPreviewStatus("error");
        setDocPreviewText("");
        setDocPreviewError("Preview unavailable for this file. Use Open File to view it directly.");
      }
    };

    void loadTextPreview();

    return () => {
      cancelled = true;
    };
  }, [selectedItem]);

  const saveNoteContent = async (fileId: string, content: string): Promise<boolean> => {
    try {
      setNoteSaveStatus("saving");
      const response = await fetch("/api/notes/update", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          fileId,
          content,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to save note");
      }

      setAllFiles((prev) =>
        prev.map((file) =>
          file.id === fileId
            ? {
                ...file,
                extractedText: content,
              }
            : file
        )
      );
      setSelectedItem((prev) => {
        if (!prev || prev.id !== fileId || prev.type !== "Note") {
          return prev;
        }
        return {
          ...prev,
          content,
        };
      });

      setNoteSaveStatus("saved");
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to save note";
      setNoteSaveStatus("error");
      setError(message);
      showToast(message, "error");
      return false;
    }
  };

  const handleSaveCurrentNote = async () => {
    if (!selectedItem || selectedItem.type !== "Note") return;

    const content = selectedItem.content || "";
    if (content === noteBaselineContent) return;

    if (selectedItem.source === "file") {
      const success = await saveNoteContent(selectedItem.id, content);
      if (!success) return;
    }

    setNoteBaselineContent(content);
    setNoteSaveStatus("saved");
    showToast("Note saved", "success");
  };

  const handleDiscardCurrentNote = () => {
    if (!selectedItem || selectedItem.type !== "Note") return;

    const reverted = { ...selectedItem, content: noteBaselineContent };
    setSelectedItem(reverted);
    setNotes((prev) => prev.map((item) => (item.id === reverted.id ? reverted : item)));

    if (editorRef.current) {
      editorRef.current.innerText = noteBaselineContent;
    }

    setNoteSaveStatus("saved");
  };

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

  const handleRenameFolder = async (folderId: string, newName: string) => {
    const trimmedName = newName.trim();
    if (!trimmedName) return;

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
          name: trimmedName,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to rename folder");
      }

      await loadLibraryData(userId);
      showToast("Folder name updated successfully", "success");
    } catch (renameError) {
      const message = renameError instanceof Error ? renameError.message : "Failed to rename folder";
      setError(message);
      showToast(message, "error");
      setLoading(false);
    }
  };

  const handleMoveFolder = async (folderId: string, targetFolderId: string | null) => {

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
      showToast("Folder moved successfully", "success");
    } catch (moveError) {
      const message = moveError instanceof Error ? moveError.message : "Failed to move folder";
      setError(message);
      showToast(message, "error");
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
    setPendingNewNoteName("New Note");
    setShowAddMenu(false);
  };

  const handleConfirmCreateNote = async () => {
    const noteName = pendingNewNoteName?.trim();
    if (!noteName) return;

    setPendingNewNoteName(null);
    setLoading(true);
    setError("");
    showLoading("Creating note...");

    try {
      const response = await fetch("/api/notes/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          title: noteName,
          content: "",
          folderId: currentFolderId,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create note");
      }

      const payload = await response.json();
      await loadLibraryData(userId);
      if (payload?.note?.id) {
        setSelectedItem({
          id: payload.note.id,
          source: "file",
          type: "Note",
          title: payload.note.originalName,
          author: "Uploaded file",
          tag: "text/markdown",
          parentId: payload.note.folderId ?? currentFolderId,
          downloadURL: payload.note.downloadURL,
          mimeType: "text/markdown",
          content: "",
        });
      }
      setNoteSaveStatus("idle");
      showToast("Note created successfully", "success");
    } catch (createNoteError) {
      const message = createNoteError instanceof Error ? createNoteError.message : "Failed to create note";
      setError(message);
      showToast(message, "error");
      setLoading(false);
    }
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
      const alreadyExists = uploadResult?.uploadResult?.alreadyExists === true;

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
      showToast(alreadyExists ? "File already exists in library" : "File uploaded successfully", "success");
    } catch (uploadError) {
      const message = uploadError instanceof Error ? uploadError.message : "Failed to upload file";
      setError(message);
      showToast(message, "error");
      setLoading(false);
    }
  };

  const handleMoveFile = async (fileId: string, targetFolderId: string | null) => {

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
      showToast("File moved successfully", "success");
    } catch (moveError) {
      const message = moveError instanceof Error ? moveError.message : "Failed to move file";
      setError(message);
      showToast(message, "error");
      setLoading(false);
    }
  };

  const handleRenameFile = async (fileId: string, currentName: string) => {
    const trimmedName = currentName.trim();
    if (!trimmedName) return;

    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/folders", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "rename-file",
          userId,
          fileId,
          name: trimmedName,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to rename file");
      }

      await loadLibraryData(userId);
      setSelectedItem((prev) => {
        if (!prev || prev.source !== "file" || prev.id !== fileId) {
          return prev;
        }
        return { ...prev, title: trimmedName };
      });
      showToast("File renamed successfully", "success");
    } catch (renameError) {
      const message = renameError instanceof Error ? renameError.message : "Failed to rename file";
      setError(message);
      showToast(message, "error");
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

  const requestRenameFolder = (folderId: string, currentName: string) => {
    const folder = allFolders.find((item) => item.id === folderId);
    if (!folder) return;

    setPendingRename({
      id: folderId,
      type: "folder",
      parentId: folder.parentFolderId,
      currentName,
      newName: currentName,
    });
  };

  const requestRenameFile = (fileId: string, currentName: string) => {
    const file = allFiles.find((item) => item.id === fileId);
    if (!file) return;

    setPendingRename({
      id: fileId,
      type: "file",
      parentId: file.folderId,
      currentName,
      newName: currentName,
    });
  };

  const requestMoveFile = (fileId: string) => {
    const file = allFiles.find((item) => item.id === fileId);
    if (!file) return;

    setPendingMove({
      id: fileId,
      type: "file",
      currentParentId: file.folderId,
    });
  };

  const requestMoveFolder = (folderId: string) => {
    const folder = allFolders.find((item) => item.id === folderId);
    if (!folder) return;

    setPendingMove({
      id: folderId,
      type: "folder",
      currentParentId: folder.parentFolderId,
    });
  };

  const getBlockedFolderIds = (): string[] => {
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
  };

  const handleConfirmMove = async (destinationFolderId: string | null) => {
    if (!pendingMove) return;

    const moveTarget = pendingMove;
    setPendingMove(null);

    if (moveTarget.type === "file") {
      await handleMoveFile(moveTarget.id, destinationFolderId);
      return;
    }

    if (destinationFolderId === moveTarget.id) {
      return;
    }

    await handleMoveFolder(moveTarget.id, destinationFolderId);
  };

  const handleConfirmRename = async () => {
    if (!pendingRename) return;

    const { id, type, currentName, newName } = pendingRename;
    const trimmedName = newName.trim();
    setPendingRename(null);

    if (!trimmedName || trimmedName === currentName) {
      return;
    }

    if (type === "folder") {
      await handleRenameFolder(id, trimmedName);
      return;
    }

    await handleRenameFile(id, trimmedName);
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

  const normalizedNewNoteName = (pendingNewNoteName || "").trim().toLowerCase();
  const isNewNoteNameDuplicate = normalizedNewNoteName.length > 0 && [
    ...allFolders
      .filter((folder) => folder.parentFolderId === currentFolderId)
      .map((folder) => folder.name.trim().toLowerCase()),
    ...allFiles
      .filter((file) => file.folderId === currentFolderId)
      .map((file) => file.originalName.trim().toLowerCase()),
  ].includes(
    normalizedNewNoteName.endsWith(".md")
      ? normalizedNewNoteName
      : `${normalizedNewNoteName}.md`
  );

  return (
    <div className="flex flex-col md:flex-row h-full gap-0 relative overflow-hidden" onClick={() => setShowAddMenu(false)}>
      <StatusToast toast={toast} onClose={clearToast} />

      {(pendingUploadFile || pendingNewNoteName || pendingDelete || pendingRename || pendingMove) && (
        <div className="fixed inset-0 z-[9997] bg-black/20 backdrop-blur-[1px]" />
      )}

      {pendingNewNoteName !== null && (
        <div className="fixed inset-0 z-[9998] flex items-center justify-center p-4">
          <div className="w-[min(92vw,520px)] p-4 border rounded-lg bg-popover shadow-lg flex flex-col gap-3 animate-in fade-in zoom-in-95">
            <div className="text-sm font-medium">Name your new note</div>
            <Input
              autoFocus
              value={pendingNewNoteName}
              onChange={(event) => setPendingNewNoteName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !isNewNoteNameDuplicate && pendingNewNoteName.trim()) {
                  void handleConfirmCreateNote();
                }
                if (event.key === "Escape") {
                  setPendingNewNoteName(null);
                }
              }}
              placeholder="My Notes"
            />
            {isNewNoteNameDuplicate && (
              <p className="text-xs text-destructive">A file/folder with similar name already exists here.</p>
            )}
            <div className="flex items-center gap-2 justify-end">
              <Button size="sm" variant="ghost" onClick={() => setPendingNewNoteName(null)} disabled={loading}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() => void handleConfirmCreateNote()}
                disabled={loading || !pendingNewNoteName.trim() || isNewNoteNameDuplicate}
              >
                Create Note
              </Button>
            </div>
          </div>
        </div>
      )}

      <RenameModal
        open={Boolean(pendingRename)}
        targetType={pendingRename?.type ?? "file"}
        originalName={pendingRename?.currentName ?? ""}
        value={pendingRename?.newName ?? ""}
        existingNames={
          pendingRename
            ? [
                ...allFolders
                  .filter((folder) => folder.parentFolderId === pendingRename.parentId && folder.id !== pendingRename.id)
                  .map((folder) => folder.name),
                ...allFiles
                  .filter((file) => file.folderId === pendingRename.parentId && file.id !== pendingRename.id)
                  .map((file) => file.originalName),
              ]
            : []
        }
        loading={loading}
        onValueChange={(value) =>
          setPendingRename((prev) =>
            prev ? { ...prev, newName: value } : prev
          )
        }
        onConfirm={() => void handleConfirmRename()}
        onCancel={() => setPendingRename(null)}
      />

      <MovePickerModal
        key={pendingMove ? `${pendingMove.type}:${pendingMove.id}:${pendingMove.currentParentId ?? "root"}` : "move-closed"}
        open={Boolean(pendingMove)}
        targetType={pendingMove?.type ?? "file"}
        currentParentId={pendingMove?.currentParentId ?? null}
        folders={allFolders.map((folder) => ({
          id: folder.id,
          name: folder.name,
          path: folder.path,
          parentFolderId: folder.parentFolderId,
        }))}
        blockedFolderIds={getBlockedFolderIds()}
        loading={loading}
        onConfirm={(destinationFolderId) => void handleConfirmMove(destinationFolderId)}
        onCancel={() => setPendingMove(null)}
      />

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
        accept={UPLOAD_FILE_ACCEPT}
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
                    <Button variant="ghost" className="w-full justify-start gap-2 text-sm" onClick={() => void handleCreateNote()}>
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
                    <CardTitle className="text-base font-medium leading-snug break-words line-clamp-2">{material.title}</CardTitle>
                    <CardDescription className="text-sm mt-1 break-words">{material.author || "Unknown Author"}</CardDescription>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <span className="inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold bg-secondary text-secondary-foreground shrink-0">
                      {material.type}
                    </span>
                  </div>

                  {material.source === "folder" && (
                    <div className="flex gap-2 mt-4" onClick={(event) => event.stopPropagation()}>
                      <Button variant="outline" size="sm" onClick={() => requestRenameFolder(material.id, material.title)}>
                        <PenLine className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => requestMoveFolder(material.id)}>
                        <FolderInput className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => requestDeleteFolder(material.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}

                  {material.source === "file" && (
                    <div className="flex gap-2 mt-4" onClick={(event) => event.stopPropagation()}>
                      <Button variant="outline" size="sm" onClick={() => requestRenameFile(material.id, material.title)}>
                        <PenLine className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => requestMoveFile(material.id)}>
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
                <h2 className="text-xl font-semibold break-words">{selectedItem.title}</h2>
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
                <div className="relative min-h-75">
                  {(!selectedItem.content || selectedItem.content.trim() === "") && (
                    <p className="absolute left-0 top-0 text-base text-muted-foreground pointer-events-none select-none">
                      Start writing...
                    </p>
                  )}
                  <div
                    key={selectedItem.id}
                    ref={(element) => {
                      if (element && element.innerText !== (selectedItem.content || "")) {
                        element.innerText = selectedItem.content || "";
                      }
                      editorRef.current = element;
                    }}
                    contentEditable
                    className="prose dark:prose-invert max-w-none text-base leading-relaxed focus:outline-none min-h-75"
                    suppressContentEditableWarning
                    onInput={(event) => {
                      const newContent = event.currentTarget.innerText;
                      const updated = { ...selectedItem, content: newContent };
                      setSelectedItem(updated);
                      setNotes((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));

                      setNoteSaveStatus(newContent === noteBaselineContent ? "saved" : "unsaved");
                    }}
                    onBlur={(event) => {
                      const newContent = event.currentTarget.innerText;
                      if (newContent !== selectedItem.content) {
                        const updated = { ...selectedItem, content: newContent };
                        setSelectedItem(updated);
                        setNotes((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
                        setNoteSaveStatus(newContent === noteBaselineContent ? "saved" : "unsaved");
                      }
                    }}
                  />
                </div>
              ) : (
                <div className="h-full min-h-[380px] border rounded-lg overflow-hidden bg-muted/10">
                  {!selectedItem.downloadURL && (
                    <div className="flex flex-col items-center justify-center h-full text-center space-y-4 text-muted-foreground p-8 border-2 border-dashed rounded-lg">
                      <FileText className="h-16 w-16 opacity-20" />
                      <div>
                        <h3 className="text-lg font-medium text-foreground">Document Preview</h3>
                        <p className="text-sm mt-1">No preview URL available for this file.</p>
                      </div>
                    </div>
                  )}

                  {selectedItem.downloadURL && selectedDocumentPreviewKind === "image" && (
                    <div className="relative w-full h-full min-h-[380px] bg-background">
                      <Image
                        src={selectedItem.downloadURL}
                        alt={selectedItem.title}
                        fill
                        unoptimized
                        className="object-contain"
                      />
                    </div>
                  )}

                  {selectedItem.downloadURL && selectedDocumentPreviewKind === "pdf" && (
                    <iframe
                      title={`Preview ${selectedItem.title}`}
                      src={selectedItem.downloadURL}
                      className="w-full h-full min-h-[380px]"
                    />
                  )}

                  {selectedItem.downloadURL && selectedDocumentPreviewKind === "text" && (
                    <div className="h-full overflow-auto p-4">
                      {docPreviewStatus === "loading" && (
                        <p className="text-sm text-muted-foreground">Loading preview...</p>
                      )}
                      {docPreviewStatus === "error" && (
                        <p className="text-sm text-destructive">{docPreviewError}</p>
                      )}
                      {docPreviewStatus === "ready" && (
                        <pre className="text-sm leading-relaxed whitespace-pre-wrap break-words font-mono">
                          {docPreviewText}
                        </pre>
                      )}
                    </div>
                  )}

                  {selectedItem.downloadURL && selectedDocumentPreviewKind === "web" && (
                    <iframe
                      title={`Preview ${selectedItem.title}`}
                      src={selectedItem.downloadURL}
                      className="w-full h-full min-h-[380px]"
                    />
                  )}

                </div>
              )}
            </div>

            <div className="p-4 border-t bg-muted/10 flex justify-between items-center text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                {selectedItem.type === "Note" ? (
                  <span className="flex items-center gap-1 text-xs">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        noteSaveStatus === "unsaved"
                          ? "bg-orange-500"
                          : noteSaveStatus === "saving"
                          ? "bg-yellow-500"
                          : noteSaveStatus === "error"
                            ? "bg-red-500"
                            : "bg-green-500"
                      }`}
                    />
                    {noteSaveStatus === "unsaved"
                      ? "Unsaved"
                      : noteSaveStatus === "saving"
                        ? "Saving..."
                      : noteSaveStatus === "error"
                        ? "Save failed"
                        : "Saved"}
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-xs">Read-only</span>
                )}
              </div>
              <div className="flex flex-wrap gap-2 justify-end">
                {selectedItem.type === "Note" && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void handleSaveCurrentNote()}
                    disabled={loading || (selectedItem.content || "") === noteBaselineContent}
                  >
                    Save
                  </Button>
                )}
                {selectedItem.type === "Note" && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDiscardCurrentNote}
                    disabled={loading || (selectedItem.content || "") === noteBaselineContent}
                  >
                    Discard
                  </Button>
                )}
                {selectedItem.source === "file" && (
                  <Button variant="outline" size="sm" onClick={() => requestRenameFile(selectedItem.id, selectedItem.title)}>
                    Rename
                  </Button>
                )}
                {selectedItem.source === "file" && (
                  <Button variant="outline" size="sm" onClick={() => requestMoveFile(selectedItem.id)}>
                    Move
                  </Button>
                )}
                {selectedItem.source === "file" && (
                  <Button variant="outline" size="sm" onClick={() => requestDeleteFile(selectedItem.id)}>
                    Delete
                  </Button>
                )}
                {selectedItem.source === "file" && selectedItem.downloadURL && (
                  <a href={selectedItem.downloadURL} target="_blank" rel="noreferrer" className="inline-flex">
                    <Button variant="outline" size="sm" className="gap-2">
                      <ExternalLink className="h-4 w-4" /> Open File
                    </Button>
                  </a>
                )}
                {selectedItem.source === "file" && !selectedItem.downloadURL && (
                  <Button variant="outline" size="sm" className="gap-2" disabled>
                    <ExternalLink className="h-4 w-4" /> Open File
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
