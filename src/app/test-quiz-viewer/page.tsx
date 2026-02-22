"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase/firebase";
import {
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import {
  QuizDocument,
  MCQQuestion,
  StructuredQuestion,
} from "@/lib/firebase/firestore/saveQuizToFirestore";

const TEST_USER_ID = "test-user-123";

export default function QuizViewerPage() {
  const [quizzes, setQuizzes] = useState<(QuizDocument & { id: string })[]>([]);
  const [selectedQuiz, setSelectedQuiz] = useState<
    (QuizDocument & { id: string }) | null
  >(null);
  const [loading, setLoading] = useState(true);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  // Fetch all quizzes for the test user
  useEffect(() => {
    const fetchQuizzes = async () => {
      try {
        const quizzesCollection = collection(db, "quizzes");
        const q = query(quizzesCollection, where("ownerId", "==", TEST_USER_ID));
        const snapshot = await getDocs(q);

        const fetchedQuizzes = snapshot.docs.map((doc) => ({
          ...(doc.data() as QuizDocument),
          id: doc.id,
        }));

        setQuizzes(fetchedQuizzes);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching quizzes:", error);
        setLoading(false);
      }
    };

    fetchQuizzes();
  }, []);

  if (loading) {
    return <div className="p-8">Loading quizzes...</div>;
  }

  if (!selectedQuiz) {
    return <QuizzesList quizzes={quizzes} onSelectQuiz={setSelectedQuiz} />;
  }

  return (
    <QuizViewer
      quiz={selectedQuiz}
      onBack={() => {
        setSelectedQuiz(null);
        setCurrentQuestionIndex(0);
      }}
      currentQuestionIndex={currentQuestionIndex}
      setCurrentQuestionIndex={setCurrentQuestionIndex}
    />
  );
}

// ============================================================================
// Component: Quiz List
// ============================================================================
function QuizzesList({
  quizzes,
  onSelectQuiz,
}: {
  quizzes: (QuizDocument & { id: string })[];
  onSelectQuiz: (quiz: QuizDocument & { id: string }) => void;
}) {
  if (quizzes.length === 0) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">My Quizzes</h1>
        <p>No quizzes found for this user.</p>
      </div>
    );
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">My Quizzes</h1>
      <div className="grid gap-4">
        {quizzes.map((quiz) => (
          <div
            key={quiz.id}
            className="border rounded-lg p-4 hover:shadow-lg cursor-pointer transition"
            onClick={() => onSelectQuiz(quiz)}
          >
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-xl font-semibold">{quiz.title}</h2>
                <p className="text-sm text-gray-600">
                  Mode: <span className="font-medium">{quiz.mode}</span>
                </p>
                <p className="text-sm text-gray-600">
                  Questions: {quiz.questions.length}
                </p>
              </div>
              <div>
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium ${
                    quiz.status === "completed"
                      ? "bg-green-100 text-green-800"
                      : "bg-yellow-100 text-yellow-800"
                  }`}
                >
                  {quiz.status}
                </span>
              </div>
            </div>
            <div className="mt-3 text-sm text-gray-600">
              <div>MCQ Total: {quiz.score.mcqTotal}</div>
              <div>Structured Total: {quiz.score.structuredTotal}</div>
              <div>Score: {quiz.score.mcqScore}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Component: Quiz Viewer
// ============================================================================
function QuizViewer({
  quiz,
  onBack,
  currentQuestionIndex,
  setCurrentQuestionIndex,
}: {
  quiz: QuizDocument & { id: string };
  onBack: () => void;
  currentQuestionIndex: number;
  setCurrentQuestionIndex: (index: number) => void;
}) {
  const currentQuestion = quiz.questions[currentQuestionIndex];
  const isMCQ = currentQuestion.type === "mcq";

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={onBack}
            className="mb-4 px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
          >
            ← Back to Quizzes
          </button>
          <h1 className="text-3xl font-bold mb-2">{quiz.title}</h1>
          <div className="flex gap-6 text-sm text-gray-600">
            <span>Mode: <span className="font-medium">{quiz.mode}</span></span>
            <span>
              Question {currentQuestionIndex + 1} of {quiz.questions.length}
            </span>
            <span>
              Status:{" "}
              <span className="font-medium">{quiz.status}</span>
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-6 bg-gray-200 rounded-full h-2">
          <div
            className="bg-blue-500 h-2 rounded-full transition"
            style={{
              width: `${((currentQuestionIndex + 1) / quiz.questions.length) * 100}%`,
            }}
          ></div>
        </div>

        {/* Question Section */}
        <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
          <h2 className="text-xl font-semibold mb-6">
            {currentQuestion.question}
          </h2>

          {isMCQ ? (
            <MCQViewer
              question={currentQuestion as MCQQuestion}
              quizId={quiz.id}
            />
          ) : (
            <StructuredViewer
              question={currentQuestion as StructuredQuestion}
              quizId={quiz.id}
            />
          )}
        </div>

        {/* Navigation */}
        <div className="flex justify-between items-center">
          <button
            onClick={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))}
            disabled={currentQuestionIndex === 0}
            className="px-6 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
          >
            ← Previous
          </button>

          <span className="text-sm font-medium">
            Question {currentQuestionIndex + 1} / {quiz.questions.length}
          </span>

          <button
            onClick={() =>
              setCurrentQuestionIndex(
                Math.min(
                  quiz.questions.length - 1,
                  currentQuestionIndex + 1
                )
              )
            }
            disabled={currentQuestionIndex === quiz.questions.length - 1}
            className="px-6 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
          >
            Next →
          </button>
        </div>

        {/* Score Summary */}
        <div className="mt-8 bg-blue-50 rounded-lg p-6">
          <h3 className="font-semibold mb-3">Score Summary</h3>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <div className="text-gray-600">MCQ Score</div>
              <div className="text-xl font-bold">
                {quiz.score.mcqScore}/{quiz.score.mcqTotal}
              </div>
            </div>
            <div>
              <div className="text-gray-600">Structured Total</div>
              <div className="text-xl font-bold">{quiz.score.structuredTotal}</div>
            </div>
            <div>
              <div className="text-gray-600">Total Possible</div>
              <div className="text-xl font-bold">
                {quiz.score.mcqTotal + quiz.score.structuredTotal}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Component: MCQ Viewer
// ============================================================================
function MCQViewer({
  question,
  quizId,
}: {
  question: MCQQuestion;
  quizId: string;
}) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(
    question.userSelectedIndex
  );

  const handleSelectOption = async (index: number) => {
    setSelectedIndex(index);

    // Update Firestore
    try {
      console.log(
        `Selected option ${index}: ${index === question.correctAnswerIndex ? "Correct!" : "Incorrect"}`
      );
      // In a real app, you'd update the specific question in the array
    } catch (error) {
      console.error("Error updating question:", error);
    }
  };

  return (
    <div>
      <div className="space-y-3 mb-6">
        {question.options.map((option, index) => (
          <button
            key={index}
            onClick={() => handleSelectOption(index)}
            className={`w-full text-left p-4 rounded border-2 transition ${
              selectedIndex === index
                ? "border-blue-500 bg-blue-50"
                : "border-gray-200 hover:border-gray-300"
            }`}
          >
            <div className="flex items-center">
              <div
                className={`w-5 h-5 rounded-full border-2 mr-3 flex items-center justify-center ${
                  selectedIndex === index
                    ? "border-blue-500 bg-blue-500"
                    : "border-gray-300"
                }`}
              >
                {selectedIndex === index && (
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                )}
              </div>
              <span>{option}</span>
            </div>
          </button>
        ))}
      </div>

      {/* Show result after selection */}
      {selectedIndex !== null && (
        <div
          className={`p-4 rounded-lg ${
            selectedIndex === question.correctAnswerIndex
              ? "bg-green-50 border border-green-200"
              : "bg-red-50 border border-red-200"
          }`}
        >
          <div className="font-semibold mb-2">
            {selectedIndex === question.correctAnswerIndex ? "✓ Correct!" : "✗ Incorrect"}
          </div>
          <div className="text-sm">
            Correct Answer: <span className="font-medium">{question.options[question.correctAnswerIndex]}</span>
          </div>
          {question.explanation && (
            <div className="mt-3 text-sm">
              <div className="font-medium mb-1">Explanation:</div>
              <p>{question.explanation}</p>
            </div>
          )}
          <div className="mt-3 text-xs text-gray-600">Marks: {question.marks}</div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Component: Structured Question Viewer
// ============================================================================
function StructuredViewer({
  question,
  quizId,
}: {
  question: StructuredQuestion;
  quizId: string;
}) {
  const [userAnswer, setUserAnswer] = useState(question.userAnswerText || "");
  const [showSample, setShowSample] = useState(false);
  const [selfGrade, setSelfGrade] = useState<number | null>(
    question.selfGradedScore
  );

  const handleSaveAnswer = async () => {
    // In a real app, update Firestore with the user answer
    console.log("User answer saved:", userAnswer);
  };

  return (
    <div>
      <div className="mb-6">
        <label className="block text-sm font-medium mb-2">Your Answer:</label>
        <textarea
          value={userAnswer}
          onChange={(e) => setUserAnswer(e.target.value)}
          onBlur={handleSaveAnswer}
          placeholder="Type your answer here..."
          className="w-full p-4 border rounded-lg focus:outline-none focus:border-blue-500"
          rows={5}
        />
      </div>

      <div className="flex gap-3 mb-6">
        <button
          onClick={() => setShowSample(!showSample)}
          className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
        >
          {showSample ? "Hide" : "Show"} Sample Answer
        </button>
      </div>

      {showSample && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="font-semibold mb-2">Sample Answer:</div>
          <p className="text-sm">{question.sampleAnswer}</p>
        </div>
      )}

      {/* Self-Grading Section */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="font-semibold mb-3">Self-Grade (out of {question.marks} marks):</div>
        <div className="flex gap-2 mb-3">
          {Array.from({ length: question.marks + 1 }, (_, i) => (
            <button
              key={i}
              onClick={() => setSelfGrade(i)}
              className={`w-10 h-10 rounded border ${
                selfGrade === i
                  ? "bg-yellow-500 border-yellow-500 text-white"
                  : "border-yellow-300 hover:bg-yellow-100"
              }`}
            >
              {i}
            </button>
          ))}
        </div>
        {selfGrade !== null && (
          <p className="text-sm text-gray-600">
            You've graded yourself: {selfGrade}/{question.marks}
          </p>
        )}
      </div>
    </div>
  );
}
