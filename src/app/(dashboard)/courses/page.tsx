"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Clock, 
  X, 
  Folder, 
  FileText, 
  CheckCircle2, 
  Sparkles,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import Link from "next/link";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase/firebase";
import { useAuth } from "@/context/AuthContext";

// Types
type StudyPlan = {
  id: string;
  courseTitle: string;
  description: string;
  totalDays: number;
  currentDay: number;
  hoursPerDay: number;
  progress: number;
  status: string;
  format: "Text" | "Image" | "Video";
  createdAt: Date;
  updatedAt: Date;
  ownerId: string;
};

type Material = {
  id: string;
  title: string;
  type: "Folder" | "File";
  parentId: string | null;
};

// Mock Library Data (Folders & Files)
const mockLibraryMaterials: Material[] = [
  { id: "1", title: "Introduction to CS", type: "Folder", parentId: null },
  { id: "2", title: "Data Structures", type: "Folder", parentId: null },
  { id: "3", title: "Algorithms.pdf", type: "File", parentId: "1" },
  { id: "4", title: "Clean Code", type: "File", parentId: null },
  { id: "5", title: "Design Patterns", type: "Folder", parentId: null },
  { id: "51", title: "Factory Pattern.pdf", type: "File", parentId: "5" },
  { id: "52", title: "Observer Pattern.pdf", type: "File", parentId: "5" },
  { id: "6", title: "React Hooks Cheat Sheet", type: "File", parentId: null },
];

