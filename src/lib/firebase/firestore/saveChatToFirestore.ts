/*
Save both user message and AI response to Firestore under chats/{userId}/messages
*/
import { db } from "@/lib/firebase/firebase";
import {
  collection,
  addDoc,
  Timestamp,
  doc,
  setDoc,
  updateDoc,
  getDocs,
  getDoc,
  query,
  orderBy,
  writeBatch,
} from "firebase/firestore";

export interface ChatMessage {
  role: "user" | "model";
  content: string;
  attachedFileIds?: string[];
  createdAt: Timestamp;
}

export interface ChatDocument {
  ownerId: string;
  lastUpdated: Timestamp;
}

/**
 * Save a single chat exchange to Firestore
 * - Creates user chat doc if not exist
 * - Appends messages to chats/{userId}/messages subcollection
 * - Updates lastUpdated timestamp
 * @param userId - The ID of the user (from auth)
 * @param userMessage - The message sent by the user
 * @param aiResponse - The response from the AI model
 * @param attachedFileIds - Optional array of file IDs attached to user message
 * @returns Object with success status and message IDs
 */
export async function saveChatToFirestore(
  userId: string,
  userMessage: string,
  aiResponse: { role: "model"; text: string },
  attachedFileIds?: string[]
): Promise<{ success: boolean; userMessageId: string; aiMessageId: string }> {
  try {
    if (!userId) {
      throw new Error("User ID is required.");
    }

    const now = Timestamp.now();

    // 1. Ensure chat document exists for user
    const chatDocRef = doc(db, "chats", userId);
    const chatDocSnap = await getDoc(chatDocRef);

    if (!chatDocSnap.exists()) {
      // Create user chat document
      await setDoc(chatDocRef, {
        ownerId: userId,
        lastUpdated: now,
      } as ChatDocument);
    }

    // 2. Get messages subcollection reference
    const messagesCollectionRef = collection(db, "chats", userId, "messages");

    // 3. Save user message
    const userMessageRef = await addDoc(messagesCollectionRef, {
      role: "user",
      content: userMessage,
      attachedFileIds: attachedFileIds || [],
      createdAt: now,
    } as ChatMessage);

    // 4. Save AI response
    const aiMessageRef = await addDoc(messagesCollectionRef, {
      role: "model",
      content: aiResponse.text,
      attachedFileIds: [],
      createdAt: Timestamp.fromDate(
        new Date(now.toDate().getTime() + 100)
      ),
    } as ChatMessage);

    // 5. Update lastUpdated timestamp in chat document
    await updateDoc(chatDocRef, {
      lastUpdated: now,
    });

    return {
      success: true,
      userMessageId: userMessageRef.id,
      aiMessageId: aiMessageRef.id,
    };
  } catch (error: unknown) {
    console.error("Error saving chat to Firestore:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    throw new Error(`Failed to save chat: ${errorMessage}`);
  }
}

/**
 * Get all messages for a user's chat history
 * @param userId - The ID of the user
 * @returns Array of all chat messages ordered by creation time
 */
export async function getUserChatHistory(userId: string): Promise<
  Array<ChatMessage & { id: string }>
> {
  try {
    if (!userId) {
      throw new Error("User ID is required.");
    }

    const messagesCollectionRef = collection(db, "chats", userId, "messages");
    const q = query(messagesCollectionRef, orderBy("createdAt", "asc"));
    const snapshot = await getDocs(q);

    const messages = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Array<ChatMessage & { id: string }>;

    return messages;
  } catch (error: unknown) {
    console.error("Error fetching chat history:", error);
    throw new Error("Failed to fetch chat history");
  }
}

/**
 * Get chat document metadata for a user
 * @param userId - The ID of the user
 * @returns Chat document with ownerId and lastUpdated
 */
export async function getUserChatDocument(
  userId: string
): Promise<(ChatDocument & { id: string }) | null> {
  try {
    if (!userId) {
      throw new Error("User ID is required.");
    }

    const chatDocRef = doc(db, "chats", userId);
    const chatDocSnap = await getDoc(chatDocRef);

    if (!chatDocSnap.exists()) {
      return null;
    }

    return {
      id: chatDocSnap.id,
      ...chatDocSnap.data(),
    } as ChatDocument & { id: string };
  } catch (error: unknown) {
    console.error("Error fetching chat document:", error);
    throw new Error("Failed to fetch chat document");
  }
}
/**
 * Delete all messages for a user's chat history
 * @param userId - The ID of the user
 */
export async function deleteUserChatHistory(userId: string): Promise<void> {
  try {
    const messagesCollectionRef = collection(db, "chats", userId, "messages");
    const snapshot = await getDocs(messagesCollectionRef);

    if (snapshot.empty) return;

    const batch = writeBatch(db);
    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    await batch.commit();
  } catch (error) {
    console.error("Error deleting chat history:", error);
    throw new Error("Failed to delete chat history");
  }
}
