"use client";

import { useEffect, useRef, useState } from "react";
import { Card, CardTitle, CardHeader, CardContent } from "@/components/ui/card";
import { Send, Bot, User, Library, FileText, Check, X, Folder, ChevronLeft, BookOpen, ExternalLink, MessageSquare, Plus, Trash2, Sidebar, Trash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useAuth } from "@/context/AuthContext";

// --- Types ---
type MaterialType = "PDF" | "Note" | "Document" | "Folder" | "IMG" | "PPT" | "TXT" | "DOCX";

interface Material {
  id: string;
  type: MaterialType; // mapped from file extension
  title: string;
  author?: string;
  content?: string; 
  tag?: string;
  parentId: string | null; // null means root directory
}

interface ChatMessage {
  id?: string;
  role: "user" | "model"; // Internal logic uses 'model', UI maps to 'assistant'
  content: string;
  attachedFileIds?: string[];
  sources?: Material[]; // For UI display
}

interface ChatSession {
  id: string;
  title: string;
  createdAt: Date;
  messages: ChatMessage[];
}

// Convert API file item to Material
const mapFileToMaterial = (file: any): Material => {
    // simple extension check
    const name = file.originalName || "Unknown";
    const ext = name.split('.').pop()?.toLowerCase();
    
    let type: MaterialType = "Document";
    if (ext === "pdf") type = "PDF";
    else if (ext === "txt") type = "TXT";
    else if (ext === "docx") type = "DOCX";
    else if (ext === "pptx") type = "PPT";
    else if (["jpg", "jpeg", "png", "gif"].includes(ext || "")) type = "IMG";
    else if (file.type === "note") type = "Note"; // if api returns type

    return {
        id: file.id,
        type,
        title: name,
        parentId: file.folderId || null,
        author: "Unknown", // API doesn't seem to return author yet
        content: file.content 
    };
};

const mapFolderToMaterial = (folder: any): Material => ({
    id: folder.id,
    type: "Folder",
    title: folder.name,
    parentId: null, // Folders in this system seem flat or parentId managed elsewhere? The test bot uses folderId on files.
    author: "System"
});


