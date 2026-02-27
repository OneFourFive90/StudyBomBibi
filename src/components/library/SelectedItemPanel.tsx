import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
    Maximize2,
    Minimize2,
    X,
    Eye,
    Pencil,
    Sparkles,
    List,
    Highlighter,
    MoreVertical,
    PenLine,
    FolderInput,
    Trash2,
    ExternalLink,
    FileText
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Material, DocumentPreviewKind } from "@/lib/library/types";
import { FilePreview } from "./FilePreview";

interface SelectedItemPanelProps {
    selectedItem: Material;
    onClose: () => void;
    isFullView: boolean;
    onToggleFullView: () => void;
    
    // Note specific props
    isEditingNote: boolean;
    onSetIsEditing: (isEditing: boolean) => void;
    onUpdateNoteContent: (content: string) => void;
    noteSaveStatus: "saved" | "unsaved" | "saving" | "error";
    onSaveNote: () => void;
    onDiscardNote: () => void;
    noteBaselineContent: string;

    // File actions
    onRename: (id: string, name: string) => void;
    onMove: (id: string) => void;
    onDelete: (id: string) => void;
    
    // Navigation
    onNavigateToFile?: (fileId: string) => void;

    // Preview props
    previewKind: DocumentPreviewKind;
    previewStatus: "idle" | "loading" | "ready" | "error";
    previewText: string | null;
    previewError: string | null;

    // AI handlers
    onAiExplain: (text: string) => void;
    onAiSummarise: (text: string) => void;

    // Attached Sources (for notes)
    attachedFiles?: Array<{ id: string; title: string; type: string; }>;
}

import { NoteEditor } from "./NoteEditor";

