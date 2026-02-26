"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  BookOpen, 
  GraduationCap, 
  Library, 
  Sparkles, 
  UploadCloud, 
  MessageSquare, 
  PlayCircle, 
  FileText,
  ArrowRight,
  Activity,
  Clock,
  CheckCircle
} from "lucide-react";
import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "@/lib/firebase/firebase";
import { getQuizzesMetadataByOwnerId } from "@/lib/firebase/firestore/readQuizzesFromFirestore";
import { collection, getDocs, query, where } from "firebase/firestore";

const TEST_USER_ID = "test-user-123";

interface DashboardStats {
  planCount: number;
  activePlanCount: number;
  examCount: number;
  completedExamCount: number;
  libraryFileCount: number;
}

interface ActivePlanSummary {
  id: string;
  title: string;
  progress: number;
}

interface IncompleteExamSummary {
  id: string;
  title: string;
  mode: "mcq" | "past_year";
}

const INITIAL_STATS: DashboardStats = {
  planCount: 0,
  activePlanCount: 0,
  examCount: 0,
  completedExamCount: 0,
  libraryFileCount: 0,
};

export default function DashboardPage() {
  const [userId, setUserId] = useState(TEST_USER_ID);
  const [stats, setStats] = useState<DashboardStats>(INITIAL_STATS);
  const [activePlan, setActivePlan] = useState<ActivePlanSummary | null>(null);
  const [incompleteExams, setIncompleteExams] = useState<IncompleteExamSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (firebaseUser) => {
      setUserId(firebaseUser?.uid || TEST_USER_ID);
    });

    return () => unsub();
  }, []);

  useEffect(() => {
    const loadDashboardStats = async () => {
      setLoading(true);
      setError("");

      try {
        const [filesResponse, quizzes, plansSnapshot] = await Promise.all([
          fetch(`/api/get-files?userId=${encodeURIComponent(userId)}`),
          getQuizzesMetadataByOwnerId(userId),
          getDocs(query(collection(db, "plans"), where("ownerId", "==", userId))),
        ]);

        if (!filesResponse.ok) {
          const payload = await filesResponse.json();
          throw new Error(payload.error || "Failed to load files");
        }

        const filesPayload = (await filesResponse.json()) as { files?: unknown[] };
        const plans = plansSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...(doc.data() as { status?: string; progress?: number; courseTitle?: string; title?: string }),
        }));

        const activePlans = plans.filter((plan) => plan.status === "active");
        const prioritizedActivePlan = activePlans
          .sort((a, b) => {
            const aProgress = typeof a.progress === "number" ? a.progress : 0;
            const bProgress = typeof b.progress === "number" ? b.progress : 0;
            return bProgress - aProgress;
          })[0];

        setActivePlan(
          prioritizedActivePlan
            ? {
                id: prioritizedActivePlan.id,
                title: prioritizedActivePlan.courseTitle || prioritizedActivePlan.title || "Untitled Study Plan",
                progress:
                  typeof prioritizedActivePlan.progress === "number"
                    ? Math.max(0, Math.min(100, Math.round(prioritizedActivePlan.progress)))
                    : 0,
              }
            : null
        );

        const incomplete = quizzes
          .filter((quiz) => quiz.status === "uncomplete")
          .map((quiz) => ({
            id: quiz.id,
            title: quiz.title,
            mode: quiz.mode,
          }));
        setIncompleteExams(incomplete);

        setStats({
          planCount: plans.length,
          activePlanCount: activePlans.length,
          examCount: quizzes.length,
          completedExamCount: quizzes.filter((quiz) => quiz.status === "completed").length,
          libraryFileCount: filesPayload.files?.length || 0,
        });
      } catch (loadError) {
        const message = loadError instanceof Error ? loadError.message : "Failed to load dashboard";
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    void loadDashboardStats();
  }, [userId]);

  const countLabel = (value: number) => (loading ? "-" : `${value}`);

  return (
    <div className="space-y-8 pb-10 max-w-6xl mx-auto">
      {/* --- Header --- */}
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">Welcome back! Here&apos;s an overview of your study progress.</p>
      </div>

      {error && (
        <Card className="border-destructive/40 bg-destructive/10">
          <CardContent className="pt-6 text-sm text-destructive font-medium">{error}</CardContent>
        </Card>
      )}

      {/* --- Quick Actions --- */}
      <div className="grid gap-4 md:grid-cols-3">
        <Link href="/exam-prep/generator" className="block group">
          <Button variant="default" className="w-full h-auto py-4 flex flex-col items-center gap-2 shadow-sm group-hover:shadow-md transition-all">
            <Sparkles className="h-6 w-6" />
            <span className="font-semibold text-base">Generate New Exam</span>
          </Button>
        </Link>
        <Link href="/library" className="block group">
          <Button variant="secondary" className="w-full h-auto py-4 flex flex-col items-center gap-2 shadow-sm border border-transparent group-hover:border-border transition-all">
            <UploadCloud className="h-6 w-6" />
            <span className="font-semibold text-base">Upload Material</span>
          </Button>
        </Link>
        <Link href="/assistant" className="block group">
          <Button variant="outline" className="w-full h-auto py-4 flex flex-col items-center gap-2 shadow-sm hover:bg-muted transition-all bg-background">
            <MessageSquare className="h-6 w-6" />
            <span className="font-semibold text-base">Ask AI Assistant</span>
          </Button>
        </Link>
      </div>

      {/* --- Stats Overview --- */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="hover:shadow-sm transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Study Plans</CardTitle>
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <BookOpen className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{countLabel(stats.planCount)}</div>
            <p className="text-sm text-muted-foreground mt-1">
              <span className="text-blue-600 dark:text-blue-400 font-medium">{countLabel(stats.activePlanCount)}</span> active
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-sm transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Exams Generated</CardTitle>
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <GraduationCap className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{countLabel(stats.examCount)}</div>
            <p className="text-sm text-muted-foreground mt-1">
              <span className="text-purple-600 dark:text-purple-400 font-medium">{countLabel(stats.completedExamCount)}</span> completed
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-sm transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Library Items</CardTitle>
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <Library className="h-4 w-4 text-green-600 dark:text-green-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{countLabel(stats.libraryFileCount)}</div>
            <p className="text-sm text-muted-foreground mt-1">Files securely stored</p>
          </CardContent>
        </Card>
      </div>

      {/* --- Continue Where You Left Off --- */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Active Study Plan */}
        <Card className="flex flex-col">
          <CardHeader className="pb-3 border-b">
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Active Study Plan
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col justify-center pt-6">
            {loading ? (
              <div className="animate-pulse space-y-4">
                <div className="h-4 bg-muted rounded w-3/4"></div>
                <div className="h-2 bg-muted rounded w-full"></div>
              </div>
            ) : activePlan ? (
              <div className="space-y-5">
                <div>
                  <h3 className="font-semibold text-lg line-clamp-1" title={activePlan.title}>
                    {activePlan.title}
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">{activePlan.progress}% complete</p>
                </div>
                <div className="h-2.5 w-full rounded-full bg-secondary overflow-hidden">
                  <div 
                    className="h-full bg-primary transition-all duration-500 ease-in-out" 
                    style={{ width: `${activePlan.progress}%` }} 
                  />
                </div>
                <Link href={`/study-planner/${activePlan.id}`} className="block mt-4">
                  <Button className="w-full gap-2 group">
                    Resume Plan <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="text-center py-6 flex flex-col items-center text-muted-foreground">
                <BookOpen className="h-10 w-10 mb-3 opacity-20" />
                <p className="text-sm">No active study plans right now.</p>
                <Link href="/study-planner" className="mt-4">
                  <Button variant="outline" size="sm">Create a Plan</Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Incomplete Exams */}
        <Card className="flex flex-col">
          <CardHeader className="pb-3 border-b">
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5 text-amber-500" />
              Incomplete Exams
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 pt-4">
            {loading ? (
              <div className="animate-pulse space-y-4 pt-2">
                {[1, 2].map((i) => (
                  <div key={i} className="h-16 bg-muted rounded-md w-full"></div>
                ))}
              </div>
            ) : incompleteExams.length === 0 ? (
              <div className="text-center py-10 flex flex-col items-center text-muted-foreground h-full justify-center">
                <CheckCircle className="h-10 w-10 mb-3 opacity-20" />
                <p className="text-sm">You are all caught up!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {incompleteExams.slice(0, 3).map((exam) => (
                  <div 
                    key={exam.id} 
                    className="group rounded-lg border bg-card p-3 flex items-center justify-between gap-3 hover:border-primary/50 hover:bg-muted/20 transition-all"
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="p-2 bg-secondary rounded-md shrink-0">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate" title={exam.title}>{exam.title}</p>
                        <p className="text-xs text-muted-foreground uppercase tracking-wider mt-0.5">
                          {exam.mode === "mcq" ? "MCQ Quiz" : "Past Year"}
                        </p>
                      </div>
                    </div>
                    <Link href={`/exam-prep/${exam.id}`} className="shrink-0">
                      <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                        <PlayCircle className="h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}