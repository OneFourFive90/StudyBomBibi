import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreVertical, PenLine, FolderInput, Trash2, Book, FileText, StickyNote, Folder } from "lucide-react";
import { Material, MaterialType } from "@/lib/library/types";

interface ItemListItemProps {
    material: Material;
    isDragOver: boolean;
    onDragStart: (e: React.DragEvent, material: Material) => void;
    onDragOver: (e: React.DragEvent, material: Material) => void;
    onDragLeave: (e: React.DragEvent) => void;
    onDrop: (e: React.DragEvent, material: Material) => void;
    onClick: (material: Material) => void;
    onRename: (material: Material) => void;
    onMove: (material: Material) => void;
    onDelete: (material: Material) => void;
}

const getIcon = (type: MaterialType) => {
    switch (type) {
        case "Folder": return <Folder className="h-5 w-5 text-blue-500" />;
        case "Note": return <StickyNote className="h-5 w-5 text-yellow-500" />;
        case "PDF": return <Book className="h-5 w-5 text-red-500" />;
        default: return <FileText className="h-5 w-5 text-gray-500" />;
    }
}

export function ItemListItem({
    material,
    isDragOver,
    onDragStart,
    onDragOver,
    onDragLeave,
    onDrop,
    onClick,
    onRename,
    onMove,
    onDelete
}: ItemListItemProps) {
    return (
        <div
            draggable
            onDragStart={(e) => onDragStart(e, material)}
            onDragOver={(e) => onDragOver(e, material)}
            onDragLeave={onDragLeave}
            onDrop={(e) => onDrop(e, material)}
            className={`flex items-center px-4 py-3 border rounded-lg hover:bg-muted/50 cursor-pointer group transition-colors ${
                isDragOver ? "ring-2 ring-primary bg-primary/10" : ""
            }`}
            onClick={() => onClick(material)}
        >
            <div className="w-[40px] flex justify-center shrink-0">
                <div className="bg-background rounded-md border shadow-sm p-1.5 shrink-0">
                    {getIcon(material.type)}
                </div>
            </div>
            <div className="flex-1 min-w-0 px-4">
                <div className="font-medium truncate">{material.title}</div>
            </div>
            <div className="w-[120px] text-sm text-muted-foreground shrink-0 flex items-center">
                <span className="inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold bg-secondary text-secondary-foreground">
                    {material.type}
                </span>
            </div>
            <div className="w-[150px] hidden md:block text-sm text-muted-foreground truncate shrink-0">
                {material.author || "Unknown"}
            </div>
            <div className="w-[40px] flex justify-end shrink-0" onClick={(event) => event.stopPropagation()}>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity data-[state=open]:opacity-100">
                            <MoreVertical className="h-4 w-4" />
                            <span className="sr-only">Actions</span>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => onRename(material)}>
                            <PenLine className="h-4 w-4 mr-2" /> Rename
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onMove(material)}>
                            <FolderInput className="h-4 w-4 mr-2" /> Move to
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => onDelete(material)}
                        >
                            <Trash2 className="h-4 w-4 mr-2" /> Delete
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>
    );
}
