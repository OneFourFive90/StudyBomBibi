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
type StudyTask = {
  id: string;
  title: string;
  duration: number; // minutes
  completed: boolean;
};

type StudyDay = {
  day: number;
  topic: string;
  tasks: StudyTask[];
};

type StudyWeek = {
  week: number;
  days: StudyDay[];
};

type Plan = {
  id: string;
  title: string;
  description: string;
  progress: number;
  totalHours: number;
  format: "Text" | "Image" | "Video";
  materials: string[]; 
  schedule?: StudyWeek[];
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

export default function StudyPlannerPage() {
  // --- State ---
  const [plans, setPlans] = useState<Plan[]>([
    {
      id: "p1",
      title: "Introduction to Computer Science",
      description: "Learn the basics of computer science, including algorithms, data structures, and more.",
      progress: 45,
      totalHours: 20,
      format: "Video",
      materials: ["1", "3"],
      schedule: [
        {
          week: 1,
          days: [
            {
              day: 1,
              topic: "Getting Started",
              tasks: [
                { id: "t1", title: "Watch Intro Video", duration: 15, completed: true },
                { id: "t2", title: "Read Chapter 1", duration: 45, completed: true }
              ]
            },
            {
              day: 2,
              topic: "Basic Algorithms",
              tasks: [
                { id: "t3", title: "Sorting Algorithms", duration: 60, completed: false },
                { id: "t4", title: "Quiz 1", duration: 20, completed: false }
              ]
            }
          ]
        },
        {
          week: 2,
          days: [
             {
              day: 1,
              topic: "Data Structures - Arrays",
              tasks: [
                { id: "t5", title: "Dynamic Arrays", duration: 30, completed: false },
                { id: "t6", title: "Practice Problem Set", duration: 60, completed: false }
              ]
            }
          ]
        }
      ] 
    },
    {
      id: "p2",
      title: "Advanced Mathematics",
      description: "Dive deep into calculus, linear algebra, and discrete mathematics.",
      progress: 12,
      totalHours: 35,
      format: "Text",
      materials: ["2"]
    },
    {
      id: "p3",
      title: "Physics for Engineers",
      description: "Understand the fundamental principles of physics applied to engineering problems.",
      progress: 78,
      totalHours: 25,
      format: "Image",
      materials: ["4", "5"]
    },
  ]);

  const [isCreating, setIsCreating] = useState(false);
  
  // Material Selection State
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  
  // Form State
  const [newPlan, setNewPlan] = useState<{
    topic: string;
    description: string;
    availability: string;
    format: "Text" | "Image" | "Video";
    selectedMaterials: string[];
  }>({
    topic: "",
    description: "",
    availability: "",
    format: "Text",
    selectedMaterials: [],
  });

  // --- Handlers ---

  const handleCreatePlan = () => {
    // Generate a new plan object
    const createdPlan: Plan = {
      id: `p${plans.length + 1}`,
      title: newPlan.topic || "Untitled Plan",
      description: newPlan.description || `Study plan for ${newPlan.topic} (${newPlan.format})`,
      progress: 0,
      totalHours: parseInt(newPlan.availability) || 10,
      format: newPlan.format,
      materials: newPlan.selectedMaterials,
    };

    setPlans([createdPlan, ...plans]);
    setIsCreating(false);
    // Reset form
    setNewPlan({
      topic: "",
      description: "",
      availability: "",
      format: "Text",
      selectedMaterials: [],
    });
  };

  const toggleMaterialSelection = (id: string) => {
    setNewPlan(prev => {
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
          <h1 className="text-3xl font-bold tracking-tight">My Study Plans</h1>
          <p className="text-muted-foreground mt-2">Manage and track your AI-generated study schedules.</p>
        </div>
        <Button className="gap-2" onClick={() => setIsCreating(true)}>
          <Plus className="h-4 w-4" />
          Create New Plan
        </Button>
      </div>

      {/* Plans Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {plans.map((plan) => (
          <Card key={plan.id} className="hover:shadow-md transition-shadow cursor-pointer border-l-4" style={{ 
            borderLeftColor: plan.format === 'Video' ? '#3b82f6' : plan.format === 'Image' ? '#10b981' : '#f59e0b' 
          }}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <CardTitle className="text-xl">{plan.title}</CardTitle>
                <div className="bg-secondary text-secondary-foreground text-xs px-2 py-1 rounded-full uppercase font-semibold">
                  {plan.format}
                </div>
              </div>
              <CardDescription className="line-clamp-2 mt-2">{plan.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-4">
                
                {/* Progress Bar Mockup */}
                <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
                  <div 
                    className="bg-primary h-full rounded-full transition-all duration-500 ease-in-out" 
                    style={{ width: `${plan.progress}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span className="font-medium">{plan.progress}% Completed</span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" /> {plan.totalHours}h
                  </span>
                </div>

                <div className="flex gap-2 mt-2">
                  <Button variant="outline" size="sm" className="w-full" asChild>
                    <Link href={`/study-planner/${plan.id}`}>View Schedule</Link>
                  </Button>
                  <Button size="sm" className="w-full">Continue</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* --- Create Plan Modal (Overlay) --- */}
      {isCreating && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border text-card-foreground shadow-lg rounded-lg max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden">
            
            <div className="flex items-center justify-between p-6 border-b">
              <div>
                <h2 className="text-2xl font-semibold">Create Study Plan</h2>
                <p className="text-sm text-muted-foreground">Configure your AI-generated study schedule based on your needs.</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setIsCreating(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              
              {/* Step 1: Basic Info */}
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="topic">Topic / Study Goal</Label>
                  <Input 
                    id="topic" 
                    placeholder="e.g. Master Linear Algebra" 
                    value={newPlan.topic}
                    onChange={(e) => setNewPlan({...newPlan, topic: e.target.value})}
                  />
                </div>
                
                <div className="grid gap-2">
                  <Label htmlFor="description">Description (Optional)</Label>
                  <Textarea 
                    id="description" 
                    placeholder="Describe specific areas to focus on..." 
                    value={newPlan.description}
                    onChange={(e) => setNewPlan({...newPlan, description: e.target.value})}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="availability">Weekly Availability (Hours)</Label>
                    <Input 
                      id="availability" 
                      type="number" 
                      placeholder="e.g. 10" 
                      value={newPlan.availability}
                      onChange={(e) => setNewPlan({...newPlan, availability: e.target.value})}
                    />
                  </div>
                  
                  <div className="grid gap-2">
                    <Label>Preferred Format</Label>
                    <div className="flex items-center space-x-4 pt-2">
                        <div className="flex items-center space-x-2">
                          <input 
                              type="radio" 
                              id="fmt-text" 
                              name="format" 
                              value="Text" 
                              checked={newPlan.format === "Text"}
                              onChange={() => setNewPlan({...newPlan, format: "Text"})}
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
                              checked={newPlan.format === "Image"}
                              onChange={() => setNewPlan({...newPlan, format: "Image"})}
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
                              checked={newPlan.format === "Video"}
                              onChange={() => setNewPlan({...newPlan, format: "Video"})}
                              className="radio w-4 h-4 border-primary text-primary"
                          />
                          <Label htmlFor="fmt-video">Video</Label>
                        </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 2: Select Materials (Split View) */}
              <div className="space-y-4 pt-4 border-t flex-1 flex flex-col min-h-0">
                <div>
                  <h3 className="text-lg font-medium mb-1">Select Study Materials</h3>
                  <p className="text-sm text-muted-foreground">Choose files or folders from your library to include in this plan.</p>
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
                                    const isSelected = newPlan.selectedMaterials.includes(material.id);
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
                             {newPlan.selectedMaterials.length === 0 ? (
                                <p className="text-xs text-muted-foreground text-center mt-10">No materials selected</p>
                             ) : (
                                newPlan.selectedMaterials.map(id => {
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

            <div className="p-6 border-t bg-muted/20 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsCreating(false)}>Cancel</Button>
              <Button onClick={handleCreatePlan} disabled={!newPlan.topic}>
                <Sparkles className="mr-2 h-4 w-4" />
                Generate Plan
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


