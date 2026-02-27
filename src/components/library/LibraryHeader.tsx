import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    ArrowLeft,
    Search,
    LayoutGrid,
    List,
    Plus,
    Folder,
    StickyNote,
    Upload
} from "lucide-react";
import { FolderRecord } from "@/lib/library/types";

interface LibraryHeaderProps {
    currentFolder: FolderRecord | undefined;
    searchQuery: string;
    onSearchChange: (value: string) => void;
    viewMode: "grid" | "list";
    onViewModeChange: (mode: "grid" | "list") => void;
    showAddMenu: boolean;
    onToggleAddMenu: () => void;
    onNavigateBack: () => void;
    onCreateFolder: () => void;
    onCreateNote: () => void;
    onUpload: () => void;
}

export function LibraryHeader({
    currentFolder,
    searchQuery,
    onSearchChange,
    viewMode,
    onViewModeChange,
    showAddMenu,
    onToggleAddMenu,
    onNavigateBack,
    onCreateFolder,
    onCreateNote,
    onUpload
}: LibraryHeaderProps) {
    return (
        <div className="flex-none flex flex-col gap-4 md:flex-row md:items-center md:justify-between pb-4 border-b shrink-0">
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    {currentFolder && (
                        <Button variant="ghost" size="icon" onClick={onNavigateBack} className="shrink-0">
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                    )}
                    <h1 className="text-3xl font-bold tracking-tight truncate">{currentFolder ? currentFolder.name : "Library"}</h1>
                </div>
                <p className="text-muted-foreground mt-2 truncate">
                    {currentFolder ? "Folder contents" : "Manage your study materials and notes."}
                </p>
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto">
                <div className="relative flex-1 md:w-64 md:flex-none">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search materials..."
                        className="pl-8"
                        value={searchQuery}
                        onChange={(event) => onSearchChange(event.target.value)}
                    />
                </div>

                <div className="flex bg-muted rounded-lg p-1 shrink-0">
                    <Button
                        variant={viewMode === "grid" ? "secondary" : "ghost"}
                        size="sm"
                        className="h-8 px-2"
                        onClick={() => onViewModeChange("grid")}
                        title="Grid View"
                    >
                        <LayoutGrid className="h-4 w-4" />
                    </Button>
                    <Button
                        variant={viewMode === "list" ? "secondary" : "ghost"}
                        size="sm"
                        className="h-8 px-2"
                        onClick={() => onViewModeChange("list")}
                        title="List View"
                    >
                        <List className="h-4 w-4" />
                    </Button>
                </div>

                <div className="relative" onClick={(event) => event.stopPropagation()}>
                    <Button className="gap-2" onClick={onToggleAddMenu}>
                        <Plus className="h-4 w-4" /> Add New
                    </Button>

                    {showAddMenu && (
                        <div className="absolute right-0 top-12 w-48 bg-popover border rounded-md shadow-md z-50 animate-in fade-in zoom-in-95 duration-200">
                            <div className="p-1">
                                <Button
                                    variant="ghost"
                                    className="w-full justify-start gap-2 text-sm"
                                    onClick={onCreateFolder}
                                >
                                    <Folder className="h-4 w-4 text-blue-500" /> New Folder
                                </Button>
                                <Button variant="ghost" className="w-full justify-start gap-2 text-sm" onClick={onCreateNote}>
                                    <StickyNote className="h-4 w-4 text-yellow-500" /> New Note
                                </Button>
                                <Button variant="ghost" className="w-full justify-start gap-2 text-sm" onClick={onUpload}>
                                    <Upload className="h-4 w-4 text-green-500" /> Upload File
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
