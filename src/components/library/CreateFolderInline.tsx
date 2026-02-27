import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Folder } from "lucide-react";

interface CreateFolderInlineProps {
    isOpen: boolean;
    folderName: string;
    onFolderNameChange: (name: string) => void;
    onCreate: () => void;
    onCancel: () => void;
    loading: boolean;
}

export function CreateFolderInline({
    isOpen,
    folderName,
    onFolderNameChange,
    onCreate,
    onCancel,
    loading
}: CreateFolderInlineProps) {
    if (!isOpen) return null;

    return (
        <div className="mb-6 p-4 border rounded-lg bg-muted/50 flex items-center gap-4 animate-in fade-in slide-in-from-top-4">
            <Folder className="h-6 w-6 text-muted-foreground" />
            <Input
                autoFocus
                placeholder="Folder Name"
                value={folderName}
                onChange={(event) => onFolderNameChange(event.target.value)}
                className="max-w-xs"
                onKeyDown={(event) => {
                    if (event.key === "Enter") onCreate();
                    if (event.key === "Escape") onCancel();
                }}
            />
            <Button size="sm" onClick={onCreate} disabled={loading}>Create</Button>
            <Button size="sm" variant="ghost" onClick={onCancel}>Cancel</Button>
        </div>
    );
}
