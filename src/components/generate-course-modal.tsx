"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { 
  X, 
  Folder, 
  FileText, 
  CheckCircle2, 
  Sparkles,
  ChevronRight,
  ChevronLeft,
} from "lucide-react";
import { auth } from "@/lib/firebase/firebase";

// Types
type Material = {
  id: string;
  title: string;
  type: "Folder" | "File";
  parentId: string | null;
};

type NewCourse = {
  days: number;
  hoursPerDay: number;
  formats: ("Text" | "Image" | "Video")[];
  selectedMaterials: string[];
};

type StudyPlan = {
  id: string;
  courseTitle: string;
  description: string;
  totalDays: number;
  currentDay: number;
  hoursPerDay: number;
  progress: number;
  status: "active" | "completed";
  format: "Text" | "Image" | "Video";
  createdAt: Date;
  updatedAt: Date;
  ownerId: string;
};

interface GenerateCourseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (plan: StudyPlan) => void;
  libraryMaterials: Material[];
  userId: string;
}

export function GenerateCourseModal({
  isOpen,
  onClose,
  onSuccess,
  libraryMaterials,
  userId,
}: GenerateCourseModalProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  
  const [newCourse, setNewCourse] = useState<NewCourse>({
    days: 4,
    hoursPerDay: 2,
    formats: ["Text"],
    selectedMaterials: [],
  });

  const toggleMaterialSelection = (id: string) => {
    setNewCourse(prev => {
      const isSelected = prev.selectedMaterials.includes(id);
      if (isSelected) {
        return { ...prev, selectedMaterials: prev.selectedMaterials.filter(m => m !== id) };
      } else {
        return { ...prev, selectedMaterials: [...prev.selectedMaterials, id] };
      }
    });
  };

  const getFileIdsFromSelection = (selectedIds: string[]): string[] => {
    const fileIds: string[] = [];
    const visited = new Set<string>();

    const collectFiles = (id: string) => {
      if (visited.has(id)) return;
      visited.add(id);

      const material = libraryMaterials.find(m => m.id === id);
      if (!material) return;

      if (material.type === 'File') {
        fileIds.push(id);
      } else if (material.type === 'Folder') {
        const children = libraryMaterials.filter(m => m.parentId === id);
        children.forEach(child => collectFiles(child.id));
      }
    };

    selectedIds.forEach(id => collectFiles(id));
    return fileIds;
  };

  const handleCreateCourse = async () => {
    if (!userId) {
      setGenerationError("User not authenticated");
      return;
    }

    if (newCourse.selectedMaterials.length === 0) {
      setGenerationError("Please select at least one material");
      return;
    }

    if (newCourse.formats.length === 0) {
      setGenerationError("Please select at least one content format");
      return;
    }

    setIsGenerating(true);
    setGenerationError(null);

    try {
      const token = await auth.currentUser?.getIdToken();

      if (!token) {
        throw new Error("Failed to get authentication token");
      }

      const response = await fetch("/api/study-plan/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          fileIds: getFileIdsFromSelection(newCourse.selectedMaterials),
          days: newCourse.days,
          hoursPerDay: newCourse.hoursPerDay,
          formats: newCourse.formats.map(f => f.toLowerCase()),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `API error: ${response.statusText}`);
      }

      if (!data.success) {
        throw new Error(data.error || "Failed to create study plan");
      }

      // Success! Call the onSuccess callback
      const newPlan: StudyPlan = {
        id: data.planId,
        courseTitle: data.courseTitle,
        description: `AI-generated ${newCourse.formats.join(", ")} course`,
        totalDays: data.totalDays,
        currentDay: 1,
        hoursPerDay: newCourse.hoursPerDay,
        progress: 0,
        status: "active",
        format: newCourse.formats[0] as "Text" | "Image" | "Video",
        createdAt: new Date(),
        updatedAt: new Date(),
        ownerId: userId,
      };

      onSuccess(newPlan);

      // Close modal and reset form
      handleClose();

    } catch (error) {
      console.error("Error creating course:", error);
      let errorMessage = error instanceof Error ? error.message : "Failed to create study plan";

      // If the error looks like it's related to Gemini/response formatting,
      // append a short suggestion for the user to try again.
      const lower = errorMessage.toLowerCase();
      const geminiIndicators = [
        'gemini',
        'format',
        'unexpected token',
        'invalid json',
        'parsing',
        'parse error',
        'response format',
      ];
      const isLikelyGemini = geminiIndicators.some(ind => lower.includes(ind));
      if (isLikelyGemini && !lower.includes('please try again')) {
        errorMessage = `AI generation error, please try again.`;
      }

      setGenerationError(errorMessage);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleClose = () => {
    setNewCourse({
      days: 4,
      hoursPerDay: 2,
      formats: ["Text"],
      selectedMaterials: [],
    });
    setCurrentFolderId(null);
    setGenerationError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card border text-card-foreground shadow-lg rounded-lg max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden">
        
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-2xl font-semibold">Generate AI Course</h2>
            <p className="text-sm text-muted-foreground">Select study duration, hours per day, content formats, and reference materials to generate your personalized course.</p>
          </div>
          <Button variant="ghost" size="icon" onClick={handleClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          
          {/* Step 1: Study Plan Settings */}
          <div className="grid gap-6">
            {/* Days Slider */}
            <div className="grid gap-3">
              <div className="flex items-center justify-between">
                <Label>Study Duration</Label>
                <span className="text-sm font-semibold text-primary">{newCourse.days} {newCourse.days === 1 ? 'day' : 'days'}</span>
              </div>
              <input 
                type="range" 
                min="1" 
                max="30" 
                step="1"
                value={newCourse.days}
                onChange={(e) => setNewCourse({...newCourse, days: parseInt(e.target.value)})}
                className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>1 day</span>
                <span>30 days</span>
              </div>
            </div>

            {/* Hours Per Day Slider */}
            <div className="grid gap-3">
              <div className="flex items-center justify-between">
                <Label>Hours Per Day</Label>
                <span className="text-sm font-semibold text-primary">{newCourse.hoursPerDay.toFixed(1)}h</span>
              </div>
              <input 
                type="range" 
                min="0.5" 
                max="24" 
                step="0.5"
                value={newCourse.hoursPerDay}
                onChange={(e) => setNewCourse({...newCourse, hoursPerDay: parseFloat(e.target.value)})}
                className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>0.5h</span>
                <span>24h</span>
              </div>
            </div>

            {/* Content Format Selection */}
            <div className="grid gap-3">
              <Label>Content Formats</Label>
              <p className="text-xs text-muted-foreground">Select one or more formats for the AI to generate</p>
              <div className="grid grid-cols-3 gap-3">
                {['Text', 'Image', 'Video'].map((format) => (
                  <button
                    key={format}
                    onClick={() => {
                      setNewCourse(prev => {
                        const isSelected = prev.formats.includes(format as 'Text' | 'Image' | 'Video');
                        if (isSelected) {
                          if (prev.formats.length === 1) return prev;
                          return {
                            ...prev,
                            formats: prev.formats.filter(f => f !== format)
                          };
                        } else {
                          return {
                            ...prev,
                            formats: [...prev.formats, format as 'Text' | 'Image' | 'Video']
                          };
                        }
                      });
                    }}
                    className={`p-3 rounded-lg border-2 transition-all font-medium text-sm ${
                      newCourse.formats.includes(format as 'Text' | 'Image' | 'Video')
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border bg-background hover:border-primary/50'
                    }`}
                  >
                    {format}
                  </button>
                ))}
              </div>
            </div>

            {/* Total Hours Summary */}
            <div className="px-4 py-3 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">
                <span className="font-semibold text-foreground">{newCourse.days * newCourse.hoursPerDay}</span> total hours of content will be generated across <span className="font-semibold text-foreground">{newCourse.days}</span> days
              </p>
            </div>
          </div>

          {/* Step 2: Select Materials (Split View) */}
          <div className="space-y-4 pt-4 border-t flex-1 flex flex-col min-h-0">
            <div>
              <h3 className="text-lg font-medium mb-1">Reference Materials</h3>
              <p className="text-sm text-muted-foreground">Select files that the AI should reference when creating your course.</p>
            </div>

            <div className="flex border rounded-md h-[300px] overflow-hidden">
                {/* Left: Folder Navigation & List */}
                <div className="flex-1 flex flex-col border-r bg-background">
                    {/* Breadcrumbs / Header */}
                    <div className="p-3 border-b bg-muted/30 flex items-center gap-2 text-sm">
                        {currentFolderId ? (
                            <>
                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setCurrentFolderId(null)}>
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>
                                <span className="font-medium truncate">
                                    {libraryMaterials.find(m => m.id === currentFolderId)?.title}
                                </span>
                            </>
                        ) : (
                            <span className="font-medium px-2">Library Root</span>
                        )}
                    </div>
                    
                    {/* List */}
                    <div className="flex-1 overflow-y-auto p-2 space-y-1">
                        {libraryMaterials
                            .filter(m => m.parentId === currentFolderId)
                            .map(material => {
                                const isSelected = newCourse.selectedMaterials.includes(material.id);
                                return (
                                    <div 
                                        key={material.id}
                                        className={`
                                            flex items-center justify-between p-2 rounded-md hover:bg-accent cursor-pointer text-sm
                                            ${isSelected ? 'bg-primary/10' : ''}
                                        `}
                                    >
                                        <div 
                                            className="flex items-center gap-2 flex-1 truncate"
                                            onClick={() => {
                                                if (material.type === 'Folder') {
                                                    setCurrentFolderId(material.id);
                                                } else {
                                                    toggleMaterialSelection(material.id);
                                                }
                                            }}
                                        >
                                            {material.type === 'Folder' ? (
                                                <Folder className="h-4 w-4 text-blue-500 fill-blue-500/20" />
                                            ) : (
                                                <FileText className="h-4 w-4 text-orange-500" />
                                            )}
                                            <span className="truncate">{material.title}</span>
                                        </div>

                                        {material.type === 'Folder' ? (
                                            <div className="flex items-center gap-1">
                                                <div 
                                                    className={`p-1 rounded-sm hover:bg-background cursor-pointer ${isSelected ? 'text-primary' : 'text-muted-foreground'}`}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        toggleMaterialSelection(material.id);
                                                    }}
                                                >
                                                    {isSelected ? <CheckCircle2 className="h-4 w-4" /> : <div className="h-3 w-3 border rounded-sm" />}
                                                </div>
                                                <div 
                                                    className="p-1 rounded-sm hover:bg-background cursor-pointer" 
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setCurrentFolderId(material.id);
                                                    }}
                                                >
                                                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                                </div>
                                            </div>
                                        ) : (
                                            <div 
                                                className={`p-1 rounded-sm hover:bg-background cursor-pointer ${isSelected ? 'text-primary' : 'text-muted-foreground'}`}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    toggleMaterialSelection(material.id);
                                                }}
                                            >
                                                {isSelected ? <CheckCircle2 className="h-4 w-4" /> : <div className="h-3 w-3 border rounded-sm" />}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        
                        {libraryMaterials.filter(m => m.parentId === currentFolderId).length === 0 && (
                            <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-sm p-4">
                                <Folder className="h-8 w-8 mb-2 opacity-50" />
                                <p>Empty Folder</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right: Selected Summary Panel */}
                <div className="w-[180px] bg-muted/10 flex flex-col">
                    <div className="p-3 border-b text-xs font-semibold uppercase tracking-wider text-muted-foreground bg-muted/30">
                        Selected
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-2">
                         {newCourse.selectedMaterials.length === 0 ? (
                            <p className="text-xs text-muted-foreground text-center mt-10">No materials selected</p>
                         ) : (
                            newCourse.selectedMaterials.map(id => {
                                const item = libraryMaterials.find(m => m.id === id);
                                if (!item) return null;
                                return (
                                    <div key={id} className="group flex items-start justify-between gap-2 text-xs bg-background border p-2 rounded shadow-sm">
                                        <span className="truncate flex-1">{item.title}</span>
                                        <button 
                                            onClick={() => toggleMaterialSelection(id)}
                                            className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
                                        >
                                            <X className="h-3 w-3" />
                                        </button>
                                    </div>
                                )
                            })
                         )}
                    </div>
                </div>
            </div>
          </div>
        </div>

        <div className="p-6 border-t bg-muted/20 space-y-3">
          {generationError && (
            <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 p-3 rounded-md">
              {generationError}
            </div>
          )}
          <div className="text-xs text-muted-foreground flex items-center gap-2">
            <Sparkles className="h-3 w-3" />
            <span>AI will generate {newCourse.days * newCourse.hoursPerDay} hours of {newCourse.formats.join(", ").toLowerCase()} content</span>
          </div>
          <div className="flex gap-2 justify-end">
            <Button 
              variant="outline" 
              onClick={handleClose}
              disabled={isGenerating}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleCreateCourse} 
              disabled={newCourse.selectedMaterials.length === 0 || newCourse.formats.length === 0 || isGenerating}
            >
              {isGenerating ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Generate Course
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
