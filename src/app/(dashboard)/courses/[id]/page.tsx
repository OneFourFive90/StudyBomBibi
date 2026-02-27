"use client";

import { useState, useEffect } from "react";
import { updateActivityCompletionStatus } from "@/lib/firebase/firestore/study-plan/updateStudyPlan";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Clock, CheckCircle2, BookOpen, Play, PanelLeftClose, PanelLeftOpen, Loader2 } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { collection, getDocs, doc, getDoc, query, where } from "firebase/firestore";
import { db } from "@/lib/firebase/firebase";
import { useAuth } from "@/context/AuthContext";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// Types matching Enhanced Study Plan Assets Schema
type VideoSegment = {
  slide_title: string;
  bullets: string[];
  script: string;
};

type QuizQuestion = {
  question: string;
  options: string[];
  answer: string;
};

type ActivityAsset = {
  assetId: string;
  type: "slide_image" | "script_audio" | "single_image";
  segmentIndex?: number;
  url?: string;
  status: "pending" | "generating" | "ready" | "failed";
};

type Activity = {
  type: "video" | "text" | "quiz" | "image";
  title: string;
  time_minutes: number;
  video_segments?: VideoSegment[];
  content?: string;
  image_description?: string;
  quiz_check?: QuizQuestion[];
  assetStatus?: "pending" | "generating" | "ready" | "failed";
  assets?: ActivityAsset[];
};

type DailyModule = {
  id: string;
  order: number;
  title: string;
  activities: Activity[];
};

type StudyPlan = {
  id: string;
  title: string;
  description: string;
  progress: number;
  totalHours: number;
  format: "Text" | "Image" | "Video";
  materials: string[];
  schedule: DailyModule[];
  ownerId: string;
  courseTitle: string;
  createdAt: string;
};

