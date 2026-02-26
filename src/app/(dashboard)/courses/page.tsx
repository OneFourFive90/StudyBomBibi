"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { 
  PlayCircle, 
  Clock, 
  Plus, 
  X, 
  Folder, 
  FileText, 
  CheckCircle2, 
  Sparkles,
  ChevronRight,
  ChevronLeft,
  Search
} from "lucide-react";
import Link from "next/link";

// Types
type Lesson = {
  id: string;
  title: string;
  duration: number; // minutes
  completed: boolean;
  contentType: "video" | "text" | "document" | "quiz";
};

type Module = {
  id: string;
  title: string;
  lessons: Lesson[];
};

type Course = {
  id: string;
  title: string;
  description: string;
  instructor: string;
  rating: number;
  students: number;
  progress: number;
  totalHours: number;
  format: "Text" | "Image" | "Video";
  materials: string[];
  customPrompt?: string;
  preferences: {
    difficulty: "Beginner" | "Intermediate" | "Advanced";
    pace: "Slow" | "Normal" | "Fast";
    focusAreas: string[];
  };
  modules: Module[];
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
  // --- State ---
  const [courses, setCourses] = useState<Course[]>([
    {
      id: "c1",
      title: "Introduction to Computer Science",
      description: "AI-generated personalized course covering CS fundamentals based on your selected materials.",
      instructor: "AI Assistant",
      rating: 4.8,
      students: 1240,
      progress: 45,
      totalHours: 20,
      format: "Video",
      materials: ["1", "3"],
      customPrompt: "Focus on practical applications and real-world examples",
      preferences: {
        difficulty: "Beginner",
        pace: "Normal",
        focusAreas: ["Algorithms", "Data Structures"]
      },
      modules: [
        {
          id: "m1",
          title: "Fundamentals",
          lessons: [
            { id: "l1", title: "What is Computer Science?", duration: 15, completed: true, contentType: "video" },
            { id: "l2", title: "Basic Concepts & History", duration: 45, completed: true, contentType: "video" }
          ]
        }
      ]
    },
    {
      id: "c2",
      title: "Advanced Mathematics",
      description: "Personalized mathematics course tailored to your learning style and materials.",
      instructor: "AI Assistant",
      rating: 4.9,
      students: 856,
      progress: 12,
      totalHours: 35,
      format: "Text",
      materials: ["2"],
      preferences: {
        difficulty: "Advanced",
        pace: "Fast",
        focusAreas: ["Calculus", "Linear Algebra"]
      },
      modules: []
    },
    {
      id: "c3",
      title: "Physics for Engineers",
      description: "Interactive physics course generated from your engineering textbooks and notes.",
      instructor: "AI Assistant",
      rating: 4.7,
      students: 2100,
      progress: 78,
      totalHours: 25,
      format: "Image",
      materials: ["4", "5"],
      preferences: {
        difficulty: "Intermediate",
        pace: "Normal",
        focusAreas: ["Mechanics", "Thermodynamics"]
      },
      modules: []
    },
  ]);

  const [isCreating, setIsCreating] = useState(false);
  
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

  // --- Handlers ---

  const handleCreateCourse = () => {
    // Generate a new course object
    const createdCourse: Course = {
      id: `c${courses.length + 1}`,
      title: newCourse.topic || "Untitled Course",
      description: `AI-generated personalized course for ${newCourse.topic}${newCourse.customPrompt ? ` - ${newCourse.customPrompt}` : ''}`,
      instructor: "AI Assistant",
      rating: 0,
      students: 0,
      progress: 0,
      totalHours: parseInt(newCourse.availability) || 10,
      format: newCourse.format,
      materials: newCourse.selectedMaterials,
      customPrompt: newCourse.customPrompt,
      preferences: {
        difficulty: newCourse.difficulty,
        pace: newCourse.pace,
        focusAreas: newCourse.focusAreas.split(',').map(s => s.trim()).filter(Boolean)
      },
      modules: []
    };

    setCourses([createdCourse, ...courses]);
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

      {/* Courses Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {courses.map((course) => {
          const completedLessons = course.modules.reduce((acc, mod) => acc + mod.lessons.filter(l => l.completed).length, 0);
          const totalLessons = course.modules.reduce((acc, mod) => acc + mod.lessons.length, 0);
          
          return (
            <Card key={course.id} className="hover:shadow-md transition-shadow cursor-pointer border-l-4" style={{ 
              borderLeftColor: course.format === 'Video' ? '#3b82f6' : course.format === 'Image' ? '#10b981' : '#f59e0b' 
            }}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle className="text-xl">{course.title}</CardTitle>
                  <div className="flex flex-col gap-1 items-end">
                    <div className="bg-secondary text-secondary-foreground text-xs px-2 py-1 rounded-full uppercase font-semibold">
                      {course.format}
                    </div>
                    <div className="bg-primary/10 text-primary text-xs px-2 py-1 rounded-full">
                      {course.preferences.difficulty}
                    </div>
                  </div>
                </div>
                <CardDescription className="line-clamp-2 mt-2">{course.description}</CardDescription>
                {course.customPrompt && (
                  <div className="text-xs bg-blue-50 text-blue-800 p-2 rounded border border-blue-200 mt-2">
                    <span className="font-medium">Custom:</span> {course.customPrompt}
                  </div>
                )}
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-4">
                  {/* Course Stats */}
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="text-center">
                      <div className="font-semibold">{course.modules.length}</div>
                      <div className="text-muted-foreground">Modules</div>
                    </div>
                    <div className="text-center">
                      <div className="font-semibold">{totalLessons}</div>
                      <div className="text-muted-foreground">Lessons</div>
                    </div>
                    <div className="text-center">
                      <div className="font-semibold">{course.totalHours}h</div>
                      <div className="text-muted-foreground">Duration</div>
                    </div>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-primary h-full rounded-full transition-all duration-500 ease-in-out" 
                      style={{ width: `${course.progress}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span className="font-medium">{course.progress}% Completed</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" /> {course.preferences.pace}
                    </span>
                  </div>

                  <div className="flex gap-2 mt-2">
                    <Button variant="outline" size="sm" className="w-full" asChild>
                      <Link href={`/courses/${course.id}`}>View Course</Link>
                    </Button>
                    <Button size="sm" className="w-full">Continue</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
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


