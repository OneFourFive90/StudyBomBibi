"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { ArrowLeft, CheckCircle, Clock, RotateCcw, Save } from "lucide-react";
import Link from "next/link";
import { useState, useEffect, useCallback } from "react";
import { useParams, useSearchParams } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";
import { getQuizById } from "@/lib/firebase/firestore/readQuizzesFromFirestore";
import { StatusToast } from "@/components/ui/status-toast";
import { useToastMessage } from "@/hooks/use-toast-message";
import {
  restartQuizAttempt,
  submitQuizResponses,
  type QuizDocument,
  type QuizQuestion,
  type QuizScore,
} from "@/lib/firebase/firestore/saveQuizToFirestore";

function normalizeGeneratedText(content: string): string {
  let normalized = content.replace(/\r\n/g, "\n").trim();

  const fencedBlockMatch = normalized.match(/^```(?:markdown|md|text|txt)?\n([\s\S]*?)\n```$/i);
  if (fencedBlockMatch) {
    normalized = fencedBlockMatch[1].trim();
  }

  normalized = normalized
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "")
    .replace(/\\([`*_#>\-\[\]()])/g, "$1");

  return normalized;
}

function MarkdownBlock({
  content,
  className,
}: {
  content: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "prose prose-sm max-w-none break-words text-foreground dark:prose-invert prose-p:text-foreground prose-li:text-foreground prose-strong:text-foreground prose-headings:text-foreground",
        className
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => <p className="my-2 leading-relaxed">{children}</p>,
          li: ({ children }) => <li className="my-1">{children}</li>,
          ul: ({ children }) => <ul className="my-2 list-disc pl-5">{children}</ul>,
          ol: ({ children }) => <ol className="my-2 list-decimal pl-5">{children}</ol>,
          table: ({ children }) => (
            <div className="my-3 overflow-x-auto rounded-md border">
              <table className="w-full border-collapse text-sm">{children}</table>
            </div>
          ),
          th: ({ children }) => (
            <th className="border bg-muted/40 px-2 py-1 text-left align-top whitespace-normal break-words">{children}</th>
          ),
          td: ({ children }) => (
            <td className="border px-2 py-1 align-top whitespace-normal break-words">{children}</td>
          ),
        }}
      >
        {normalizeGeneratedText(content)}
      </ReactMarkdown>
    </div>
  );
}

export default function ExamPage() {
  const { userId, loading: authLoading } = useAuth();
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const quizId = params?.id || "";
  const shouldAutoStart = searchParams.get("autostart") === "1";
  const isViewOnly = searchParams.get("view") === "1";
  const timerParam = searchParams.get("timer");

  const [quiz, setQuiz] = useState<(QuizDocument & { id: string }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [structuredAnswers, setStructuredAnswers] = useState<Record<string, string>>({});
  
  // NEW STATES: For Active Quiz "Card by Card" Navigation
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [confirmedQuestions, setConfirmedQuestions] = useState<Record<string, boolean>>({});

  const [timeLeft, setTimeLeft] = useState(60 * 60);
  const [isExamStarted, setIsExamStarted] = useState(false);
  const [isStartChoiceOpen, setIsStartChoiceOpen] = useState(false);
  const [useTimerForAttempt, setUseTimerForAttempt] = useState<boolean | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRestarting, setIsRestarting] = useState(false);
  const [attemptUiKey, setAttemptUiKey] = useState(0);
  const { toast, showToast, clearToast } = useToastMessage();

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!userId) {
      setQuiz(null);
      setError("Please sign in to access this exam.");
      setLoading(false);
      return;
    }

    const loadQuiz = async () => {
      if (!quizId) return;

      setLoading(true);
      setError("");
      try {
        const result = await getQuizById(quizId);
        if (!result) {
          throw new Error("Quiz not found");
        }

        if (result.ownerId !== userId) {
          throw new Error("Unauthorized to view this quiz");
        }

        const existingMcqAnswers: Record<string, number> = {};
        const existingStructuredAnswers: Record<string, string> = {};

        result.questions.forEach((question) => {
          if (question.type === "mcq" && typeof question.userSelectedIndex === "number") {
            existingMcqAnswers[question.id] = question.userSelectedIndex;
          }

          if (question.type === "structured") {
             if (question.userAnswerText) {
                existingStructuredAnswers[question.id] = question.userAnswerText;
             }
             if (question.subQuestions) {
                question.subQuestions.forEach(sq => {
                    if (sq.userAnswerText) {
                        existingStructuredAnswers[`${question.id}_sub_${sq.id}`] = sq.userAnswerText;
                    }
                });
             }
          }
        });

        setAnswers(existingMcqAnswers);
        setStructuredAnswers(existingStructuredAnswers);
        setIsSubmitted(result.status === "completed");
        setIsExamStarted(result.status === "completed");
        setUseTimerForAttempt(result.status === "completed" ? Boolean(result.durationMinutes) : null);
        setQuiz(result);
        const durationMinutes =
          typeof result.durationMinutes === "number" && result.durationMinutes > 0
            ? result.durationMinutes
            : result.mode === "past_year"
              ? 120
              : 60;
        setTimeLeft(durationMinutes * 60);
      } catch (loadError) {
        const message = loadError instanceof Error ? loadError.message : "Failed to load quiz";
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    void loadQuiz();
  }, [quizId, userId, authLoading]);

  useEffect(() => {
    if (!isExamStarted || useTimerForAttempt !== true) return;

    if (timeLeft > 0 && !isSubmitted) {
      const timer = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
      return () => clearInterval(timer);
    }
  }, [timeLeft, isSubmitted, isExamStarted, useTimerForAttempt]);

  const formatTime = (seconds: number) => {
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return `${min}:${sec < 10 ? "0" : ""}${sec}`;
  };

  const handleSelectAnswer = (questionId: string, optionIndex: number) => {
    if (isSubmitted || !isExamStarted) return;
    setAnswers((prev) => ({ ...prev, [questionId]: optionIndex }));
  };

  const calculateScore = () => {
    if (!quiz) return 0;

    let score = 0;
    quiz.questions.forEach((question) => {
      if (question.type === "mcq" && answers[question.id] === question.correctAnswerIndex) {
        score += question.marks;
      }
    });

    return score;
  };

  const getConfiguredDurationMinutes = useCallback(() => {
    if (!quiz) return null;

    if (typeof quiz.durationMinutes === "number" && quiz.durationMinutes > 0) {
      return quiz.durationMinutes;
    }

    return quiz.mode === "past_year" ? 120 : 60;
  }, [quiz]);

  const startExamImmediately = useCallback(
    (preferTimer: boolean) => {
      const configuredDuration = getConfiguredDurationMinutes();
      const canUseTimer =
        preferTimer && typeof configuredDuration === "number" && configuredDuration > 0;

      setUseTimerForAttempt(canUseTimer);
      if (canUseTimer && configuredDuration) {
        setTimeLeft(configuredDuration * 60);
      }

      setIsExamStarted(true);
      setIsStartChoiceOpen(false);
    },
    [getConfiguredDurationMinutes]
  );

  const handleStartExam = (withTimer: boolean) => {
    startExamImmediately(withTimer);
  };

  const askTimerPreference = useCallback(
    () =>
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
      }),
    [showToast, clearToast]
  );

  useEffect(() => {
    if (!quiz) return;
    if (quiz.status !== "uncomplete") return;
    if (!shouldAutoStart) return;
    if (isViewOnly) return;
    if (isExamStarted) return;

    const withTimer = timerParam === "1" ? true : timerParam === "0" ? false : Boolean(quiz.timerEnabled);
    startExamImmediately(withTimer);
  }, [quiz, shouldAutoStart, isViewOnly, isExamStarted, timerParam, startExamImmediately]);

  const handleSubmitExam = useCallback(async () => {
    if (!quiz || isSubmitting) return;

    setIsSubmitting(true);
    setError("");

    try {
      const updatedQuestions: QuizQuestion[] = quiz.questions.map((question) => {
        if (question.type === "mcq") {
          const selected = answers[question.id];
          const isCorrect = typeof selected === "number" ? selected === question.correctAnswerIndex : null;

          return {
            ...question,
            userSelectedIndex: typeof selected === "number" ? selected : null,
            isCorrect,
          };
        }

        // Handle subquestions if they exist
        let subQuestions = question.subQuestions;
        if (question.subQuestions && question.subQuestions.length > 0) {
            subQuestions = question.subQuestions.map(sq => ({
                 ...sq,
                 userAnswerText: (structuredAnswers[`${question.id}_sub_${sq.id}`] || "").trim() || null
             }));
        }

        const answerText = (structuredAnswers[question.id] || "").trim();
        return {
          ...question,
          subQuestions,
          userAnswerText: answerText || null,
          selfGradedScore: question.selfGradedScore ?? null,
        };
      });

      const mcqScore = updatedQuestions.reduce((sum, question) => {
        if (question.type !== "mcq") return sum;
        return question.isCorrect ? sum + question.marks : sum;
      }, 0);

      const updatedScore: QuizScore = {
        mcqScore,
        mcqTotal: quiz.score.mcqTotal,
        structuredTotal: quiz.score.structuredTotal,
      };

      await submitQuizResponses(quiz.id, updatedQuestions, updatedScore);

      setQuiz((prev) =>
        prev
          ? {
              ...prev,
              questions: updatedQuestions,
              score: updatedScore,
              status: "completed",
            }
          : prev
      );
      setIsSubmitted(true);
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : "Failed to submit exam";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  }, [quiz, isSubmitting, answers, structuredAnswers]);

  const handleRestartExam = useCallback(async () => {
    if (!quiz || isRestarting) return;

    const withTimer = await askTimerPreference();

    setIsRestarting(true);
    setError("");

    try {
      await restartQuizAttempt(quiz.id);

      const resetQuestions: QuizQuestion[] = quiz.questions.map((question) => {
        if (question.type === "mcq") {
          return {
            ...question,
            userSelectedIndex: null,
            isCorrect: null,
          };
        }

        const resetSubQuestions = question.subQuestions?.map(sq => ({
            ...sq,
            userAnswerText: null
        }));

        return {
          ...question,
          userAnswerText: null,
          subQuestions: resetSubQuestions || question.subQuestions,
          selfGradedScore: null,
        };
      });

      setAnswers({});
      setStructuredAnswers({});
      
      // Reset the card-by-card progress states
      setCurrentQuestionIndex(0);
      setConfirmedQuestions({});

      setQuiz((prev) =>
        prev
          ? {
              ...prev,
              questions: resetQuestions,
              score: {
                ...prev.score,
                mcqScore: 0,
              },
              status: "uncomplete",
            }
          : prev
      );
      setIsSubmitted(false);
      setAttemptUiKey((prev) => prev + 1);
      startExamImmediately(withTimer);
    } catch (restartError) {
      const message = restartError instanceof Error ? restartError.message : "Failed to restart exam";
      setError(message);
    } finally {
      setIsRestarting(false);
    }
  }, [quiz, isRestarting, askTimerPreference, startExamImmediately]);

  useEffect(() => {
    if (useTimerForAttempt !== true) return;
    if (!isExamStarted) return;
    if (timeLeft > 0) return;
    if (isSubmitted || isSubmitting) return;

    void handleSubmitExam();
  }, [timeLeft, isSubmitted, isSubmitting, isExamStarted, useTimerForAttempt, handleSubmitExam]);

  if (loading) {
    return <div className="max-w-4xl mx-auto text-sm text-muted-foreground">Loading exam...</div>;
  }

  if (error || !quiz) {
    return (
      <div className="max-w-4xl mx-auto space-y-4">
        <Link href="/exam-prep">
          <Button variant="ghost" size="sm">Back to Exam Prep</Button>
        </Link>
        <Card className="border-destructive/40">
          <CardContent className="pt-6 text-sm text-destructive">{error || "Exam not found"}</CardContent>
        </Card>
      </div>
    );
  }

  // Determine if we should use the Card-by-Card Quiz view
  const isActiveQuizMode = quiz.mode === "mcq" && isExamStarted && !isSubmitted && !isViewOnly;

  return (
    <>
    <div className="space-y-6 max-w-4xl mx-auto pb-10">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link href="/exam-prep">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">{quiz.title}</h1>
            <p className="text-muted-foreground">{quiz.mode === "mcq" ? "MCQ Quiz" : "Past Year Paper"}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          {isExamStarted && useTimerForAttempt === true ? (
            <div className={`flex items-center gap-2 font-mono text-lg text-background font-medium px-3 py-1 rounded-md ${
                  isExamStarted && timeLeft < 300 ? "bg-red-100 text-red-700 dark:bg-red-900/30" : "bg-secondary"
              }`}>
              <Clock className="h-4 w-4" />
              {formatTime(timeLeft)}
            </div>
          ) : isExamStarted && useTimerForAttempt === false ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground px-3 py-1 rounded-md border">
              <Clock className="h-4 w-4" />
              Timer Off
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm text-muted-foreground px-3 py-1 rounded-md border">
              <Clock className="h-4 w-4" />
              {`${getConfiguredDurationMinutes() ?? 0} mins configured`}
            </div>
          )}

          {!isSubmitted && !isExamStarted && !isViewOnly && (
            <Button onClick={() => setIsStartChoiceOpen(true)} className="gap-2">
              Start Exam
            </Button>
          )}

          {/* Hide the top submit button if we are in active card-by-card mode to encourage natural flow */}
          {!isSubmitted && isExamStarted && !isViewOnly && !isActiveQuizMode && (
            <Button onClick={() => void handleSubmitExam()} className="gap-2" disabled={isSubmitting}>
              <Save className="h-4 w-4" /> {isSubmitting ? "Submitting..." : "Submit Exam"}
            </Button>
          )}

          {isSubmitted && !isViewOnly && (
            <Button onClick={() => void handleRestartExam()} className="gap-2" disabled={isRestarting}>
              <RotateCcw className="h-4 w-4" /> {isRestarting ? "Restarting..." : "Restart"}
            </Button>
          )}
        </div>
      </div>

      {isViewOnly && (
        <Card>
          <CardContent className="pt-4 text-sm text-muted-foreground">
            Viewing completed results in read-only mode.
          </CardContent>
        </Card>
      )}

      {!isSubmitted && !isExamStarted && !isViewOnly && (
        <Card>
          <CardContent className="pt-4 text-sm text-muted-foreground space-y-3">
            <p>
              Click <strong>Start Exam</strong> to begin. You will choose whether to run with timer or without timer.
            </p>

            {isStartChoiceOpen && (
              <div className="rounded-md border bg-muted/30 p-3">
                <p className="font-medium text-foreground mb-2">Choose exam mode</p>
                <div className="flex flex-wrap gap-2">
                  <Button onClick={() => handleStartExam(true)}>
                    Start With Timer
                  </Button>
                  <Button variant="outline" onClick={() => handleStartExam(false)}>
                    Start Without Timer
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {error && (
        <Card className="border-destructive/40">
          <CardContent className="pt-4 text-sm text-destructive">{error}</CardContent>
        </Card>
      )}

      {isSubmitted && (
        <Card className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-900">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                <CheckCircle className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-green-800 dark:text-green-300">Exam Completed!</h3>
                <p className="text-green-700 dark:text-green-400">
                  You scored {quiz.score.mcqScore || calculateScore()} out of {quiz.score.mcqTotal} (MCQ marks).
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-6">
        {quiz.questions.map((q, qIdx) => {
          // If in active quiz mode, only show the current question
          if (isActiveQuizMode && qIdx !== currentQuestionIndex) return null;

          // A question is "confirmed" if the user manually confirmed it in Quiz mode, OR if the whole exam is submitted
          const isQuestionConfirmed = isSubmitted || confirmedQuestions[q.id];

          return (
            <Card key={`${q.id}-${attemptUiKey}`} className={isQuestionConfirmed ? 
              (q.type === "mcq" && answers[q.id] === q.correctAnswerIndex
                  ? "border-green-200 dark:border-green-900 bg-green-50/30" 
                  : q.type === "mcq"
                    ? "border-red-200 dark:border-red-900 bg-red-50/30"
                    : "") 
              : ""
            }>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold text-muted-foreground">Q{qIdx + 1} of {quiz.questions.length}</div>
                  <CardDescription>{q.marks} marks</CardDescription>
                </div>
                <CardTitle className="text-lg pt-2">
                  <MarkdownBlock content={q.question} className="text-foreground min-w-0" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                {q.type === "mcq" ? (
                  <div className="space-y-3">
                    <RadioGroup 
                      value={answers[q.id] !== undefined ? answers[q.id].toString() : ""} 
                      onValueChange={(val) => handleSelectAnswer(q.id, Number.parseInt(val, 10))}
                      disabled={isQuestionConfirmed || !isExamStarted || isViewOnly}
                    >
                      {q.options.map((option, optIndex) => (
                        <div key={optIndex} className="flex items-center space-x-2 mb-2">
                          <RadioGroupItem value={optIndex.toString()} id={`q${q.id}-opt${optIndex}`} />
                          <Label 
                              htmlFor={`q${q.id}-opt${optIndex}`}
                              className={`flex-1 cursor-pointer py-2 ${
                                  isQuestionConfirmed && optIndex === q.correctAnswerIndex ? "text-green-600 font-bold" : ""
                              }`}
                          >
                            {option}
                            {isQuestionConfirmed && optIndex === q.correctAnswerIndex && " (Correct Answer)"}
                            {isQuestionConfirmed && answers[q.id] === optIndex && optIndex !== q.correctAnswerIndex && " (Your Answer)"}
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>

                    {isQuestionConfirmed && (
                      <div className="rounded-md border bg-muted/30 p-3 text-sm">
                        <p className="font-medium mb-1">Explanation</p>
                        <MarkdownBlock
                          content={q.explanation?.trim() || "No explanation provided."}
                          className="text-muted-foreground"
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                     {/* Render Subquestions if available, otherwise Main Question Answer */}
                     {q.subQuestions && q.subQuestions.length > 0 ? (
                      <div className="space-y-6">
                        {q.subQuestions.map((subQ) => (
                           <div key={subQ.id} className="border-l-2 pl-4 border-muted">
                              <div className="flex justify-between items-start mb-2">
                                <Label className="text-sm font-semibold">
                                  {subQ.id}) {subQ.question}
                                </Label>
                                <span className="text-xs text-muted-foreground">({subQ.marks} marks)</span>
                              </div>
                              <textarea
                                className="w-full min-h-[80px] rounded-md border bg-background px-3 py-2 text-sm"
                                placeholder={`Answer for ${subQ.id}...`}
                                value={structuredAnswers[`${q.id}_sub_${subQ.id}`] || ""}
                                onChange={(event) =>
                                  setStructuredAnswers((prev) => ({ ...prev, [`${q.id}_sub_${subQ.id}`]: event.target.value }))
                                }
                                disabled={isQuestionConfirmed || !isExamStarted || isViewOnly}
                              />
                                {isSubmitted && (
                                <div className="mt-2 rounded-md border bg-muted/30 p-2 text-sm">
                                  <p className="font-medium text-xs mb-1">Suggested Answer</p>
                                  <MarkdownBlock content={subQ.sampleAnswer} className="text-muted-foreground text-xs" />
                                </div>
                              )}
                           </div>
                        ))}
                      </div>
                    ) : (
                      <>
                        <textarea
                          className="w-full min-h-[120px] rounded-md border bg-background px-3 py-2 text-sm"
                          placeholder="Write your structured answer here..."
                          value={structuredAnswers[q.id] || ""}
                          onChange={(event) =>
                            setStructuredAnswers((prev) => ({ ...prev, [q.id]: event.target.value }))
                          }
                          disabled={isQuestionConfirmed || !isExamStarted || isViewOnly}
                        />
                        {isSubmitted && (
                          <div className="rounded-md border bg-muted/30 p-3 text-sm">
                            <p className="font-medium mb-1">Suggested Answer</p>
                            <MarkdownBlock content={q.sampleAnswer} className="text-muted-foreground" />
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}

                {/* Footer Navigation specifically for Active MCQ Quizzes */}
                {isActiveQuizMode && (
                  <div className="mt-6 flex justify-between items-center border-t pt-4">
                    <Button
                      variant="outline"
                      onClick={() => setCurrentQuestionIndex((prev) => prev - 1)}
                      disabled={currentQuestionIndex === 0}
                    >
                      Previous
                    </Button>

                    <div className="flex gap-2">
                      {!confirmedQuestions[q.id] ? (
                        <Button
                          onClick={() => setConfirmedQuestions((prev) => ({ ...prev, [q.id]: true }))}
                          disabled={answers[q.id] === undefined}
                        >
                          Confirm Answer
                        </Button>
                      ) : currentQuestionIndex === quiz.questions.length - 1 ? (
                        <Button onClick={() => void handleSubmitExam()} disabled={isSubmitting}>
                          {isSubmitting ? "Submitting..." : "Submit Quiz"}
                        </Button>
                      ) : (
                        <Button onClick={() => setCurrentQuestionIndex((prev) => prev + 1)}>
                          Next Question
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
    <StatusToast toast={toast} onClose={clearToast} />
    </>
  );
}