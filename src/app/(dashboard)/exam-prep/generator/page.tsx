"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea"; 
import { ArrowLeft, Clock, FileText, RefreshCw, Save, Upload, Library, X, Check, FileType, BrainCircuit } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/context/AuthContext";

// Mock Library Data (Fallback)
const MOCK_LIBRARY_FILES = [
  { id: "lib1", name: "Lecture 1: React Fundamentals.pdf", type: "PDF" },
  { id: "lib2", name: "Advanced State Management.docx", type: "DOCX" },
  { id: "lib3", name: "React Hooks Cheat Sheet.png", type: "IMG" },
  { id: "lib4", name: "Week 3 - Component Lifecycle.pptx", type: "PPT" },
  { id: "lib5", name: "Project Guidelines.pdf", type: "PDF" },
  { id: "lib6", name: "Mid-term Review Notes.txt", type: "TXT" },
  { id: "lib7", name: "2024 Past Year Paper.pdf", type: "PDF" },
  { id: "lib8", name: "2023 Mock Exam.docx", type: "DOCX" },
];

interface GeneratedContent {
  title: string;
  duration?: string;
  totalMarks?: number;
  totalQuestions?: number;
  type: "paper" | "quiz";
  sections: {
    title: string;
    questions: {
      id: number;
      question: string;
      marks?: number;
      type: "structural" | "essay" | "mcq";
      options?: string[]; // For MCQ only
      sampleAnswer: string; // Correct answer or explanation
    }[];
  }[];
}

interface SelectedFile {
  id: string;
  name: string;
  type: string;
  origin: "library" | "upload";
  role: "source" | "reference"; // source = content to learn from, reference = past year paper style
  fileObject?: File; // Only for uploads
}

interface LibraryFile {
  id: string;
  name: string;
  type: string;
}

