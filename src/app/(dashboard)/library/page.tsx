"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Book, 
  FileText, 
  StickyNote, 
  Upload, 
  Folder, 
  ArrowLeft,
  X,
  Search,
  Sparkles,
  Highlighter,
  Wand2,
  Plus,
  Maximize2,
  Minimize2
} from "lucide-react";

// --- Types ---
type MaterialType = "PDF" | "Note" | "Document" | "Folder";

interface Material {
  id: string;
  type: MaterialType;
  title: string;
  author?: string;
  content?: string; // For notes (HTML string now)
  tag?: string;
  parentId: string | null; // null means root directory
}

// --- Mock Initial Data ---
const initialMaterials: Material[] = [
  { id: "1", type: "Folder", title: "Study Resources", parentId: null, author: "System" },
  { id: "2", type: "Folder", title: "Project Docs", parentId: null, author: "Team" },
  { id: "3", type: "PDF", title: "Clean Code", author: "Robert C. Martin", tag: "Software Engineering", parentId: null },
  { 
    id: "4", 
    type: "Note", 
    title: "React Hooks Cheat Sheet", 
    author: "Self", 
    content: `
      <h2>React Hooks</h2>
      <p>Hooks are functions that let you "hook into" React state and lifecycle features from function components.</p>
      <ul>
        <li><strong>useState</strong>: Returns a stateful value, and a function to update it.</li>
        <li><strong>useEffect</strong>: Accepts a function that contains imperative, possibly effectful code.</li>
        <li><strong>useContext</strong>: Accepts a context object (the value returned from React.createContext) and returns the current context value.</li>
      </ul>
      <p>Try selecting some text here to see the smart actions!</p>
    `, 
    tag: "React", 
    parentId: "1" 
  },
  { id: "5", type: "Document", title: "System Design Interview Guide", author: "Alex Xu", tag: "System Design", parentId: "1" },
];

