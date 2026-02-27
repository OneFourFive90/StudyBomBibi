import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    ArrowLeft,
    ArrowDown,
    ArrowUp,
    ChevronDown,
    Search,
    LayoutGrid,
    List,
    Plus,
    Folder,
    StickyNote,
    Upload
} from "lucide-react";
import { FolderRecord } from "@/lib/library/types";

export type LibrarySortKey = "name" | "type" | "time";

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
    showSortControls: boolean;
    sortLabel: string;
    sortBy: LibrarySortKey;
    sortOrder: "asc" | "desc";
    showSortDropdown: boolean;
    sortOptions: Array<{ key: LibrarySortKey; label: string }>;
    onToggleSortDropdown: () => void;
    onSortChange: (key: LibrarySortKey) => void;
    onToggleSortOrder: () => void;
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
    onUpload,
    showSortControls,
    sortLabel,
    sortBy,
    sortOrder,
    showSortDropdown,
    sortOptions,
    onToggleSortDropdown,
    onSortChange,
    onToggleSortOrder
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

                {showSortControls && (
                    <div className="flex items-center gap-2 border rounded-md bg-background">
                        <div className="relative">
                            <button
                                type="button"
                                onClick={onToggleSortDropdown}
                                className="inline-flex items-center justify-between gap-2 h-9 w-40 px-3 text-sm hover:bg-accent rounded-md"
                            >
                                <span className="truncate whitespace-nowrap">{sortLabel}</span>
                                <ChevronDown className="h-4 w-4 shrink-0" />
                            </button>

                            {showSortDropdown && (
                                <div className="absolute top-full left-0 mt-1 w-48 bg-background border rounded-md shadow-lg z-50">
                                    {sortOptions.map((option) => (
                                        <button
                                            key={option.key}
                                            onClick={() => onSortChange(option.key)}
                                            className={`w-full text-left px-4 py-2 text-sm hover:bg-accent truncate whitespace-nowrap ${sortBy === option.key ? "bg-primary/10 text-primary font-semibold" : ""}`}
                                        >
                                            {option.label}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="border-l h-6" />

                        <button
                            type="button"
                            onClick={onToggleSortOrder}
                            title={sortOrder === "asc" ? "Ascending" : "Descending"}
                            className="inline-flex items-center gap-1 h-9 px-3 text-sm hover:bg-accent rounded-md"
                        >
                            {sortOrder === "asc" ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
                        </button>
                    </div>
                )}

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
