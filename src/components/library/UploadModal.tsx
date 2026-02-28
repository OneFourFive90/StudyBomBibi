import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, XCircle, Upload, Loader2 } from "lucide-react";

interface UploadProgress {
    currentFileIndex: number;
    currentFileName: string;
    isUploading: boolean;
    completed: number;
    failed: string[];
}

interface UploadModalProps {
    files: File[];
    uploadProgress: UploadProgress;
    currentFolderName?: string;
    onConfirm: () => void;
    onCancel: () => void;
    loading: boolean;
}

export function UploadModal({
    files,
    uploadProgress,
    currentFolderName,
    onConfirm,
    onCancel,
    loading
}: UploadModalProps) {
    if (files.length === 0) return null;

    const totalFiles = files.length;
    const progressPercentage = totalFiles > 0 
        ? ((uploadProgress.completed + uploadProgress.failed.length) / totalFiles) * 100 
        : 0;

    const isUploadComplete = !uploadProgress.isUploading && 
        (uploadProgress.completed + uploadProgress.failed.length) === totalFiles;

    const formatFileSize = (bytes: number) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    return (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9998] w-[min(92vw,600px)]">
            <div className="p-4 border rounded-lg bg-popover shadow-lg flex flex-col gap-4 animate-in fade-in slide-in-from-top-4 max-h-[80vh] overflow-hidden">
                <div className="flex flex-col gap-2">
                    <div className="text-sm font-medium">
                        {uploadProgress.isUploading 
                            ? `Uploading ${totalFiles} file${totalFiles > 1 ? 's' : ''}...`
                            : isUploadComplete
                                ? `Upload ${uploadProgress.failed.length > 0 ? 'Completed with Errors' : 'Complete'}`
                                : `Ready to upload ${totalFiles} file${totalFiles > 1 ? 's' : ''}`
                        }
                        {currentFolderName ? ` into ${currentFolderName}` : " to Root"}
                    </div>
                    
                    {uploadProgress.isUploading && (
                        <div className="text-xs text-muted-foreground">
                            Processing: {uploadProgress.currentFileName}
                        </div>
                    )}
                    
                    {(uploadProgress.isUploading || isUploadComplete) && (
                        <div className="space-y-2">
                            <Progress value={progressPercentage} className="w-full" />
                            <div className="flex justify-between text-xs text-muted-foreground">
                                <span>
                                    {uploadProgress.completed + uploadProgress.failed.length} / {totalFiles} files processed
                                </span>
                                <span>{Math.round(progressPercentage)}%</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* File list */}
                <div className="max-h-48 overflow-y-auto space-y-1">
                    {files.map((file, index) => {
                        const isCompleted = index < uploadProgress.completed + uploadProgress.failed.length;
                        const isFailed = uploadProgress.failed.includes(file.name);
                        const isCurrent = uploadProgress.isUploading && index === uploadProgress.currentFileIndex;
                        const isSuccess = isCompleted && !isFailed;

                        return (
                            <div 
                                key={`${file.name}-${index}`}
                                className={`flex items-center justify-between p-2 rounded text-sm ${
                                    isCurrent ? 'bg-primary/10 border border-primary/20' : 
                                    isSuccess ? 'bg-green-50 dark:bg-green-900/20' :
                                    isFailed ? 'bg-red-50 dark:bg-red-900/20' :
                                    'bg-muted/50'
                                }`}
                            >
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                    {isCurrent ? (
                                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                                    ) : isSuccess ? (
                                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                                    ) : isFailed ? (
                                        <XCircle className="h-4 w-4 text-red-600" />
                                    ) : (
                                        <Upload className="h-4 w-4 text-muted-foreground" />
                                    )}
                                    <span className="truncate font-medium">{file.name}</span>
                                </div>
                                <span className="text-xs text-muted-foreground ml-2">
                                    {formatFileSize(file.size)}
                                </span>
                            </div>
                        );
                    })}
                </div>

                {/* Action buttons */}
                <div className="flex items-center gap-2 pt-2 border-t">
                    {isUploadComplete ? (
                        <Button size="sm" onClick={onCancel}>
                            Close
                        </Button>
                    ) : (
                        <>
                            <Button 
                                size="sm" 
                                onClick={onConfirm} 
                                disabled={loading || uploadProgress.isUploading}
                            >
                                {uploadProgress.isUploading ? 'Uploading...' : 'Start Upload'}
                            </Button>
                            <Button 
                                size="sm" 
                                variant="ghost" 
                                onClick={onCancel} 
                                disabled={uploadProgress.isUploading}
                            >
                                Cancel
                            </Button>
                        </>
                    )}
                </div>

                {/* Upload status summary */}
                {isUploadComplete && (
                    <div className="text-xs text-muted-foreground border-t pt-2">
                        {uploadProgress.failed.length === 0 ? (
                            <span className="text-green-600">✓ All files uploaded successfully</span>
                        ) : (
                            <span>
                                {uploadProgress.completed > 0 && (
                                    <span className="text-green-600">✓ {uploadProgress.completed} successful</span>
                                )}
                                {uploadProgress.completed > 0 && uploadProgress.failed.length > 0 && ', '}
                                {uploadProgress.failed.length > 0 && (
                                    <span className="text-red-600">✗ {uploadProgress.failed.length} failed</span>
                                )}
                            </span>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