export function SelectedItemPanel({
    selectedItem,
    onClose,
    isFullView,
    onToggleFullView,
    isEditingNote,
    onSetIsEditing,
    onUpdateNoteContent,
    noteSaveStatus,
    onSaveNote,
    onDiscardNote,
    noteBaselineContent,
    onRename,
    onMove,
    onDelete,
    onNavigateToFile,
    previewKind,
    previewStatus,
    previewText,
    previewError,
    onAiExplain,
    onAiSummarise,
    attachedFiles = []
}: SelectedItemPanelProps) {
    const editorRef = useRef<HTMLElement | null>(null);
    const [contextMenuSelection, setContextMenuSelection] = useState<{ text: string; rect: DOMRect } | null>(null);

    const handleTextSelection = () => {
        const selection = window.getSelection();
        if (!selection || selection.isCollapsed) {
            setContextMenuSelection(null);
            return;
        }
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
            setContextMenuSelection({
                text: selection.toString(),
                rect: rect,
            });
        }
    };

    const handleHighlight = () => {
        if (!contextMenuSelection || selectedItem.type !== "Note") return;
        
        const textToHighlight = contextMenuSelection.text;
        const currentContent = selectedItem.content || "";
        
        if (currentContent.includes(textToHighlight)) {
            const newContent = currentContent.replace(textToHighlight, `<mark>${textToHighlight}</mark>`);
            onUpdateNoteContent(newContent);
            setContextMenuSelection(null);
        }
    };

    const getIcon = (type: string) => {
         // Keep it simple or pass as prop if needed.
         // Duplicating small logic is fine to decouple.
         switch (type) {
            case "Note": return <Pencil className="h-5 w-5 text-yellow-500 mr-2" />;
            default: return <FileText className="h-5 w-5 text-blue-500 mr-2" />;
         }
    };

    return (
        <>
            <div
                className="md:hidden fixed inset-0 z-40 bg-background/80 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            <div
                className={`
              fixed inset-y-0 right-0 z-50 bg-background shadow-2xl animate-in slide-in-from-right duration-300 flex flex-col h-full border-l
              ${isFullView ? "w-full" : "w-full md:relative md:w-1/3 md:shrink-0 md:shadow-none"}
            `}
            >
                <div className="flex items-center justify-between p-6 border-b">
                    <div className="flex items-center gap-3 overflow-hidden">
                        {getIcon(selectedItem.type)}
                        <h2 className="text-xl font-semibold break-words">{selectedItem.title}</h2>
                    </div>
                    <div className="flex gap-1">
                        {selectedItem.type === "Note" && (
                            <div className="bg-muted p-1 rounded-lg flex gap-1 mr-2">
                                <Button
                                    variant={!isEditingNote ? "secondary" : "ghost"}
                                    size="sm"
                                    className="h-7 w-7 p-0"
                                    onClick={() => onSetIsEditing(false)}
                                    title="View Mode"
                                >
                                    <Eye className="h-4 w-4" />
                                </Button>
                                <Button
                                    variant={isEditingNote ? "secondary" : "ghost"}
                                    size="sm"
                                    className="h-7 w-7 p-0"
                                    onClick={() => onSetIsEditing(true)}
                                    title="Edit Mode"
                                >
                                    <Pencil className="h-4 w-4" />
                                </Button>
                            </div>
                        )}
                        <Button
                            variant="ghost"
                            size="icon"
                            className="hidden md:inline-flex"
                            onClick={onToggleFullView}
                            title={isFullView ? "Collapse" : "Expand"}
                        >
                            {isFullView ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={onClose}
                        >
                            <X className="h-5 w-5" />
                        </Button>
                    </div>
                </div>

                <div 
                    className="flex-1 p-6 overflow-y-auto" 
                    onMouseUp={handleTextSelection} 
                    onKeyUp={handleTextSelection} 
                    onScroll={() => setContextMenuSelection(null)}
                >
                    {attachedFiles && attachedFiles.length > 0 && (
                        <div className="mb-6 flex flex-wrap gap-2 pb-4 border-b">
                            <span className="text-xs font-semibold text-muted-foreground w-full mb-1">Sources:</span>
                            {attachedFiles.map((file) => (
                                <button
                                    key={file.id}
                                    onClick={() => onNavigateToFile?.(file.id)}
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted/50 hover:bg-muted text-xs font-medium transition-colors border border-transparent hover:border-border"
                                    title="View Source"
                                >
                                    <FileText className="h-3 w-3 text-blue-500" />
                                    <span className="truncate max-w-[200px]">{file.title}</span>
                                    <ExternalLink className="h-3 w-3 opacity-50" />
                                </button>
                            ))}
                        </div>
                    )}

                    {selectedItem.type === "Note" ? (
                        <NoteEditor 
                            item={selectedItem}
                            isEditing={isEditingNote}
                            onContentChange={onUpdateNoteContent}
                            onBlur={(content) => {
                                if (content !== selectedItem.content) {
                                   onUpdateNoteContent(content);
                                }
                            }}
                            // @ts-ignore
                            editorRef={editorRef}
                            noteBaselineContent={noteBaselineContent}
                            onLinkClick={(href) => {
                                if (href.startsWith("study://file/")) {
                                    const fileId = href.split("study://file/")[1];
                                    onNavigateToFile?.(fileId);
                                }
                            }}
                        />
                    ) : (
                        <FilePreview 
                            item={selectedItem}
                            kind={previewKind}
                            status={previewStatus}
                            text={previewText}
                            error={previewError}
                        />
                    )}
                </div>

                {contextMenuSelection && (
                    <div
                        className="fixed bg-background border rounded-lg shadow-xl p-1.5 flex items-center gap-1 z-50 animate-in fade-in zoom-in-95 duration-200"
                        style={{
                            top: contextMenuSelection.rect.top - 48,
                            left: Math.max(16, contextMenuSelection.rect.left),
                        }}
                        onMouseDown={(e) => e.preventDefault()}
                    >
                        <Button variant="ghost" size="sm" onClick={() => onAiExplain(contextMenuSelection.text)} className="h-8 px-2 text-xs font-normal">
                            <Sparkles className="h-3.5 w-3.5 mr-1.5 text-yellow-500" />
                            Explain
                        </Button>
                        <div className="w-px h-4 bg-border mx-0.5" />
                        <Button variant="ghost" size="sm" onClick={() => onAiSummarise(contextMenuSelection.text)} className="h-8 px-2 text-xs font-normal">
                            <List className="h-3.5 w-3.5 mr-1.5 text-blue-500" />
                            Summarise
                        </Button>

                        {isEditingNote && (
                            <>
                                <div className="w-px h-4 bg-border mx-0.5" />
                                <Button variant="ghost" size="sm" onClick={handleHighlight} className="h-8 px-2 text-xs font-normal">
                                    <Highlighter className="h-3.5 w-3.5 mr-1.5 text-green-500" />
                                    Highlight
                                </Button>
                            </>
                        )}
                    </div>
                )}

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
                    <div className="flex gap-2 justify-end items-center">
                        {selectedItem.type === "Note" && (selectedItem.content || "") !== noteBaselineContent && (
                            <>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={onDiscardNote}
                                    className="text-muted-foreground hover:text-foreground"
                                >
                                    Discard
                                </Button>
                                <Button
                                    size="sm"
                                    onClick={onSaveNote}
                                >
                                    Save Changes
                                </Button>
                            </>
                        )}
                        {selectedItem.source === "file" && (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" size="sm">
                                        <MoreVertical className="h-4 w-4" />
                                        <span className="sr-only">Actions</span>
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                    <DropdownMenuItem onClick={() => onRename(selectedItem.id, selectedItem.title)}>
                                        <PenLine className="h-4 w-4 mr-2" /> Rename
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => onMove(selectedItem.id)}>
                                        <FolderInput className="h-4 w-4 mr-2" /> Move
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => onDelete(selectedItem.id)}>
                                        <Trash2 className="h-4 w-4 mr-2" /> Delete
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}
                        {selectedItem.source === "file" && selectedItem.type !== "Note" && selectedItem.downloadURL && (
                            <a href={selectedItem.downloadURL} target="_blank" rel="noreferrer" className="inline-flex">
                                <Button variant="outline" size="sm" className="gap-2">
                                    <ExternalLink className="h-4 w-4" /> Open File
                                </Button>
                            </a>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
