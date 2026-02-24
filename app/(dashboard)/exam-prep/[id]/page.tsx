
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { ArrowLeft, CheckCircle, Clock, Save, BookOpen, ExternalLink, X } from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";

// Mock data for the exam
const MOCK_EXAM = {
  id: "1",
  title: "Mid-Term Mock Exam",
  subject: "Data Structures",
  sourceMaterial: "Introduction to Algorithms, Chapter 3 & 4",
  sourceContent: `
    <h2>Introduction to Algorithms</h2>
    <p>This chapter covers the fundamentals of algorithm analysis and design.</p>
    <ul>
      <li><strong>Time Complexity:</strong> O(1), O(log n), O(n), O(n log n), O(n^2), O(2^n)</li>
      <li><strong>Sorting Algorithms:</strong> Bubble Sort, Merge Sort, Quick Sort</li>
      <li><strong>Search Algorithms:</strong> Linear Search, Binary Search</li>
      <li><strong>Data Structures:</strong> Arrays, Linked Lists, Stacks, Queues, Trees, Graphs</li>
    </ul>
    <p>Understanding these concepts is crucial for efficient software development.</p>
  `,
  duration: 90, // minutes
  totalQuestions: 3,
  questions: [
    {
      id: 1,
      text: "What is the time complexity of binary search on a sorted array?",
      options: ["O(n)", "O(log n)", "O(n^2)", "O(1)"],
      correctAnswer: 1
    },
    {
      id: 2,
      text: "Which data structure uses LIFO (Last In First Out) principle?",
      options: ["Queue", "Stack", "Linked List", "Tree"],
      correctAnswer: 1
    },
    {
      id: 3,
      text: "In a binary search tree, the left child is always:",
      options: [
        "Greater than the parent",
        "Smaller than the parent",
        "Equal to the parent",
        "None of the above"
      ],
      correctAnswer: 1
    }
  ]
};

export default function ExamPage() {
  const params = useParams();
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [timeLeft, setTimeLeft] = useState(MOCK_EXAM.duration * 60);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    if (timeLeft > 0 && !isSubmitted) {
      const timer = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
      return () => clearInterval(timer);
    }
  }, [timeLeft, isSubmitted]);

  const formatTime = (seconds: number) => {
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return `${min}:${sec < 10 ? "0" : ""}${sec}`;
  };

  const handleSelectAnswer = (questionId: number, optionIndex: number) => {
    if (isSubmitted) return;
    setAnswers((prev) => ({ ...prev, [questionId]: optionIndex }));
  };

  const calculateScore = () => {
    let score = 0;
    MOCK_EXAM.questions.forEach((q) => {
      if (answers[q.id] === q.correctAnswer) {
        score++;
      }
    });
    return score;
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-10">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link href="/exam-prep">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">{MOCK_EXAM.title}</h1>
            <p className="text-muted-foreground">{MOCK_EXAM.subject}</p>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-sm font-semibold text-muted-foreground">Source:</span>
              <Button 
                variant="outline" 
                size="sm" 
                className="h-7 rounded-full text-xs gap-1"
                onClick={() => setShowPreview(true)}
              >
                  <BookOpen className="h-3 w-3" />
                  {MOCK_EXAM.sourceMaterial}
                  <ExternalLink className="h-3 w-3 ml-1 opacity-50" />
              </Button>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
             <div className={`flex items-center gap-2 font-mono text-lg text-background font-medium px-3 py-1 rounded-md ${
                timeLeft < 300 ? "bg-red-100 text-red-700 dark:bg-red-900/30" : "bg-secondary"
            }`}>
            <Clock className="h-4 w-4" />
            {formatTime(timeLeft)}
          </div>
          {!isSubmitted && (
            <Button onClick={() => setIsSubmitted(true)} className="gap-2">
              <Save className="h-4 w-4" /> Submit Exam
            </Button>
          )}
        </div>
      </div>

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
                  You scored {calculateScore()} out of {MOCK_EXAM.questions.length}.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-6">
        {MOCK_EXAM.questions.map((q, index) => (
          <Card key={q.id} className={isSubmitted ? 
            (answers[q.id] === q.correctAnswer 
                ? "border-green-200 dark:border-green-900 bg-green-50/30" 
                : "border-red-200 dark:border-red-900 bg-red-50/30") 
            : ""
          }>
            <CardHeader>
              <CardTitle className="text-lg">
                <span className="text-muted-foreground mr-2">{index + 1}.</span>
                {q.text}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <RadioGroup 
                value={answers[q.id]?.toString()} 
                onValueChange={(val) => handleSelectAnswer(q.id, parseInt(val))}
                disabled={isSubmitted}
              >
                {q.options.map((option, optIndex) => (
                  <div key={optIndex} className="flex items-center space-x-2 mb-2">
                    <RadioGroupItem value={optIndex.toString()} id={`q${q.id}-opt${optIndex}`} />
                    <Label 
                        htmlFor={`q${q.id}-opt${optIndex}`}
                        className={`flex-1 cursor-pointer py-2 ${
                            isSubmitted && optIndex === q.correctAnswer ? "text-green-600 font-bold" : ""
                        }`}
                    >
                      {option}
                      {isSubmitted && optIndex === q.correctAnswer && " (Correct Answer)"}
                      {isSubmitted && answers[q.id] === optIndex && optIndex !== q.correctAnswer && " (Your Answer)"}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </CardContent>
          </Card>
        ))}
      </div>
      {showPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 animate-in fade-in-0">
          <Card className="w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl animate-in zoom-in-95">
            <CardHeader className="flex flex-row items-center justify-between border-b px-6 py-4">
              <div className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary" />
                <CardTitle>{MOCK_EXAM.sourceMaterial}</CardTitle>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setShowPreview(false)}>
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="overflow-y-auto p-6 flex-1">
              <div 
                className="prose dark:prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: MOCK_EXAM.sourceContent }}
              />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
