"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea"; 
import { ArrowLeft, Clock, FileText, RefreshCw, Save, Upload, Library, X, Check, FileType, BrainCircuit, Folder, ChevronRight, Home } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/context/AuthContext";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { markdownComponents } from "@/components/markdown-renderers";
import { getExtractedTextsFromFiles } from "@/lib/firebase/firestore/getExtractedTextFromFile";
import type { QuizQuestion, QuizScore } from "@/lib/firebase/firestore/saveQuizToFirestore";
import { StatusToast } from "@/components/ui/status-toast";
import { useToastMessage } from "@/hooks/use-toast-message";
import { authenticatedFetch } from "@/lib/authenticatedFetch";
import {
  isAllowedUploadFileType,
  SUPPORTED_UPLOAD_TYPES_LABEL,
  UPLOAD_FILE_ACCEPT,
} from "@/lib/upload/fileTypePolicy";

interface GeneratedContent {
  title: string;
  duration?: string;
  totalMarks?: number;
  totalQuestions?: number;
  type: "paper" | "quiz";
  sections: {
    title: string;
    questions: {
      id: string;
      question: string;
      marks?: number;
      type: "structural" | "essay" | "mcq";
      options?: string[]; // For MCQ only
      sampleAnswer: string; // Correct answer or explanation
      subQuestions?: {
        id: string;
        question: string;
        marks: number;
        sampleAnswer: string;
      }[];
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
  mimeType: string;
  folderId?: string | null;
}

interface FileApiResponse {
  id: string;
  originalName: string;
  mimeType: string;
  folderId?: string | null;
}

interface LibraryFolder {
  id: string;
  name: string;
  parentId?: string | null;
}

interface GeneratedQuizPayload {
  mode: "mcq" | "past_year";
  title: string;
  duration?: string | null;
  totalMarks?: number | null;
  questions: QuizQuestion[];
  score: QuizScore;
}

function getFileTypeLabel(fileName: string, mimeType: string): string {
  if (mimeType === "application/pdf") return "PDF";
  if (mimeType.startsWith("image/")) return "IMG";
  if (mimeType === "text/markdown") return "MD";
  if (mimeType === "text/csv") return "CSV";
  if (mimeType === "text/plain") return "TXT";
  const extension = fileName.split(".").pop()?.toUpperCase();
  return extension || "FILE";
}

function normalizeGeneratedText(content: string): string {
  let normalized = content.replace(/\r\n/g, "\n").trim();

  const fencedBlockMatch = normalized.match(/^```(?:markdown|md|text|txt)?\n([\s\S]*?)\n```$/i);
  if (fencedBlockMatch) {
    normalized = fencedBlockMatch[1].trim();
  }

  normalized = normalized
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "")
    .replace(/\\([`*_#>\-\[\]()])/g, "$1");

  return normalized;
}

function MarkdownBlock({
  content,
  className,
}: {
  content: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "prose prose-sm max-w-none break-words text-foreground dark:prose-invert prose-p:text-foreground prose-li:text-foreground prose-strong:text-foreground prose-headings:text-foreground",
        className
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => <p className="my-2 leading-relaxed">{children}</p>,
          li: ({ children }) => <li className="my-1">{children}</li>,
          ul: ({ children }) => <ul className="my-2 list-disc pl-5">{children}</ul>,
          ol: ({ children }) => <ol className="my-2 list-decimal pl-5">{children}</ol>,
          table: ({ children }) => (
            <div className="my-3 overflow-x-auto rounded-md border">
              <table className="w-full border-collapse text-sm">{children}</table>
            </div>
          ),
          th: ({ children }) => (
            <th className="border bg-muted/40 px-2 py-1 text-left align-top whitespace-normal break-words">{children}</th>
          ),
          td: ({ children }) => (
            <td className="border px-2 py-1 align-top whitespace-normal break-words">{children}</td>
          ),
          code: markdownComponents.code,
        }}
      >
        {normalizeGeneratedText(content)}
      </ReactMarkdown>
    </div>
  );
}

function mapGeneratedQuizToPreview(data: GeneratedQuizPayload): GeneratedContent {
  if (data.mode === "mcq") {
    return {
      title: data.title,
      type: "quiz",
      totalQuestions: data.questions.length,
      sections: [
        {
          title: "Multiple Choice Questions",
          questions: data.questions.map((question) => {
            if (question.type === "mcq") {
              const correct = question.options[question.correctAnswerIndex] || "";
              return {
                id: question.id,
                type: "mcq" as const,
                question: question.question,
                options: question.options,
                sampleAnswer: correct,
              };
            }

            return {
              id: question.id,
              type: "essay" as const,
              question: question.question,
              sampleAnswer: question.sampleAnswer,
            };
          }),
        },
      ],
    };
  }

  return {
    title: data.title,
    type: "paper",
    duration: data.duration || undefined,
    totalMarks: data.totalMarks || undefined,
    sections: [
      {
        title: "Generated Questions",
        questions: data.questions.map((question) => {
          if (question.type === "mcq") {
            const correct = question.options[question.correctAnswerIndex] || "";
            return {
              id: question.id,
              type: "mcq" as const,
              marks: question.marks,
              question: question.question,
              options: question.options,
              sampleAnswer: correct,
            };
          }

          return {
            id: question.id,
            type: question.marks >= 10 ? ("essay" as const) : ("structural" as const),
            marks: question.marks,
            question: question.question,
            sampleAnswer: question.sampleAnswer,
            subQuestions: question.subQuestions,
          };
        }),
      },
    ],
  };
}

export default function GeneratorPage() {
  const router = useRouter();
  const { userId, loading: authLoading } = useAuth();
  const { toast, showLoading, showToast, clearToast } = useToastMessage();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLibraryLoading, setIsLibraryLoading] = useState(false);
  const [isPreviewSaved, setIsPreviewSaved] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<GeneratedContent | null>(null);
  const [generatedPayload, setGeneratedPayload] = useState<GeneratedQuizPayload | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [libraryFiles, setLibraryFiles] = useState<LibraryFile[]>([]);
  const [libraryFolders, setLibraryFolders] = useState<LibraryFolder[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);

  // Form State
  const [mode, setMode] = useState<"quiz" | "paper">("paper");
  const [selectedSyllabusFiles, setSelectedSyllabusFiles] = useState<SelectedFile[]>([]);
  const [selectedReferenceFiles, setSelectedReferenceFiles] = useState<SelectedFile[]>([]);
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const [libraryTarget, setLibraryTarget] = useState<"syllabus" | "reference">("syllabus");
  const [prompt, setPrompt] = useState("");
  
  // Paper Specific State
  const [timeLimit, setTimeLimit] = useState("120");
  const [totalMarks, setTotalMarks] = useState("100");

  // Quiz Specific State
  const [questionCount, setQuestionCount] = useState("20");
  const [quizTimeLimit, setQuizTimeLimit] = useState("30");

  const [revealedAnswers, setRevealedAnswers] = useState<Set<string>>(new Set());

  const loadLibraryFiles = async (activeUserId: string): Promise<LibraryFile[]> => {
    setIsLibraryLoading(true);
    try {
      const [filesRes, foldersRes] = await Promise.all([
        authenticatedFetch(`/api/get-files?userId=${encodeURIComponent(activeUserId)}`),
        authenticatedFetch(`/api/folders?action=get-all&userId=${encodeURIComponent(activeUserId)}`)
      ]);

      if (!filesRes.ok) {
        const data = await filesRes.json();
        throw new Error(data.error || "Failed to load library files");
      }

      const filesData = await filesRes.json();
      const files = (filesData.files || []).map((file: FileApiResponse) => ({
        id: file.id,
        name: file.originalName,
        type: getFileTypeLabel(file.originalName, file.mimeType),
        mimeType: file.mimeType,
        folderId: file.folderId || null,
      }));
      setLibraryFiles(files);

      if (foldersRes.ok) {
        const foldersData = await foldersRes.json();
        setLibraryFolders(foldersData.folders || []);
      }
      
      return files;
    } finally {
      setIsLibraryLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!userId) {
      setLibraryFiles([]);
      setErrorMessage("Please sign in to load your library files.");
      return;
    }

    void loadLibraryFiles(userId);
  }, [authLoading, userId]);

  const toggleAnswer = (id: string) => {
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

  const getSelectedFilesByTarget = (target: "syllabus" | "reference") => {
    return target === "syllabus" ? selectedSyllabusFiles : selectedReferenceFiles;
  };

  const setSelectedFilesByTarget = (
    target: "syllabus" | "reference",
    updater: (prev: SelectedFile[]) => SelectedFile[]
  ) => {
    if (target === "syllabus") {
      setSelectedSyllabusFiles((prev) => updater(prev));
      return;
    }

    setSelectedReferenceFiles((prev) => updater(prev));
  };

  const toggleLibraryFile = (file: LibraryFile, target: "syllabus" | "reference") => {
    setSelectedFilesByTarget(target, (prev) => {
      const exists = prev.find((f) => f.id === file.id);
      if (exists) {
        return prev.filter((f) => f.id !== file.id);
      }

      return [...prev, {
        id: file.id,
        name: file.name,
        type: file.type,
        origin: "library",
        role: target === "syllabus" ? "source" : "reference",
      }];
    });
  };

  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    target: "syllabus" | "reference"
  ) => {
    if (!e.target.files || e.target.files.length === 0) return;
    if (!userId) {
      const message = "Please sign in before uploading files.";
      setErrorMessage(message);
      showToast(message, "error");
      return;
    }

    setErrorMessage("");
    const filesToUpload = Array.from(e.target.files);
    e.target.value = "";

    const unsupportedFiles = filesToUpload.filter((file) => !isAllowedUploadFileType(file.type, file.name));
    if (unsupportedFiles.length > 0) {
      const message = `Unsupported file type: ${unsupportedFiles[0].name}. Allowed: ${SUPPORTED_UPLOAD_TYPES_LABEL}.`;
      setErrorMessage(message);
      showToast(message, "error");
      return;
    }

    try {
      showLoading(
        filesToUpload.length > 1
          ? `Uploading ${filesToUpload.length} files...`
          : `Uploading ${filesToUpload[0]?.name || "file"}...`
      );

      let existingCount = 0;
      let uploadedCount = 0;

      for (const file of filesToUpload) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("userId", userId);

        const response = await authenticatedFetch("/api/upload-file", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || `Failed to upload ${file.name}`);
        }

        const payload = await response.json();
        const alreadyExists = payload?.uploadResult?.alreadyExists === true;
        if (alreadyExists) {
          existingCount += 1;
        } else {
          uploadedCount += 1;
        }
      }

      const refreshedFiles = await loadLibraryFiles(userId);
      const added = filesToUpload
        .map((uploaded) =>
          refreshedFiles.find((item) => item.name === uploaded.name)
        )
        .filter((item): item is LibraryFile => Boolean(item));

      if (added.length > 0) {
        setSelectedFilesByTarget(target, (prev) => {
          const existingIds = new Set(prev.map((item) => item.id));
          const toAdd: SelectedFile[] = added
            .filter((item) => !existingIds.has(item.id))
            .map((item) => ({
              id: item.id,
              name: item.name,
              type: item.type,
              origin: "library",
              role: target === "syllabus" ? "source" : "reference",
            }));

          return [...prev, ...toAdd];
        });
      }

      if (filesToUpload.length === 1) {
        showToast(existingCount === 1 ? "File already exists in library" : "File uploaded successfully", "success");
      } else if (existingCount > 0 && uploadedCount > 0) {
        showToast(`${uploadedCount} uploaded, ${existingCount} already existed`, "success");
      } else if (existingCount === filesToUpload.length) {
        showToast(`${existingCount} files already exist in library`, "success");
      } else {
        showToast(`${uploadedCount} files uploaded successfully`, "success");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to upload files";
      setErrorMessage(message);
      showToast(message, "error");
    }
  };

  const removeFile = (id: string, target: "syllabus" | "reference") => {
    setSelectedFilesByTarget(target, (prev) => prev.filter((f) => f.id !== id));
  };

  const handleGenerate = async () => {
    if (!userId) {
      setErrorMessage("Please sign in before generating content.");
      return;
    }

    setErrorMessage("");

    const sourceFileIds = selectedSyllabusFiles.map((file) => file.id);
    const referenceFileIds = selectedReferenceFiles.map((file) => file.id);
    const hasPrompt = prompt.trim().length > 0;
    const hasAnyInput = sourceFileIds.length > 0 || referenceFileIds.length > 0 || hasPrompt;

    if (!hasAnyInput) {
      setErrorMessage("Provide at least one input: material file, mock exam file, or prompt.");
      return;
    }

    setIsGenerating(true);
    try {
      let sourceText: string[] = [];
      if (sourceFileIds.length > 0) {
        const sourceResults = await getExtractedTextsFromFiles(sourceFileIds, userId);
        sourceText = sourceResults
          .map((item) => (item.extractedText || "").trim())
          .filter((text) => text.length > 0);
      }

      let pastYearText: string[] = [];
      if (mode === "paper") {
        if (referenceFileIds.length > 0) {
          const referenceResults = await getExtractedTextsFromFiles(referenceFileIds, userId);
          pastYearText = referenceResults
            .map((item) => (item.extractedText || "").trim())
            .filter((text) => text.length > 0);
        }
      }

      const apiMode = mode === "quiz" ? "mcq" : "past_year";
      const payload = {
        mode: apiMode,
        sourceText,
        pastYearText: apiMode === "past_year" ? pastYearText : undefined,
        numQuestions:
          apiMode === "mcq"
            ? Math.max(1, Number.parseInt(questionCount, 10) || 20)
            : Math.max(1, Math.round((Number.parseInt(totalMarks, 10) || 100) / 5)),
        customPrompt: prompt,
        duration:
          apiMode === "past_year"
            ? `${timeLimit} minutes`
            : `${Math.max(1, Number.parseInt(quizTimeLimit, 10) || 30)} minutes`,
        totalMarks: apiMode === "past_year" ? Number.parseInt(totalMarks, 10) || 100 : undefined,
      };

      const response = await fetch("/api/ai-generate-quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.details || data.error || "Failed to generate quiz");
      }

      const generated: GeneratedQuizPayload = {
        mode: apiMode,
        title: data.title,
        duration:
          apiMode === "past_year"
            ? (data.duration || `${timeLimit} minutes`)
            : `${Math.max(1, Number.parseInt(quizTimeLimit, 10) || 30)} minutes`,
        totalMarks: data.totalMarks,
        questions: data.questions,
        score: data.score,
      };

      setGeneratedPayload(generated);
      setGeneratedContent(mapGeneratedQuizToPreview(generated));
      setRevealedAnswers(new Set());
      setIsPreviewSaved(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to generate content";
      setErrorMessage(message);
      setGeneratedPayload(null);
      setGeneratedContent(null);
      setIsPreviewSaved(false);
    } finally {
      setIsGenerating(false);
    }
  };

  const renderFileSection = (target: "syllabus" | "reference", title: string, description: string) => {
    const selectedFiles = getSelectedFilesByTarget(target);

    return (
      <div className="space-y-3">
        <div>
          <label className="text-sm font-medium">{title}</label>
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setLibraryTarget(target);
              setCurrentFolderId(null);
              setIsLibraryOpen(true);
            }}
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
              accept={UPLOAD_FILE_ACCEPT}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              onChange={(event) => {
                void handleFileUpload(event, target);
              }}
            />
          </div>
        </div>

        <div className="bg-muted/30 rounded-lg border min-h-[120px] p-2 space-y-2">
          {selectedFiles.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground py-6 text-sm">
              <FileText className="h-7 w-7 mb-2 opacity-50" />
              <p>No files selected</p>
            </div>
          ) : (
            selectedFiles.map((file) => (
              <div key={file.id} className="bg-background border rounded-md p-3 text-sm shadow-sm group">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <div className="bg-primary/10 p-1.5 rounded shrink-0">
                      <FileType className="h-4 w-4 text-primary" />
                    </div>
                    <span className="font-medium truncate">{file.name}</span>
                  </div>
                  <button
                    onClick={() => removeFile(file.id, target)}
                    className="text-muted-foreground hover:text-destructive shrink-0"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  };

  const handleSave = async () => {
    if (!generatedPayload) return;
    if (!userId) {
      setErrorMessage("Please sign in before saving.");
      showToast("Please sign in before saving.", "error");
      return;
    }

    setIsSaving(true);
    setErrorMessage("");
    try {
      const response = await authenticatedFetch("/api/quizzes/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ownerId: userId,
          mode: generatedPayload.mode,
          timerSettings: {
            durationMinutes:
              generatedPayload.duration && generatedPayload.duration.includes("minutes")
                ? Number.parseInt(generatedPayload.duration, 10) || null
                : null,
            timerEnabled: true,
          },
          quizData: {
            title: generatedPayload.title,
            questions: generatedPayload.questions,
            score: generatedPayload.score,
          },
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.details || data.error || "Failed to save quiz");
      }

      setIsPreviewSaved(true);
      showToast("Saved to Exam Prep successfully", "success");
      setTimeout(() => {
        router.push("/exam-prep");
      }, 500);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to save quiz";
      setErrorMessage(message);
      showToast(message, "error");
    } finally {
      setIsSaving(false);
    }
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
          <h1 className="text-2xl font-bold">Exam Generator</h1>
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
            {errorMessage && (
              <div className="text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-md px-3 py-2">
                {errorMessage}
              </div>
            )}
            
            {/* Mode Selection */}
            <Tabs 
                value={mode} 
                onValueChange={(v) => {
                    setMode(v as "paper" | "quiz");
                    setGeneratedContent(null);
                setGeneratedPayload(null);
                setRevealedAnswers(new Set());
                setIsPreviewSaved(false);
                }} 
                className="w-full"
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="paper">Mock Exam</TabsTrigger>
                <TabsTrigger value="quiz">Quiz (MCQ)</TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="space-y-4">
              {renderFileSection(
              "syllabus",
              "Syllabus / Materials",
              "Upload or pick materials to generate questions from."
              )}

              {mode === "paper" &&
              renderFileSection(
                "reference",
                "Exam Paper (Reference Format)",
                "Upload or pick past exam paper files to guide question format/style."
              )}
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
                <div className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Time Limit (mins)</label>
                        <Input
                            type="number"
                            min={1}
                            value={quizTimeLimit}
                            onChange={(e) => setQuizTimeLimit(e.target.value)}
                        />
                    </div>

                    <div className="space-y-2">
                    <label className="text-sm font-medium">Number of Questions</label>
                    <Input 
                        type="number" 
                        value={questionCount} 
                        onChange={(e) => setQuestionCount(e.target.value)} 
                    />
                    </div>
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
                    {generatedContent && !isPreviewSaved && (
                      <span className="text-xs bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300 px-2 py-0.5 rounded-full font-normal">
                        Save to enable actions
                      </span>
                    )}
                </h2>
                <Button 
                    variant="default" 
                    size="sm" 
                  disabled={!generatedContent || isSaving} 
                  onClick={() => void handleSave()}
                >
                  <Save className="mr-2 h-4 w-4" /> {isSaving ? "Saving..." : `Save ${mode === "paper" ? "Paper" : "Quiz"}`}
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
                                            
                                            <MarkdownBlock
                                              content={q.question}
                                              className="mb-4 text-foreground"
                                            />
                                            
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
                                                   q.subQuestions && q.subQuestions.length > 0 ? (
                                                     <div className="space-y-4 pl-4 border-l-2 border-muted-foreground/30">
                                                      {q.subQuestions.map((sq) => (
                                                        <div key={sq.id} className="mb-4">
                                                          <div className="flex justify-between items-center mb-2">
                                                            <span className="font-semibold">{sq.id})</span>
                                                            <span className="text-xs text-muted-foreground ml-2">({sq.marks} marks)</span>
                                                          </div>
                                                          <div className="mb-2">
                                                            <MarkdownBlock content={sq.question} />
                                                          </div>
                                                          <div className="space-y-2 pl-4">
                                                            <div className="h-6 border-b border-muted-foreground/30 w-full"></div>
                                                            <div className="h-6 border-b border-muted-foreground/30 w-3/4"></div>
                                                          </div>
                                                          
                                                          {/* Show sub-question answer if parent is revealed */}
                                                          {revealedAnswers.has(q.id) && (
                                                            <div className="mt-2 p-3 bg-muted rounded text-sm relative">
                                                              <div className="absolute top-2 right-2 text-xs text-muted-foreground uppercase tracking-wider font-bold">Answer ({sq.id})</div>
                                                              <MarkdownBlock content={sq.sampleAnswer} />
                                                            </div>
                                                          )}
                                                        </div>
                                                      ))}
                                                     </div>
                                                   ) : (
                                                    <div className="space-y-3 pl-4 border-l-2 border-dashed border-muted-foreground/30">
                                                        <div className="h-6 border-b border-muted-foreground/30 w-full"></div>
                                                        <div className="h-6 border-b border-muted-foreground/30 w-3/4"></div>
                                                        <div className="h-6 border-b border-muted-foreground/30 w-1/2"></div>
                                                    </div>
                                                   )
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
                                                  disabled={!isPreviewSaved}
                                                >
                                                    {revealedAnswers.has(q.id) ? "Hide Answer" : "Show Answer"}
                                                </Button>
                                                
                                                {revealedAnswers.has(q.id) && (
                                                    <div className="bg-background/80 p-4 rounded-md border text-sm text-muted-foreground animate-in fade-in slide-in-from-top-1 duration-200">
                                                        <strong className="block text-foreground mb-1 text-xs uppercase tracking-wider">
                                                          {q.type === "structural" && q.subQuestions && q.subQuestions.length > 0
                                                            ? "Overall Suggested Answer / Notes:" 
                                                            : "Suggested Answer:"}
                                                        </strong>
                                                        {q.type === "structural" && q.subQuestions && q.subQuestions.length > 0 && !q.sampleAnswer ? (
                                                            <p className="italic">See individual answers above.</p>
                                                        ) : (
                                                            <MarkdownBlock content={q.sampleAnswer} className="text-muted-foreground" />
                                                        )}
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
                            <span className="flex items-center gap-1"><Clock className="h-4 w-4" /> {`${Math.max(1, Number.parseInt(quizTimeLimit, 10) || 30)} min`}</span>
                            </div>
                        </div>
                        {generatedContent.sections.map((section, sIdx) => (
                             <div key={sIdx} className="space-y-8">
                                <h3 className="font-bold text-xl border-b pb-2 hidden">{section.title}</h3>
                                {section.questions.map((q) => (
                                    <div key={q.id} className="space-y-4 p-4 border rounded-lg bg-card hover:shadow-sm transition-shadow">
                                        <div className="flex gap-4">
                                            <div className="flex-1 space-y-4">
                                                <MarkdownBlock
                                                  content={q.question}
                                                  className="text-foreground"
                                                />
                                                
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
                                                          disabled={!isPreviewSaved}
                                                         >
                                                            {revealedAnswers.has(q.id) ? "Hide Answer" : "Show Answer"}
                                                         </Button>
                                                         
                                                         {revealedAnswers.has(q.id) && (
                                                             <div className="bg-background p-2 rounded border mt-1 animate-in fade-in slide-in-from-top-1">
                                                             <span className="font-semibold text-primary">Correct Answer:</span>
                                                             <MarkdownBlock content={q.sampleAnswer} className="text-muted-foreground" />
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
              <CardTitle>
                Select from Library ({libraryTarget === "syllabus" ? "Syllabus / Materials" : "Exam Paper Reference"})
              </CardTitle>
              <Button variant="ghost" size="icon" onClick={() => setIsLibraryOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-2 max-h-[60vh] overflow-y-auto">
              {isLibraryLoading && (
                <div className="text-sm text-muted-foreground p-4 text-center">Loading library files...</div>
              )}
              
              {!isLibraryLoading && (
                <>
                  {/* Breadcrumbs / Back Navigation */}
                  <div className="flex items-center gap-2 mb-2 pb-2 border-b text-sm">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2 text-muted-foreground hover:text-foreground"
                      onClick={() => setCurrentFolderId(null)}
                      disabled={!currentFolderId}
                    >
                      <Home className="h-4 w-4" />
                    </Button>
                    {currentFolderId && (
                      <>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium truncate max-w-[150px]">
                          {libraryFolders.find(f => f.id === currentFolderId)?.name || "Folder"}
                        </span>
                      </>
                    )}
                  </div>

                  {/* Empty State */}
                  {libraryFolders.length === 0 && libraryFiles.length === 0 && (
                     <div className="text-sm text-muted-foreground p-8 text-center">Library is empty.</div>
                  )}

                  {/* Folders - only show at root level since structure is flat for now */}
                  <div className="space-y-1">
                    {!currentFolderId && libraryFolders.map((folder) => (
                      <div
                        key={folder.id}
                        className="flex items-center justify-between p-2 rounded-md hover:bg-accent cursor-pointer group"
                        onClick={() => setCurrentFolderId(folder.id)}
                      >
                        <div className="flex items-center gap-3">
                          <Folder className="h-5 w-5 text-blue-400 fill-blue-400/20" />
                          <span className="text-sm font-medium">{folder.name}</span>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    ))}
                  </div>

                  {/* Files - filtered by current folder */}
                  <div className="space-y-1">
                    {libraryFiles
                      .filter((file) => {
                          const fileFolderId = file.folderId || null;
                          const current = currentFolderId || null;
                          return fileFolderId === current;
                      })
                      .map((file) => {
                        const isSelected = getSelectedFilesByTarget(libraryTarget).some(f => f.id === file.id);
                        return (
                          <div
                            key={file.id}
                            className={cn(
                              "flex items-center justify-between p-2 rounded-md border border-transparent cursor-pointer transition-colors",
                              isSelected
                                ? "bg-primary/10 border-primary/20"
                                : "hover:bg-accent hover:border-accent"
                            )}
                            onClick={() => toggleLibraryFile(file, libraryTarget)}
                          >
                            <div className="flex items-center gap-3 overflow-hidden">
                              <div className={cn("p-1.5 rounded shrink-0", isSelected ? "bg-primary/20" : "bg-muted")}>
                                <FileText className={cn("h-4 w-4", isSelected ? "text-primary" : "text-muted-foreground")} />
                              </div>
                              <div className="overflow-hidden">
                                <p className="font-medium text-sm truncate">{file.name}</p>
                                <p className="text-[10px] text-muted-foreground uppercase">{file.type}</p>
                              </div>
                            </div>
                            {isSelected && (
                              <Check className="h-4 w-4 text-primary shrink-0" />
                            )}
                          </div>
                        );
                      })}
                      
                      {/* Empty Folder State */}
                      {!isLibraryLoading && 
                       libraryFolders.filter(f => (f.parentId || null) === currentFolderId).length === 0 &&
                       libraryFiles.filter(f => (f.folderId || null) === currentFolderId).length === 0 && (
                        <div className="text-sm text-muted-foreground py-8 text-center italic">
                          This folder is empty.
                        </div>
                      )}
                  </div>
                </>
              )}
            </CardContent>
            <div className="p-4 border-t flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsLibraryOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => setIsLibraryOpen(false)}>
                Confirm Selection ({getSelectedFilesByTarget(libraryTarget).length})
              </Button>
            </div>
          </Card>
        </div>
      )}
      <StatusToast toast={toast} onClose={clearToast} />
    </div>
  );
}
