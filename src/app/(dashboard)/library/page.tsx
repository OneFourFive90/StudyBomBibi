"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { StatusToast } from "@/components/ui/status-toast";
import { RenameModal } from "@/components/ui/rename-modal";
import { MovePickerModal } from "@/components/ui/move-picker-modal";
import { useToastMessage } from "@/hooks/use-toast-message";
import { UPLOAD_FILE_ACCEPT, isAllowedUploadFileType } from "@/lib/upload/fileTypePolicy";
import { Upload } from "lucide-react";

import { 
  Material, 
  FolderRecord, 
  FileRecord, 
  MaterialType, 
  PendingDeleteAction,
  PendingRenameAction,
  PendingMoveAction,
  DocumentPreviewKind
} from "@/lib/library/types";

import { 
  toFolderMaterial, 
  toFileMaterial, 
  getDocumentPreviewKind,
  getBlockedFolderIds,
  checkDuplicateNoteName,
  createDragGhost,
  getFilteredMaterials
} from "@/lib/library/utils";

import { useLibraryData } from "@/lib/library/hooks";
import { useLibraryActions } from "@/lib/library/actions";

import { LibraryHeader } from "../../../components/library/LibraryHeader";
import { CreateFolderInline } from "../../../components/library/CreateFolderInline";
import { ItemCard } from "../../../components/library/ItemCard";
import { ItemListItem } from "../../../components/library/ItemListItem";
import { SelectedItemPanel } from "../../../components/library/SelectedItemPanel";
import { NewNoteModal } from "../../../components/library/NewNoteModal";
import { UploadModal } from "../../../components/library/UploadModal";
import { DeleteConfirmationModal } from "../../../components/library/DeleteConfirmationModal";
import { AiResultModal } from "../../../components/library/AiResultModal";

