import { Button } from "@/components/ui/button";
import { PendingDeleteAction } from "@/lib/library/types";

interface DeleteConfirmationModalProps {
    pendingDelete: PendingDeleteAction | null;
    onConfirm: () => void;
    onCancel: () => void;
    loading: boolean;
}

export function DeleteConfirmationModal({
    pendingDelete,
    onConfirm,
    onCancel,
    loading
}: DeleteConfirmationModalProps) {
    if (!pendingDelete) return null;

    return (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9998] w-[min(92vw,560px)]">
            <div className="p-4 border rounded-lg bg-popover border-destructive/40 shadow-lg flex flex-col gap-3 animate-in fade-in slide-in-from-top-4">
                <div className="text-sm">
                    Delete <strong>{pendingDelete.label}</strong>?
                    {pendingDelete.type === "folder" ? " This includes nested files and subfolders." : " This action cannot be undone."}
                </div>
                <div className="flex items-center gap-2">
                    <Button size="sm" variant="destructive" onClick={onConfirm} disabled={loading}>
                        Confirm Delete
                    </Button>
                    <Button size="sm" variant="ghost" onClick={onCancel} disabled={loading}>
                        Cancel
                    </Button>
                </div>
            </div>
        </div>
    );
}
