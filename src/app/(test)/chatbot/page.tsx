"use client";

import { Timestamp } from "firebase/firestore";
import { useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useAuth } from "@/context/AuthContext";
import { authenticatedFetch } from "@/lib/authenticatedFetch";

interface ChatMessage {
  id?: string;
  role: "user" | "model";
  content: string;
  attachedFileIds?: string[];
  createdAt?: Timestamp;
}

interface FileItem {
  id: string;
  originalName: string;
  folderId: string | null;
}

interface FolderItem {
  id: string;
  name: string;
}

export default function ChatbotPage() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [selectedFileIds, setSelectedFileIds] = useState<string[]>([]);
  const [isFileDropdownOpen, setIsFileDropdownOpen] = useState(false);
  const [fileSearchQuery, setFileSearchQuery] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsFileDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch history and files on load
  useEffect(() => {
    if (!user) return;

    const fetchHistory = async () => {
      try {
        const res = await authenticatedFetch("/api/chatbot/get-history");
        if (res.ok) {
          const data = await res.json();
          const history = data.history || [];
          setMessages(history);
          
          // Auto-select files from the most recent user message
          for (let i = history.length - 1; i >= 0; i--) {
            if (history[i].role === "user" && history[i].attachedFileIds?.length > 0) {
              setSelectedFileIds(history[i].attachedFileIds);
              break;
            }
          }
        }
      } catch (error) {
        console.error("Failed to fetch history:", error);
      }
    };

    const fetchFilesAndFolders = async () => {
      try {
        const [filesRes, foldersRes] = await Promise.all([
          authenticatedFetch("/api/get-files"),
          authenticatedFetch("/api/folders?action=get-all")
        ]);

        if (filesRes.ok) {
          const data = await filesRes.json();
          setFiles(data.files || []);
        }
        
        if (foldersRes.ok) {
          const data = await foldersRes.json();
          setFolders(data.folders || []);
        }
      } catch (error) {
        console.error("Failed to fetch files or folders:", error);
      }
    };

    fetchHistory();
    fetchFilesAndFolders();
  }, [user]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    
    // Optimistically add user message
    const newUserMsg: ChatMessage = {
      role: "user",
      content: userMessage,
      attachedFileIds: selectedFileIds,
    };
    setMessages((prev) => [...prev, newUserMsg]);
    setIsLoading(true);

    try {
      // Format history for the API (it expects { role, text })
      // Only send the last 20 messages (10 rounds of user + ai)
      const recentMessages = messages.slice(-20);
      const historyForApi = recentMessages.map((msg) => ({
        role: msg.role,
        text: msg.content,
      }));

      const res = await authenticatedFetch("/api/chatbot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage,
          history: historyForApi,
          attachedFileIds: selectedFileIds,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        // Add AI response
        setMessages((prev) => [
          ...prev,
          {
            role: "model",
            content: data.text,
          },
        ]);
        // We no longer clear selected files after sending, 
        // so they remain selected for the next message
      } else {
        console.error("Failed to send message");
        // Optionally show error to user
      }
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleFileSelection = (fileId: string) => {
    setSelectedFileIds((prev) =>
      prev.includes(fileId)
        ? prev.filter((id) => id !== fileId)
        : [...prev, fileId]
    );
  };

  const filteredFiles = files.filter((file) =>
    file.originalName.toLowerCase().includes(fileSearchQuery.toLowerCase())
  );

  // Group files by folder
  const filesByFolder = filteredFiles.reduce((acc, file) => {
    const folderId = file.folderId || "root";
    if (!acc[folderId]) {
      acc[folderId] = [];
    }
    acc[folderId].push(file);
    return acc;
  }, {} as Record<string, FileItem[]>);

  return (
    <div className="flex flex-col h-screen max-w-4xl mx-auto p-4 bg-gray-50">
      <div className="flex justify-between items-center mb-4 p-4 bg-white rounded-lg shadow">
        <h1 className="text-2xl font-bold text-gray-800">StudyBomBibi Chatbot</h1>
        <div className="text-sm text-gray-600">
          {user ? `Logged in as: ${user.email}` : 'Not logged in'}
        </div>
      </div>

      {/* Chat Messages Area */}
      <div className="flex-1 overflow-y-auto mb-4 p-4 bg-white rounded-lg shadow flex flex-col gap-4">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 my-auto">
            No messages yet. Start a conversation!
          </div>
        ) : (
          messages.map((msg, index) => (
            <div
              key={index}
              className={`flex flex-col max-w-[80%] ${
                msg.role === "user" ? "self-end items-end" : "self-start items-start"
              }`}
            >
              <div
                className={`p-3 rounded-2xl ${
                  msg.role === "user"
                    ? "bg-blue-500 text-white rounded-br-none"
                    : "bg-gray-200 text-gray-800 rounded-bl-none"
                }`}
              >
                <div className={`prose prose-sm max-w-none ${msg.role === "user" ? "prose-invert" : ""}`}>
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {msg.content}
                  </ReactMarkdown>
                </div>
              </div>
              
              {/* Show attached files if any */}
              {msg.role === "user" && msg.attachedFileIds && msg.attachedFileIds.length > 0 && (
                <div className="flex gap-1 mt-1 flex-wrap justify-end">
                  {msg.attachedFileIds.map((fileId) => {
                    const file = files.find((f) => f.id === fileId);
                    return (
                      <span
                        key={fileId}
                        className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full"
                      >
                        📎 {file ? file.originalName : "Unknown File"}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          ))
        )}
        {isLoading && (
          <div className="self-start bg-gray-200 text-gray-800 p-3 rounded-2xl rounded-bl-none animate-pulse">
            Thinking...
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* File Selection Area */}
      <div className="mb-2 flex gap-2 items-center relative" ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setIsFileDropdownOpen(!isFileDropdownOpen)}
          className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg shadow-sm hover:bg-gray-50 flex items-center gap-2 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13" />
          </svg>
          Attach Files {selectedFileIds.length > 0 && `(${selectedFileIds.length})`}
        </button>

        {/* Selected Files Chips */}
        <div className="flex gap-2 overflow-x-auto flex-1">
          {selectedFileIds.map((fileId) => {
            const file = files.find((f) => f.id === fileId);
            if (!file) return null;
            return (
              <span
                key={fileId}
                className="text-xs bg-blue-100 text-blue-800 px-3 py-1.5 rounded-full flex items-center gap-1 whitespace-nowrap"
              >
                {file.originalName}
                <button
                  onClick={() => toggleFileSelection(fileId)}
                  className="hover:text-blue-900 ml-1 focus:outline-none"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                    <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                  </svg>
                </button>
              </span>
            );
          })}
        </div>

        {/* Dropdown Menu */}
        {isFileDropdownOpen && (
          <div className="absolute bottom-full left-0 mb-2 w-72 bg-white border border-gray-200 rounded-lg shadow-xl z-10 overflow-hidden flex flex-col max-h-64">
            <div className="p-2 border-b border-gray-100">
              <input
                type="text"
                placeholder="Search files..."
                value={fileSearchQuery}
                onChange={(e) => setFileSearchQuery(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div className="overflow-y-auto flex-1 p-1">
              {filteredFiles.length === 0 ? (
                <div className="p-3 text-sm text-gray-500 text-center">No files found</div>
              ) : (
                Object.entries(filesByFolder).map(([folderId, folderFiles]) => {
                  const folderName = folderId === "root" 
                    ? "Root Directory" 
                    : folders.find(f => f.id === folderId)?.name || "Unknown Folder";
                  
                  return (
                    <div key={folderId} className="mb-2">
                      <div className="px-2 py-1 text-xs font-semibold text-gray-500 uppercase tracking-wider bg-gray-50 sticky top-0">
                        {folderName}
                      </div>
                      {folderFiles.map((file) => (
                        <button
                          key={file.id}
                          onClick={() => toggleFileSelection(file.id)}
                          className="w-full text-left px-3 py-2 text-sm rounded-md hover:bg-gray-100 flex items-center justify-between group"
                        >
                          <span className="truncate pr-2 pl-2">{file.originalName}</span>
                          {selectedFileIds.includes(file.id) && (
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-blue-500 flex-shrink-0">
                              <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                            </svg>
                          )}
                        </button>
                      ))}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      {/* Input Area */}
      <form onSubmit={handleSendMessage} className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your message..."
          className="flex-1 p-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={!input.trim() || isLoading}
          className="bg-blue-500 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Send
        </button>
      </form>
    </div>
  );
}
