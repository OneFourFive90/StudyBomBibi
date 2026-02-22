"use client";

import { useState } from "react";
import { Timestamp } from "firebase/firestore";
import { QuizQuestion } from "@/lib/firebase/firestore/saveQuizToFirestore";
import { useRouter } from "next/navigation";

const TEST_USER_ID = "test-user-123";

interface PreviewQuiz {
  title: string;
  duration?: string;
  questions: QuizQuestion[];
  score: {
    mcqScore: number;
    mcqTotal: number;
    structuredTotal: number;
  };
}

export default function QuizGeneratorPage() {
  const router = useRouter();
  const [step, setStep] = useState<"form" | "generating" | "preview">("form");
  const [mode, setMode] = useState<"mcq" | "past_year">("mcq");
  const [sourceText, setSourceText] = useState<string>("");
  const [pastYearText, setPastYearText] = useState<string>("");
  const [numQuestions, setNumQuestions] = useState<number>(5);
  const [customPrompt, setCustomPrompt] = useState<string>("");
  const [duration, setDuration] = useState<string>("");

  const [previewQuiz, setPreviewQuiz] = useState<PreviewQuiz | null>(null);
  const [customTitle, setCustomTitle] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

  // Handle quiz generation
  const handleGenerate = async () => {
    setError("");
    setLoading(true);

    try {
      if (!sourceText.trim()) {
        throw new Error("Please enter source material");
      }

      const response = await fetch("/api/ai/generate-quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          sourceText: [sourceText],
          pastYearText: mode === "past_year" ? [pastYearText] : undefined,
          numQuestions,
          customPrompt: customPrompt || undefined,
          duration: mode === "past_year" ? duration : undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate quiz");
      }

      setPreviewQuiz({
        title: data.title,
        duration: data.duration,
        questions: data.questions,
        score: data.score,
      });
      setStep("preview");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  // Handle quiz save
  const handleSave = async () => {
    if (!previewQuiz) return;

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/quizzes/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ownerId: TEST_USER_ID,
          mode,
          quizData: previewQuiz,
          customTitle: customTitle || previewQuiz.title,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to save quiz");
      }

      // Redirect to quiz viewer
      router.push(`/test-quiz-viewer?quizId=${data.quizId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  if (step === "form") {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Generate Quiz</h1>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-800 rounded">
              {error}
            </div>
          )}

          {/* Mode Selection */}
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <label className="block text-lg font-semibold mb-4">Quiz Mode</label>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setMode("mcq")}
                className={`p-4 rounded-lg border-2 transition ${
                  mode === "mcq"
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className="font-semibold">MCQ Quiz</div>
                <div className="text-sm text-gray-600">Multiple choice questions</div>
              </button>
              <button
                onClick={() => setMode("past_year")}
                className={`p-4 rounded-lg border-2 transition ${
                  mode === "past_year"
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className="font-semibold">Past Year Paper</div>
                <div className="text-sm text-gray-600">Exam-style paper</div>
              </button>
            </div>
          </div>

          {/* Source Material */}
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <label className="block text-lg font-semibold mb-2">Source Material</label>
            <p className="text-sm text-gray-600 mb-3">
              Paste your study notes, textbook excerpts, or any content you want to quiz on
            </p>
            <textarea
              value={sourceText}
              onChange={(e) => setSourceText(e.target.value)}
              placeholder="Paste your source material here..."
              className="w-full p-4 border rounded-lg focus:outline-none focus:border-blue-500"
              rows={8}
            />
          </div>

          {/* Past Year Format (if mode is past_year) */}
          {mode === "past_year" && (
            <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
              <label className="block text-lg font-semibold mb-2">Past Year Paper Format</label>
              <p className="text-sm text-gray-600 mb-3">
                Paste the structure/template of the past year paper to mimic
              </p>
              <textarea
                value={pastYearText}
                onChange={(e) => setPastYearText(e.target.value)}
                placeholder="Paste past year paper format here..."
                className="w-full p-4 border rounded-lg focus:outline-none focus:border-blue-500"
                rows={6}
              />
            </div>
          )}

          {/* Settings */}
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <label className="block text-lg font-semibold mb-4">Settings</label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Number of Questions
                </label>
                <input
                  type="number"
                  value={numQuestions}
                  onChange={(e) => setNumQuestions(Math.max(1, parseInt(e.target.value) || 1))}
                  min="1"
                  max="60"
                  className="w-full p-2 border rounded focus:outline-none focus:border-blue-500"
                />
              </div>
              {mode === "past_year" && (
                <div>
                  <label className="block text-sm font-medium mb-2">Duration</label>
                  <input
                    type="text"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    placeholder="e.g., 2 hours"
                    className="w-full p-2 border rounded focus:outline-none focus:border-blue-500"
                  />
                </div>
              )}
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium mb-2">Custom Instructions (Optional)</label>
              <textarea
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                placeholder="e.g., Focus on chapters 1-3, Include diagrams, etc."
                className="w-full p-2 border rounded focus:outline-none focus:border-blue-500"
                rows={3}
              />
            </div>
          </div>

          {/* Generate Button */}
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="w-full px-6 py-3 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600 disabled:opacity-50"
          >
            {loading ? "Generating..." : "Generate Quiz"}
          </button>
        </div>
      </div>
    );
  }

  if (step === "preview" && previewQuiz) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <button
              onClick={() => setStep("form")}
              className="mb-4 px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
            >
              ← Back to Form
            </button>
            <h1 className="text-3xl font-bold mb-2">{previewQuiz.title}</h1>
            <p className="text-gray-600">
              {previewQuiz.questions.length} questions
              {previewQuiz.duration && ` • ${previewQuiz.duration}`}
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-800 rounded">
              {error}
            </div>
          )}

          {/* Custom Title Input */}
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <label className="block text-sm font-medium mb-2">Custom Quiz Title (Optional)</label>
            <input
              type="text"
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value)}
              placeholder="Leave blank to use AI-generated title"
              className="w-full p-3 border rounded focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Score Summary */}
          <div className="bg-blue-50 rounded-lg shadow-lg p-6 mb-6">
            <h2 className="font-semibold mb-4">Quiz Summary</h2>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <div className="text-gray-600 text-sm">MCQ Questions</div>
                <div className="text-2xl font-bold">{previewQuiz.score.mcqTotal}</div>
              </div>
              <div>
                <div className="text-gray-600 text-sm">Structured Marks</div>
                <div className="text-2xl font-bold">{previewQuiz.score.structuredTotal}</div>
              </div>
              <div>
                <div className="text-gray-600 text-sm">Total Marks</div>
                <div className="text-2xl font-bold">
                  {previewQuiz.score.mcqTotal + previewQuiz.score.structuredTotal}
                </div>
              </div>
            </div>
          </div>

          {/* Questions Preview (Read-only) */}
          <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
            <h2 className="font-semibold text-lg mb-6">Questions Preview (Read-Only)</h2>
            <div className="space-y-8 max-h-[500px] overflow-y-auto">
              {previewQuiz.questions.map((question, idx) => (
                <div key={question.id} className="border-b pb-8 last:border-b-0">
                  <div className="text-sm text-gray-600 mb-2">Question {idx + 1}</div>
                  <h3 className="text-lg font-semibold mb-4">{question.question}</h3>

                  {question.type === "mcq" ? (
                    <div className="space-y-2">
                      {(question as any).options.map((option: string, optIdx: number) => (
                        <div
                          key={optIdx}
                          className="p-3 rounded border border-gray-300 bg-gray-50 text-gray-600 cursor-not-allowed"
                        >
                          <div className="flex items-center">
                            <div className="w-5 h-5 rounded-full border-2 border-gray-300 mr-3 flex-shrink-0"></div>
                            <span>{option}</span>
                          </div>
                        </div>
                      ))}
                      <div className="mt-3 text-xs text-gray-600">
                        Marks: {(question as any).marks} • Type: MCQ
                      </div>
                    </div>
                  ) : (
                    <div>
                      <textarea
                        disabled
                        placeholder="User will enter answer here"
                        className="w-full p-4 border border-gray-300 rounded bg-gray-50 text-gray-600 resize-none"
                        rows={4}
                      />
                      <div className="mt-3 text-xs text-gray-600">
                        Marks: {(question as any).marks} • Type: Structured
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => setStep("form")}
              className="px-6 py-3 bg-gray-500 text-white rounded-lg font-semibold hover:bg-gray-600"
            >
              ← Regenerate
            </button>
            <button
              onClick={handleSave}
              disabled={loading}
              className="px-6 py-3 bg-green-500 text-white rounded-lg font-semibold hover:bg-green-600 disabled:opacity-50"
            >
              {loading ? "Saving..." : "Save Quiz →"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
