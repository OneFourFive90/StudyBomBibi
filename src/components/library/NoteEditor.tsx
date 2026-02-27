import { useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import { Material } from "@/lib/library/types";

interface NoteEditorProps {
    item: Material;
    isEditing: boolean;
    onContentChange: (content: string) => void;
    onBlur: (content: string) => void;
    editorRef: React.RefObject<HTMLDivElement | null>;
    noteBaselineContent: string;
}

export function NoteEditor({
    item,
    isEditing,
    onContentChange,
    onBlur,
    editorRef,
    noteBaselineContent
}: NoteEditorProps) {
    // We need to keep the innerText in sync when not editing or when item changes
    // The original code did this with a callback ref.
    // Here we can use a callback ref or useEffect.
    // Since `contentEditable` is tricky with React, sticking to `onInput` is good.

    return (
        <div className="relative min-h-75">
            {isEditing ? (
                <>
                    {(!item.content || item.content.trim() === "") && (
                        <p className="absolute left-0 top-0 text-base text-muted-foreground pointer-events-none select-none">
                            Start writing...
                        </p>
                    )}
                    <div
                        key={item.id}
                        ref={(element) => {
                            if (element && element.innerText !== (item.content || "")) {
                                element.innerText = item.content || "";
                            }
                            if (editorRef) {
                                // @ts-ignore
                                editorRef.current = element;
                            }
                        }}
                        contentEditable
                        className="prose dark:prose-invert max-w-none text-base leading-relaxed focus:outline-none min-h-75"
                        suppressContentEditableWarning
                        onInput={(event) => {
                            const newContent = event.currentTarget.innerText;
                            onContentChange(newContent);
                        }}
                        onBlur={(event) => {
                            const newContent = event.currentTarget.innerText;
                            onBlur(newContent);
                        }}
                    />
                </>
            ) : (
                <article className="prose dark:prose-invert max-w-none">
                    <ReactMarkdown 
                        remarkPlugins={[remarkGfm]}
                        rehypePlugins={[rehypeRaw]}
                        components={{
                            // Fix highlight visibility
                            mark: ({node, ...props}) => (
                                <mark className="bg-yellow-200 dark:bg-yellow-500 text-inherit dark:text-black px-1 rounded" {...props} />
                            ),
                            // Fix list item marker visibility
                            ul: ({node, ...props}) => (
                                <ul className="list-disc pl-6 space-y-1" {...props} />
                            ),
                            ol: ({node, ...props}) => (
                                <ol className="list-decimal pl-6 space-y-1" {...props} />
                            ),
                            li: ({node, ...props}) => (
                                <li className="pl-1 marker:text-foreground" {...props} />
                            ),
                            // Fix table borders visibility
                            table: ({node, ...props}) => (
                                <div className="overflow-x-auto my-4">
                                    <table className="w-full border-collapse border border-border" {...props} />
                                </div>
                            ),
                            th: ({node, ...props}) => (
                                <th className="border border-border px-4 py-2 bg-muted text-left font-bold" {...props} />
                            ),
                            td: ({node, ...props}) => (
                                <td className="border border-border px-4 py-2" {...props} />
                            ),
                            // Fix code block background visibility
                            pre: ({node, ...props}) => (
                                <pre className="bg-muted p-4 rounded-lg overflow-x-auto my-4 text-muted-foreground dark:bg-muted" {...props} />
                            ),
                            code: ({node, className, ...props}: any) => {
                                const isInline = props.inline || !props.children?.toString().includes('\n');
                                return isInline ? (
                                    <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono dark:bg-muted" {...props} />
                                ) : (
                                    <code className={className} {...props} />
                                );
                            }
                        }}
                    >
                        {item.content || "*No content*"}
                    </ReactMarkdown>
                </article>
            )}
        </div>
    );
}
