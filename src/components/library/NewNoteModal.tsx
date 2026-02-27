import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface NewNoteModalProps {
    isOpen: boolean;
    pendingName: string;
    onNameChange: (name: string) => void;
    onConfirm: () => void;
    onCancel: () => void;
    isDuplicate: boolean;
    loading: boolean;
}

export function NewNoteModal({
    isOpen,
    pendingName,
    onNameChange,
    onConfirm,
    onCancel,
    isDuplicate,
    loading
}: NewNoteModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[9998] flex items-center justify-center p-4">
            <div className="w-[min(92vw,520px)] p-4 border rounded-lg bg-popover shadow-lg flex flex-col gap-3 animate-in fade-in zoom-in-95">
                <div className="text-sm font-medium">Name your new note</div>
                <Input
                    autoFocus
                    value={pendingName}
                    onChange={(event) => onNameChange(event.target.value)}
                    onKeyDown={(event) => {
                        if (event.key === "Enter" && !isDuplicate && pendingName.trim()) {
                            onConfirm();
                        }
                        if (event.key === "Escape") {
                            onCancel();
                        }
                    }}
                    placeholder="My Notes"
                />
                {isDuplicate && (
                    <p className="text-xs text-destructive">A file/folder with similar name already exists here.</p>
                )}
                <div className="flex items-center gap-2 justify-end">
                    <Button size="sm" variant="ghost" onClick={onCancel} disabled={loading}>
                        Cancel
                    </Button>
                    <Button
                        size="sm"
                        onClick={onConfirm}
                        disabled={loading || !pendingName.trim() || isDuplicate}
                    >
                        Create Note
                    </Button>
                </div>
            </div>
        </div>
    );
}