export default function CourseDetailPage() {
  const params = useParams();
  const courseId = Array.isArray(params.id) ? params.id[0] : params.id;
  const { userId } = useAuth();

  // State for Firestore data
  const [studyPlan, setStudyPlan] = useState<StudyPlan | null>(null);
  const [dailyModules, setDailyModules] = useState<DailyModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [assetUrls, setAssetUrls] = useState<Record<string, string>>({});

  // UI state
  const [activeModuleDay, setActiveModuleDay] = useState<number | null>(null);
  const [activeQuizIndex, setActiveQuizIndex] = useState<number | null>(null); // Index of the active quiz within the module
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [completedSections, setCompletedSections] = useState<Set<string>>(new Set());
  // State for quiz start page, quiz question navigation, and answer selection
  const [quizStarted, setQuizStarted] = useState(false);
  const [currentQuizQuestion, setCurrentQuizQuestion] = useState(0);
  // Store selected answers as an array of selected option indices (or null)
  const [selectedAnswers, setSelectedAnswers] = useState<(number | null)[]>([]);
  // Quiz summary state
  const [quizSubmitted, setQuizSubmitted] = useState(false);

  // Fetch study plan document
  useEffect(() => {
    const fetchPlan = async () => {
      if (!userId || !courseId) return;
      try {
        const planRef = doc(db, 'plans', courseId as string);
        const planSnapshot = await getDoc(planRef);
        
        if (planSnapshot.exists()) {
          const planData = planSnapshot.data();
          setStudyPlan({
            id: planSnapshot.id,
            title: planData.courseTitle,
            description: planData.description || "",
            progress: planData.progress || 0,
            totalHours: planData.hoursPerDay * planData.totalDays || 0,
            format: planData.format || "Video",
            materials: planData.materials || [],
            schedule: [],
            ownerId: planData.ownerId,
            courseTitle: planData.courseTitle,
            createdAt: planData.createdAt?.toDate?.()?.toISOString?.() || new Date().toISOString(),
          } as StudyPlan);
        }
      } catch (error) {
        console.error('Error fetching plan:', error);
      }
    };

    fetchPlan();
  }, [courseId, userId]);

  // Fetch daily modules and assets, and sync completion status
  useEffect(() => {
    if (!studyPlan || !courseId) return;

    const fetchModules = async () => {
      setLoading(true);
      try {
        // Get daily modules from subcollection
        const modulesRef = collection(db, 'plans', courseId as string, 'dailyModule');
        const snapshot = await getDocs(modulesRef);
        const modules = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            order: data.order || 0,
            title: data.title || '',
            activities: data.activities || [],
          };
        }) as DailyModule[];

        setDailyModules(modules.sort((a, b) => a.order - b.order));

        // Sync completedSections state with Firestore
        const newCompletedSections = new Set<string>();
        modules.forEach(module => {
          // Learning material section
          const materialIdx = module.activities.findIndex(a => a.type !== "quiz");
          if (materialIdx !== -1 && module.activities[materialIdx].isCompleted) {
            newCompletedSections.add(getSectionKey(module.order, "materials"));
          }
          // Quiz sections
          module.activities.forEach((activity, idx) => {
            if (activity.type === "quiz" && activity.isCompleted) {
              newCompletedSections.add(getSectionKey(module.order, "quiz", idx));
            }
          });
        });
        setCompletedSections(newCompletedSections);

        // Fetch asset URLs from Firestore
        const assetsRef = collection(db, 'studyplanAIAssets');
        const q = query(assetsRef, where('planId', '==', courseId));
        const assetsSnapshot = await getDocs(q);

        const urls: Record<string, string> = {};
        assetsSnapshot.docs.forEach(doc => {
          const asset = doc.data();
          if (asset.downloadUrl) {
            urls[doc.id] = asset.downloadUrl;
          }
        });

        setAssetUrls(urls);
      } catch (error) {
        console.error('Error fetching modules:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchModules();
  }, [studyPlan, courseId]);

  // Reset quiz state when changing quiz or module
  useEffect(() => {
    setQuizStarted(false);
    setCurrentQuizQuestion(0);
    setSelectedAnswers([]);
    setQuizSubmitted(false);
  }, [activeQuizIndex, activeModuleDay]);

  if (!studyPlan) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <h2 className="text-xl font-semibold">{loading ? "Loading Course..." : "Course Not Found"}</h2>
        <p className="text-muted-foreground">{loading ? "Please wait while we fetch your course." : "The course you are looking for does not exist."}</p>
        {!loading && (
          <Link href="/courses">
            <Button>Return to Learning Hub</Button>
          </Link>
        )}
      </div>
    );
  }

  // Set active module on first load
  if (activeModuleDay === null && dailyModules.length > 0) {
    setActiveModuleDay(dailyModules[0].order);
    setActiveQuizIndex(null); // Show module content by default
  }

  const currentModule = dailyModules.find(m => m.order === activeModuleDay);
  const quizActivities = currentModule?.activities.map((a, i) => ({ ...a, originalIndex: i })).filter(a => a.type === "quiz") || [];
  const contentActivities = currentModule?.activities.filter(a => a.type !== "quiz") || [];

  // Each quiz is a separate section; materials are one section per day
  const getSectionKey = (day: number, sectionType: "materials" | "quiz", quizIndex?: number) => {
    if (sectionType === "materials") return `day-${day}-materials`;
    return `day-${day}-quiz-${quizIndex}`;
  };

  const handleToggleSectionComplete = async () => {
    if (activeModuleDay === null || !currentModule) return;
    let key;
    if (activeQuizIndex === null) {
      key = getSectionKey(activeModuleDay, "materials");
      // Learning material = all non-quiz activities
      const materialIndices = currentModule.activities
        .map((a, idx) => (a.type !== "quiz" ? idx : -1))
        .filter(idx => idx !== -1);
      const willComplete = !completedSections.has(key);
      setCompletedSections(prev => {
        const newSet = new Set(prev);
        if (newSet.has(key)) {
          newSet.delete(key);
        } else {
          newSet.add(key);
        }
        return newSet;
      });
      // Update all non-quiz activities' completion status in Firestore
      if (materialIndices.length > 0) {
        try {
          for (const idx of materialIndices) {
            await updateActivityCompletionStatus(
              courseId,
              currentModule.id,
              idx,
              willComplete
            );
          }
        } catch (err) {
          console.error("Failed to update material completion status:", err);
        }
      }
    } else {
      key = getSectionKey(activeModuleDay, "quiz", activeQuizIndex);
      // Find the quiz activity index
      const activityIndex = currentModule.activities.findIndex((a, idx) => a.type === "quiz" && idx === activeQuizIndex);
      setCompletedSections(prev => {
        const newSet = new Set(prev);
        if (newSet.has(key)) {
          newSet.delete(key);
        } else {
          newSet.add(key);
        }
        return newSet;
      });
      // Update Firestore completion status
      if (activityIndex !== -1) {
        try {
          await updateActivityCompletionStatus(
            courseId,
            currentModule.id,
            activityIndex,
            !completedSections.has(key)
          );
        } catch (err) {
          console.error("Failed to update completion status:", err);
        }
      }
    }
  };

  // Each quiz is a section, and materials are one section per day
  const totalActivities = dailyModules.reduce((acc, mod) => {
    const quizCount = mod.activities.filter(a => a.type === "quiz").length;
    return acc + 1 + quizCount; // 1 for materials, rest for quizzes
  }, 0);
  const completedActivities = Array.from(completedSections).length;

  const goToNextSection = () => {
    if (activeModuleDay === null || !currentModule) return;

    // 1. If we are in materials, check if there's a quiz in the same module
    if (activeQuizIndex === null) {
      if (quizActivities.length > 0) {
        setActiveQuizIndex(0);
        return;
      }
    } 
    // 2. If we are in a quiz, check if there's a next quiz in the same module
    else if (activeQuizIndex < quizActivities.length - 1) {
      setActiveQuizIndex(activeQuizIndex + 1);
      return;
    }

    // 3. Move to the next module's materials
    const currentModuleIdx = dailyModules.findIndex(m => m.order === activeModuleDay);
    if (currentModuleIdx < dailyModules.length - 1) {
      const nextModule = dailyModules[currentModuleIdx + 1];
      setActiveModuleDay(nextModule.order);
      setActiveQuizIndex(null);
    }
  };

  const goToPreviousSection = () => {
    if (activeModuleDay === null || !currentModule) return;

    // 1. If we are in a quiz
    if (activeQuizIndex !== null) {
      if (activeQuizIndex > 0) {
        setActiveQuizIndex(activeQuizIndex - 1);
      } else {
        setActiveQuizIndex(null);
      }
      return;
    }

    // 2. If we are in materials, go to the last quiz of the previous module
    const currentModuleIdx = dailyModules.findIndex(m => m.order === activeModuleDay);
    if (currentModuleIdx > 0) {
      const prevModule = dailyModules[currentModuleIdx - 1];
      const prevQuizActivities = prevModule.activities.filter(a => a.type === "quiz");
      
      setActiveModuleDay(prevModule.order);
      if (prevQuizActivities.length > 0) {
        setActiveQuizIndex(prevQuizActivities.length - 1);
      } else {
        setActiveQuizIndex(null);
      }
    }
  };

  return (
    <div className="flex flex-col h-full space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2 border-b pb-4">
        <Link href="/courses">
          <Button variant="ghost" size="sm">
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
        </Link>
        <div className="h-6 w-px bg-border mx-2" />
        <div className="flex-1">
          <h1 className="text-2xl font-bold tracking-tight">{studyPlan.title}</h1>
          <p className="text-muted-foreground text-sm">{studyPlan.description}</p>
        </div>
      </div>

      {/* Main Content - Two Column Layout */}
      <div className="flex-1 flex gap-4 overflow-hidden relative">
        {/* Left: Modules List */}
        <div 
          className={`border rounded-lg overflow-hidden flex flex-col bg-card transition-all duration-300 ease-in-out ${
            isSidebarOpen ? "w-80 translate-x-0 opacity-100" : "w-0 -translate-x-full opacity-0 border-0"
          }`}
        >
          <div className="p-4 border-b bg-muted/30 flex justify-between items-start">
            <div>
              <h3 className="font-semibold text-sm">Course Content</h3>
              <p className="text-xs text-muted-foreground mt-1">{dailyModules.length} days</p>
            </div>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setIsSidebarOpen(false)}>
              <PanelLeftClose className="h-4 w-4" />
            </Button>
          </div>

          <div className="overflow-y-auto flex-1">
            {dailyModules.length === 0 ? (
              <div className="flex items-center justify-center h-full text-muted-foreground text-sm p-4">
                No modules available yet
              </div>
            ) : (
              <div className="space-y-2 p-3">
                {dailyModules.map((module) => {
                  const isActive = activeModuleDay === module.order;
                  const moduleQuizzes = module.activities.map((a, i) => ({ ...a, originalIndex: i })).filter(a => a.type === "quiz");
                  
                  // Section completion logic
                  const isMaterialsCompleted = completedSections.has(getSectionKey(module.order, "materials"));

                  return (
                    <div key={module.order} className="mb-6">
                      {/* Module Header */}
                      <div className="mb-2">
                        <div className="font-medium text-xs uppercase tracking-wider  px-2 py-1">
                          Day {module.order}: {module.title}
                        </div>
                      </div>
                      
                      {/* Materials Section */}
                      <div className="ml-2 space-y-1">
                        <button
                          onClick={() => {
                            setActiveModuleDay(module.order);
                            setActiveQuizIndex(null);
                          }}
                          className={`w-full text-left p-2 text-xs rounded transition-colors flex items-center gap-2 ${
                            isActive && activeQuizIndex === null 
                            ? "bg-primary/10 text-primary font-medium" 
                            : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                          }`}
                        >
                          <div className="flex items-center gap-1.5 w-full">
                            {isMaterialsCompleted ? (
                              <CheckCircle2 className="h-3 w-3 text-green-500" />
                            ) : (
                              <BookOpen className="h-3 w-3" />
                            )}
                            <span className="truncate flex-1">Learning Materials</span>
                          </div>
                        </button>
                      </div>
                      
                      {/* Quizzes List */}
                      {moduleQuizzes.length > 0 && (
                        <div className="ml-2 space-y-1">
                          {moduleQuizzes.map((quiz, qIdx) => {
                            const isQuizCompleted = completedSections.has(getSectionKey(module.order, "quiz", quiz.originalIndex));
                            const isQuizActive = activeQuizIndex === quiz.originalIndex && isActive;
                            return (
                              <button
                                key={qIdx}
                                onClick={() => {
                                  setActiveModuleDay(module.order);
                                  setActiveQuizIndex(quiz.originalIndex);
                                }}
                                className={`w-full text-left p-2 text-xs rounded transition-colors flex items-center gap-2 ${
                                  isQuizActive
                                    ? "bg-primary/10 text-primary font-medium" 
                                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                                }`}
                              >
                                <div className="flex items-center gap-1.5 w-full">
                                  {isQuizCompleted ? (
                                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                                  ) : (
                                    <Play className="h-3 w-3" />
                                  )}
                                  <span className="truncate flex-1">{quiz.title}</span>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Course Progress - Sidebar Bottom */}
          <div className="p-4 border-t bg-muted/20 space-y-3">
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold uppercase tracking-wider text-muted-foreground">Overall Progress</span>
              <span className="font-medium">{Math.round((completedActivities / totalActivities) * 100)}%</span>
            </div>
            <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
              <div 
                className="bg-primary h-full rounded-full transition-all duration-500"
                style={{ width: `${(completedActivities / totalActivities) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Right: Activity Content */}
        <div className="flex-1 border rounded-lg overflow-hidden flex flex-col bg-card min-w-0 transition-all duration-300 relative">
          
          {activeQuizIndex !== null && currentModule ? (
            // QUIZ VIEW: Show start page, then questions, then summary after submit
            (() => {
              const quiz = currentModule.activities[activeQuizIndex];
              const questions = quiz.quiz_check || [];
              // If quiz not started, show start page
              if (!quizStarted && !quizSubmitted) {
                return (
                  <div className="flex-1 overflow-y-auto relative flex flex-col">
                    {/* Floating Sidebar Toggle (Only visible when sidebar closed) */}
                    {!isSidebarOpen && (
                      <div className="sticky top-4 left-12 z-50 h-0">
                        <Button variant="secondary" size="icon" onClick={() => setIsSidebarOpen(true)} title="Show Sidebar" className="h-8 w-8 shadow-md border bg-background/80 backdrop-blur">
                          <PanelLeftOpen className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                    <div className="p-6 border-b bg-gradient-to-r from-primary/10 to-transparent">
                      <h2 className={`text-2xl font-bold${!isSidebarOpen ? ' ml-12' : ''}`}>{quiz.title}</h2>
                      <p className={`text-muted-foreground flex items-center gap-2 mt-1 ${!isSidebarOpen ? 'ml-12' : ''}`}>
                        <Clock className="h-4 w-4" /> {quiz.time_minutes} minutes
                      </p>
                    </div>
                    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-6">
                      <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                        <Play className="h-10 w-10 text-primary ml-1" />
                      </div>
                      <div className="max-w-md space-y-2">
                        <h3 className="text-xl font-semibold">Ready to test your knowledge?</h3>
                        <p className="text-muted-foreground">This quiz covers the materials from {currentModule.title}. Good luck!</p>
                      </div>
                      <Button
                        size="lg"
                        className="w-full max-w-sm gap-2"
                        onClick={() => {
                          setQuizStarted(true);
                          setCurrentQuizQuestion(0);
                          setSelectedAnswers(Array(questions.length).fill(null));
                        }}
                      >
                        Start Quiz <ChevronLeft className="h-4 w-4 rotate-180" />
                      </Button>
                    </div>
                  </div>
                );
              }
              // After submit, show summary
              if (quizSubmitted) {
                // Calculate score
                let correctCount = 0;
                questions.forEach((q, i) => {
                  if (selectedAnswers[i] !== null && q.options[selectedAnswers[i]!] === q.answer) {
                    correctCount++;
                  }
                });
                return (
                  <div className="flex-1 flex flex-col min-h-0">
                    <div className="flex-1 overflow-y-auto relative flex flex-col items-center p-8">
                      <div className="max-w-lg w-full bg-muted/20 border rounded-lg p-8 mx-auto text-center">
                        <h2 className="text-2xl font-bold mb-2">Quiz Results</h2>
                        <p className="mb-4 text-muted-foreground">You scored <span className="font-semibold text-primary">{correctCount} / {questions.length}</span></p>
                        <div className="space-y-6 text-left">
                          {questions.map((q, i) => {
                            const userIdx = selectedAnswers[i];
                            const isCorrect = userIdx !== null && q.options[userIdx] === q.answer;
                            return (
                              <div key={i} className="p-4 rounded-lg border bg-background/80">
                                <div className="font-medium mb-1">Q{i + 1}: {q.question}</div>
                                <div className="mb-1">
                                  <span className="font-semibold">Your answer: </span>
                                  {userIdx !== null ? (
                                    <span className={isCorrect ? "text-green-600" : "text-red-600"}>{q.options[userIdx]}</span>
                                  ) : (
                                    <span className="text-muted-foreground italic">No answer</span>
                                  )}
                                </div>
                                <div>
                                  <span className="font-semibold">Correct answer: </span>
                                  <span className="text-primary">{q.answer}</span>
                                </div>
                                {isCorrect ? (
                                  <div className="mt-2 text-green-600 font-semibold flex items-center gap-1"><CheckCircle2 className="h-4 w-4" /> Correct</div>
                                ) : userIdx !== null ? (
                                  <div className="mt-2 text-red-600 font-semibold flex items-center gap-1">Incorrect</div>
                                ) : null}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                    {/* Bottom navigation actions */}
                    <div className="mt-12 pt-6 border-t-2 border-dashed flex flex-col sm:flex-row justify-between items-center gap-4 p-6">
                      <Button 
                        variant="outline"
                        onClick={() => {
                          setQuizStarted(false);
                          setQuizSubmitted(false);
                          setCurrentQuizQuestion(0);
                          setSelectedAnswers([]);
                        }}
                        className="w-full sm:w-auto"
                      >
                        Retake Quiz
                      </Button>
                      <Button 
                        onClick={() => {
                          setQuizStarted(false);
                          setQuizSubmitted(false);
                          setCurrentQuizQuestion(0);
                          setSelectedAnswers([]);
                          // Quiz completion already saved when user clicked Submit
                          goToNextSection();
                        }}
                        className="w-full sm:w-auto bg-primary text-white"
                      >
                        Next Section
                        <ChevronLeft className="h-4 w-4 ml-2 rotate-180" />
                      </Button>
                    </div>
                  </div>
                );
              }
              // After starting, show one question at a time
              const currentQ = questions[currentQuizQuestion];
              return (
                <div className="flex-1 overflow-y-auto relative flex flex-col">
                  {/* Floating Sidebar Toggle (Only visible when sidebar closed) */}
                  {!isSidebarOpen && (
                    <div className="sticky top-4 left-12 z-50 h-0">
                      <Button variant="secondary" size="icon" onClick={() => setIsSidebarOpen(true)} title="Show Sidebar" className="h-8 w-8 shadow-md border bg-background/80 backdrop-blur">
                        <PanelLeftOpen className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                  <div className="p-6 border-b bg-gradient-to-r from-primary/10 to-transparent">
                    <h2 className={`text-2xl font-bold${!isSidebarOpen ? ' ml-12' : ''}`}>{quiz.title}</h2>
                    <p className={`text-muted-foreground flex items-center gap-2 mt-1 ${!isSidebarOpen ? 'ml-12' : ''}`}>
                      <Clock className="h-4 w-4" /> {quiz.time_minutes} minutes
                    </p>
                  </div>
                  <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-6">
                    <div className="max-w-md w-full">
                      <div className="mb-6 flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">Question {currentQuizQuestion + 1} of {questions.length}</span>
                      </div>
                      <h3 className="text-lg font-semibold mb-4">{currentQ?.question}</h3>
                      <div className="flex flex-col gap-3 mb-6">
                        {currentQ?.options.map((opt, idx) => (
                          <label key={idx} className="flex items-center gap-2 p-3 rounded border cursor-pointer transition-colors hover:bg-muted/50">
                            <input
                              type="radio"
                              name={`quiz-q${currentQuizQuestion}`}
                              className="accent-primary"
                              checked={selectedAnswers[currentQuizQuestion] === idx}
                              onChange={() => {
                                setSelectedAnswers(prev => {
                                  const updated = [...prev];
                                  updated[currentQuizQuestion] = idx;
                                  return updated;
                                });
                              }}
                            />
                            <span className="text-sm">{opt}</span>
                          </label>
                        ))}
                      </div>
                      <div className="flex justify-between gap-4">
                        <Button
                          variant="outline"
                          disabled={currentQuizQuestion === 0}
                          onClick={() => setCurrentQuizQuestion(q => Math.max(0, q - 1))}
                        >
                          <ChevronLeft className="h-4 w-4 mr-2" />
                          Previous
                        </Button>
                        {currentQuizQuestion < questions.length - 1 ? (
                          <Button
                            onClick={() => setCurrentQuizQuestion(q => Math.min(questions.length - 1, q + 1))}
                            disabled={currentQuizQuestion === questions.length - 1}
                          >
                            Next
                            <ChevronLeft className="h-4 w-4 ml-2 rotate-180" />
                          </Button>
                        ) : (
                          <Button
                            className="bg-primary text-white"
                            onClick={async () => {
                              setQuizSubmitted(true);
                              // Save quiz completion to Firestore immediately
                              if (activeModuleDay !== null && currentModule && activeQuizIndex !== null) {
                                const activityIndex = currentModule.activities.findIndex((a, idx) => a.type === "quiz" && idx === activeQuizIndex);
                                if (activityIndex !== -1) {
                                  try {
                                    await updateActivityCompletionStatus(
                                      courseId,
                                      currentModule.id,
                                      activityIndex,
                                      true
                                    );
                                    // Update frontend state
                                    setCompletedSections(prev => {
                                      const newSet = new Set(prev);
                                      newSet.add(getSectionKey(activeModuleDay, "quiz", activeQuizIndex));
                                      return newSet;
                                    });
                                  } catch (err) {
                                    console.error("Failed to save quiz completion:", err);
                                  }
                                }
                              }
                            }}
                          >
                            Submit Quiz
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()
          ) : currentModule ? (
            /* MODULE SCROLL VIEW */
            <div className="flex-1 overflow-y-auto relative">
               {/* Floating Sidebar Toggle (Only visible when sidebar closed) */}
               {!isSidebarOpen && (
                 <div className="sticky top-4 left-4 z-50 h-0">
                    <Button variant="secondary" size="icon" onClick={() => setIsSidebarOpen(true)} title="Show Sidebar" className="h-8 w-8 shadow-md border bg-background/80 backdrop-blur">
                      <PanelLeftOpen className="h-4 w-4" />
                    </Button>
                 </div>
               )}

               <div className="p-6 border-b bg-muted/10 flex items-start gap-3">
                  {/* Spacer for floating button when sidebar is closed */}
                  {!isSidebarOpen && <div className="w-10 shrink-0" />}
                  <div>
                    <h2 className="text-2xl font-bold">{currentModule.title}</h2>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                      <span>{contentActivities.reduce((acc, a) => acc + a.time_minutes, 0)} Minutes Total</span>
                    </div>
                  </div>
               </div>
               
               <div className="p-6 space-y-12">
                  {contentActivities.map((activity, idx) => (
                    <div key={idx} className=""> 
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <h3 className="text-xl font-semibold">{activity.title}</h3>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" /> {activity.time_minutes} min
                            </div>
                          </div>
                        </div>

                       {/* Content Body */}
                       <div className="pl-0 md:pl-0">
                          {/* Video Content */}
                          {activity.type === "video" && (
                            <div className="space-y-4">
                              {activity.video_segments && activity.video_segments.length > 0 ? (
                                <div className="grid md:grid-cols-2 gap-6">
                                  {(() => {
                                    // Find the first slide image asset
                                    const slideAsset = activity.assets?.find(a => a.type === 'slide_image' && a.segmentIndex === 0);
                                    const slideUrl = slideAsset ? assetUrls[slideAsset.assetId] : null;
                                    
                                    return (
                                      <div className="aspect-video bg-black rounded-lg flex items-center justify-center group cursor-pointer hover:bg-black/90 transition-colors shadow-lg overflow-hidden">
                                        {slideUrl ? (
                                          <img
                                            src={slideUrl}
                                            alt="First slide"
                                            className="w-full h-full object-cover"
                                          />
                                        ) : (
                                          <Play className="h-16 w-16 text-white opacity-80 group-hover:opacity-100 transition-opacity" />
                                        )}
                                      </div>
                                    );
                                  })()}
                                  <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
                                    <h4 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">Key Concepts</h4>
                                    <div className="space-y-3">
                                      {activity.video_segments?.map((segment, sIdx) => (
                                        <div key={sIdx} className="text-sm p-3 bg-muted/50 rounded-lg">
                                          <p className="font-medium mb-1">{segment.slide_title}</p>
                                          <ul className="text-[10px] text-muted-foreground mb-2 list-disc pl-4">
                                             {segment.bullets?.map((bullet, bIdx) => (
                                               <li key={bIdx}>{bullet}</li>
                                             ))}
                                          </ul>
                                          <p className="text-muted-foreground text-xs leading-relaxed italic border-l-2 pl-2">
                                            &quot;{segment.script.substring(0, 100)}&quot;...
                                          </p>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <div className="w-full h-48 bg-muted/30 rounded-lg flex flex-col items-center justify-center border-2 border-dashed">
                                   <Loader2 className="h-8 w-8 text-primary animate-spin mb-2" />
                                   <p className="text-sm font-medium">Video content is being generated...</p>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Text/Reading Content */}
                          {activity.type === "text" && (
                            <div className="max-w-none">
                               {activity.content ? (
                                 <div className="prose prose-sm dark:prose-invert max-w-none bg-muted/20 p-6 rounded-lg border">
                                   <ReactMarkdown 
                                     remarkPlugins={[remarkGfm]}
                                     components={{
                                       h1: ({node, ...props}) => <h1 className="text-2xl font-bold mt-6 mb-4 first:mt-0" {...props} />,
                                       h2: ({node, ...props}) => <h2 className="text-xl font-bold mt-5 mb-3" {...props} />,
                                       h3: ({node, ...props}) => <h3 className="text-lg font-semibold mt-4 mb-3" {...props} />,
                                       h4: ({node, ...props}) => <h4 className="text-base font-semibold mt-3 mb-2" {...props} />,
                                       p: ({node, ...props}) => <p className="text-foreground leading-relaxed mb-4" {...props} />,
                                       ul: ({node, ...props}) => <ul className="list-disc list-outside space-y-2 mb-4 ml-6" {...props} />,
                                       ol: ({node, ...props}) => <ol className="list-decimal list-outside space-y-2 mb-4 ml-6" {...props} />,
                                       li: ({node, ...props}) => <li className="text-foreground" {...props} />,
                                       blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-primary pl-4 italic text-muted-foreground my-4" {...props} />,
                                       code: ({node, inline, ...props}) => 
                                         inline ? (
                                           <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono text-foreground" {...props} />
                                         ) : (
                                           <code className="block bg-muted/50 p-4 rounded-lg overflow-x-auto mb-4 text-sm font-mono text-foreground" {...props} />
                                         ),
                                       table: ({node, ...props}) => <table className="border-collapse border border-muted w-full mb-4" {...props} />,
                                       thead: ({node, ...props}) => <thead className="bg-muted/30" {...props} />,
                                       th: ({node, ...props}) => <th className="border border-muted p-2 text-left font-semibold" {...props} />,
                                       td: ({node, ...props}) => <td className="border border-muted p-2" {...props} />,
                                       a: ({node, ...props}) => <a className="text-primary hover:underline" {...props} />,
                                       hr: ({node, ...props}) => <hr className="my-6 border-muted" {...props} />,
                                     }}
                                   >
                                     {activity.content}
                                   </ReactMarkdown>
                                 </div>
                               ) : (
                                 <div className="bg-muted/20 p-6 rounded-lg border">
                                   <p className="text-muted-foreground italic">
                                     [Generated Reading Material For: {activity.title}]
                                   </p>
                                   <p className="mt-4 text-foreground">
                                     Detailed conceptual explanations, definitions, and examples would appear here matching the backend content generation.
                                   </p>
                                 </div>
                               )}
                            </div>
                          )}
                          
                          {/* Image Content */}
                          {activity.type === "image" && (
                            <div className="flex flex-col items-center p-6 bg-muted/20 rounded-lg border">
                               {(() => {
                                 const imageAsset = activity.assets?.find(a => a.type === 'single_image');
                                 const imageUrl = imageAsset ? assetUrls[imageAsset.assetId] : null;
                                 
                                 return imageUrl ? (
                                   <>
                                     <img
                                       src={imageUrl}
                                       alt={activity.title}
                                       className="w-full max-w-2xl rounded shadow-md mb-4 object-cover"
                                     />
                                     {activity.image_description && (
                                       <p className="text-sm text-center text-muted-foreground max-w-lg">{activity.image_description}</p>
                                     )}
                                   </>
                                 ) : (
                                   <div className="flex flex-col items-center gap-2 text-muted-foreground">
                                     <Loader2 className="h-6 w-6 animate-spin text-primary" />
                                     <p className="text-sm font-medium">Image is being generated...</p>
                                   </div>
                                 );
                               })()}
                            </div>
                          )}
                       </div>
                    </div>
                  ))}

                  {/* Section Navigation & Completion */}
                  <div className="mt-12 pt-6 border-t-2 border-dashed flex flex-col sm:flex-row justify-between items-center gap-4">
                    <Button 
                      variant="outline" 
                      onClick={goToPreviousSection}
                      disabled={activeModuleDay === dailyModules[0]?.order && activeQuizIndex === null}
                      className="w-full sm:w-auto"
                    >
                      <ChevronLeft className="h-4 w-4 mr-2" />
                      Previous
                    </Button>
                    
                    <Button 
                      onClick={handleToggleSectionComplete}
                      variant={(() => {
                        if (activeQuizIndex === null) {
                          return completedSections.has(getSectionKey(currentModule.order, "materials")) ? "secondary" : "default";
                        } else {
                          return completedSections.has(getSectionKey(currentModule.order, "quiz", activeQuizIndex)) ? "secondary" : "default";
                        }
                      })()}
                      className="w-full sm:w-auto"
                    >
                      {(() => {
                        if (activeQuizIndex === null) {
                          return completedSections.has(getSectionKey(currentModule.order, "materials")) ? (
                            <>
                              <CheckCircle2 className="h-4 w-4 mr-2" />
                              Completed
                            </>
                          ) : (
                            "Mark as Completed"
                          );
                        } else {
                          return completedSections.has(getSectionKey(currentModule.order, "quiz", activeQuizIndex)) ? (
                            <>
                              <CheckCircle2 className="h-4 w-4 mr-2" />
                              Completed
                            </>
                          ) : (
                            "Mark as Completed"
                          );
                        }
                      })()}
                    </Button>

                    <Button 
                      onClick={goToNextSection}
                      disabled={
                        activeModuleDay === dailyModules[dailyModules.length - 1]?.order && 
                        (activeQuizIndex === null ? quizActivities.length === 0 : activeQuizIndex === quizActivities.length - 1)
                      }
                      className="w-full sm:w-auto"
                    >
                      Next
                      <ChevronLeft className="h-4 w-4 ml-2 rotate-180" />
                    </Button>
                  </div>
               </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <p>Select a module to view content</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
