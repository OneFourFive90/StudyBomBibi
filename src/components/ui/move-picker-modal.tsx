"use client";

import { useMemo, useState } from "react";
import { 
  ArrowUp, 
  Folder, 
  HardDrive, 
  ChevronRight, 
  X,
  FolderOpen
} from "lucide-react";
import { Button } from "@/components/ui/button";

export interface MoveFolderOption {
  id: string;
  name: string;
  path: string[];
  parentFolderId: string | null;
}

interface MovePickerModalProps {
  open: boolean;
  targetType: "file" | "folder";
  currentParentId: string | null;
  folders: MoveFolderOption[];
  blockedFolderIds?: string[];
  loading?: boolean;
  onConfirm: (destinationFolderId: string | null) => void;
  onCancel: () => void;
}

export function MovePickerModal({
  open,
  targetType,
  currentParentId,
  folders,
  blockedFolderIds = [],
  loading = false,
  onConfirm,
  onCancel,
}: MovePickerModalProps) {
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(currentParentId);
  const [viewFolderId, setViewFolderId] = useState<string | null>(currentParentId);

  const blockedSet = useMemo(() => new Set(blockedFolderIds), [blockedFolderIds]);

  const folderMap = useMemo(
    () => new Map(folders.map((folder) => [folder.id, folder])),
    [folders]
  );

  const availableFolders = useMemo(
    () =>
      folders
        .filter((folder) => !blockedSet.has(folder.id))
        .sort((a, b) => a.path.join(" /").localeCompare(b.path.join(" /"))),
    [folders, blockedSet]
  );

  const rootFolders = useMemo(
    () => availableFolders.filter((folder) => folder.parentFolderId === null),
    [availableFolders]
  );

  const currentChildren = useMemo(
    () => availableFolders.filter((folder) => folder.parentFolderId === viewFolderId),
    [availableFolders, viewFolderId]
  );

  const currentViewPath = useMemo(() => {
    if (!viewFolderId) return "Root";
    const folder = folderMap.get(viewFolderId);
    return folder ? `Root / ${folder.path.join(" / ")}` : "Root";
  }, [viewFolderId, folderMap]);

  const selectedDestinationText = useMemo(() => {
    if (!selectedFolderId) return "Root";
    const folder = folderMap.get(selectedFolderId);
    return folder ? `Root / ${folder.path.join(" / ")}` : "Root";
  }, [selectedFolderId, folderMap]);

  const goUp = () => {
    if (!viewFolderId) return;
    const current = folderMap.get(viewFolderId);
    setViewFolderId(current?.parentFolderId ?? null);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-[min(95vw,800px)] flex flex-col bg-card border rounded-xl shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden">
        
        {/* --- Header --- */}
        <div className="flex items-center justify-between px-5 py-4 border-b bg-muted/10">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">
              Move {targetType}
            </h2>
            <p className="text-sm text-muted-foreground">
              Select a destination folder
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={onCancel} className="h-8 w-8 rounded-full">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* --- Body --- */}
        <div className="flex flex-col p-5 gap-4">
          
          {/* Toolbar */}
          <div className="flex items-center gap-3 p-2 border rounded-lg bg-muted/10">
            <Button 
              type="button" 
              size="icon" 
              variant="outline" 
              className="h-8 w-8 shrink-0"
              onClick={goUp} 
              disabled={!viewFolderId || loading}
            >
              <ArrowUp className="h-4 w-4" />
            </Button>
            <div className="text-sm font-medium text-foreground truncate select-none">
              {currentViewPath}
            </div>
          </div>

          {/* Two-Pane Explorer */}
          <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] border rounded-lg overflow-hidden h-[40vh] min-h-[300px]">
            
            {/* Left Pane: Quick Access / Roots */}
            <div className="bg-muted/30 border-r overflow-y-auto p-2 space-y-1">
              <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Locations
              </div>
              <button
                type="button"
                className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors flex items-center gap-2.5 ${
                  viewFolderId === null 
                    ? "bg-primary text-primary-foreground shadow-sm" 
                    : "hover:bg-muted text-foreground"
                }`}
                onClick={() => setViewFolderId(null)}
              >
                <HardDrive className="h-4 w-4 shrink-0" /> 
                <span className="truncate">Root</span>
              </button>
              
              {rootFolders.length > 0 && (
                <div className="pt-2 px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Root Folders
                </div>
              )}
              {rootFolders.map((folder) => (
                <button
                  key={folder.id}
                  type="button"
                  className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors flex items-center gap-2.5 ${
                    viewFolderId === folder.id 
                      ? "bg-primary text-primary-foreground shadow-sm" 
                      : "hover:bg-muted text-foreground"
                  }`}
                  onClick={() => setViewFolderId(folder.id)}
                >
                  {viewFolderId === folder.id ? (
                    <FolderOpen className="h-4 w-4 shrink-0" />
                  ) : (
                    <Folder className="h-4 w-4 shrink-0" />
                  )}
                  <span className="truncate">{folder.name}</span>
                </button>
              ))}
            </div>

            {/* Right Pane: Current Folder Contents */}
            <div className="bg-background overflow-y-auto p-2 space-y-1 relative">
              {/* Option to select the current viewed directory itself */}
              <button
                type="button"
                className={`w-full text-left px-3 py-2.5 rounded-md text-sm transition-colors flex items-center justify-between group ${
                  selectedFolderId === viewFolderId 
                    ? "bg-primary/10 text-primary font-medium" 
                    : "hover:bg-muted"
                }`}
                onClick={() => setSelectedFolderId(viewFolderId)}
              >
                <div className="flex items-center gap-2.5">
                  <FolderOpen className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-foreground transition-colors" />
                  <span>Current Folder ({viewFolderId === null ? "Root" : "Here"})</span>
                </div>
              </button>

              {currentChildren.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-sm opacity-60 pb-10">
                  <Folder className="h-10 w-10 mb-2 stroke-1" />
                  No subfolders here
                </div>
              ) : (
                currentChildren.map((folder) => {
                  const isSelected = selectedFolderId === folder.id;
                  return (
                    <div 
                      key={folder.id}
                      className={`flex items-center justify-between rounded-md text-sm transition-colors group ${
                        isSelected ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted"
                      }`}
                    >
                      <button
                        type="button"
                        className="flex-1 text-left px-3 py-2.5 flex items-center gap-2.5 truncate"
                        onClick={() => setSelectedFolderId(folder.id)}
                        onDoubleClick={() => setViewFolderId(folder.id)}
                      >
                        <Folder className={`h-4 w-4 shrink-0 ${isSelected ? "text-primary" : "text-muted-foreground group-hover:text-foreground"}`} />
                        <span className="truncate">{folder.name}</span>
                      </button>
                      
                      {/* Navigate Into Button - Discoverable alternative to double click */}
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className={`h-8 w-8 mr-1 rounded-full shrink-0 ${isSelected ? "text-primary hover:bg-primary/20 hover:text-primary" : "text-muted-foreground opacity-0 group-hover:opacity-100"}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setViewFolderId(folder.id);
                        }}
                        title={`Open ${folder.name}`}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* --- Footer --- */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-5 py-4 border-t bg-muted/10">
          <div className="text-sm truncate w-full sm:w-auto">
            <span className="text-muted-foreground">Destination: </span>
            <span className="font-medium" title={selectedDestinationText}>
              {selectedDestinationText}
            </span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <Button variant="outline" onClick={onCancel} disabled={loading} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button onClick={() => onConfirm(selectedFolderId)} disabled={loading} className="w-full sm:w-auto">
              Move Here
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}