"use client";

import { useRef, useState } from "react";
import { Card, CardTitle, CardHeader, CardContent } from "@/components/ui/card";
import { Send, Bot, User, Library, FileText, Check, X, Folder, ChevronLeft, BookOpen, ExternalLink, MessageSquare, Plus, Trash2, Sidebar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

// --- Types ---
type MaterialType = "PDF" | "Note" | "Document" | "Folder" | "IMG" | "PPT" | "TXT" | "DOCX";

interface Material {
  id: string;
  type: MaterialType;
  title: string;
  author?: string;
  content?: string; 
  tag?: string;
  parentId: string | null; // null means root directory
}

interface Message {
  role: "assistant" | "user";
  content: string;
  sources?: Material[];
}

interface ChatSession {
  id: string;
  title: string;
  createdAt: Date;
  messages: Message[];
}


// --- Mock Library Data ---
// Combining existing mocks with structure from Library page
const MOCK_LIBRARY_ITEMS: Material[] = [
  // Folders
  { id: "1", type: "Folder", title: "Study Resources", parentId: null, author: "System" },
  { id: "2", type: "Folder", title: "Project Docs", parentId: null, author: "Team" },
  { id: "3", type: "Folder", title: "Past Years", parentId: null, author: "System" },
  
  // Files in Root
  { 
    id: "lib1", 
    title: "Lecture 1: React Fundamentals.pdf", 
    type: "PDF", 
    parentId: null,
    content: "<h3>React Fundamentals</h3><p>React is a JavaScript library for building user interfaces.</p><ul><li><strong>Components:</strong> Building blocks of UI.</li><li><strong>JSX:</strong> Syntax extension for JavaScript.</li><li><strong>Props:</strong> Inputs to components.</li><li><strong>State:</strong> Internal data managed by components.</li></ul>"
  },
  { id: "lib2", title: "Advanced State Management.docx", type: "DOCX", parentId: null },

  // Files in Study Resources (id: 1)
  { id: "lib3", title: "React Hooks Cheat Sheet.png", type: "IMG", parentId: "1" },
  { id: "lib4", title: "Week 3 - Component Lifecycle.pptx", type: "PPT", parentId: "1" },
  { id: "4", type: "Note", title: "React Hooks Cheat Sheet (Note)", author: "Self", parentId: "1" },
  { id: "5", type: "Document", title: "System Design Interview Guide", author: "Alex Xu", tag: "System Design", parentId: "1" },

  // Files in Project Docs (id: 2)
  { id: "lib5", title: "Project Guidelines.pdf", type: "PDF", parentId: "2" },
  { id: "lib6", title: "Mid-term Review Notes.txt", type: "TXT", parentId: "2" },

   // Files in Past Years (id: 3)
   { id: "lib7", title: "2024 Past Year Paper.pdf", type: "PDF", parentId: "3" },
   { id: "lib8", title: "2023 Mock Exam.docx", type: "DOCX", parentId: "3" },
   
   // Specific for Assistant Demo
   { 
     id: "recursion_note", 
     title: "Recursion & Algorithms.note", 
     type: "Note", 
     parentId: "1",
     content: "<h3>Understanding Recursion</h3><p>Recursion is a programming technique where a function calls itself directly or indirectly.</p><ul><li><strong>Base Case:</strong> The condition under which the function stops calling itself.</li><li><strong>Recursive Step:</strong> The part where the function calls itself with a modified input.</li></ul><p>Example: Factorial calculation.</p><code>function factorial(n) { if (n === 0) return 1; return n * factorial(n - 1); }</code>"
   }
];

const MOCK_SESSIONS: ChatSession[] = [
  {
    id: "session-1",
    title: "Understanding Recursion",
    createdAt: new Date("2024-02-23T10:00:00"),
    messages: [
      {
        role: "assistant",
        content: "Hello! checking in. How can I help you with your studies today?"
      },
      {
        role: "user",
        content: "Can you explain the concept of Recursion?"
      },
      {
        role: "assistant",
        content: "Recursion is a method where the solution to a problem depends on solutions to smaller instances of the same problem. In programming, it's when a function calls itself.",
        sources: [
          MOCK_LIBRARY_ITEMS.find(item => item.id === "recursion_note")!
        ]
      }
    ]
  },
  {
    id: "session-2",
    title: "React Components",
    createdAt: new Date("2024-02-22T14:30:00"),
    messages: [
      {
        role: "assistant",
        content: "Hi there! Ready to dive into React?"
      },
      {
        role: "user",
        content: "What are the main differences between functional and class components?",
        sources: [
            MOCK_LIBRARY_ITEMS.find(item => item.id === "lib1")!
        ]
      }
    ]
  }
];

export default function AssistantPage() {
  const [sessions, setSessions] = useState<ChatSession[]>(MOCK_SESSIONS);
  const [currentSessionId, setCurrentSessionId] = useState<string>("session-1");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const nextSessionIdRef = useRef(3);

  const currentSession = sessions.find(s => s.id === currentSessionId) || sessions[0];
  const messages = currentSession.messages;

  const handleNewChat = () => {
    const nextSessionId = `session-${nextSessionIdRef.current}`;
    nextSessionIdRef.current += 1;
    const newSession: ChatSession = {
      id: nextSessionId,
      title: "New Chat",
      createdAt: new Date(),
      messages: [
        {
          role: "assistant",
          content: "Hello! How can I help you today?"
        }
      ]
    };
    setSessions([newSession, ...sessions]);
    setCurrentSessionId(newSession.id);
  };

  const handleDeleteSession = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const newSessions = sessions.filter(s => s.id !== id);
    if (newSessions.length === 0) {
        handleNewChat(); // Create a new one if all deleted
    } else {
        setSessions(newSessions);
        if (currentSessionId === id) {
            setCurrentSessionId(newSessions[0].id);
        }
    }
  };

  const handleSelectSession = (id: string) => {
      setCurrentSessionId(id);
      // On mobile, maybe close sidebar
  };

  const handleSendMessage = () => {
    if (!inputValue.trim()) return;

    const newMessage: Message = {
      role: "user",
      content: inputValue
    };

    // Optimistic update
    setSessions(prev => prev.map(s => {
      if (s.id === currentSessionId) {
        return {
          ...s,
          messages: [...s.messages, newMessage]
        };
      }
      return s;
    }));
    
    setInputValue("");

    // Simulate AI response
    setTimeout(() => {
        setSessions(prev => prev.map(s => {
            if (s.id === currentSessionId) {
                // Determine if title needs update (first user message)
                const isFirstUserMessage = s.messages.length <= 1;
                const updatedTitle = isFirstUserMessage ? newMessage.content.slice(0, 30) + (newMessage.content.length > 30 ? "..." : "") : s.title;
                
                return {
                    ...s,
                    title: updatedTitle,
                    messages: [...s.messages, newMessage, {
                        role: "assistant",
                        content: "I'm a simulated AI response. In a real app, this would call an API."
                    }]
                };
            }
            return s;
        }));
    }, 1000);
  };
  
  const [selectedFiles, setSelectedFiles] = useState<Material[]>([]);
  const [isLibraryPanelOpen, setIsLibraryPanelOpen] = useState(false);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [previewMaterial, setPreviewMaterial] = useState<Material | null>(null);

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

  const currentFolder = MOCK_LIBRARY_ITEMS.find(item => item.id === currentFolderId);
  
  // Get items in current folder
  const currentViewItems = MOCK_LIBRARY_ITEMS.filter(item => item.parentId === currentFolderId);

  const selectedFilesCount = selectedFiles.length;

  const handleFolderClick = (folderId: string) => {
    setCurrentFolderId(folderId);
  };

  const handleBackClick = () => {
    if (currentFolder) {
      setCurrentFolderId(currentFolder.parentId);
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
      {/* Chat History Sidebar */}
      <div 
        className={cn(
             "flex flex-col gap-2 transition-all duration-300 ease-in-out bg-card rounded-lg border shadow-sm overflow-hidden",
             isSidebarOpen ? "w-64 min-w-[250px] p-3" : "w-0 p-0 border-0 opacity-0 hidden"
        )}
      >
        <div className="flex items-center justify-between mb-2 px-2">
            <h2 className="font-semibold">Chats</h2>
            <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleNewChat}>
                    <Plus className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 lg:hidden" onClick={() => setIsSidebarOpen(false)}>
                    <X className="h-4 w-4" />
                </Button>
            </div>
        </div>
        <div className="flex-1 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
            {sessions.map(session => (
                <div 
                    key={session.id}
                    className={cn(
                        "group flex items-center justify-between p-2 rounded-md cursor-pointer text-sm transition-colors",
                        currentSessionId === session.id 
                            ? "bg-primary text-primary-foreground font-medium" 
                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                    onClick={() => handleSelectSession(session.id)}
                >
                    <div className="flex items-center gap-2 truncate flex-1 min-w-0">
                        <MessageSquare className="h-4 w-4 shrink-0" />
                        <span className="truncate">{session.title}</span>
                    </div>
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                        onClick={(e) => handleDeleteSession(e, session.id)}
                    >
                        <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                </div>
            ))}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col gap-4 min-w-0 transition-all duration-300">
        <div className="flex items-center gap-2">
             <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="shrink-0"
            >
                <Sidebar className="h-5 w-5" />
            </Button>
            <div>
                 <h1 className="text-3xl font-bold tracking-tight">AI Study Companion</h1>
                 <p className="text-muted-foreground mt-2">Ask questions, get explanations, and study smarter.</p>
            </div>
        </div>
        
        <Card className="flex-1 flex flex-col p-4 overflow-hidden relative">
            <div className="flex-1 overflow-y-auto space-y-4 pr-2 pb-4">
            {messages.map((msg, index) => (
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
                    {msg.role === 'assistant' && <Bot className="mt-0.5 h-4 w-4 shrink-0" />}
                    
                    <div className="flex flex-col gap-2 w-full">
                        <p className="leading-relaxed">{msg.content}</p>
                        
                        {msg.sources && msg.sources.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-1">
                                <span className={cn("text-xs font-semibold mt-1.5", msg.role === 'user' ? "opacity-90" : "opacity-70")}>
                                    {msg.role === 'user' ? "Context:" : "Sources:"}
                                </span>
                                {msg.sources.map((source, i) => (
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
            ))}
            </div>
            
            {/* Selected Files Context */}
            {selectedFilesCount > 0 && (
            <div className="flex gap-2 mb-2 overflow-x-auto py-2 px-1 border-t border-dashed">
                {selectedFiles.map(file => (
                <div key={file.id} className="flex items-center gap-1 bg-muted text-xs px-2 py-1 rounded-full whitespace-nowrap border">
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
            />
            <Button size="icon" onClick={handleSendMessage}>
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
                        <p>Empty Folder</p>
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
                                        <div 
                                            className={cn(
                                                "h-6 w-6 rounded-md flex items-center justify-center transition-colors shrink-0",
                                                isSelected ? "text-primary-foreground hover:bg-primary-foreground/20" : "text-muted-foreground hover:bg-muted-foreground/10"
                                            )}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                toggleLibraryFile(item);
                                            }}
                                        >
                                            {isSelected ? <Check className="h-4 w-4" /> : <div className="h-3 w-3 border border-muted-foreground/50 rounded-sm" />}
                                        </div>
                                        <div 
                                            className={cn(
                                                "h-6 w-6 rounded-md flex items-center justify-center", 
                                                isSelected ? "text-primary-foreground hover:bg-primary-foreground/20" : "text-muted-foreground hover:bg-muted-foreground/10"
                                            )}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleFolderClick(item.id);
                                            }}
                                        >
                                            <ChevronLeft className="h-4 w-4 rotate-180" />
                                        </div>
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
