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
  userSelectedIndex: null;
  isCorrect: null;
  explanation: string;
}

// Firestore questions array object
export interface StructuredQuestion {
  id: string;
  type: "structured";
  question: string;
  marks: number;
  sampleAnswer: string;
  userAnswerText: null;
  selfGradedScore: null;
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
  options?: string[] | null;
  answer_key: string;
}

export type AIQuestionFormat = MCQModeQuestion | PastYearModeQuestion | AIGeneratedQuestion;

export interface AIGeneratedQuiz {
  title: string;
  questions: AIQuestionFormat[];
  duration?: string;
}

/**
 * Transform AI-generated quiz data into Firestore format
 * @param aiQuiz - The quiz response from AI
 * @param mode - Quiz mode (mcq or past_year)
 * @returns Transformed questions array in Firestore format
 */
function transformAIQuizToFirestore(
  aiQuiz: AIGeneratedQuiz,
  mode: "mcq" | "past_year"
): QuizQuestion[] {
  return aiQuiz.questions.map((question, index) => {
    const baseId = `q_${question.id || index + 1}`;

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
          question: mcqQuestion.question,
          marks: 1,
          options: mcqQuestion.options,
          correctAnswerIndex: correctAnswerIndex !== -1 ? correctAnswerIndex : 0,
          userSelectedIndex: null,
          isCorrect: null,
          explanation: mcqQuestion.explanation || "",
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
          question: pastYearQuestion.question,
          marks: 1, // Default MCQ mark value
          options: pastYearQuestion.options as string[],
          correctAnswerIndex: correctAnswerIndex !== -1 ? correctAnswerIndex : 0,
          userSelectedIndex: null,
          isCorrect: null,
          explanation: "", // Past year format doesn't provide explanation
        } as MCQQuestion;
      } else if (pastYearQuestion.type === "structured") {
        return {
          id: baseId,
          type: "structured",
          question: pastYearQuestion.question,
          marks: 3, // Default structured marks
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
      question: question.question,
      marks: 3,
      sampleAnswer: (question as any).answer_key || (question as any).answer || "",
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
function calculateInitialScore(questions: QuizQuestion[]): QuizScore {
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
 * Save AI-generated quiz to Firestore
 * @param ownerId - The user's UID
 * @param title - Quiz title (can be from AI or custom)
 * @param aiQuiz - The quiz response from AI
 * @param mode - Quiz mode (mcq or past_year)
 * @returns Promise with the document reference
 */
export async function saveQuizToFirestore(
  ownerId: string,
  title: string,
  aiQuiz: AIGeneratedQuiz,
  mode: "mcq" | "past_year"
): Promise<DocumentReference> {
  try {
    // Transform AI quiz to Firestore format
    const transformedQuestions = transformAIQuizToFirestore(aiQuiz, mode);

    // Calculate initial score
    const initialScore = calculateInitialScore(transformedQuestions);

    // Create quiz document
    const quizData: QuizDocument = {
      ownerId,
      title: title || aiQuiz.title || "Untitled Quiz",
      mode,
      status: "uncomplete",
      score: initialScore,
      questions: transformedQuestions,
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