export default function LibraryPage() {
  const { userId, loading: authLoading } = useAuth();
  
  const { 
      folders: allFolders, 
      files: allFiles, 
      isLoading: isLoadingLibrary, 
      refresh: loadLibraryData,
      setFiles: setAllFiles 
  } = useLibraryData();

  const {
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
      summariseText,
      actionLoading
  } = useLibraryActions(loadLibraryData);

  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<Material | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [isFullView, setIsFullView] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [showAddMenu, setShowAddMenu] = useState(false);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  
  const [pendingNewNoteName, setPendingNewNoteName] = useState<string | null>(null);
  const [pendingUploadFile, setPendingUploadFile] = useState<File | null>(null);
  const [pendingDelete, setPendingDelete] = useState<PendingDeleteAction | null>(null);
  const [pendingRename, setPendingRename] = useState<PendingRenameAction | null>(null);
  const [pendingMove, setPendingMove] = useState<PendingMoveAction | null>(null);

  const [isEditingNote, setIsEditingNote] = useState(false);
  const [noteSaveStatus, setNoteSaveStatus] = useState<"saved" | "unsaved" | "saving" | "error">("saved");
  const [noteBaselineContent, setNoteBaselineContent] = useState("");
  // editorRef moved to SelectedItemPanel

  const [docPreviewText, setDocPreviewText] = useState<string | null>(null);
  const [docPreviewStatus, setDocPreviewStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [docPreviewError, setDocPreviewError] = useState<string | null>(null);

  const [aiActionResult, setAiActionResult] = useState<{ title: string; content: string; originalText?: string } | null>(null);
  const [aiActionStatus, setAiActionStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);

  const { toast, showToast, clearToast, showLoading } = useToastMessage();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentFolder = allFolders.find((f) => f.id === currentFolderId);

  const displayedMaterials = getFilteredMaterials(allFolders, allFiles, currentFolderId, searchQuery);

  useEffect(() => {
    if (!authLoading && !userId) router.push("/login");
  }, [userId, authLoading, router]);

  // Handle selected item preview and note logic
  const lastSelectedItemIdRef = useRef<string | null>(null);

  useEffect(() => {
    // If no item selected, reset everything
    if (!selectedItem) {
        setDocPreviewStatus("idle");
        setDocPreviewText(null);
        setDocPreviewError(null);
        setIsEditingNote(false);
        setNoteSaveStatus("saved");
        setNoteBaselineContent("");
        lastSelectedItemIdRef.current = null;
        return;
    }

    // If we switched to a DIFFERENT item
    if (selectedItem.id !== lastSelectedItemIdRef.current) {
        lastSelectedItemIdRef.current = selectedItem.id;
        
        if (selectedItem.type === "Note") {
            setNoteBaselineContent(selectedItem.content || "");
            setIsEditingNote(false); // Reset editing state
            setNoteSaveStatus("saved");
        } 
        
        if (selectedItem.source === "file" && selectedItem.type !== "Note" && selectedItem.downloadURL) {
            const kind = getDocumentPreviewKind(selectedItem);
            if (kind === "text") {
                setDocPreviewStatus("loading");
                getFilePreview(selectedItem.id)
                    .then((data: any) => {
                        if (data && data.content) {
                          setDocPreviewText(data.content);
                          setDocPreviewStatus("ready");
                        } else {
                           throw new Error("Invalid preview data");
                        }
                    })
                    .catch(() => {
                        setDocPreviewError("Failed to load file content.");
                        setDocPreviewStatus("error");
                    });
            }
        }
    }
  }, [selectedItem, getFilePreview]);

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;

    const success = await createFolder(newFolderName.trim(), currentFolderId);
    if (success) {
      setNewFolderName("");
      setIsCreatingFolder(false);
    }
  };

  const handleCreateNote = () => {
    setPendingNewNoteName("New Note");
    setShowAddMenu(false);
  };

  const handleConfirmCreateNote = async () => {
    const noteName = pendingNewNoteName?.trim();
    if (!noteName) return;
    
    const success = await createNote(noteName, currentFolderId);
    if (success) {
        setPendingNewNoteName(null);
    }
  };

  const handleSelectUploadFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!isAllowedUploadFileType(file.type, file.name)) {
        showToast("File type not supported", "error");
        return;
    }

    setPendingUploadFile(file);
    event.target.value = "";
  };

  const handleConfirmUpload = async () => {
    const file = pendingUploadFile;
    if (!file) return;

    const success = await uploadFile(file, currentFolderId);
    if (success) {
        setPendingUploadFile(null);
        showToast("File uploaded successfully", "success");
    }
  };

  const handleRenameConfirm = async () => {
      if (!pendingRename) return;
      const { id, type, newName, currentName } = pendingRename;
      const trimmed = newName.trim();
      
      if (!trimmed || trimmed === currentName) {
        setPendingRename(null);
        return;
      }

      const success = type === "folder" 
        ? await renameFolder(id, trimmed)
        : await renameFile(id, trimmed);

      if (success) {
          setPendingRename(null);
          if (selectedItem && selectedItem.id === id) {
            setSelectedItem(prev => prev ? ({ ...prev, title: trimmed }) : null);
        }
      }
  };

  const handleDeleteConfirm = async () => {
      if (!pendingDelete) return;
      const { id, type } = pendingDelete;
      
      const success = type === "folder"
        ? await deleteFolder(id)
        : await deleteFile(id);

      if (success) {
          setPendingDelete(null);
          if (selectedItem && selectedItem.id === id) {
            setSelectedItem(null);
          }
      }
  };

  const handleMoveConfirm = async (targetId: string | null) => {
      if (!pendingMove) return;
      const { id, type } = pendingMove;
      // same folder check
      if (type === "folder" && id === targetId) return;

      const success = type === "folder" 
        ? await moveFolder(id, targetId)
        : await moveFile(id, targetId);

      if (success) {
          setPendingMove(null);
          if (selectedItem && selectedItem.id === id) {
              // Usually move clears selected item if it moves out of view? 
              // The original code set selectedItem null ONLY on Delete/MoveFile.
              // MoveFile original: setSelectedItem(null);
              // Let's implement that behavior.
              if (type !== 'folder') setSelectedItem(null);
          }
      }
  };
   // Drag and Drop
  const handleItemDragStart = (e: React.DragEvent, material: Material) => {
    e.dataTransfer.setData("application/json", JSON.stringify({ id: material.id, type: material.source }));
    e.dataTransfer.effectAllowed = "move";
    createDragGhost(e);
  };

  const handleItemDragOver = (e: React.DragEvent, material: Material) => {
    if (material.type === "Folder") {
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = "move";
        if (dragOverFolderId !== material.id) setDragOverFolderId(material.id);
    } else {
        if (dragOverFolderId) setDragOverFolderId(null);
    }
  };

  const handleItemDrop = async (e: React.DragEvent, targetFolder: Material) => {
      e.preventDefault();
      e.stopPropagation();
      setDragOverFolderId(null);
      if (targetFolder.type !== "Folder") {
          showToast("Cannot move into a file", "error");
          return;
      }

      try {
        const data = e.dataTransfer.getData("application/json");
        if (!data) return;
        const draggedItem = JSON.parse(data);
        if (draggedItem.id === targetFolder.id) {
            showToast("Cannot move into itself", "error");
            return;
        }
        
        const success = draggedItem.type === "folder"
          ? await moveFolder(draggedItem.id, targetFolder.id)
          : await moveFile(draggedItem.id, targetFolder.id);
          
      } catch (err) {
          showToast("Failed to move item", "error");
      }
  };

  const handleSaveCurrentNote = async () => {
    if (!selectedItem || selectedItem.type !== "Note") return;
    setNoteSaveStatus("saving");
    
    const success = await saveNote(selectedItem.id, selectedItem.content || "");
    if (success) {
        setNoteBaselineContent(selectedItem.content || "");
        setNoteSaveStatus("saved");
    } else {
        setNoteSaveStatus("error");
    }
  };

  const handleExplain = async (text: string) => {
    if (!selectedItem || selectedItem.type !== "Note") return;
    setAiActionStatus("loading");
    
    // Pass note content as context
    const explanation = await explainText(text, selectedItem.content);
    
    if (explanation && typeof explanation === 'string') {
      setAiActionResult({ title: "Explanation", content: explanation, originalText: text });
      setAiActionStatus("success");
    } else {
      setAiActionStatus("error");
    }
  };

  const handleSummarise = async (text: string) => {
    if (!selectedItem || selectedItem.type !== "Note") return;
    setAiActionStatus("loading");
    
    const summary = await summariseText(text, selectedItem.content);
    
    if (summary && typeof summary === 'string') {
      setAiActionResult({ title: "Summary", content: summary, originalText: text });
      setAiActionStatus("success");
    } else {
      setAiActionStatus("error");
    }
  };
  
  const handleUpdateNoteContent = (content: string) => {
      if (!selectedItem) return;
      const updated = { ...selectedItem, content };
      setSelectedItem(updated);
      setNoteSaveStatus(content === noteBaselineContent ? "saved" : "unsaved");
      setAllFiles(prev => prev.map(f => f.id === updated.id ? { ...f, extractedText: content } : f));
  };

  const handleDiscardNote = () => {
      if (!selectedItem) return;
      const updated = { ...selectedItem, content: noteBaselineContent };
      setSelectedItem(updated);
      handleUpdateNoteContent(noteBaselineContent);
      setNoteSaveStatus("saved");
  };

  const isNewNoteNameDuplicate = checkDuplicateNoteName(pendingNewNoteName, currentFolderId, allFolders, allFiles);

  return (
    <div className="flex flex-col md:flex-row h-full gap-0 relative overflow-hidden" onClick={() => setShowAddMenu(false)}>
      <StatusToast toast={toast} onClose={clearToast} />

      {(pendingUploadFile || pendingNewNoteName || pendingDelete || pendingRename || pendingMove) && (
        <div className="fixed inset-0 z-[9997] bg-black/20 backdrop-blur-[1px]" />
      )}

      <NewNoteModal 
        isOpen={pendingNewNoteName !== null}
        pendingName={pendingNewNoteName || ""}
        onNameChange={setPendingNewNoteName}
        onConfirm={() => void handleConfirmCreateNote()}
        onCancel={() => setPendingNewNoteName(null)}
        isDuplicate={isNewNoteNameDuplicate}
        loading={loading}
      />

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
        onValueChange={(value) => setPendingRename(prev => prev ? { ...prev, newName: value } : prev)}
        onConfirm={() => void handleRenameConfirm()}
        onCancel={() => setPendingRename(null)}
      />

      <MovePickerModal
        key={pendingMove ? `${pendingMove.type}:${pendingMove.id}:${pendingMove.currentParentId ?? "root"}` : "move-closed"}
        open={Boolean(pendingMove)}
        targetType={pendingMove?.type ?? "file"}
        currentParentId={pendingMove?.currentParentId ?? null}
        folders={allFolders.map(f => ({ id: f.id, name: f.name, path: f.path, parentFolderId: f.parentFolderId }))}
        blockedFolderIds={getBlockedFolderIds(pendingMove, allFolders)}
        loading={loading}
        onConfirm={(targetId) => void handleMoveConfirm(targetId)}
        onCancel={() => setPendingMove(null)}
      />

      <UploadModal 
        file={pendingUploadFile}
        currentFolderName={currentFolder?.name}
        onConfirm={() => void handleConfirmUpload()}
        onCancel={() => setPendingUploadFile(null)}
        loading={loading}
      />

      <DeleteConfirmationModal
        pendingDelete={pendingDelete}
        onConfirm={() => void handleDeleteConfirm()}
        onCancel={() => setPendingDelete(null)}
        loading={loading}
      />

      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={handleSelectUploadFile}
        accept={UPLOAD_FILE_ACCEPT}
      />

      <div 
        className="flex-1 flex flex-col min-w-0 h-full overflow-hidden px-4 relative"
        onDragOver={(e) => {
            e.preventDefault(); 
            e.stopPropagation();
            if (e.dataTransfer.types.includes("Files")) setIsDraggingOver(true);
        }}
        onDragLeave={(e) => {
            e.preventDefault(); 
            e.stopPropagation();
            if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsDraggingOver(false);
        }}
        onDrop={(e) => {
            e.preventDefault(); 
            e.stopPropagation(); 
            setIsDraggingOver(false);
            const file = e.dataTransfer.files?.[0];
            if (file) {
                 if (!isAllowedUploadFileType(file.type, file.name)) {
                    showToast("File type not supported", "error");
                } else {
                    setPendingUploadFile(file);
                }
            }
        }}
      >
        {isDraggingOver && (
          <div className="absolute inset-4 z-50 bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center border-2 border-dashed border-primary rounded-lg pointer-events-none animate-in fade-in zoom-in-95 duration-200">
            <Upload className="h-12 w-12 text-primary mb-4" />
            <p className="text-xl font-medium text-primary">Drop file here to upload</p>
          </div>
        )}

        <LibraryHeader 
            currentFolder={currentFolder}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            showAddMenu={showAddMenu}
            onToggleAddMenu={() => setShowAddMenu(prev => !prev)}
            onNavigateBack={() => setCurrentFolderId(null)}
            onCreateFolder={() => { setIsCreatingFolder(true); setShowAddMenu(false); }}
            onCreateNote={handleCreateNote}
            onUpload={() => { fileInputRef.current?.click(); setShowAddMenu(false); }}
        />

        <div className="flex-1 overflow-y-auto pt-6">
            {error && <p className="mb-4 text-sm text-destructive">{error}</p>}
            
            <CreateFolderInline 
                isOpen={isCreatingFolder}
                folderName={newFolderName}
                onFolderNameChange={setNewFolderName}
                onCreate={() => void handleCreateFolder()}
                onCancel={() => setIsCreatingFolder(false)}
                loading={loading}
            />

            {viewMode === "grid" ? (
                <div className={`grid gap-6 pb-8 ${selectedItem ? "grid-cols-1 lg:grid-cols-2" : "md:grid-cols-2 lg:grid-cols-3"}`}>
                    {displayedMaterials.map(material => (
                        <ItemCard 
                            key={material.id}
                            material={material}
                            isDragOver={dragOverFolderId === material.id}
                            onDragStart={handleItemDragStart}
                            onDragOver={handleItemDragOver}
                            onDragLeave={() => setDragOverFolderId(null)}
                            onDrop={handleItemDrop}
                            onClick={(m) => m.type === "Folder" ? setCurrentFolderId(m.id) : setSelectedItem(m)}
                            onRename={(m) => m.source === "folder" 
                                ? setPendingRename({ id: m.id, type: "folder", parentId: m.parentId, currentName: m.title, newName: m.title }) 
                                : setPendingRename({ id: m.id, type: "file", parentId: m.parentId, currentName: m.title, newName: m.title })}
                            onMove={(m) => setPendingMove({ id: m.id, type: m.source === "folder" ? "folder" : "file", currentParentId: m.parentId })}
                            onDelete={(m) => setPendingDelete({ id: m.id, type: m.source === "folder" ? "folder" : "file", label: m.title })}
                        />
                    ))}
                </div>
            ) : (
                <div className="flex flex-col space-y-2 pb-8">
                     <div className="flex items-center px-4 py-2 text-sm text-muted-foreground font-medium border-b">
                         <div className="w-[40px]"></div>
                         <div className="flex-1 min-w-0">Name</div>
                         <div className="w-[120px]">Type</div>
                         <div className="w-[150px] hidden md:block">Author</div>
                         <div className="w-[40px]"></div>
                     </div>
                     {displayedMaterials.map(material => (
                         <ItemListItem 
                             key={material.id}
                             material={material}
                             isDragOver={dragOverFolderId === material.id}
                             onDragStart={handleItemDragStart}
                             onDragOver={handleItemDragOver}
                             onDragLeave={() => setDragOverFolderId(null)}
                             onDrop={handleItemDrop}
                             onClick={(m) => m.type === "Folder" ? setCurrentFolderId(m.id) : setSelectedItem(m)}
                             onRename={(m) => m.source === "folder" 
                                 ? setPendingRename({ id: m.id, type: "folder", parentId: m.parentId, currentName: m.title, newName: m.title }) 
                                 : setPendingRename({ id: m.id, type: "file", parentId: m.parentId, currentName: m.title, newName: m.title })}
                             onMove={(m) => setPendingMove({ id: m.id, type: m.source === "folder" ? "folder" : "file", currentParentId: m.parentId })}
                             onDelete={(m) => setPendingDelete({ id: m.id, type: m.source === "folder" ? "folder" : "file", label: m.title })}
                         />
                     ))}
                </div>
            )}
        </div>
      </div>

      {selectedItem && (
          <SelectedItemPanel 
              selectedItem={selectedItem}
              onClose={() => setSelectedItem(null)}
              isFullView={isFullView}
              onToggleFullView={() => setIsFullView(!isFullView)}
              isEditingNote={isEditingNote}
              onSetIsEditing={setIsEditingNote}
              onUpdateNoteContent={handleUpdateNoteContent}
              noteSaveStatus={noteSaveStatus}
              onSaveNote={() => void handleSaveCurrentNote()}
              onDiscardNote={handleDiscardNote}
              noteBaselineContent={noteBaselineContent}
              onRename={(id, name) => setPendingRename({ id, type: "file", parentId: selectedItem.parentId, currentName: selectedItem.title, newName: name })}
              onMove={(id) => setPendingMove({ id, type: "file", currentParentId: selectedItem.parentId })}
              onDelete={(id) => setPendingDelete({ id, type: "file", label: selectedItem.title })}
              onNavigateToFile={(fileId) => {
                  const target = allFiles.find(f => f.id === fileId); // Check files
                  if (target) {
                      setSelectedItem(toFileMaterial(target));
                  } else {
                      // Check folders if needed, but usually files are previewed
                      // Also might need to fetch if not in current list?
                      // Assuming all files are loaded in `allFiles`
                  }
              }}
              previewKind={getDocumentPreviewKind(selectedItem)}
              previewStatus={docPreviewStatus}
              previewText={docPreviewText}
              previewError={docPreviewError}
              onAiExplain={handleExplain}
              onAiSummarise={handleSummarise}
              attachedFiles={selectedItem.attachedFileIds?.map(id => {
                  const file = allFiles.find(f => f.id === id);
                  if (file) return { id: file.id, title: file.originalName, type: file.mimeType };
                  return null;
              }).filter((f): f is { id: string; title: string; type: string } => f !== null) || []}
          />
      )}

      <AiResultModal 
        result={aiActionResult} 
        isLoading={aiActionStatus === "loading"}
        onClose={() => {
            setAiActionResult(null);
            setAiActionStatus("idle");
        }}
        onAskAi={() => {
            if (!aiActionResult) return;
            const context = {
                noteContent: selectedItem?.content || "",
                resultContent: aiActionResult.content,
                sourceTitle: selectedItem?.title || "Unknown Source",
                sourceId: selectedItem?.id,
                sourceType: selectedItem?.type || "Note", // Added sourceType
                actionType: aiActionResult.title, // "Summary" or "Explanation"
                sourceSnippet: aiActionResult.originalText
            };
            sessionStorage.setItem("assistantContext", JSON.stringify(context));
            router.push("/assistant");
        }}
      />

    </div>
  );
}