export default function GeneratorPage() {
  const { user } = useAuth();
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<GeneratedContent | null>(null);

  // Form State
  const [mode, setMode] = useState<"quiz" | "paper">("paper");
  const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>([]);
  const [libraryFiles, setLibraryFiles] = useState<LibraryFile[]>([]);
  const [isLoadingLibrary, setIsLoadingLibrary] = useState(false);
  
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  
  // Paper Specific State
  const [timeLimit, setTimeLimit] = useState("120");
  const [totalMarks, setTotalMarks] = useState("100");

  // Quiz Specific State
  const [questionCount, setQuestionCount] = useState("20");

  const [revealedAnswers, setRevealedAnswers] = useState<Set<number>>(new Set());

  const toggleAnswer = (id: number) => {
    setRevealedAnswers(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  useEffect(() => {
    if (isLibraryOpen && user && libraryFiles.length === 0) {
      const fetchLibraryFiles = async () => {
        setIsLoadingLibrary(true);
        try {
          const res = await fetch(`/api/get-files?userId=${user.uid}`);
          if (res.ok) {
            const data = await res.json();
            const files = data.files.map((f: any) => ({
              id: f.id,
              name: f.originalName,
              type: f.mimeType.split('/').pop()?.toUpperCase() || "FILE"
            }));
            setLibraryFiles(files);
          }
        } catch (error) {
          console.error("Failed to fetch library files", error);
        } finally {
          setIsLoadingLibrary(false);
        }
      };
      fetchLibraryFiles();
    }
  }, [isLibraryOpen, user, libraryFiles.length]);

  const toggleLibraryFile = (file: LibraryFile) => {
    setSelectedFiles(prev => {
      const exists = prev.find(f => f.id === file.id);
      if (exists) {
        return prev.filter(f => f.id !== file.id);
      } else {
        return [...prev, {
          id: file.id,
          name: file.name,
          type: file.type,
          origin: "library",
          role: "source" // Default to source
        }];
      }
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles: SelectedFile[] = Array.from(e.target.files).map(file => ({
        id: `upload-${Date.now()}-${file.name}`,
        name: file.name,
        type: file.name.split('.').pop()?.toUpperCase() || "FILE",
        origin: "upload",
        role: "source",
        fileObject: file
      }));
      setSelectedFiles(prev => [...prev, ...newFiles]);
    }
  };

  const updateFileRole = (id: string, role: "source" | "reference") => {
    setSelectedFiles(prev => prev.map(f => f.id === id ? { ...f, role } : f));
  };

  const removeFile = (id: string) => {
    setSelectedFiles(prev => prev.filter(f => f.id !== id));
  };

  const handleGenerate = () => {
    setIsGenerating(true);
    setTimeout(() => {
      if (mode === "paper") {
        setGeneratedContent({
          title: "Generated Past Year Paper (Mock)",
          type: "paper",
          duration: `${timeLimit} minutes`,
          totalMarks: parseInt(totalMarks),
          sections: [
            {
              title: "Section A: Structural Questions",
              questions: [
                {
                  id: 1,
                  question: "Explain the concept of 'State' in React components.",
                  marks: 10,
                  type: "structural",
                  sampleAnswer: "State is a built-in React object that is used to contain data or information about the component. A component's state can change over time; whenever it changes, the component re-renders."
                },
                {
                  id: 2,
                  question: "Differentiate between 'props' and 'state'.",
                  marks: 10,
                  type: "structural",
                  sampleAnswer: "Props are read-only and passed from parent to child. State is local to the component and can be changed within the component."
                }
              ]
            },
            {
              title: "Section B: Essay Questions",
              questions: [
                {
                  id: 3,
                  question: "Discuss the lifecycle methods of a React component.",
                  marks: 20,
                  type: "essay",
                  sampleAnswer: "Lifecycle methods are special methods that automatically get called as your component goes through its lifecycle (Mounting, Updating, Unmounting). Key methods include componentDidMount, componentDidUpdate, and componentWillUnmount (in class components) or useEffect (in functional components)."
                }
              ]
            },
            {
              title: "Section C: Past Year Questions (Simulated)",
              questions: [
                {
                  id: 4,
                  question: "[2023] Explain the significance of Keys in React Lists.",
                  marks: 5,
                  type: "structural",
                  sampleAnswer: "Keys help React identify which items have changed, are added, or are removed. Keys should be given to the elements inside the array to give the elements a stable identity."
                },
                {
                  id: 5,
                  question: "[2022] Describe the 'Virtual DOM' and how it improves performance.",
                  marks: 15,
                  type: "essay",
                  sampleAnswer: "The Virtual DOM is a lightweight copy of the actual DOM. React uses it to batch updates and only re-render components that have actually changed, minimizing direct manipulation of the slow browser DOM."
                },
                {
                  id: 6,
                  question: "[2021] Which hook is used for side effects?",
                  marks: 2,
                  type: "mcq",
                  options: ["useState", "useEffect", "usememo", "useCallback"],
                  sampleAnswer: "useEffect"
                }
              ]
            }
          ]
        });
      } else {
        // Mock Quiz Generation
        setGeneratedContent({
            title: "Generated Mock Quiz",
            type: "quiz",
            totalQuestions: parseInt(questionCount),
            sections: [
                {
                    title: "Multiple Choice Questions",
                    questions: [
                        {
                            id: 1,
                            type: "mcq",
                            question: "Which hook is used to handle side effects in functional components?",
                            options: ["useState", "useEffect", "useContext", "useReducer"],
                            sampleAnswer: "useEffect"
                        },
                        {
                            id: 2,
                            type: "mcq",
                            question: "What is the virtual DOM?",
                            options: ["A direct copy of the real DOM", "A lightweight representation of the real DOM", "A browser extension", "A database for React"],
                            sampleAnswer: "A lightweight representation of the real DOM"
                        },
                        {
                            id: 3,
                            type: "mcq",
                            question: "How do you pass data from parent to child?",
                            options: ["State", "Props", "Context", "Ref"],
                            sampleAnswer: "Props"
                        }
                    ]
                }
            ]
        });
      }
      setIsGenerating(false);
    }, 2000);
  };

  const handleSave = () => {
    alert("Saved to Exam Prep!");
  };

  return (
    <div className="flex flex-col h-full gap-4 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link href="/exam-prep">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">Content Generator</h1>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 h-full overflow-hidden">
        {/* Left Side: Controls (30%) */}
        <Card className="w-full lg:w-[30%] flex flex-col h-full overflow-hidden">
          <CardHeader className="shrink-0">
            <CardTitle>Configuration</CardTitle>
            <CardDescription>Setup your generation parameters.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 overflow-y-auto flex-1">
            
            {/* Mode Selection */}
            <Tabs 
                value={mode} 
                onValueChange={(v) => {
                    setMode(v as "paper" | "quiz");
                    setGeneratedContent(null);
                }} 
                className="w-full"
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="paper">Past Year Paper</TabsTrigger>
                <TabsTrigger value="quiz">Quiz (MCQ)</TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="space-y-4">
              <label className="text-sm font-medium">Materials & References</label>
              
              <div className="flex gap-2">
                <Button 
                    variant="outline" 
                    onClick={() => setIsLibraryOpen(true)}
                    className="flex-1"
                >
                    <Library className="mr-2 h-4 w-4" />
                    Library
                </Button>
                <div className="relative flex-1">
                    <Button variant="outline" className="w-full">
                        <Upload className="mr-2 h-4 w-4" />
                        Upload
                    </Button>
                    <input 
                        type="file" 
                        multiple 
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        onChange={handleFileUpload}
                    />
                </div>
              </div>

              {/* Selected Files List */}
              <div className="bg-muted/30 rounded-lg border min-h-[150px] p-2 space-y-2">
                {selectedFiles.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-muted-foreground py-8 text-sm">
                        <FileText className="h-8 w-8 mb-2 opacity-50" />
                        <p>No files selected</p>
                    </div>
                ) : (
                    selectedFiles.map((file) => (
                        <div key={file.id} className="bg-background border rounded-md p-3 text-sm shadow-sm group">
                            <div className="flex items-start justify-between gap-2 mb-2">
                                <div className="flex items-center gap-2 overflow-hidden">
                                     <div className="bg-primary/10 p-1.5 rounded shrink-0">
                                        <FileType className="h-4 w-4 text-primary" />
                                    </div>
                                    <span className="font-medium truncate">{file.name}</span>
                                </div>
                                <button 
                                    onClick={() => removeFile(file.id)}
                                    className="text-muted-foreground hover:text-destructive shrink-0"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                            
                            <div className="flex items-center gap-2 bg-muted/50 p-1.5 rounded text-xs">
                                <span className="text-muted-foreground shrink-0">Use as:</span>
                                <div className="flex gap-2 w-full">
                                    <label className="flex items-center gap-1.5 cursor-pointer">
                                        <input 
                                            type="radio" 
                                            name={`role-${file.id}`}
                                            checked={file.role === "source"}
                                            onChange={() => updateFileRole(file.id, "source")}
                                            className="text-primary focus:ring-primary h-3 w-3"
                                        />
                                        Source
                                    </label>
                                    <label className={cn("flex items-center gap-1.5 cursor-pointer", mode === "quiz" && "opacity-50 cursor-not-allowed")}>
                                        <input 
                                            type="radio" 
                                            name={`role-${file.id}`}
                                            checked={file.role === "reference"}
                                            onChange={() => mode === "paper" && updateFileRole(file.id, "reference")}
                                            disabled={mode === "quiz"} 
                                            title={mode === "quiz" ? "Reference material is only for Past Year Papers" : ""}
                                            className="text-primary focus:ring-primary h-3 w-3"
                                        />
                                        Past Year
                                    </label>
                                </div>
                            </div>
                        </div>
                    ))
                )}
              </div>
            </div>

            {/* Dynamic Inputs based on Mode */}
            {mode === "paper" ? (
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Time Limit (mins)</label>
                        <Input 
                            type="number" 
                            value={timeLimit} 
                            onChange={(e) => setTimeLimit(e.target.value)} 
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Total Marks</label>
                        <Input 
                            type="number" 
                            value={totalMarks} 
                            onChange={(e) => setTotalMarks(e.target.value)} 
                        />
                    </div>
                </div>
            ) : (
                <div className="space-y-2">
                    <label className="text-sm font-medium">Number of Questions</label>
                    <Input 
                        type="number" 
                        value={questionCount} 
                        onChange={(e) => setQuestionCount(e.target.value)} 
                    />
                </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">Custom Prompt / Instructions</label>
              <Textarea 
                placeholder={mode === "paper" ? "e.g. Focus on Chapter 3 and 4. Make it slightly harder than the referenced paper." : "e.g. Focus on React Hooks and State Management"} 
                className="min-h-[100px]"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
              />
            </div>

            <Button onClick={handleGenerate} disabled={isGenerating} className="w-full">
              {isGenerating ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Generating...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" /> Generate {mode === "paper" ? "Paper" : "Quiz"}
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Right Side: Preview (70%) */}
        <div className="w-full lg:w-[70%] flex flex-col gap-4 h-full overflow-hidden">
            <div className="flex justify-between items-center bg-card p-4 rounded-lg border shadow-sm shrink-0">
                <h2 className="font-semibold text-lg flex items-center gap-2">
                    Preview
                    {generatedContent && <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-normal">Generated</span>}
                </h2>
                <Button 
                    variant="default" 
                    size="sm" 
                    disabled={!generatedContent} 
                    onClick={handleSave}
                >
                    <Save className="mr-2 h-4 w-4" /> Save {mode === "paper" ? "Paper" : "Quiz"}
                </Button>
            </div>

            <div className="flex-1 overflow-y-auto rounded-lg border bg-card text-card-foreground shadow-sm p-8">
                {generatedContent ? (
                  mode === "paper" ? (
                    <div className="space-y-8 max-w-3xl mx-auto">
                        <div className="text-center border-b pb-6 mb-6">
                            <h1 className="text-3xl font-bold uppercase tracking-wide mb-2">{generatedContent.title}</h1>
                            <div className="flex justify-center gap-8 text-muted-foreground">
                                <span className="flex items-center gap-1"><Clock className="h-4 w-4" /> {generatedContent.duration}</span>
                                <span className="flex items-center gap-1"><FileText className="h-4 w-4" /> {generatedContent.totalMarks} Marks</span>
                            </div>
                        </div>

                        {generatedContent.sections.map((section, sIdx) => (
                            <div key={sIdx} className="space-y-6">
                                <h3 className="font-bold text-xl border-b pb-2">{section.title}</h3>
                                <div className="space-y-6">
                                    {section.questions.map((q, qIdx) => (
                                        <div key={q.id} className="p-4 bg-accent/20 rounded-lg border border-transparent hover:border-accent transition-colors break-inside-avoid">
                                            <div className="flex justify-between items-start mb-3">
                                                <div className="flex gap-2">
                                                    <span className="font-semibold whitespace-nowrap">Q{qIdx + 1}</span>
                                                    <span className="text-xs uppercase px-2 py-0.5 rounded-full bg-background border self-start mt-0.5 text-muted-foreground">
                                                        {q.type}
                                                    </span>
                                                </div>
                                                <span className="text-sm font-medium bg-primary/10 text-primary px-2 py-0.5 rounded">
                                                    {q.marks} marks
                                                </span>
                                            </div>
                                            
                                            <p className="mb-4 text-lg font-medium leading-relaxed">{q.question}</p>
                                            
                                            {/* Different format based on question type */}
                                            <div className="my-4">
                                                {q.type === "mcq" && q.options ? (
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pl-4">
                                                        {q.options.map((opt, i) => (
                                                            <div key={i} className="flex items-center gap-3 p-3 rounded-md border bg-background/50">
                                                                <div className="h-4 w-4 rounded-full border border-primary/50" />
                                                                <span>{String.fromCharCode(65 + i)}. {opt}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : q.type === "structural" ? (
                                                    <div className="space-y-3 pl-4 border-l-2 border-dashed border-muted-foreground/30">
                                                        <div className="h-6 border-b border-muted-foreground/30 w-full"></div>
                                                        <div className="h-6 border-b border-muted-foreground/30 w-3/4"></div>
                                                        <div className="h-6 border-b border-muted-foreground/30 w-1/2"></div>
                                                    </div>
                                                ) : (
                                                    <div className="h-32 border rounded-md bg-background/50 p-4 text-muted-foreground text-sm italic">
                                                        (Essay answer space...)
                                                    </div>
                                                )}
                                            </div>

                                            <div className="mt-4">
                                                <Button
                                                    variant="secondary" 
                                                    size="sm"
                                                    onClick={() => toggleAnswer(q.id)}
                                                    className="mb-2"
                                                >
                                                    {revealedAnswers.has(q.id) ? "Hide Answer" : "Show Answer"}
                                                </Button>
                                                
                                                {revealedAnswers.has(q.id) && (
                                                    <div className="bg-background/80 p-4 rounded-md border text-sm text-muted-foreground animate-in fade-in slide-in-from-top-1 duration-200">
                                                        <strong className="block text-foreground mb-1 text-xs uppercase tracking-wider">Suggested Answer:</strong>
                                                        {q.sampleAnswer}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                  ) : (
                    <div className="space-y-8 max-w-2xl mx-auto">
                         <div className="text-center border-b pb-6 mb-6">
                            <h1 className="text-3xl font-bold uppercase tracking-wide mb-2">{generatedContent.title}</h1>
                             <div className="flex justify-center gap-8 text-muted-foreground">
                                <span className="flex items-center gap-1"><BrainCircuit className="h-4 w-4" /> {generatedContent.totalQuestions} Questions</span>
                            </div>
                        </div>
                        {generatedContent.sections.map((section, sIdx) => (
                             <div key={sIdx} className="space-y-8">
                                <h3 className="font-bold text-xl border-b pb-2 hidden">{section.title}</h3>
                                {section.questions.map((q, qIdx) => (
                                    <div key={q.id} className="space-y-4 p-4 border rounded-lg bg-card hover:shadow-sm transition-shadow">
                                        <div className="flex gap-4">
                                            <div className="flex-none font-bold text-lg text-primary">{qIdx + 1}.</div>
                                            <div className="flex-1 space-y-4">
                                                <p className="text-lg font-medium">{q.question}</p>
                                                
                                                <div className="grid gap-3">
                                                    {q.options?.map((option, oIdx) => (
                                                        <div key={oIdx} className="flex items-center space-x-3 p-3 rounded-md border hover:bg-accent cursor-pointer">
                                                            <div className="h-4 w-4 rounded-full border border-primary" />
                                                            <span>{option}</span>
                                                        </div>
                                                    ))}
                                                </div>

                                                <div className="mt-4 p-3 bg-muted/50 rounded text-sm text-muted-foreground">
                                                     <div className="flex flex-col gap-2">
                                                         <Button 
                                                            variant="secondary" 
                                                            size="sm" 
                                                            className="w-fit"
                                                            onClick={() => toggleAnswer(q.id)}
                                                         >
                                                            {revealedAnswers.has(q.id) ? "Hide Answer" : "Show Answer"}
                                                         </Button>
                                                         
                                                         {revealedAnswers.has(q.id) && (
                                                             <div className="bg-background p-2 rounded border mt-1 animate-in fade-in slide-in-from-top-1">
                                                                 <span className="font-semibold text-primary">Correct Answer:</span> {q.sampleAnswer}
                                                             </div>
                                                         )}
                                                     </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                             </div>
                        ))}
                    </div>
                  )
                ) : isGenerating ? (
                    <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-4">
                        <RefreshCw className="h-10 w-10 animate-spin text-primary" />
                        <p>Analyzing materials and generating {mode === "paper" ? "questions" : "quiz"}...</p>
                    </div>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-4 opacity-50">
                        {mode === "paper" ? <FileText className="h-16 w-16" /> : <BrainCircuit className="h-16 w-16" />}
                        <p>Configure and generate to see the preview here.</p>
                    </div>
                )}
            </div>
        </div>
      </div>
      {/* Library Selection Modal */}
      {isLibraryOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <Card className="w-full max-w-lg shadow-lg">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle>Select from Library</CardTitle>
              <Button variant="ghost" size="icon" onClick={() => setIsLibraryOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-4 max-h-[60vh] overflow-y-auto">
              {MOCK_LIBRARY_FILES.map((file) => (
                <div 
                  key={file.id} 
                  className={cn(
                    "flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors",
                    selectedFiles.some(f => f.id === file.id)
                      ? "bg-primary/10 border-primary" 
                      : "hover:bg-accent"
                  )}
                  onClick={() => toggleLibraryFile(file)}
                >
                  <div className="flex items-center gap-3">
                    <div className="bg-muted p-2 rounded">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{file.name}</p>
                      <p className="text-xs text-muted-foreground">{file.type}</p>
                    </div>
                  </div>
                  {selectedFiles.some(f => f.id === file.id) && (
                    <Check className="h-5 w-5 text-primary" />
                  )}
                </div>
              ))}
            </CardContent>
            <div className="p-4 border-t flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsLibraryOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => setIsLibraryOpen(false)}>
                Confirm Selection ({selectedFiles.filter(f => f.origin === "library").length})
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