export default function AICoursePage() {
  const { userId } = useAuth();

  // --- State ---
  const [studyPlans, setStudyPlans] = useState<StudyPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [sortBy, setSortBy] = useState<'createdAt' | 'lastAccessedAt' | 'name'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  
  // Material Selection State
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  
  // Form State
  const [newCourse, setNewCourse] = useState<{
    topic: string;
    customPrompt: string;
    availability: string;
    format: "Text" | "Image" | "Video";
    difficulty: "Beginner" | "Intermediate" | "Advanced";
    pace: "Slow" | "Normal" | "Fast";
    focusAreas: string;
    selectedMaterials: string[];
  }>({
    topic: "",
    customPrompt: "",
    availability: "",
    format: "Text",
    difficulty: "Beginner",
    pace: "Normal",
    focusAreas: "",
    selectedMaterials: [],
  });

  // Fetch study plans for the current user
  useEffect(() => {
    const fetchPlans = async () => {
      if (!userId) return;
      
      try {
        const plansRef = collection(db, 'plans');
        const q = query(plansRef, where('ownerId', '==', userId));
        const snapshot = await getDocs(q);
        const plans = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            createdAt: data.createdAt?.toDate(),
            updatedAt: data.updatedAt?.toDate(),
          } as StudyPlan;
        });
        
        setStudyPlans(plans);
      } catch (error) {
        console.error('Error fetching plans:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPlans();
  }, [userId]);

  // --- Handlers ---

  const handleCreateCourse = async () => {
    if (!userId) return;
    
    try {
      // TODO: Call backend API to create the study plan
      // For now, just add to local state and close the modal
      const now = new Date();
      const createdPlan: StudyPlan = {
        id: `plan_${Date.now()}`,
        courseTitle: newCourse.topic || "Untitled Course",
        description: `AI-generated personalized course${newCourse.customPrompt ? ` - ${newCourse.customPrompt}` : ''}`,
        totalDays: 7,
        currentDay: 1,
        hoursPerDay: parseInt(newCourse.availability) || 10,
        status: "generating",
        format: newCourse.format,
        createdAt: now,
        updatedAt: now,
        ownerId: userId,
      };

      setStudyPlans([createdPlan, ...studyPlans]);
      setIsCreating(false);
      // Reset form
      setNewCourse({
        topic: "",
        customPrompt: "",
        availability: "",
        format: "Text",
        difficulty: "Beginner",
        pace: "Normal",
        focusAreas: "",
        selectedMaterials: [],
      });
    } catch (error) {
      console.error('Error creating course:', error);
    }
  };

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

  const getSortedPlans = () => {
    const sorted = [...studyPlans];
    
    if (sortBy === 'createdAt') {
      if (sortOrder === 'desc') {
        sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      } else {
        sorted.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      }
    } else if (sortBy === 'lastAccessedAt') {
      if (sortOrder === 'desc') {
        sorted.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      } else {
        sorted.sort((a, b) => new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime());
      }
    } else if (sortBy === 'name') {
      if (sortOrder === 'desc') {
        sorted.sort((a, b) => b.courseTitle.localeCompare(a.courseTitle));
      } else {
        sorted.sort((a, b) => a.courseTitle.localeCompare(b.courseTitle));
      }
    }
    
    return sorted;
  };

  const getSortLabel = () => {
    switch (sortBy) {
      case 'createdAt':
        return 'Time Created';
      case 'lastAccessedAt':
        return 'Last Access';
      case 'name':
        return 'Name';
      default:
        return 'Sort';
    }
  };

  return (
    <div className="space-y-6 relative h-full">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My AI Courses</h1>
          <p className="text-muted-foreground mt-2">Create personalized AI-generated courses from your materials with custom prompts and preferences.</p>
        </div>
        <Button className="gap-2" onClick={() => setIsCreating(true)}>
          <Sparkles className="h-4 w-4" />
          Generate Course
        </Button>
      </div>

      {/* Sort Controls */}
      {studyPlans.length > 0 && (
        <div className="flex items-center gap-2 relative">
          <div className="flex items-center gap-2 border rounded-md bg-background">
            <div className="relative">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setShowSortDropdown(!showSortDropdown)}
                className="gap-2"
              >
                {getSortLabel()}
                <ChevronDown className="h-4 w-4" />
              </Button>
              
              {showSortDropdown && (
                <div className="absolute top-full left-0 mt-1 w-48 bg-background border rounded-md shadow-lg z-50">
                  <button 
                    onClick={() => {
                      setSortBy('createdAt');
                      setShowSortDropdown(false);
                    }}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-accent ${
                      sortBy === 'createdAt' ? 'bg-primary/10 text-primary font-semibold' : ''
                    }`}
                  >
                    Time Created
                  </button>
                  <button 
                    onClick={() => {
                      setSortBy('lastAccessedAt');
                      setShowSortDropdown(false);
                    }}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-accent ${
                      sortBy === 'lastAccessedAt' ? 'bg-primary/10 text-primary font-semibold' : ''
                    }`}
                  >
                    Last Access
                  </button>
                  <button 
                    onClick={() => {
                      setSortBy('name');
                      setShowSortDropdown(false);
                    }}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-accent ${
                      sortBy === 'name' ? 'bg-primary/10 text-primary font-semibold' : ''
                    }`}
                  >
                    Name
                  </button>
                </div>
              )}
            </div>
            
            <div className="border-l h-6" />
            
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              title={sortOrder === 'asc' ? 'Ascending' : 'Descending'}
              className="gap-1"
            >
              {sortOrder === 'asc' ? (
                <ArrowUp className="h-4 w-4" />
              ) : (
                <ArrowDown className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Courses Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          <div className="col-span-full flex items-center justify-center py-12">
            <p className="text-muted-foreground">Loading your courses...</p>
          </div>
        ) : studyPlans.length === 0 ? (
          <div className="col-span-full flex items-center justify-center py-12">
            <p className="text-muted-foreground">No courses yet. Create your first AI course!</p>
          </div>
        ) : (
          getSortedPlans().map((plan) => {
            const progress = plan.progress || 0;
            
            return (
              <Link href={`/courses/${plan.id}`} key={plan.id} className="block">
                <Card className="hover:shadow-md transition-shadow cursor-pointer border-l-4" style={{ 
                  // borderLeftColor: plan.format === 'Video' ? '#3b82f6' : plan.format === 'Image' ? '#10b981' : '#f59e0b' 
                }}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-xl">{plan.courseTitle}</CardTitle>
                      <div className="flex flex-col gap-1 items-end">
                        <div className={`text-xs px-2 py-1 rounded-full ${
                          plan.status === 'generating' 
                            ? 'bg-yellow-500/10 text-yellow-700'
                            : plan.status === 'ready'
                            ? 'bg-green-500/10 text-green-700'
                            : 'bg-red-500/10 text-red-700'
                        }`}>
                          {plan.status === 'generating' ? 'Generating...' : plan.status === 'ready' ? 'Ready' : 'Error'}
                        </div>
                      </div>
                    </div>
                    <CardDescription className="line-clamp-2 mt-2">{plan.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col gap-4">
                      {/* Course Stats */}
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div className="text-center">
                          <div className="font-semibold">{plan.totalDays}</div>
                          <div className="text-muted-foreground">Days</div>
                        </div>
                        <div className="text-center">
                          <div className="font-semibold">{plan.hoursPerDay}h</div>
                          <div className="text-muted-foreground">Per Day</div>
                        </div>
                        <div className="text-center">
                          <div className="font-semibold">{plan.totalDays * plan.hoursPerDay}h</div>
                          <div className="text-muted-foreground">Total</div>
                        </div>
                      </div>
                      
                      {/* Progress Bar */}
                      <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                        <div 
                          className="bg-primary h-full rounded-full transition-all duration-500 ease-in-out" 
                          style={{ width: `${progress}%` }}
                        />
                      </div>

                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <span className="font-medium">{progress}% Completed</span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" /> Day {plan.currentDay}/{plan.totalDays}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })
        )}
      </div>

      {/* --- Create Course Modal (Overlay) --- */}
      {isCreating && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border text-card-foreground shadow-lg rounded-lg max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden">
            
            <div className="flex items-center justify-between p-6 border-b">
              <div>
                <h2 className="text-2xl font-semibold">Generate AI Course</h2>
                <p className="text-sm text-muted-foreground">Create a personalized course from your materials with custom AI prompts and preferences.</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setIsCreating(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              
              {/* Step 1: Basic Course Info */}
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="topic">Course Topic</Label>
                  <Input 
                    id="topic" 
                    placeholder="e.g. Master Linear Algebra, Introduction to Machine Learning" 
                    value={newCourse.topic}
                    onChange={(e) => setNewCourse({...newCourse, topic: e.target.value})}
                  />
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="customPrompt">Custom AI Prompt (Optional)</Label>
                  <Textarea 
                    id="customPrompt" 
                    placeholder="e.g. Focus on practical applications, include lots of examples, make it beginner-friendly..."
                    rows={3}
                    value={newCourse.customPrompt}
                    onChange={(e) => setNewCourse({...newCourse, customPrompt: e.target.value})}
                  />
                  <p className="text-xs text-muted-foreground">Tell the AI how you want your course structured and what to emphasize.</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="availability">Weekly Hours</Label>
                    <Input 
                      id="availability" 
                      type="number" 
                      placeholder="e.g. 10" 
                      value={newCourse.availability}
                      onChange={(e) => setNewCourse({...newCourse, availability: e.target.value})}
                    />
                  </div>
                  
                  <div className="grid gap-2">
                    <Label>Content Format</Label>
                    <div className="flex items-center space-x-4 pt-2">
                        <div className="flex items-center space-x-2">
                          <input 
                              type="radio" 
                              id="fmt-text" 
                              name="format" 
                              value="Text" 
                              checked={newCourse.format === "Text"}
                              onChange={() => setNewCourse({...newCourse, format: "Text"})}
                              className="radio w-4 h-4 border-primary text-primary"
                          />
                          <Label htmlFor="fmt-text">Text</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <input 
                              type="radio" 
                              id="fmt-image" 
                              name="format" 
                              value="Image" 
                              checked={newCourse.format === "Image"}
                              onChange={() => setNewCourse({...newCourse, format: "Image"})}
                              className="radio w-4 h-4 border-primary text-primary"
                          />
                          <Label htmlFor="fmt-image">Image</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <input 
                              type="radio" 
                              id="fmt-video" 
                              name="format" 
                              value="Video" 
                              checked={newCourse.format === "Video"}
                              onChange={() => setNewCourse({...newCourse, format: "Video"})}
                              className="radio w-4 h-4 border-primary text-primary"
                          />
                          <Label htmlFor="fmt-video">Video</Label>
                        </div>
                    </div>
                  </div>
                </div>

                {/* Learning Preferences */}
                <div className="space-y-4 pt-4 border-t">
                  <h3 className="font-medium">Learning Preferences</h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Difficulty Level</Label>
                      <select 
                        className="w-full p-2 border rounded-md text-sm" 
                        value={newCourse.difficulty}
                        onChange={(e) => setNewCourse({...newCourse, difficulty: e.target.value as "Beginner" | "Intermediate" | "Advanced"})}
                      >
                        <option value="Beginner">Beginner</option>
                        <option value="Intermediate">Intermediate</option>
                        <option value="Advanced">Advanced</option>
                      </select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Learning Pace</Label>
                      <select 
                        className="w-full p-2 border rounded-md text-sm" 
                        value={newCourse.pace}
                        onChange={(e) => setNewCourse({...newCourse, pace: e.target.value as "Slow" | "Normal" | "Fast"})}
                      >
                        <option value="Slow">Slow & Detailed</option>
                        <option value="Normal">Normal</option>
                        <option value="Fast">Fast & Concise</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="focusAreas">Focus Areas (Optional)</Label>
                    <Input 
                      id="focusAreas" 
                      placeholder="e.g. Practical Applications, Theory, Problem Solving (comma-separated)" 
                      value={newCourse.focusAreas}
                      onChange={(e) => setNewCourse({...newCourse, focusAreas: e.target.value})}
                    />
                    <p className="text-xs text-muted-foreground">Specific topics or skills you want to emphasize in this course.</p>
                  </div>
                </div>
              </div>

              {/* Step 2: Select Materials (Split View) */}
              <div className="space-y-4 pt-4 border-t flex-1 flex flex-col min-h-0">
                <div>
                  <h3 className="text-lg font-medium mb-1">Reference Materials</h3>
                  <p className="text-sm text-muted-foreground">Select files, documents, or folders that the AI should reference when creating your course.</p>
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
                                        {mockLibraryMaterials.find(m => m.id === currentFolderId)?.title}
                                    </span>
                                </>
                            ) : (
                                <span className="font-medium px-2">Library Root</span>
                            )}
                        </div>
                        
                        {/* List */}
                        <div className="flex-1 overflow-y-auto p-2 space-y-1">
                            {mockLibraryMaterials
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
                            
                            {mockLibraryMaterials.filter(m => m.parentId === currentFolderId).length === 0 && (
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
                                    const item = mockLibraryMaterials.find(m => m.id === id);
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

            <div className="p-6 border-t bg-muted/20 flex justify-between gap-2">
              <div className="text-xs text-muted-foreground flex items-center gap-2">
                <Sparkles className="h-3 w-3" />
                <span>AI will analyze your materials and preferences to generate a personalized course</span>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setIsCreating(false)}>Cancel</Button>
                <Button onClick={handleCreateCourse} disabled={!newCourse.topic}>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Generate Course
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


