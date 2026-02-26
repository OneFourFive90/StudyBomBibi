import { db } from "@/lib/firebase/firebase";
import {
  collection,
  addDoc,
  Timestamp,
  DocumentReference,
} from "firebase/firestore";

// Firestore questions array object
export interface MCQQuestion {
  id: string;
  type: "mcq";
  question: string;
  marks: number;
  options: string[];
  correctAnswerIndex: number;
  userSelectedIndex: number | null;
  isCorrect: boolean | null;
  explanation: string;
}

// Firestore questions array object
export interface StructuredQuestion {
  id: string;
  type: "structured";
  question: string;
  marks: number;
  sampleAnswer: string;
  userAnswerText: string | null;
  selfGradedScore: number | null;
}

// Firestore questions array object
export type QuizQuestion = MCQQuestion | StructuredQuestion;

export interface QuizScore {
  mcqScore: number;
  mcqTotal: number;
  structuredTotal: number;
}

// Firestore quiz document format
export interface QuizDocument {
  ownerId: string;
  title: string;
  mode: "mcq" | "past_year";
  durationMinutes: number | null;
  timerEnabled: boolean;
  status: "uncomplete" | "completed";
  score: QuizScore;
  questions: QuizQuestion[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// AI quiz response format
export interface AIGeneratedQuestion {
  id: number | string;
  type: "mcq" | "structured";
  question: string;
  marks?: number;
  options?: string[];
  answer?: string;
  answer_key?: string;
  explanation?: string;
  section?: string;
}

// AI reponse questions object (MCQ Mode)
export interface MCQModeQuestion {
  id: number | string;
  type: "mcq";
  question: string;
  options: string[];
  answer: string;
  explanation: string;
}

// AI reponse questions object (Past Year Mode)
export interface PastYearModeQuestion {
  id: number | string;
  section: string;
  type: "mcq" | "structured";
  question: string;
  marks: number;
  options?: string[] | null;
  answer_key: string;
  explanation?: string;
}

export type AIQuestionFormat = MCQModeQuestion | PastYearModeQuestion | AIGeneratedQuestion;

export interface AIGeneratedQuiz {
  title: string;
  questions: AIQuestionFormat[];
  duration?: string;
  totalMarks?: number;
}

/**
 * Transform AI-generated quiz data into Firestore format
 * @param aiQuiz - The quiz response from AI
 * @param mode - Quiz mode (mcq or past_year)
 * @returns Transformed questions array in Firestore format
 */
export function transformAIQuizToFirestore(
  aiQuiz: AIGeneratedQuiz,
  mode: "mcq" | "past_year"
): QuizQuestion[] {
  const normalizePositiveMark = (value: unknown, fallback: number): number => {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : fallback;
  };

  const normalizeQuestionText = (value: unknown): string => {
    const text = typeof value === "string" ? value.replace(/\r\n/g, "\n").trim() : "";

    return text
      .replace(/^\s*(?:q(?:uestion)?\s*)?\d+\s*[.)\-:]\s*/i, "")
      .replace(/^\s*[a-zA-Z]\s*[.)\-:]\s*/, "")
      .trim();
  };

  const getMcqExplanation = (question: { explanation?: string }, answerText: string): string => {
    const normalized = typeof question.explanation === "string" ? question.explanation.trim() : "";
    if (normalized) return normalized;

    return answerText
      ? `The correct answer is ${answerText} based on the provided source context.`
      : "This is the correct answer based on the provided source context.";
  };

  return aiQuiz.questions.map((question, index) => {
    const baseId = `q_${index + 1}`;
    const questionText = normalizeQuestionText(question.question);

    if (mode === "mcq") {
      // MCQ Mode format: has "answer" field
      const mcqQuestion = question as MCQModeQuestion;
      
      if (mcqQuestion.type === "mcq" && mcqQuestion.options) {
        const correctAnswerIndex = mcqQuestion.options.findIndex(
          (opt) => opt === mcqQuestion.answer || opt.trim() === mcqQuestion.answer.trim()
        );

        return {
          id: baseId,
          type: "mcq",
          question: questionText,
          marks: 1,
          options: mcqQuestion.options,
          correctAnswerIndex: correctAnswerIndex !== -1 ? correctAnswerIndex : 0,
          userSelectedIndex: null,
          isCorrect: null,
          explanation: getMcqExplanation(mcqQuestion, mcqQuestion.answer),
        } as MCQQuestion;
      }
    } else if (mode === "past_year") {
      // Past Year Mode format: has "answer_key" field and "marks" in question
      const pastYearQuestion = question as PastYearModeQuestion;
      
      if (pastYearQuestion.type === "mcq" && pastYearQuestion.options) {
        const correctAnswerIndex = (pastYearQuestion.options as string[]).findIndex(
          (opt) => opt === pastYearQuestion.answer_key || opt.trim() === pastYearQuestion.answer_key.trim()
        );

        return {
          id: baseId,
          type: "mcq",
          question: questionText,
          marks: normalizePositiveMark((pastYearQuestion as AIGeneratedQuestion).marks, 1),
          options: pastYearQuestion.options as string[],
          correctAnswerIndex: correctAnswerIndex !== -1 ? correctAnswerIndex : 0,
          userSelectedIndex: null,
          isCorrect: null,
          explanation: getMcqExplanation(pastYearQuestion, pastYearQuestion.answer_key),
        } as MCQQuestion;
      } else if (pastYearQuestion.type === "structured") {
        return {
          id: baseId,
          type: "structured",
          question: questionText,
          marks: normalizePositiveMark((pastYearQuestion as AIGeneratedQuestion).marks, 3),
          sampleAnswer: pastYearQuestion.answer_key,
          userAnswerText: null,
          selfGradedScore: null,
        } as StructuredQuestion;
      }
    }

    // Fallback for structured questions in MCQ mode
    return {
      id: baseId,
      type: "structured",
      question: questionText,
      marks: 3,
      sampleAnswer: (question as AIGeneratedQuestion).answer_key || (question as AIGeneratedQuestion).answer || "",
      userAnswerText: null,
      selfGradedScore: null,
    } as StructuredQuestion;
  });
}

