"use client";

import { useEffect, useRef } from "react";
import { Folder, FileText, X, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface RenameModalProps {
  open: boolean;
  targetType: "file" | "folder";
  value: string; // The current input value
  originalName: string; // The starting name of the item
  existingNames?: string[]; // Array of sibling names in the current folder
  loading?: boolean;
  onValueChange: (value: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
}

export function RenameModal({
  open,
  targetType,
  value,
  originalName,
  existingNames = [],
  loading = false,
  onValueChange,
  onConfirm,
  onCancel,
}: RenameModalProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const wasOpenRef = useRef(false);
  const isFolder = targetType === "folder";

  const trimmedValue = value.trim();
  const normalizeName = (name: string) => name.trim().toLowerCase();
  const normalizedValue = normalizeName(value);
  const normalizedOriginalName = normalizeName(originalName);

  // 1. Validation: OS-level forbidden characters
  const forbiddenCharsRegex = /[<>:"/\\|?*]/;
  const hasInvalidChars = forbiddenCharsRegex.test(value);

  // 2. Validation: Check for duplicates (case-insensitive, ignoring if it's just the original name)
  const isDuplicate =
    normalizedValue !== normalizedOriginalName &&
    existingNames.some((existingName) => normalizeName(existingName) === normalizedValue);

  // 3. Validation: Check if the name actually changed (case-insensitive)
  const isUnchanged = normalizedValue === normalizedOriginalName;
  
  // Name is valid if it's not empty, has no invalid chars, isn't a duplicate, and actually changed
  const isValid = trimmedValue.length > 0 && !hasInvalidChars && !isDuplicate && !isUnchanged;

  // Auto-focus and intelligently select text only when the modal is newly opened
  useEffect(() => {
    const justOpened = open && !wasOpenRef.current;

    if (justOpened && inputRef.current) {
      const input = inputRef.current;
      input.focus();

      if (targetType === "file") {
        const lastDotIndex = originalName.lastIndexOf(".");
        
        // If there is a dot, and it's not the very first character
        if (lastDotIndex > 0) {
          input.setSelectionRange(0, lastDotIndex);
        } else {
          input.select();
        }
      } else {
        input.select();
      }
    }

    wasOpenRef.current = open;
  }, [open, targetType, originalName]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9998] flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-[min(95vw,420px)] flex flex-col bg-card border rounded-xl shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden">
        
        {/* --- Header --- */}
        <div className="flex items-center justify-between px-5 py-4 border-b bg-muted/10">
          <div className="flex items-center gap-2.5">
            {isFolder ? (
              <Folder className="h-5 w-5 text-muted-foreground" />
            ) : (
              <FileText className="h-5 w-5 text-muted-foreground" />
            )}
            <h2 className="text-lg font-semibold tracking-tight">
              Rename {isFolder ? "folder" : "file"}
            </h2>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onCancel} 
            disabled={loading}
            className="h-8 w-8 rounded-full"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* --- Body --- */}
        <div className="p-5">
          <div className="flex flex-col">
            <label 
              htmlFor="rename-input" 
              className="mb-2 text-xs font-medium text-muted-foreground uppercase tracking-wider"
            >
              New Name
            </label>
            <Input
              id="rename-input"
              ref={inputRef}
              value={value}
              disabled={loading}
              autoComplete="off"
              spellCheck={false}
              autoCorrect="off"
              autoCapitalize="none"
              onChange={(event) => onValueChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && isValid) {
                  onConfirm();
                }
                if (event.key === "Escape") {
                  onCancel();
                }
              }}
              // Add a red border if the input is invalid or a duplicate
              className={`h-10 transition-colors ${
                (hasInvalidChars || isDuplicate) ? "border-destructive focus-visible:ring-destructive" : ""
              }`}
            />
            
            {/* Error Messages */}
            <div className="min-h-[20px]">
              {hasInvalidChars && (
                <div className="flex items-center gap-1.5 text-xs text-destructive animate-in fade-in slide-in-from-top-1 pt-1">
                  <AlertCircle className="h-3.5 w-3.5" />
                  <span>Names cannot contain: \ / : * ? &quot; &lt; &gt; |</span>
                </div>
              )}
              {isDuplicate && !hasInvalidChars && (
                <div className="flex items-center gap-1.5 text-xs text-destructive animate-in fade-in slide-in-from-top-1 pt-1">
                  <AlertCircle className="h-3.5 w-3.5" />
                  <span>A {isFolder ? "folder" : "file"} with this name already exists.</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* --- Footer --- */}
        <div className="flex items-center justify-end gap-3 px-5 py-4 border-t bg-muted/10">
          <Button 
            variant="outline" 
            onClick={onCancel} 
            disabled={loading}
          >
            Cancel
          </Button>
          <Button 
            onClick={onConfirm} 
            disabled={loading || !isValid}
          >
            Save
          </Button>
        </div>
      </div>
    </div>
  );
}