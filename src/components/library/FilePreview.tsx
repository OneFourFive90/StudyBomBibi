import Image from "next/image";
import { FileText } from "lucide-react";
import { DocumentPreviewKind, Material } from "@/lib/library/types";

interface FilePreviewProps {
    item: Material;
    kind: DocumentPreviewKind;
    status: "idle" | "loading" | "ready" | "error";
    text: string | null;
    error: string | null;
}

export function FilePreview({
    item,
    kind,
    status,
    text,
    error
}: FilePreviewProps) {
    return (
        <div className="h-full min-h-[380px] border rounded-lg overflow-hidden bg-muted/10">
            {!item.downloadURL && (
                <div className="flex flex-col items-center justify-center h-full text-center space-y-4 text-muted-foreground p-8 border-2 border-dashed rounded-lg">
                    <FileText className="h-16 w-16 opacity-20" />
                    <div>
                        <h3 className="text-lg font-medium text-foreground">Document Preview</h3>
                        <p className="text-sm mt-1">No preview URL available for this file.</p>
                    </div>
                </div>
            )}

            {item.downloadURL && kind === "image" && (
                <div className="relative w-full h-full min-h-[380px] bg-background">
                    <Image
                        src={item.downloadURL}
                        alt={item.title}
                        fill
                        unoptimized
                        className="object-contain"
                    />
                </div>
            )}

            {item.downloadURL && kind === "pdf" && (
                <iframe
                    title={`Preview ${item.title}`}
                    src={item.downloadURL}
                    className="w-full h-full min-h-[380px]"
                />
            )}

            {item.downloadURL && kind === "text" && (
                <div className="h-full overflow-auto p-4">
                    {status === "loading" && (
                        <p className="text-sm text-muted-foreground">Loading preview...</p>
                    )}
                    {status === "error" && (
                        <p className="text-sm text-destructive">{error}</p>
                    )}
                    {status === "ready" && (
                        <pre className="text-sm leading-relaxed whitespace-pre-wrap break-words font-mono">
                            {text}
                        </pre>
                    )}
                </div>
            )}

            {item.downloadURL && kind === "web" && (
                <iframe
                    title={`Preview ${item.title}`}
                    src={item.downloadURL}
                    className="w-full h-full min-h-[380px]"
                />
            )}
        </div>
    );
}
