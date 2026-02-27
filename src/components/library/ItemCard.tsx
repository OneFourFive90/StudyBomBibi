import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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

interface ItemCardProps {
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

export function ItemCard({
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
}: ItemCardProps) {
    return (
        <Card
            draggable
            onDragStart={(e) => onDragStart(e, material)}
            onDragOver={(e) => onDragOver(e, material)}
            onDragLeave={onDragLeave}
            onDrop={(e) => onDrop(e, material)}
            className={`hover:bg-muted/50 transition-colors cursor-pointer group flex flex-col min-w-0 relative ${
                isDragOver ? "ring-2 ring-primary bg-primary/10" : ""
            }`}
            onClick={() => onClick(material)}
        >
            <CardHeader className="flex flex-row items-center gap-4 pb-2 space-y-0 relative">
                <div className="p-2 bg-background rounded-md border shadow-sm group-hover:border-primary/50 transition-colors shrink-0">
                    {getIcon(material.type)}
                </div>
                <div className="flex flex-col min-w-0 flex-1">
                    <CardTitle className="text-base font-medium leading-snug break-words line-clamp-2">{material.title}</CardTitle>
                    <CardDescription className="text-sm mt-1 break-words">{material.author || "Unknown Author"}</CardDescription>
                </div>
            </CardHeader>
            <CardContent className="relative pb-8">
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <span className="inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold bg-secondary text-secondary-foreground shrink-0">
                        {material.type}
                    </span>
                </div>
                <div className="absolute bottom-2 right-2" onClick={(event) => event.stopPropagation()}>
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
            </CardContent>
        </Card>
    );
}
