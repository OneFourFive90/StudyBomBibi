"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronLeft, Play, Clock, CheckCircle2, BookOpen, Loader2, RefreshCw, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

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
  day: number;
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

// --- MOCK DATA ---
const MOCK_STUDY_PLANS: StudyPlan[] = [
  {
    id: "c1",
    title: "Introduction to Biology & The Cell",
    description: "AI-generated course uncovering the foundational principles of life.",
    progress: 45,
    totalHours: 20,
    format: "Video",
    materials: ["1", "3"],
    ownerId: "user123",
    courseTitle: "Introduction to Biology & The Cell",
    createdAt: "2026-02-26T10:00:00Z",
    schedule: [
      {
        day: 1,
        title: "Day 1: Unveiling Biology - The Study of Life",
        activities: [
          {
            type: "video",
            time_minutes: 45,
            title: "Introduction to Biology: What is Life?",
            assetStatus: "ready",
            video_segments: [
              {
                slide_title: "Welcome to Biology!",
                bullets: ["The scientific study of living organisms.", "Explores the diversity, complexity, and interconnectedness of life.", "Answers fundamental questions about our existence and the natural world."],
                script: "Hello future biologists! Welcome to your journey..."
              },
              {
                slide_title: "Defining Life: More Than Just Being There",
                bullets: ["What truly distinguishes living organisms from non-living matter?", "Life is defined by a unique set of shared characteristics.", "Understanding these helps us classify, appreciate, and conserve life."],
                script: "But what exactly constitutes a 'living organism'?"
              }
            ]
          },
          {
            type: "text",
            time_minutes: 45,
            title: "The Seven Characteristics of Life Explained",
            assetStatus: "ready",
            content: "To truly understand 'living organisms', as defined by biology, it's essential to grasp the fundamental characteristics..."
          },
          {
            type: "video",
            time_minutes: 20,
            title: "Major Themes in Biology: A Glimpse",
            assetStatus: "ready",
            video_segments: [
              {
                slide_title: "Biology's Vast Landscape: Key Topics",
                bullets: ["Cells: The fundamental building blocks of all life.", "Genetics..."],
                script: "Biology is an incredibly broad science..."
              }
            ]
          },
          {
            type: "quiz",
            time_minutes: 10,
            title: "Day 1 Quiz: Introduction to Biology",
            assetStatus: "ready",
            quiz_check: [
              {
                question: "Which of the following is NOT typically considered a characteristic of all living organisms?",
                options: ["Growth and Development", "Ability to fly", "Reproduction", "Response to the Environment"],
                answer: "Ability to fly"
              },
              {
                question: "The process by which living organisms maintain a stable internal environment despite external changes is called:",
                options: ["Metabolism", "Evolution", "Homeostasis", "Reproduction"],
                answer: "Homeostasis"
              }
            ]
          }
        ]
      },
      {
        day: 2,
        title: "Day 2: The Cell - Life's Fundamental Unit",
        activities: [
          {
            type: "video",
            time_minutes: 25,
            title: "The Cell: Unveiling Life's Fundamental Unit",
            assetStatus: "ready"
          },
          {
            type: "text",
            time_minutes: 25,
            title: "Exploring the 'Basic Unit': Prokaryotic vs. Eukaryotic Cells",
            assetStatus: "ready"
          },
          {
            type: "image",
            time_minutes: 10,
            title: "Anatomy of a Eukaryotic Animal Cell",
            assetStatus: "generating"
          },
          {
            type: "quiz",
            time_minutes: 10,
            title: "Day 2 Quiz: The Cell and Its Structures",
            assetStatus: "ready"
          }
        ]
      }
    ]
  },
  {
    id: "c2",
    title: "Advanced Mathematics",
    description: "Personalized mathematics course tailored to your learning style and materials.",
    progress: 12,
    totalHours: 35,
    format: "Text",
    materials: ["2"],
    ownerId: "user123",
    courseTitle: "Advanced Mathematics",
    createdAt: "2026-02-25T14:00:00Z",
    schedule: []
  },
];


