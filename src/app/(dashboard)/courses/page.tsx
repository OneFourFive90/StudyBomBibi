"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Clock, 
  Sparkles,
  ChevronDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db, auth } from "@/lib/firebase/firebase";
import { useAuth } from "@/context/AuthContext";
import { GenerateCourseModal } from "@/components/generate-course-modal";

// Types
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

type Material = {
  id: string;
  title: string;
  type: "Folder" | "File";
  parentId: string | null;
};

// Mock Library Data (Folders & Files) - used as fallback if no real files exist
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
  const router = useRouter();

  // --- State ---
  const [studyPlans, setStudyPlans] = useState<StudyPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [sortBy, setSortBy] = useState<'createdAt' | 'lastAccessedAt' | 'name'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  
  // Material Selection State
  const [libraryMaterials, setLibraryMaterials] = useState<Material[]>(mockLibraryMaterials);

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

  // Fetch library materials from API (files and folders)
  useEffect(() => {
    const fetchLibraryMaterials = async () => {
      if (!userId) return;
      
      try {
        // Get ID token for authentication
        const token = await auth.currentUser?.getIdToken();
        if (!token) return;

        // Fetch files using existing API
        const filesResponse = await fetch("/api/get-files", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!filesResponse.ok) throw new Error("Failed to fetch files");
        const filesData = await filesResponse.json();
        
        // Fetch folders from Firestore
        const foldersRef = collection(db, 'folders');
        const foldersQuery = query(foldersRef, where('ownerId', '==', userId));
        const foldersSnapshot = await getDocs(foldersQuery);

        const materials: Material[] = [];

        // Add folders
        foldersSnapshot.docs.forEach(doc => {
          const data = doc.data();
          materials.push({
            id: doc.id,
            title: data.name || "Untitled Folder",
            type: "Folder" as const,
            parentId: data.parentFolderId || null,
          });
        });

        // Add files
        if (filesData.files && Array.isArray(filesData.files)) {
          filesData.files.forEach((file: any) => {
            materials.push({
              id: file.id,
              title: file.originalName || file.name || "Untitled",
              type: "File" as const,
              parentId: file.folderId || null,
            });
          });
        }

        // Only update if we found materials
        if (materials.length > 0) {
          setLibraryMaterials(materials);
        }
      } catch (error) {
        console.error('Error fetching library materials:', error);
        // Keep using mock materials if fetch fails
      }
    };

    fetchLibraryMaterials();
  }, [userId]);

  // --- Handlers ---

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
                          plan.status === 'active' 
                            ? 'bg-blue-500/10 text-blue-700'
                            : 'bg-green-500/10 text-green-700'
                        }`}>
                          {plan.status === 'active' ? 'Ongoing' : 'Completed'}
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
      <GenerateCourseModal
        isOpen={isCreating}
        onClose={() => setIsCreating(false)}
        onSuccess={(newPlan) => {
          setStudyPlans([newPlan, ...studyPlans]);
          router.push(`/courses/${newPlan.id}`);
        }}
        libraryMaterials={libraryMaterials}
        userId={userId || ""}
      />
    </div>
  );
}


