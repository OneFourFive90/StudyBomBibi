import { Button } from "@/components/ui/button";

interface UploadModalProps {
    file: File | null;
    currentFolderName?: string;
    onConfirm: () => void;
    onCancel: () => void;
    loading: boolean;
}

export function UploadModal({
    file,
    currentFolderName,
    onConfirm,
    onCancel,
    loading
}: UploadModalProps) {
    if (!file) return null;

    return (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9998] w-[min(92vw,560px)]">
            <div className="p-4 border rounded-lg bg-popover shadow-lg flex flex-col gap-3 animate-in fade-in slide-in-from-top-4">
                <div className="text-sm">
                    Ready to upload <strong>{file.name}</strong>
                    {currentFolderName ? ` into ${currentFolderName}` : " to Root"}.
                </div>
                <div className="flex items-center gap-2">
                    <Button size="sm" onClick={onConfirm} disabled={loading}>
                        Confirm Upload
                    </Button>
                    <Button size="sm" variant="ghost" onClick={onCancel} disabled={loading}>
                        Cancel
                    </Button>
                </div>
            </div>
        </div>
    );
}
