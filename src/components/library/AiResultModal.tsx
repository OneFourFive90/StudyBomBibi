import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, X, MessageSquare, Loader2 } from "lucide-react";

interface AiResult {
    title: string;
    content: string;
    originalText?: string;
}

interface AiResultModalProps {
    result: AiResult | null;
    isLoading?: boolean;
    onClose: () => void;
    onAskAi: () => void;
}

export function AiResultModal({ result, isLoading, onClose, onAskAi }: AiResultModalProps) {
    if (!result && !isLoading) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200">
            <Card className="w-full max-w-md shadow-2xl border-primary/20">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-lg font-medium flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-primary" />
                        {isLoading ? "Processing..." : result?.title}
                    </CardTitle>
                    {!isLoading && (
                        <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 -mr-2">
                            <X className="h-4 w-4" />
                        </Button>
                    )}
                </CardHeader>
                <CardContent className="space-y-4">
                    {isLoading ? (
                        <div className="py-8 flex flex-col items-center justify-center text-center space-y-3">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            <p className="text-sm text-muted-foreground animate-pulse">Waiting for response...</p>
                        </div>
                    ) : (
                        <>
                            <div className="bg-muted/30 p-4 rounded-lg text-sm leading-relaxed whitespace-pre-wrap max-h-[60vh] overflow-y-auto">
                                {result?.content}
                            </div>
                            <div className="flex justify-between items-center pt-2">
                                <Button variant="outline" size="sm" onClick={onAskAi} className="gap-2">
                                    <MessageSquare className="h-4 w-4" />
                                    Ask AI about this
                                </Button>
                                <Button size="sm" onClick={onClose}>
                                    Close
                                </Button>
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
