import { useState } from "react";
import { useToastMessage } from "@/hooks/use-toast-message";
import {
  createFolderApi,
  createNoteApi,
  uploadFileApi,
  renameFolderApi,
  renameFileApi,
  deleteFolderApi,
  deleteFileApi,
  moveFolderApi,
  moveFileApi,
  updateNoteApi,
  explainTextApi,
  summariseTextApi,
  getFilePreviewApi
} from "./service";

export interface AiActionResult {
  title: string;
  content: string;
}

export function useLibraryActions(refresh: () => Promise<void>) {
  const { showToast, showLoading } = useToastMessage();
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Helper to standardise async action execution
  const executeAction = async <T>(
    loadingMessage: string, 
    actionFn: () => Promise<T>, 
    successMessage?: string,
    refreshAfter = true
  ): Promise<T | null | boolean> => {
    setActionLoading(true);
    setActionError(null);
    if (loadingMessage) showLoading(loadingMessage);

    try {
      const result = await actionFn();
      if (refreshAfter) await refresh();
      if (successMessage) showToast(successMessage, "success");
      return result === undefined ? true : result; 
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Action failed";
      setActionError(message);
      showToast(message, "error");
      return null;
    } finally {
      setActionLoading(false);
    }
  };

  const createFolder = (name: string, parentId: string | null) => 
    executeAction("Creating folder...", () => createFolderApi(name, parentId), "Folder created successfully");

  const createNote = (name: string, parentId: string | null) =>
    executeAction("Creating note...", () => createNoteApi(name, parentId, ""), "Note created successfully");

  const uploadFile = (file: File, parentId: string | null) =>
    executeAction(`Uploading ${file.name}...`, () => uploadFileApi(file, parentId), "File uploaded successfully");

  const renameFolder = (id: string, newName: string) =>
    executeAction("Renaming folder...", () => renameFolderApi(id, newName), "Folder renamed");

  const renameFile = (id: string, newName: string) =>
    executeAction("Renaming file...", () => renameFileApi(id, newName), "File renamed");

  const deleteFolder = (id: string) =>
    executeAction("Deleting folder...", () => deleteFolderApi(id), "Folder deleted");

  const deleteFile = (id: string) =>
    executeAction("Deleting file...", () => deleteFileApi(id), "File deleted");

  const moveFolder = (id: string, targetId: string | null) =>
    executeAction("Moving folder...", () => moveFolderApi(id, targetId), "Folder moved");

  const moveFile = (id: string, targetId: string | null) =>
    executeAction("Moving file...", () => moveFileApi(id, targetId), "File moved");

  // Note actions - separate logic sometimes
  const saveNote = (id: string, content: string) => 
    executeAction("Saving note...", () => updateNoteApi(id, content), "Note saved", false);

    const getFilePreview = async (params: { url: string; mimeType: string; fileName: string }) => {
      // Doesn't need refresh or toast usually, but can use executeAction with no success message
      return executeAction("Loading preview...", () => getFilePreviewApi(params), undefined, false);
  }

  const explainText = async (text: string, context?: string) => {
     return executeAction("Generating explanation...", () => explainTextApi(text, context), undefined, false);
  };

  const summariseText = async (text: string, context?: string) => {
     return executeAction("Summarising...", () => summariseTextApi(text, context), undefined, false);
  };

  return {
    actionLoading,
    actionError,
    createFolder,
    createNote,
    uploadFile,
    renameFolder,
    renameFile,
    deleteFolder,
    deleteFile,
    moveFolder,
    moveFile,
    saveNote,
    getFilePreview,
    explainText,
    summariseText
  };
}
