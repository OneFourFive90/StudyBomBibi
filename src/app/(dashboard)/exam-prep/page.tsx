"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { CheckCircle, Clock, RotateCcw, Search, Sparkles, ChevronDown, ArrowUp, ArrowDown } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { getQuizzesByOwnerId } from "@/lib/firebase/firestore/readQuizzesFromFirestore";
import { restartQuizAttempt } from "@/lib/firebase/firestore/saveQuizToFirestore";
import { StatusToast } from "@/components/ui/status-toast";
import { useToastMessage } from "@/hooks/use-toast-message";
import { useSort } from "@/hooks/use-sort";

interface ExamListItem {
  id: string;
  title: string;
  mode: "mcq" | "past_year";
  status: "uncomplete" | "completed";
  questions: number;
  durationMinutes: number | null;
  createdAtMs: number;
  updatedAtMs: number;
  updatedAtLabel: string;
}

export default function ExamPrepPage() {
  const router = useRouter();
  const { userId, loading: authLoading } = useAuth();
  const { toast, showToast, clearToast } = useToastMessage();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [exams, setExams] = useState<ExamListItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [restartingExamId, setRestartingExamId] = useState<string | null>(null);

  const filteredExams = exams.filter((exam) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const modeLabel = exam.mode === "mcq" ? "mcq quiz" : "mock exam";
    return (
      exam.title.toLowerCase().includes(q) ||
      modeLabel.includes(q) ||
      exam.status.toLowerCase().includes(q)
    );
  });

  const examSortOptions = useMemo(
    () => [
      {
        key: "createdAt" as const,
        label: "Time Created",
        compare: (a: ExamListItem, b: ExamListItem) => a.createdAtMs - b.createdAtMs,
      },
      {
        key: "lastAccessedAt" as const,
        label: "Last Access",
        compare: (a: ExamListItem, b: ExamListItem) => a.updatedAtMs - b.updatedAtMs,
      },
      {
        key: "name" as const,
        label: "Name",
        compare: (a: ExamListItem, b: ExamListItem) => a.title.localeCompare(b.title),
      },
    ],
    []
  );

  const {
    sortBy,
    setSortBy,
    sortOrder,
    showSortDropdown,
    setShowSortDropdown,
    sortedItems: sortedExams,
    sortLabel,
    toggleSortOrder,
  } = useSort({
    items: filteredExams,
    options: examSortOptions,
    initialSortBy: "createdAt",
    initialSortOrder: "desc",
  });

  const askTimerPreference = () =>
    new Promise<boolean>((resolve) => {
      showToast("Use timer for this attempt?", "info", {
        actions: [
          {
            label: "With Timer",
            onClick: () => {
              clearToast();
              resolve(true);
            },
          },
          {
            label: "Without Timer",
            variant: "outline",
            onClick: () => {
              clearToast();
              resolve(false);
            },
          },
        ],
      });
    });

  const navigateToExamAttempt = (examId: string, withTimer: boolean) => {
    router.push(`/exam-prep/${examId}?autostart=1&timer=${withTimer ? "1" : "0"}`);
  };

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!userId) {
      setExams([]);
      setError("Please sign in to load exams.");
      setLoading(false);
      return;
    }

    const loadQuizzes = async () => {
      setLoading(true);
      setError("");

      try {
        const quizzes = await getQuizzesByOwnerId(userId);
        const mapped = quizzes
          .sort((a, b) => {
            const aTime = a.updatedAt?.toMillis?.() || 0;
            const bTime = b.updatedAt?.toMillis?.() || 0;
            return bTime - aTime;
          })
          .map((quiz) => ({
            id: quiz.id,
            title: quiz.title,
            mode: quiz.mode,
            status: quiz.status,
            questions: quiz.questions.length,
            durationMinutes:
              typeof quiz.durationMinutes === "number" && quiz.durationMinutes > 0
                ? quiz.durationMinutes
                : null,
            createdAtMs: quiz.createdAt?.toMillis?.() || 0,
            updatedAtMs: quiz.updatedAt?.toMillis?.() || 0,
            updatedAtLabel: quiz.updatedAt?.toDate?.().toLocaleDateString() || "-",
          }));

        setExams(mapped);
      } catch (loadError) {
        const message = loadError instanceof Error ? loadError.message : "Failed to load exams";
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    void loadQuizzes();
  }, [authLoading, userId]);

  const handleRestartExam = async (examId: string) => {
    const withTimer = await askTimerPreference();

    setRestartingExamId(examId);
    setError("");

    try {
      await restartQuizAttempt(examId);
      setExams((prev) =>
        prev.map((exam) =>
          exam.id === examId
            ? {
                ...exam,
                status: "uncomplete",
                updatedAtMs: Date.now(),
                updatedAtLabel: new Date().toLocaleDateString(),
              }
            : exam
        )
      );
      navigateToExamAttempt(examId, withTimer);
    } catch (restartError) {
      const message = restartError instanceof Error ? restartError.message : "Failed to restart exam";
      setError(message);
    } finally {
      setRestartingExamId(null);
    }
  };

  const handleStartExam = async (examId: string) => {
    const withTimer = await askTimerPreference();
    navigateToExamAttempt(examId, withTimer);
  };

  const sortedQuizExams = sortedExams.filter((exam) => exam.mode === "mcq");
  const sortedPastYearExams = sortedExams.filter((exam) => exam.mode === "past_year");

  const renderExamCard = (exam: ExamListItem) => (
    <Card key={exam.id} className="hover:shadow-md transition-shadow bg-card text-card-foreground">
      <CardHeader>
        <div className="flex justify-between items-start gap-2">
          <div>
            <CardTitle>{exam.title}</CardTitle>
          </div>
          <span className={`text-xs font-semibold px-2 py-1 rounded-full whitespace-nowrap ${
            exam.mode === "mcq"
              ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
              : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
          }`}>
            {exam.mode === "mcq" ? "MCQ Quiz" : "Mock Exam"}
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex justify-between items-center mb-4">
          <div className="flex flex-col gap-1 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              <span>{exam.questions} Questions</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span>{exam.durationMinutes ? `${exam.durationMinutes} mins` : "No time limit"}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>{exam.status === "completed" ? "Completed" : "Uncomplete"}</span>
          </div>
        </div>
        <div className="flex gap-2">
          {exam.status === "completed" ? (
            <Link href={`/exam-prep/${exam.id}?view=1`} className="flex-1">
              <Button className="w-full" variant="outline">
                View
              </Button>
            </Link>
          ) : (
            <Button className="w-full flex-1" onClick={() => void handleStartExam(exam.id)}>
              Start
            </Button>
          )}

          {exam.status === "completed" && (
            <Button
              className="flex-1 gap-2"
              onClick={() => void handleRestartExam(exam.id)}
              disabled={restartingExamId === exam.id}
            >
              <RotateCcw className="h-4 w-4" />
              {restartingExamId === exam.id ? "Restarting..." : "Restart"}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <>
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Exam Prep</h1>
          <p className="text-muted-foreground mt-2">Generate quizzes and practice papers for your exams.</p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-64 md:flex-none">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search exams..."
              className="pl-8"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
          </div>

          {filteredExams.length > 0 && (
            <div className="flex items-center gap-2 border rounded-md bg-background">
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowSortDropdown(!showSortDropdown)}
                  className="inline-flex items-center justify-between gap-2 h-9 w-40 px-3 text-sm hover:bg-accent rounded-md"
                >
                  <span className="truncate whitespace-nowrap">{sortLabel}</span>
                  <ChevronDown className="h-4 w-4 shrink-0" />
                </button>

                {showSortDropdown && (
                  <div className="absolute top-full left-0 mt-1 w-48 bg-background border rounded-md shadow-lg z-50">
                    {examSortOptions.map((option) => (
                      <button
                        key={option.key}
                        onClick={() => {
                          setSortBy(option.key);
                          setShowSortDropdown(false);
                        }}
                        className={`w-full text-left px-4 py-2 text-sm hover:bg-accent truncate whitespace-nowrap ${sortBy === option.key ? "bg-primary/10 text-primary font-semibold" : ""}`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="border-l h-6" />

              <button
                type="button"
                onClick={toggleSortOrder}
                title={sortOrder === "asc" ? "Ascending" : "Descending"}
                className="inline-flex items-center gap-1 h-9 px-3 text-sm hover:bg-accent rounded-md"
              >
                {sortOrder === "asc" ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
              </button>
            </div>
          )}

          <Link href="/exam-prep/generator">
            <Button className="gap-2">
              <Sparkles className="h-4 w-4" /> Generate New
            </Button>
          </Link>
        </div>
      </div>
      
      <div className="space-y-6">
        {loading && (
          <Card className="md:col-span-2 lg:col-span-3">
            <CardContent className="pt-6 text-sm text-muted-foreground">Loading exams...</CardContent>
          </Card>
        )}

        {!loading && error && (
          <Card className="md:col-span-2 lg:col-span-3 border-destructive/40">
            <CardContent className="pt-6 text-sm text-destructive">{error}</CardContent>
          </Card>
        )}

        {!loading && !error && exams.length === 0 && (
          <Card className="md:col-span-2 lg:col-span-3">
            <CardContent className="pt-6 text-sm text-muted-foreground">No quizzes yet. Generate one to get started.</CardContent>
          </Card>
        )}

        {!loading && !error && exams.length > 0 && filteredExams.length === 0 && (
          <Card className="md:col-span-2 lg:col-span-3">
            <CardContent className="pt-6 text-sm text-muted-foreground">No exams match your search.</CardContent>
          </Card>
        )}

        {!loading && !error && sortedExams.length > 0 && (
          <>
            {sortedQuizExams.length > 0 && (
              <div className="space-y-3">
                <p className="text-sm font-medium text-muted-foreground">MCQ Quiz ({sortedQuizExams.length})</p>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {sortedQuizExams.map(renderExamCard)}
                </div>
              </div>
            )}

            {sortedQuizExams.length > 0 && sortedPastYearExams.length > 0 && (
              <div className="border-t border-dashed" />
            )}

            {sortedPastYearExams.length > 0 && (
              <div className="space-y-3">
                <p className="text-sm font-medium text-muted-foreground">Mock Exam ({sortedPastYearExams.length})</p>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {sortedPastYearExams.map(renderExamCard)}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
    <StatusToast toast={toast} onClose={clearToast} />
    </>
  );
}
