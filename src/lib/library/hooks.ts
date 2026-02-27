import { useState, useEffect, useCallback } from "react";
import { FolderRecord, FileRecord } from "./types";
import { fetchFolders, fetchFiles } from "./service";
import { useAuth } from "@/context/AuthContext";

export function useLibraryData() {
  const { userId } = useAuth();
  const [folders, setFolders] = useState<FolderRecord[]>([]);
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!userId) return;
    setIsLoading(true);
    setError(null);
    try {
      const [fetchedFolders, fetchedFiles] = await Promise.all([
        fetchFolders(),
        fetchFiles(),
      ]);
      setFolders(fetchedFolders);
      setFiles(fetchedFiles);
    } catch (err) {
      console.error("Failed to load library data", err);
      setError("Failed to load library data");
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (userId) {
      refresh();
    }
  }, [userId, refresh]);

  return {
    folders,
    files,
    isLoading,
    error,
    refresh,
    setFolders,
    setFiles
  };
}