export default function LibraryPage() {
  // --- State ---
  const [materials, setMaterials] = useState<Material[]>(initialMaterials);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Interaction State
  const [selectedItem, setSelectedItem] = useState<Material | null>(null);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [isFullView, setIsFullView] = useState(false);

  // Smart Highlighting State
  const [showMenu, setShowMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const editorRef = useRef<HTMLDivElement | null>(null);

  // --- Derived State ---
  const currentFolder = materials.find(m => m.id === currentFolderId);
  
  const displayedMaterials = materials.filter(m => {
    // 1. Filter by folder level (if not searching)
    if (!searchQuery) {
        return m.parentId === currentFolderId;
    }
    // 2. Global search if query exists
    return m.title.toLowerCase().includes(searchQuery.toLowerCase());
  });

  // --- Handlers ---
  const handleCreateFolder = () => {
    if (!newFolderName.trim()) return;
    const newFolder: Material = {
      id: Math.random().toString(36).substr(2, 9),
      type: "Folder",
      title: newFolderName,
      parentId: currentFolderId,
      author: "Me",
    };
    setMaterials([...materials, newFolder]);
    setNewFolderName("");
    setIsCreatingFolder(false);
  };

  const handleCreateNote = () => {
    const newNote: Material = {
      id: Math.random().toString(36).substr(2, 9),
      type: "Note",
      title: "New Note",
      parentId: currentFolderId,
      author: "Me",
      content: "<p>Start writing...</p>",
      tag: "Draft"
    };
    setMaterials([...materials, newNote]);
    setSelectedItem(newNote); // Open it immediately
    setShowAddMenu(false);
  };

  const handleUpload = () => {
    alert("Upload feature would open a file picker here.");
    setShowAddMenu(false);
  };

  // Smart Selection Logic
  useEffect(() => {
    const handleSelection = () => {
      const selection = window.getSelection();
      
      // Safety checks
      if (!selection || selection.isCollapsed || !selectedItem || selectedItem.type !== 'Note') {
        setShowMenu(false);
        return;
      }

      // Ensure selection is inside our editor
      if (editorRef.current && !editorRef.current.contains(selection.anchorNode)) {
        setShowMenu(false);
        return;
      }

      // Get the range to calculate position
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      
      // Calculate position relative to the viewport
      setMenuPosition({
        top: rect.top - 50, 
        left: rect.left + (rect.width / 2)
      });
      setShowMenu(true);
    };

    // Only add listener if a note is open
    if (selectedItem?.type === 'Note') {
      document.addEventListener('selectionchange', handleSelection);
    }
    
    return () => {
      document.removeEventListener('selectionchange', handleSelection);
    };
  }, [selectedItem]);

  const handleAction = (action: string) => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) return;

    if (action === 'highlight') {
      try {
        document.designMode = "on";
        document.execCommand("hiliteColor", false, "#fef08a"); // Light yellow
        document.designMode = "off";
        selection.removeAllRanges();
        setShowMenu(false);
      } catch (e) {
        console.error("Highlighting failed", e);
      }
    } else {
      alert(`[Demo] ${action} feature triggered! This would call the AI agent.`);
      setShowMenu(false);
    }
  };

  const getIcon = (type: MaterialType) => {
    switch (type) {
      case "Folder": return <Folder className="h-5 w-5 text-blue-500 fill-blue-100" />;
      case "PDF": return <Book className="h-5 w-5 text-red-500" />;
      case "Note": return <StickyNote className="h-5 w-5 text-yellow-500" />;
      default: return <FileText className="h-5 w-5 text-green-500" />;
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-full gap-0 relative overflow-hidden" onClick={() => setShowAddMenu(false)}>
      
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden px-4">
        
        {/* Header & Controls */}
        <div className="flex-none flex flex-col gap-4 md:flex-row md:items-center md:justify-between pb-4 border-b shrink-0">
            <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
                {currentFolderId && (
                <Button variant="ghost" size="icon" onClick={() => setCurrentFolderId(null)} className="shrink-0">
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                )}
                <h1 className="text-3xl font-bold tracking-tight truncate">
                {currentFolder ? currentFolder.title : "Library"}
                </h1>
            </div>
            <p className="text-muted-foreground mt-2 truncate">
                {currentFolderId ? "Folder contents" : "Manage your study materials and notes."}
            </p>
            </div>
            
            <div className="flex items-center gap-2 w-full md:w-auto">
                <div className="relative flex-1 md:w-64 md:flex-none">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input 
                        placeholder="Search materials..." 
                        className="pl-8" 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                
                {/* Combined Add New Button */}
                <div className="relative" onClick={(e) => e.stopPropagation()}>
                    <Button className="gap-2" onClick={() => setShowAddMenu(!showAddMenu)}>
                        <Plus className="h-4 w-4" /> Add New
                    </Button>
                    
                    {showAddMenu && (
                        <div className="absolute right-0 top-12 w-48 bg-popover border rounded-md shadow-md z-50 animate-in fade-in zoom-in-95 duration-200">
                            <div className="p-1">
                                {!currentFolderId && (
                                    <Button 
                                        variant="ghost" 
                                        className="w-full justify-start gap-2 text-sm"
                                        onClick={() => {
                                            setIsCreatingFolder(true);
                                            setShowAddMenu(false);
                                        }}
                                    >
                                        <Folder className="h-4 w-4 text-blue-500" /> New Folder
                                    </Button>
                                )}
                                <Button 
                                    variant="ghost" 
                                    className="w-full justify-start gap-2 text-sm"
                                    onClick={handleCreateNote}
                                >
                                    <StickyNote className="h-4 w-4 text-yellow-500" /> New Note
                                </Button>
                                <Button 
                                    variant="ghost" 
                                    className="w-full justify-start gap-2 text-sm"
                                    onClick={handleUpload}
                                >
                                    <Upload className="h-4 w-4 text-green-500" /> Upload File
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>

        {/* Content Scrollable Area */}
        <div className="flex-1 overflow-y-auto pt-6">
            {/* Inline Creation Form */}
            {isCreatingFolder && (
                <div className="mb-6 p-4 border rounded-lg bg-muted/50 flex items-center gap-4 animate-in fade-in slide-in-from-top-4">
                    <Folder className="h-6 w-6 text-muted-foreground" />
                    <Input 
                        autoFocus
                        placeholder="Folder Name" 
                        value={newFolderName}
                        onChange={(e) => setNewFolderName(e.target.value)}
                        className="max-w-xs"
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') handleCreateFolder();
                            if (e.key === 'Escape') setIsCreatingFolder(false);
                        }}
                    />
                    <Button size="sm" onClick={handleCreateFolder}>Create</Button>
                    <Button size="sm" variant="ghost" onClick={() => setIsCreatingFolder(false)}>Cancel</Button>
                </div>
            )}

            {/* Grid View */}
            <div className={`grid gap-6 pb-8 ${selectedItem ? 'grid-cols-1 lg:grid-cols-2' : 'md:grid-cols-2 lg:grid-cols-3'}`}>
                {displayedMaterials.map((material) => (
                <Card 
                    key={material.id} 
                    className="hover:bg-muted/50 transition-colors cursor-pointer group flex flex-col min-w-0"
                    onClick={() => {
                        if (material.type === "Folder") {
                            setCurrentFolderId(material.id);
                        } else {
                            setSelectedItem(material);
                        }
                    }}
                >
                    <CardHeader className="flex flex-row items-center gap-4 pb-2 space-y-0">
                    <div className="p-2 bg-background rounded-md border shadow-sm group-hover:border-primary/50 transition-colors shrink-0">
                        {getIcon(material.type)}
                    </div>
                    <div className="flex flex-col min-w-0">
                        <CardTitle className="text-base font-medium leading-none truncate">{material.title}</CardTitle>
                        <CardDescription className="text-sm mt-1 truncate">{material.author || "Unknown Author"}</CardDescription>
                    </div>
                    </CardHeader>
                    <CardContent>
                    <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <span className="inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold bg-secondary text-secondary-foreground shrink-0">
                        {material.type}
                        </span>
                        {material.tag && (
                            <span className="inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold bg-primary/10 text-primary truncate max-w-full">
                                {material.tag}
                            </span>
                        )}
                    </div>
                    </CardContent>
                </Card>
                ))}
            </div>
        </div>
      </div>

      {/* Side Panel Area */}
      {selectedItem && (
        <>
            {/* Backdrop for Mobile Only */}
            <div 
                className="md:hidden fixed inset-0 z-40 bg-background/80 backdrop-blur-sm transition-opacity"
                onClick={() => {
                    setSelectedItem(null);
                    setIsFullView(false);
                }}
            />
            
            {/* Side Panel */}
            <div className={`
              fixed inset-y-0 right-0 z-50 bg-background shadow-2xl animate-in slide-in-from-right duration-300 flex flex-col h-full border-l
              ${isFullView 
                ? "w-full" 
                : "w-full md:relative md:w-1/3 md:shrink-0 md:shadow-none"
              }
            `}>
                
                {/* Floating Smart Menu (Only for Note type) */}
                {showMenu && selectedItem.type === 'Note' && (
                    <div 
                      className="fixed z-60 flex items-center gap-1 p-1 bg-popover text-popover-foreground rounded-lg shadow-xl border animate-in fade-in zoom-in-95 duration-200"
                      style={{ 
                        top: `${menuPosition.top}px`, 
                        left: `${menuPosition.left}px`, 
                        transform: 'translate(-50%, -10px)' 
                      }}
                      onMouseDown={(e) => e.preventDefault()}
                    >
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 gap-1.5 hover:bg-muted text-xs font-medium"
                        onClick={() => handleAction('explain')}
                      >
                        <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                        Explain
                      </Button>
                      <div className="w-px h-4 bg-border mx-1" />
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 gap-1.5 hover:bg-muted text-xs font-medium"
                        onClick={() => handleAction('summarize')}
                      >
                        <Wand2 className="w-3.5 h-3.5 text-blue-500" />
                        Summarize
                      </Button>
                      <div className="w-px h-4 bg-border mx-1" />
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 gap-1.5 hover:bg-muted text-xs font-medium"
                        onClick={() => handleAction('highlight')}
                      >
                        <Highlighter className="w-3.5 h-3.5 text-amber-500" />
                        Highlight
                      </Button>
                    </div>
                )}

                {/* Panel Header */}
                <div className="flex items-center justify-between p-6 border-b">
                    <div className="flex items-center gap-3 overflow-hidden">
                        {getIcon(selectedItem.type)}
                        <h2 className="text-xl font-semibold truncate">{selectedItem.title}</h2>
                    </div>
                    <div className="flex gap-1">
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="hidden md:inline-flex"
                            onClick={() => setIsFullView(!isFullView)}
                            title={isFullView ? "Collapse" : "Expand"}
                        >
                            {isFullView ? <Minimize2 className="h-5 w-5" /> : <Maximize2 className="h-5 w-5" />}
                        </Button>
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => {
                                setSelectedItem(null);
                                setIsFullView(false);
                            }}
                        >
                            <X className="h-5 w-5" />
                        </Button>
                    </div>
                </div>
                
                {/* Panel Content */}
                <div className="flex-1 p-6 overflow-y-auto">
                    {selectedItem.type === 'Note' ? (
                        /* ContentEditable Editor for Notes */
                        <div 
                            key={selectedItem.id}
                            ref={(el) => {
                                if (el && !el.innerHTML && selectedItem.content) {
                                    el.innerHTML = selectedItem.content;
                                }
                                editorRef.current = el;
                            }}
                            contentEditable
                            className="prose dark:prose-invert max-w-none text-base leading-relaxed focus:outline-none min-h-75"
                            suppressContentEditableWarning={true}
                            onBlur={(e) => {
                                 const newContent = e.currentTarget.innerHTML;
                                 if (newContent !== selectedItem.content) {
                                     // Update global list
                                     const updated = { ...selectedItem, content: newContent };
                                     setMaterials(prev => prev.map(m => 
                                         m.id === updated.id ? updated : m
                                     ));
                                 }
                            }}
                        />
                    ) : (
                        /* Read-only / Fake Document View for PDFs */
                        <div className="flex flex-col items-center justify-center h-full text-center space-y-4 text-muted-foreground p-8 border-2 border-dashed rounded-lg">
                            <FileText className="h-16 w-16 opacity-20" />
                            <div>
                                <h3 className="text-lg font-medium text-foreground">Document Preview</h3>
                                <p className="text-sm mt-1">
                                    This is a placeholder preview for <strong>{selectedItem.title}</strong>.
                                </p>
                            </div>
                            <Button variant="outline" className="mt-4">
                                Download File
                            </Button>
                        </div>
                    )}
                </div>
                
                {/* Panel Footer */}
                <div className="p-4 border-t bg-muted/10 flex justify-between items-center text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                        {selectedItem.type === 'Note' ? (
                            <span className="flex items-center gap-1 text-xs">
                                <span className="w-2 h-2 rounded-full bg-green-500" /> Saved
                            </span>
                        ) : (
                            <span className="flex items-center gap-1 text-xs">
                                Read-only
                            </span>
                        )}
                        <span>{selectedItem.tag ? `#${selectedItem.tag}` : ''}</span>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm">Share</Button>
                        <Button size="sm" onClick={() => setSelectedItem(null)}>Close</Button>
                    </div>
                </div>
            </div>
        </>
      )}
    </div>
  );
}