export default function CourseDetailPage() {
  const params = useParams();
  const courseId = Array.isArray(params.id) ? params.id[0] : params.id;
  const studyPlan = MOCK_STUDY_PLANS.find((plan) => plan.id === courseId) ?? null;
  const [activeModuleDay, setActiveModuleDay] = useState<number | null>(null);
  const [activeQuizIndex, setActiveQuizIndex] = useState<number | null>(null); // Index of the active quiz within the module
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [completedSections, setCompletedSections] = useState<Set<string>>(new Set());
  // State for quiz start page, quiz question navigation, and answer selection
  const [quizStarted, setQuizStarted] = useState(false);
  const [currentQuizQuestion, setCurrentQuizQuestion] = useState(0);
  // Store selected answers as an array of selected option indices (or null)
  const [selectedAnswers, setSelectedAnswers] = useState<(number | null)[]>([]);

  // Reset quiz state when changing quiz or module
  useEffect(() => {
    setQuizStarted(false);
    setCurrentQuizQuestion(0);
    setSelectedAnswers([]);
  }, [activeQuizIndex, activeModuleDay]);

  if (!studyPlan) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <h2 className="text-xl font-semibold">Course Not Found</h2>
        <p className="text-muted-foreground">The course you are looking for does not exist.</p>
        <Link href="/courses">
          <Button>Return to Learning Hub</Button>
        </Link>
      </div>
    );
  }

  // Set active module on first load
  if (activeModuleDay === null && studyPlan.schedule.length > 0) {
    setActiveModuleDay(studyPlan.schedule[0].day);
    setActiveQuizIndex(null); // Show module content by default
  }

  const currentModule = studyPlan.schedule.find(m => m.day === activeModuleDay);
  const quizActivities = currentModule?.activities.map((a, i) => ({ ...a, originalIndex: i })).filter(a => a.type === "quiz") || [];
  const contentActivities = currentModule?.activities.filter(a => a.type !== "quiz") || [];

  const completedActivities = Array.from(completedSections).length;
  const totalActivities = studyPlan.schedule.reduce((acc, mod) => acc + mod.activities.length, 0);

  const getSectionKey = (day: number, quizIndex: number | null) => {
    return quizIndex === null ? `day-${day}-materials` : `day-${day}-quiz-${quizIndex}`;
  };

  const handleToggleSectionComplete = () => {
    if (activeModuleDay === null) return;
    const key = getSectionKey(activeModuleDay, activeQuizIndex);
    setCompletedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });
  };

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
    const currentModuleIdx = studyPlan.schedule.findIndex(m => m.day === activeModuleDay);
    if (currentModuleIdx < studyPlan.schedule.length - 1) {
      const nextModule = studyPlan.schedule[currentModuleIdx + 1];
      setActiveModuleDay(nextModule.day);
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
    const currentModuleIdx = studyPlan.schedule.findIndex(m => m.day === activeModuleDay);
    if (currentModuleIdx > 0) {
      const prevModule = studyPlan.schedule[currentModuleIdx - 1];
      const prevQuizActivities = prevModule.activities.filter(a => a.type === "quiz");
      
      setActiveModuleDay(prevModule.day);
      if (prevQuizActivities.length > 0) {
        setActiveQuizIndex(prevQuizActivities.length - 1);
      } else {
        setActiveQuizIndex(null);
      }
    }
  };

  // Content type badges
  const getContentTypeBadge = (type: string) => {
    const badges: Record<string, { bg: string; text: string }> = {
      video: { bg: "bg-blue-500/10", text: "text-blue-600" },
      text: { bg: "bg-green-500/10", text: "text-green-600" },
      image: { bg: "bg-purple-500/10", text: "text-purple-600" },
      quiz: { bg: "bg-primary/10", text: "text-primary" }
    };
    return badges[type] || badges.text;
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
              <p className="text-xs text-muted-foreground mt-1">{studyPlan.schedule.length} days</p>
            </div>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setIsSidebarOpen(false)}>
              <PanelLeftClose className="h-4 w-4" />
            </Button>
          </div>

          <div className="overflow-y-auto flex-1">
            {studyPlan.schedule.length === 0 ? (
              <div className="flex items-center justify-center h-full text-muted-foreground text-sm p-4">
                No modules available yet
              </div>
            ) : (
              <div className="space-y-2 p-3">
                {studyPlan.schedule.map((module, idx) => {
                  const isActive = activeModuleDay === module.day;
                  const moduleQuizzes = module.activities.map((a, i) => ({ ...a, originalIndex: i })).filter(a => a.type === "quiz");
                  
                  // Section completion logic
                  const isMaterialsCompleted = completedSections.has(getSectionKey(module.day, null));
                  const completedQuizzesCount = moduleQuizzes.filter(q => completedSections.has(getSectionKey(module.day, q.originalIndex))).length;
                  const totalSections = 1 + moduleQuizzes.length; // Materials + Quizzes
                  const completedSectionsCount = (isMaterialsCompleted ? 1 : 0) + completedQuizzesCount;

                  return (
                    <div key={module.day} className="mb-6">
                      {/* Module Header */}
                      <div className="mb-2">
                        <div className="font-medium text-xs uppercase tracking-wider  px-2 py-1">
                          {module.title}
                        </div>
                      </div>
                      
                      {/* Materials Section */}
                      <div className="ml-2 space-y-1">
                        <button
                          onClick={() => {
                            setActiveModuleDay(module.day);
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
                            const isQuizCompleted = completedSections.has(getSectionKey(module.day, quiz.originalIndex));
                            const isQuizActive = activeQuizIndex === quiz.originalIndex && isActive;
                            return (
                              <button
                                key={qIdx}
                                onClick={() => {
                                  setActiveModuleDay(module.day);
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
            // QUIZ VIEW: Show start page first, then quiz questions one at a time after starting
            (() => {
              const quiz = currentModule.activities[activeQuizIndex];
              const questions = quiz.quiz_check || [];
              // If quiz not started, show start page
              if (!quizStarted) {
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
                            onClick={() => {
                              // Placeholder for submit logic
                              alert('Quiz submitted!');
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
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${getContentTypeBadge(activity.type).bg}`}>
                               {activity.type === 'video' && <Play className={`h-5 w-5 ${getContentTypeBadge(activity.type).text}`} />}
                               {activity.type === 'text' && <BookOpen className={`h-5 w-5 ${getContentTypeBadge(activity.type).text}`} />}
                               {activity.type === 'image' && <BookOpen className={`h-5 w-5 ${getContentTypeBadge(activity.type).text}`} />} {/* Reuse book for image or add Image icon */}
                            </div>
                            <div>
                               <h3 className="text-xl font-semibold">{activity.title}</h3>
                               <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <Clock className="h-3 w-3" /> {activity.time_minutes} min
                               </div>
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
                                  <div className="aspect-video bg-black rounded-lg flex items-center justify-center group cursor-pointer hover:bg-black/90 transition-colors shadow-lg">
                                    <Play className="h-16 w-16 text-white opacity-80 group-hover:opacity-100 transition-opacity" />
                                  </div>
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
                                            "{segment.script.substring(0, 100)}..."
                                          </p>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <div className="w-full h-48 bg-muted/30 rounded-lg flex flex-col items-center justify-center border-2 border-dashed">
                                   <Loader2 className="h-8 w-8 text-primary animate-spin mb-2" />
                                   <p className="text-sm font-medium">Waiting for AI to generate...</p>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Text/Reading Content */}
                          {activity.type === "text" && (
                            <div className="prose prose-sm max-w-none bg-muted/20 p-6 rounded-lg border">
                               {activity.content ? (
                                 <div className="text-foreground leading-relaxed whitespace-pre-wrap">
                                   {activity.content}
                                 </div>
                               ) : (
                                 <>
                                   <p className="text-muted-foreground italic">
                                     [Generated Reading Material For: {activity.title}]
                                   </p>
                                   <p className="mt-4">
                                     Detailed conceptual explanations, definitions, and examples would appear here matching the backend content generation.
                                   </p>
                                 </>
                               )}
                            </div>
                          )}
                          
                          {/* Image Content */}
                          {activity.type === "image" && (
                            <div className="flex flex-col items-center p-6 bg-muted/20 rounded-lg border">
                               {activity.image_description ? ( 
                                 <>
                                   <div className="w-full max-w-md aspect-video bg-muted rounded shadow-sm mb-4 flex items-center justify-center">
                                      <span className="text-muted-foreground">Image Asset</span>
                                   </div>
                                   <p className="text-sm text-center text-muted-foreground max-w-lg">{activity.image_description}</p>
                                 </>
                               ) : (
                                  <div className="flex items-center gap-2 text-muted-foreground">
                                     <Loader2 className="h-4 w-4 animate-spin" /> Waiting for AI to generate...
                                  </div>
                               )}
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
                      disabled={activeModuleDay === studyPlan.schedule[0].day && activeQuizIndex === null}
                      className="w-full sm:w-auto"
                    >
                      <ChevronLeft className="h-4 w-4 mr-2" />
                      Previous
                    </Button>
                    
                    <Button 
                      onClick={handleToggleSectionComplete}
                      variant={completedSections.has(getSectionKey(currentModule.day, activeQuizIndex)) ? "secondary" : "default"}
                      className="w-full sm:w-auto"
                    >
                      {completedSections.has(getSectionKey(currentModule.day, activeQuizIndex)) ? (
                        <>
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                          Completed
                        </>
                      ) : (
                        "Mark as Completed"
                      )}
                    </Button>

                    <Button 
                      onClick={goToNextSection}
                      disabled={
                        activeModuleDay === studyPlan.schedule[studyPlan.schedule.length - 1].day && 
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
