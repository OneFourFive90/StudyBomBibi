"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronLeft, Sparkles, Clock, CheckCircle2, PlayCircle } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState, useEffect } from "react";

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

// --- MOCK DATA ---
const MOCK_PLANS: Plan[] = [
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
    materials: ["2"],
    schedule: [] // Empty schedule example
  },
  {
    id: "p3",
    title: "Physics for Engineers",
    description: "Understand the fundamental principles of physics applied to engineering problems.",
    progress: 78,
    totalHours: 25,
    format: "Image",
    materials: ["4", "5"],
    schedule: [] // Empty schedule example
  },
];

export default function StudyPlanDetailPage() {
  const params = useParams();
  const [plan, setPlan] = useState<Plan | null>(null);

  useEffect(() => {
    // Simulate fetching plan by ID
    const foundPlan = MOCK_PLANS.find(p => p.id === params.id);
    if (foundPlan) {
      setPlan(foundPlan);
    }
  }, [params.id]);

  if (!plan) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <h2 className="text-xl font-semibold">Plan Not Found</h2>
        <p className="text-muted-foreground">The study plan you are looking for does not exist in the mock data.</p>
        <Link href="/study-planner">
          <Button>Return to Study Planner</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
       {/* Header with Back Button */}
       <div className="flex items-center gap-2 border-b pb-4">
          <Link href="/study-planner">
            <Button variant="ghost" size="sm">
                <ChevronLeft className="h-4 w-4 mr-1" />
                Back
            </Button>
          </Link>
          <div className="h-6 w-px bg-border mx-2" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{plan.title}</h1>
            <p className="text-muted-foreground text-sm">{plan.description}</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
             <div className="bg-secondary text-secondary-foreground px-3 py-1 rounded-full text-xs font-medium">
                Progress: {plan.progress}%
             </div>
          </div>
       </div>

       {/* Content */}
       <div className="flex-1 overflow-y-auto pr-2">
          {!plan.schedule || plan.schedule.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Sparkles className="h-12 w-12 mb-4 opacity-20" />
                  <p>No schedule generated yet for this plan.</p>
                  <Button className="mt-4" asChild>
                    <Link href="/study-planner">Return to List</Link>
                  </Button>
              </div>
          ) : (
              <div className="space-y-8 max-w-4xl mx-auto">
                  {plan.schedule.map((week) => (
                      <div key={week.week} className="space-y-4">
                          <div className="flex items-center gap-2">
                              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                                  {week.week}
                              </div>
                              <h3 className="text-lg font-semibold">Week {week.week}</h3>
                          </div>
                          
                          <div className="grid gap-4 pl-4 sm:pl-10">
                              {week.days.map((day) => (
                                  <Card key={`${week.week}-${day.day}`} className="overflow-hidden">
                                      <CardHeader className="py-3 bg-muted/30">
                                          <div className="flex justify-between items-center">
                                              <CardTitle className="text-base font-medium">Day {day.day}: {day.topic}</CardTitle>
                                              <span className="text-xs text-muted-foreground">{day.tasks.length} tasks</span>
                                          </div>
                                      </CardHeader>
                                      <CardContent className="p-0">
                                          <div className="divide-y">
                                              {day.tasks.map((task) => (
                                                  <div key={task.id} className="flex items-center p-3 hover:bg-muted/10 transition-colors group">
                                                      <div className={`mr-4 h-5 w-5 rounded-full border flex items-center justify-center cursor-pointer transition-colors ${task.completed ? "bg-green-500 border-green-500 text-white" : "border-muted-foreground group-hover:border-primary"}`}>
                                                          {task.completed && <CheckCircle2 className="h-3 w-3" />}
                                                      </div>
                                                      <div className="flex-1">
                                                          <p className={`text-sm font-medium ${task.completed ? "line-through text-muted-foreground" : ""}`}>{task.title}</p>
                                                      </div>
                                                      <div className="flex items-center text-xs text-muted-foreground gap-1">
                                                          <Clock className="h-3 w-3" />
                                                          {task.duration}m
                                                      </div>
                                                      <Button variant="ghost" size="icon" className="h-8 w-8 ml-2 opacity-0 group-hover:opacity-100">
                                                          <PlayCircle className="h-4 w-4" />
                                                      </Button>
                                                  </div>
                                              ))}
                                          </div>
                                      </CardContent>
                                    </Card>
                                  ))}
                          </div>
                      </div>
                  ))}
              </div>
          )}
       </div>
    </div>
  );
}
