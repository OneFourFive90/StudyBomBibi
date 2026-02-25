import { db } from "@/lib/firebase/firebase";
import {
  collection,
  query,
  where,
  doc,
  getDoc,
  getDocs,
  Query,
  QueryConstraint,
  Timestamp,
} from "firebase/firestore";
import { QuizDocument, QuizScore } from "./saveQuizToFirestore";

/**
 * Lightweight quiz metadata without questions (for list views)
 */
export interface QuizMetadata {
  id: string;
  ownerId: string;
  title: string;
  mode: "mcq" | "past_year";
  status: "uncomplete" | "completed";
  score: QuizScore;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * Query quiz metadata only (without questions) from a specific owner ID
 * Lightweight approach for list views - fetches only essential data
 * @param ownerId - The ID of the quiz owner
 * @returns Promise containing array of quiz metadata with IDs
 */
export async function getQuizzesMetadataByOwnerId(
  ownerId: string
): Promise<QuizMetadata[]> {
  try {
    const quizzesCollection = collection(db, "quizzes");
    const q = query(quizzesCollection, where("ownerId", "==", ownerId));

    const querySnapshot = await getDocs(q);
    const quizzes: QuizMetadata[] = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      quizzes.push({
        id: doc.id,
        ownerId: data.ownerId,
        title: data.title,
        mode: data.mode,
        status: data.status,
        score: data.score,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      } as QuizMetadata);
    });

    return quizzes;
  } catch (error) {
    console.error(`Error fetching quiz metadata for owner ${ownerId}:`, error);
    throw new Error(`Failed to fetch quiz metadata: ${error}`);
  }
}

/**
 * Query all quizzes from a specific owner ID (full documents with questions)
 * @param ownerId - The ID of the quiz owner
 * @returns Promise containing array of quiz documents with their IDs
 */
export async function getQuizzesByOwnerId(
  ownerId: string
): Promise<Array<QuizDocument & { id: string }>> {
  try {
    const quizzesCollection = collection(db, "quizzes");
    const q = query(quizzesCollection, where("ownerId", "==", ownerId));

    const querySnapshot = await getDocs(q);
    const quizzes: Array<QuizDocument & { id: string }> = [];

    querySnapshot.forEach((doc) => {
      quizzes.push({
        id: doc.id,
        ...doc.data(),
      } as QuizDocument & { id: string });
    });

    return quizzes;
  } catch (error) {
    console.error(`Error fetching quizzes for owner ${ownerId}:`, error);
    throw new Error(`Failed to fetch quizzes: ${error}`);
  }
}

/**
 * Query quiz data by quiz ID
 * @param quizId - The ID of the quiz document
 * @returns Promise containing quiz data or null if not found
 */
export async function getQuizById(
  quizId: string
): Promise<(QuizDocument & { id: string }) | null> {
  try {
    const quizRef = doc(db, "quizzes", quizId);
    const quizSnap = await getDoc(quizRef);

    if (quizSnap.exists()) {
      return {
        id: quizSnap.id,
        ...quizSnap.data(),
      } as QuizDocument & { id: string };
    } else {
      console.warn(`Quiz with ID ${quizId} not found`);
      return null;
    }
  } catch (error) {
    console.error(`Error fetching quiz ${quizId}:`, error);
    throw new Error(`Failed to fetch quiz: ${error}`);
  }
}

/**
 * Query quizzes by owner ID with additional filters
 * @param ownerId - The ID of the quiz owner
 * @param status - (Optional) Filter by status ('uncomplete' | 'completed')
 * @param mode - (Optional) Filter by mode ('mcq' | 'past_year')
 * @returns Promise containing filtered array of quiz documents with their IDs
 */
export async function getQuizzesByOwnerIdWithFilters(
  ownerId: string,
  status?: "uncomplete" | "completed",
  mode?: "mcq" | "past_year"
): Promise<Array<QuizDocument & { id: string }>> {
  try {
    const quizzesCollection = collection(db, "quizzes");
    const constraints: QueryConstraint[] = [where("ownerId", "==", ownerId)];

    if (status) {
      constraints.push(where("status", "==", status));
    }

    if (mode) {
      constraints.push(where("mode", "==", mode));
    }

    const q = query(quizzesCollection, ...constraints);
    const querySnapshot = await getDocs(q);
    const quizzes: Array<QuizDocument & { id: string }> = [];

    querySnapshot.forEach((doc) => {
      quizzes.push({
        id: doc.id,
        ...doc.data(),
      } as QuizDocument & { id: string });
    });

    return quizzes;
  } catch (error) {
    console.error(`Error fetching filtered quizzes for owner ${ownerId}:`, error);
    throw new Error(`Failed to fetch filtered quizzes: ${error}`);
  }
}

/**
 * Query a single quiz question by quiz ID and question ID
 * @param quizId - The ID of the quiz document
 * @param questionId - The ID of the question within the quiz
 * @returns Promise containing the question data or null if not found
 */
export async function getQuestionByIds(
  quizId: string,
  questionId: string
): Promise<any | null> {
  try {
    const quiz = await getQuizById(quizId);

    if (!quiz) {
      console.warn(`Quiz with ID ${quizId} not found`);
      return null;
    }

    const question = quiz.questions.find((q) => q.id === questionId);

    if (!question) {
      console.warn(
        `Question with ID ${questionId} not found in quiz ${quizId}`
      );
      return null;
    }

    return question;
  } catch (error) {
    console.error(
      `Error fetching question ${questionId} from quiz ${quizId}:`,
      error
    );
    throw new Error(`Failed to fetch question: ${error}`);
  }
}