export default function AssistantPage() {
  const { userId } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  // File System State
  const [libraryItems, setLibraryItems] = useState<Material[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<Material[]>([]);
  
  // UI State
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Initially closed as we are hiding history
  const [isLibraryPanelOpen, setIsLibraryPanelOpen] = useState(false);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [previewMaterial, setPreviewMaterial] = useState<Material | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // --- Data Fetching ---
  useEffect(() => {
    if (!userId) return;

    const fetchFilesAndFolders = async () => {
        try {
            const [filesRes, foldersRes] = await Promise.all([
                fetch(`/api/get-files?userId=${userId}`),
                fetch(`/api/folders?action=get-all&userId=${userId}`)
            ]);

            let newLibraryItems: Material[] = [];

            if (foldersRes.ok) {
                const data = await foldersRes.json();
                const folderMaterials = (data.folders || []).map(mapFolderToMaterial);
                newLibraryItems = [...newLibraryItems, ...folderMaterials];
            }

            if (filesRes.ok) {
                const data = await filesRes.json();
                const fileMaterials = (data.files || []).map(mapFileToMaterial);
                newLibraryItems = [...newLibraryItems, ...fileMaterials];
            }
            
            setLibraryItems(newLibraryItems);
        } catch (error) {
            console.error("Failed to fetch library items:", error);
        }
    };

    const fetchHistory = async () => {
        try {
            const res = await fetch(`/api/chatbot/get-history?userId=${userId}`);
            if (res.ok) {
                const data = await res.json();
                const history = (data.history || []).map((msg: any) => ({
                    id: msg.id,
                    role: msg.role,
                    content: msg.content,
                    attachedFileIds: msg.attachedFileIds || [],
                    // sources will be resolved during render from libraryItems
                }));
                setMessages(history);
            }
        } catch (error) {
            console.error("Failed to fetch history:", error);
        }
    };

    fetchFilesAndFolders();
    fetchHistory();
  }, [userId]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);


  // --- Event Handlers ---

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessageContent = inputValue.trim();
    setInputValue("");
    
    // Create new message object
    const newUserMsg: ChatMessage = {
      role: "user",
      content: userMessageContent,
      attachedFileIds: selectedFiles.map(f => f.id),
      sources: [...selectedFiles] // For UI display immediately
    };

    setMessages(prev => [...prev, newUserMsg]);
    setIsLoading(true);

    try {
       // Format history for the API (last 20 messages)
      const recentMessages = messages.slice(-20);
      const historyForApi = recentMessages.map((msg) => ({
        role: msg.role, // 'user' | 'model'
        text: msg.content,
      }));

      const res = await fetch("/api/chatbot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: userId || "test-user-123", // Fallback for dev
          message: userMessageContent,
          history: historyForApi,
          attachedFileIds: selectedFiles.map(f => f.id),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        // Add AI response
        const newAiMsg: ChatMessage = {
            role: "model",
            content: data.text,
            // In a real app, the backend might return which sources it used. 
            // For now, we assume it used the ones we sent? 
            // Or typically AI response doesn't "attach" files effectively in same structure.
            // We can leave sources empty or parse citations if implemented.
        };
        setMessages((prev) => [...prev, newAiMsg]);
      } else {
        console.error("Failed to send message: ", res.statusText);
        setMessages(prev => [...prev, { role: "model", content: "Sorry, I encountered an error processing your request." }]);
      }

    } catch (error) {
        console.error("Error sending message:", error);
        setMessages(prev => [...prev, { role: "model", content: "Sorry, I encountered an error. Please try again." }]);
    } finally {
        setIsLoading(false);
    }
  };

  const handleClearChat = async () => {
    if (!userId) return;
    if (!confirm("Are you sure you want to clear the chat history? This cannot be undone.")) return;

    try {
        setIsLoading(true);
        const res = await fetch(`/api/chatbot/delete-history?userId=${userId}`, {
            method: "DELETE"
        });
        
        if (res.ok) {
            setMessages([]);
            setInputValue("");
        } else {
            console.error("Failed to clear chat");
        }
    } catch (error) {
        console.error("Error clearing chat:", error);
    } finally {
        setIsLoading(false);
    }
  };

  const toggleLibraryFile = (file: Material) => {
    setSelectedFiles(prev => {
      const exists = prev.find(f => f.id === file.id);
      if (exists) {
        return prev.filter(f => f.id !== file.id);
      } else {
        return [...prev, file];
      }
    });
  };

  const currentFolder = libraryItems.find(item => item.id === currentFolderId);
  
  // Get items in current folder
  // logic: if currentFolderId is null, show items with parentId null. 
  // However, API might not return folder structure perfectly flat with parentId.
  // The test chatbot logic grouped by folderId.
  const currentViewItems = libraryItems.filter(item => {
    if (currentFolderId) {
        return item.parentId === currentFolderId;
    }
    // If root, show folders and files with no parent (or null parent)
    return item.parentId === null || item.parentId === "root";
  });

  const selectedFilesCount = selectedFiles.length;

  const handleFolderClick = (folderId: string) => {
    setCurrentFolderId(folderId);
  };

  const handleBackClick = () => {
    if (currentFolder) {
      setCurrentFolderId(currentFolder.parentId || null); // Go up one level (if hierarchy supported) or to root
    } else {
      setCurrentFolderId(null);
    }
  };

  const getIcon = (type: MaterialType, className?: string) => {
    const sizeClass = className || "h-5 w-5";
    switch (type) {
        case "Folder": return <Folder className={cn(sizeClass, "text-blue-500 fill-blue-100")} />;
        case "PDF": return <FileText className={cn(sizeClass, "text-red-500")} />;
        case "Note": return <FileText className={cn(sizeClass, "text-yellow-500")} />;
        case "DOCX": return <FileText className={cn(sizeClass, "text-blue-700")} />;
        case "IMG": return <FileText className={cn(sizeClass, "text-purple-500")} />;
        case "PPT": return <FileText className={cn(sizeClass, "text-orange-500")} />;
        case "TXT": return <FileText className={cn(sizeClass, "text-gray-500")} />;
        default: return <FileText className={cn(sizeClass, "text-gray-500")} />;
    }
  };

  const getSourceIcon = (type: MaterialType) => {
       switch (type) {
        case "Folder": return <Folder className="h-3 w-3" />;
        case "PDF": return <FileText className="h-3 w-3" />;
        case "Note": return <FileText className="h-3 w-3" />;
        case "DOCX": return <FileText className="h-3 w-3" />;
        case "IMG": return <FileText className="h-3 w-3" />;
        case "PPT": return <FileText className="h-3 w-3" />;
        case "TXT": return <FileText className="h-3 w-3" />;
        default: return <FileText className="h-3 w-3" />;
    }
  }


  return (
    <div className="flex h-full gap-4 relative overflow-hidden p-4">
      {/* 
        --- Chat History Sidebar (TEMPORARILY DISABLED) --- 
        User requested to comment out the side panel for new chat and sessions.
      */}
      {/* 
      <div 
        className={cn(
             "flex flex-col gap-2 transition-all duration-300 ease-in-out bg-card rounded-lg border shadow-sm overflow-hidden",
             isSidebarOpen ? "w-64 min-w-[250px] p-3" : "w-0 p-0 border-0 opacity-0 hidden"
        )}
      >
        <div className="flex items-center justify-between mb-2 px-2">
            <h2 className="font-semibold">Chats</h2>
            <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => {}}>
                    <Plus className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 lg:hidden" onClick={() => setIsSidebarOpen(false)}>
                    <X className="h-4 w-4" />
                </Button>
            </div>
        </div>
        <div className="flex-1 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
             // List of sessions would go here 
        </div>
      </div>
      */}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col gap-4 min-w-0 transition-all duration-300">
        <div className="flex items-center justify-between gap-2">
             <div className="flex items-center gap-2">
                {/* 
                <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                    className="shrink-0"
                >
                    <Sidebar className="h-5 w-5" />
                </Button>
                */}
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">AI Study Companion</h1>
                    <p className="text-muted-foreground mt-2">Ask questions, get explanations, and study smarter.</p>
                </div>
             </div>
             <div>
                <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleClearChat}
                    className="text-muted-foreground hover:text-destructive hover:border-destructive"
                    title="Clear Chat History"
                >
                    <Trash className="h-4 w-4 mr-2" />
                    Clear Chat
                </Button>
             </div>
        </div>
        
        <Card className="flex-1 flex flex-col p-4 overflow-hidden relative">
            <div className="flex-1 overflow-y-auto space-y-4 pr-2 pb-4">
            {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground opacity-50">
                    <Bot className="h-12 w-12 mb-4" />
                    <p>Start a conversation by typing below.</p>
                    <p className="text-sm">You can also select materials from the library.</p>
                </div>
            )}
            
            {messages.map((msg, index) => {
                const displaySources = msg.sources || (msg.attachedFileIds?.map(id => libraryItems.find(item => item.id === id)).filter((item): item is Material => !!item)) || [];
                
                return (
                <div 
                key={index} 
                className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                <div 
                    className={cn(
                        "flex max-w-[80%] items-start gap-2 rounded-lg px-4 py-3 text-sm shadow-sm",
                        msg.role === 'user' 
                            ? 'bg-primary text-primary-foreground' 
                            : 'bg-muted'
                    )}
                >
                    {msg.role === 'model' && <Bot className="mt-0.5 h-4 w-4 shrink-0" />}
                    
                    <div className="flex flex-col gap-2 w-full min-w-0">
                        {/* Markdown Rendering */}
                         <div className={cn("prose prose-sm max-w-none break-words", msg.role === 'user' ? "prose-invert" : "dark:prose-invert")}>
                             <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {msg.content}
                             </ReactMarkdown>
                         </div>
                        
                        {displaySources.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-1">
                                <span className={cn("text-xs font-semibold mt-1.5", msg.role === 'user' ? "opacity-90" : "opacity-70")}>
                                    {msg.role === 'user' ? "Context:" : "Sources:"}
                                </span>
                                {displaySources.map((source, i) => (
                                    <div 
                                        key={i}
                                        className={cn(
                                            "flex items-center h-6 rounded-full text-xs gap-1 px-2 cursor-pointer transition-colors max-w-full",
                                            msg.role === 'user' 
                                                ? "bg-primary-foreground/20 hover:bg-primary-foreground/30 text-primary-foreground" 
                                                : "bg-background/50 hover:bg-background/80"
                                        )}
                                        onClick={() => {
                                            if (source) {
                                                setPreviewMaterial(source);
                                                setShowPreview(true);
                                            }
                                        }}
                                    >
                                        {getSourceIcon(source.type)}
                                        <span className="truncate max-w-[150px]">{source.title}</span>
                                        <ExternalLink className="h-3 w-3 ml-1 opacity-50 shrink-0" />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {msg.role === 'user' && <User className="mt-0.5 h-4 w-4 shrink-0" />}
                </div>
                </div>
            )})}
             {isLoading && (
                <div className="flex w-full justify-start">
                    <div className="flex max-w-[80%] items-center gap-2 rounded-lg px-4 py-3 text-sm shadow-sm bg-muted text-muted-foreground">
                        <Bot className="h-4 w-4 animate-pulse" />
                        <span>Thinking...</span>
                    </div>
                </div>
            )}
             <div ref={messagesEndRef} />
            </div>
            
            {/* Selected Files Context (Files to be sent with next message) */}
            {selectedFilesCount > 0 && (
            <div className="flex gap-2 mb-2 overflow-x-auto py-2 px-1 border-t border-dashed">
                {selectedFiles.map(file => (
                <div key={file.id} className="flex items-center gap-1 bg-muted text-xs px-2 py-1 rounded-full whitespace-nowrap border animate-in fade-in zoom-in-95 duration-200">
                    {getSourceIcon(file.type)}
                    <span className="max-w-37.5 truncate">{file.title}</span>
                    <button 
                    onClick={() => toggleLibraryFile(file)}
                    className="ml-1 hover:text-destructive"
                    >
                    <X className="h-3 w-3" />
                    </button>
                </div>
                ))}
            </div>
            )}

            <div className="mt-auto flex items-center gap-2 pt-4 border-t bg-card z-10">
            <Button 
                variant="outline"
                size="icon" 
                className={cn("", (selectedFilesCount > 0 || isLibraryPanelOpen) && "text-primary")}
                onClick={() => setIsLibraryPanelOpen(!isLibraryPanelOpen)}
                title="Toggle Library Panel"
            >
                <Library className="h-5 w-5" />
                {selectedFilesCount > 0 && !isLibraryPanelOpen && (
                <span className="absolute top-0 right-0 h-2 w-2 rounded-full bg-primary" />
                )}
            </Button>
            <Input 
                placeholder="Ask anything about your notes..." 
                className="flex-1"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                disabled={isLoading}
            />
            <Button size="icon" onClick={handleSendMessage} disabled={!inputValue.trim() || isLoading}>
                <Send className="h-4 w-4" />
            </Button>
            </div>
        </Card>
      </div>

      {/* Side Panel for Library */}
      <div 
        className={cn(
            "fixed inset-y-0 right-0 z-50 w-80 bg-background border-l shadow-2xl transition-transform duration-300 ease-in-out transform sm:static sm:z-0 sm:shadow-none sm:transform-none sm:w-[320px] sm:bg-transparent h-full",
            isLibraryPanelOpen ? "translate-x-0" : "translate-x-full absolute right-0",
             !isLibraryPanelOpen && "hidden sm:hidden"
        )}
      >
        <Card className="h-full flex flex-col rounded-none sm:rounded-lg border-l sm:border overflow-hidden">
            <CardHeader className="p-4 border-b flex flex-row items-center justify-between space-y-0">
                <div className="flex items-center gap-2 overflow-hidden">
                    {currentFolderId ? (
                         <Button variant="ghost" size="icon" className="h-8 w-8 -ml-2" onClick={handleBackClick}>
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                    ) : (
                        <Library className="h-5 w-5 text-muted-foreground shrink-0" />
                    )}
                    <CardTitle className="text-base truncate">
                        {currentFolder ? currentFolder.title : "Library"}
                    </CardTitle>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8 sm:hidden" onClick={() => setIsLibraryPanelOpen(false)}>
                    <X className="h-4 w-4" />
                </Button>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-2 space-y-1">
                {currentViewItems.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-40 text-muted-foreground text-sm">
                        <Folder className="h-8 w-8 mb-2 opacity-20" />
                        <p>{libraryItems.length === 0 ? "Loading Library..." : "Empty Folder"}</p>
                    </div>
                ) : (
                    currentViewItems.map((item) => {
                        const isSelected = selectedFiles.some(f => f.id === item.id);
                        const isFolder = item.type === "Folder";
                        
                        return (
                            <div 
                                key={item.id} 
                                className={cn(
                                    "flex items-center gap-3 p-2 rounded-md cursor-pointer transition-colors text-sm group",
                                    isSelected 
                                        ? "bg-primary text-primary-foreground font-medium" 
                                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                )}
                            >
                                <div 
                                    className="flex items-center gap-3 flex-1 min-w-0"
                                    onClick={() => isFolder ? handleFolderClick(item.id) : toggleLibraryFile(item)}
                                >
                                    {isFolder ? (
                                         <Folder className={cn("h-5 w-5 shrink-0", isSelected ? "text-primary-foreground fill-primary-foreground/20" : "text-blue-500 fill-blue-100")} />
                                    ) : (
                                        <div className={cn(isSelected ? "text-primary-foreground" : "")}>
                                            {getIcon(item.type)}
                                        </div>
                                    )}
                                    
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium truncate">{item.title}</p>
                                        <p className="text-xs truncate opacity-80">{item.type}</p>
                                    </div>
                                </div>

                                {isFolder ? (
                                    <div className="flex items-center gap-1">
                                        <ChevronLeft className="h-4 w-4 rotate-180 opacity-50" />
                                    </div>
                                ) : (
                                    <div 
                                        className={cn(
                                            "h-6 w-6 rounded-md flex items-center justify-center transition-colors shrink-0",
                                            isSelected ? "text-primary-foreground hover:bg-primary-foreground/20" : "text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-muted-foreground/10"
                                        )}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            toggleLibraryFile(item);
                                        }}
                                    >
                                        {isSelected ? <Check className="h-4 w-4" /> : <div className="h-3 w-3 border border-muted-foreground/50 rounded-sm" />}
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </CardContent>
            <div className="p-3 border-t text-xs text-muted-foreground text-center">
                {selectedFilesCount} file(s) selected
            </div>
        </Card>
      </div>

       {showPreview && previewMaterial && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 animate-in fade-in-0">
          <Card className="w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl animate-in zoom-in-95 bg-card">
            <CardHeader className="flex flex-row items-center justify-between border-b px-6 py-4">
              <div className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary" />
                <CardTitle>{previewMaterial.title}</CardTitle>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setShowPreview(false)}>
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="overflow-y-auto p-6 flex-1">
              <div 
                className="prose dark:prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: previewMaterial.content || "<p>No preview available for this file type.</p>" }}
              />
            </CardContent>
          </Card>
        </div>
      )}

    </div>
  );
}