/**
 * Calculate initial quiz score based on questions
 * @param questions - Array of quiz questions
 * @returns QuizScore object
 */
export function calculateInitialScore(questions: QuizQuestion[]): QuizScore {
  let mcqTotal = 0;
  let structuredTotal = 0;

  questions.forEach((question) => {
    if (question.type === "mcq") {
      mcqTotal += question.marks;
    } else if (question.type === "structured") {
      structuredTotal += question.marks;
    }
  });

  return {
    mcqScore: 0, // User hasn't answered yet
    mcqTotal,
    structuredTotal,
  };
}

/**
 * Save pre-transformed quiz to Firestore
 * @param ownerId - The user's UID
 * @param title - Quiz title
 * @param mode - Quiz mode (mcq or past_year)
 * @param questions - Pre-transformed questions array (in Firestore format)
 * @param score - Pre-calculated score
 * @returns Promise with the document reference
 */
export async function saveQuizToFirestore(
  ownerId: string,
  title: string,
  mode: "mcq" | "past_year",
  questions: QuizQuestion[],
  score: QuizScore,
  options?: {
    durationMinutes?: number | null;
    timerEnabled?: boolean;
  }
): Promise<DocumentReference> {
  try {
    const normalizedDuration =
      typeof options?.durationMinutes === "number" && Number.isFinite(options.durationMinutes) && options.durationMinutes > 0
        ? Math.round(options.durationMinutes)
        : null;

    // Create quiz document
    const quizData: QuizDocument = {
      ownerId,
      title: title || "Untitled Quiz",
      mode,
      durationMinutes: normalizedDuration,
      timerEnabled: options?.timerEnabled ?? true,
      status: "uncomplete",
      score,
      questions,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };

    // Save to Firestore
    const quizzesCollection = collection(db, "quizzes");
    const docRef = await addDoc(quizzesCollection, quizData);

    console.log(`Quiz saved successfully with ID: ${docRef.id}`);
    return docRef;
  } catch (error) {
    console.error("Error saving quiz to Firestore:", error);
    throw new Error(
      `Failed to save quiz: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Optional: Update quiz status to "completed"
 * @param quizId - The quiz document ID
 */
export async function updateQuizStatus(
  quizId: string,
  status: "uncomplete" | "completed"
): Promise<void> {
  try {
    const { updateDoc, doc } = await import("firebase/firestore");
    const quizRef = doc(db, "quizzes", quizId);
    await updateDoc(quizRef, {
      status,
      updatedAt: Timestamp.now(),
    });
    console.log(`Quiz ${quizId} status updated to ${status}`);
  } catch (error) {
    console.error("Error updating quiz status:", error);
    throw error;
  }
}

/**
 * Persist quiz answers and mark quiz as completed
 * @param quizId - The quiz document ID
 * @param questions - Updated question array including user responses
 * @param score - Updated score object
 */
export async function submitQuizResponses(
  quizId: string,
  questions: QuizQuestion[],
  score: QuizScore
): Promise<void> {
  try {
    const { updateDoc, doc } = await import("firebase/firestore");
    const quizRef = doc(db, "quizzes", quizId);

    await updateDoc(quizRef, {
      questions,
      score,
      status: "completed",
      updatedAt: Timestamp.now(),
    });
  } catch (error) {
    console.error("Error submitting quiz responses:", error);
    throw new Error(
      `Failed to submit quiz responses: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Reset quiz responses and mark quiz as uncomplete for a new attempt
 * @param quizId - The quiz document ID
 */
export async function restartQuizAttempt(quizId: string): Promise<void> {
  try {
    const { updateDoc, doc, getDoc } = await import("firebase/firestore");
    const quizRef = doc(db, "quizzes", quizId);
    const quizSnap = await getDoc(quizRef);

    if (!quizSnap.exists()) {
      throw new Error("Quiz not found");
    }

    const quizData = quizSnap.data() as QuizDocument;
    const resetQuestions: QuizQuestion[] = quizData.questions.map((question) => {
      if (question.type === "mcq") {
        return {
          ...question,
          userSelectedIndex: null,
          isCorrect: null,
        };
      }

      return {
        ...question,
        userAnswerText: null,
        selfGradedScore: null,
      };
    });

    await updateDoc(quizRef, {
      questions: resetQuestions,
      score: {
        ...quizData.score,
        mcqScore: 0,
      },
      status: "uncomplete",
      updatedAt: Timestamp.now(),
    });
  } catch (error) {
    console.error("Error restarting quiz attempt:", error);
    throw new Error(
      `Failed to restart quiz attempt: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}
