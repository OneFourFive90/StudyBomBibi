
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface Folder {
  id: string;
  title: string;
  parentId: string | null;
}

interface SaveToNoteModalProps {
  isOpen: boolean;
  initialContent: string;
  folders: Folder[];
  onConfirm: (name: string, folderId: string | null, content: string) => void;
  onCancel: () => void;
  loading?: boolean;
}

export function SaveToNoteModal({
  isOpen,
  initialContent,
  folders,
  onConfirm,
  onCancel,
  loading = false,
}: SaveToNoteModalProps) {
  const [name, setName] = useState("");
  const [folderId, setFolderId] = useState<string | null>(null);
  const [content, setContent] = useState(initialContent);

  // Set default content when modal opens
  useEffect(() => {
    if (isOpen) {
        setContent(initialContent);
        setName("Start of " + (initialContent.substring(0, 20).replace(/[^a-zA-Z0-9 ]/g, "")) + "...");
    }
  }, [isOpen, initialContent]);

  if (!isOpen) return null;

  // Flatten folder structure for simple selection (could be improved with tree view later)
  // For now, just listing all folders
  const folderOptions = [{ id: "root", title: "My Library (Root)" }, ...folders];

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
      <div className="w-[min(95vw,600px)] border rounded-lg bg-card text-card-foreground shadow-lg flex flex-col animate-in fade-in zoom-in-95 max-h-[90vh]">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold">Save to Notes</h2>
          <p className="text-sm text-muted-foreground">
            Save this AI conversation as a new note.
          </p>
        </div>
        
        <div className="p-4 flex flex-col gap-4 overflow-y-auto flex-1">
          <div className="space-y-2">
            <Label htmlFor="note-name">Note Name</Label>
            <Input
              id="note-name"
              placeholder="e.g. Quantum Physics Summary"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="folder-select">Save In</Label>
            <Select
              value={folderId || "root"}
              onValueChange={(val) => setFolderId(val === "root" ? null : val)}
            >
              <SelectTrigger id="folder-select">
                <SelectValue placeholder="Select a folder" />
              </SelectTrigger>
              <SelectContent>
                {folderOptions.map((folder) => (
                  <SelectItem key={folder.id} value={folder.id}>
                    {folder.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2 flex-1 min-h-[150px] flex flex-col">
             <Label htmlFor="note-content">Content Preview</Label>
             <Textarea 
                id="note-content"
                className="flex-1 font-mono text-xs resize-none"
                value={content}
                onChange={(e) => setContent(e.target.value)}
             />
          </div>
        </div>

        <div className="p-4 border-t flex justify-end gap-2 bg-muted/40 rounded-b-lg">
          <Button variant="outline" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
          <Button 
            onClick={() => onConfirm(name, folderId, content)}
            disabled={loading || !name.trim()}
          >
            {loading ? "Saving..." : "Save Note"}
          </Button>
        </div>
      </div>
    </div>
  );
}
