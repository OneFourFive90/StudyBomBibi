import { NextResponse } from "next/server";
import { saveChatToFirestore } from "@/lib/firebase/firestore/saveChatToFirestore";
import { verifyFirebaseIdToken } from "@/lib/firebase/verifyIdToken";

/**
 * Endpoint to manually save a chat message pair (User + AI) to history without generating a new response.
 * Useful for injecting "fake" history or logging external interactions.
 * 
 * POST /api/chatbot/save-history
 */
export async function POST(req: Request) {
  try {
    // Verify ID token
    const authHeader = req.headers.get("Authorization");
    let userId: string;
    try {
      const decodedToken = await verifyFirebaseIdToken(authHeader);
      userId = decodedToken.uid;
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const {
      message,        // REQUIRED: User message content
      aiResponse,     // REQUIRED: The AI response content to save
      attachedFileIds = [], // OPTIONAL: Array of file IDs attached to this message
    } = body;

    if (!message || !aiResponse) {
      return NextResponse.json(
        { error: "Both 'message' and 'aiResponse' are required" },
        { status: 400 }
      );
    }

    // Call the existing utility to save to Firestore
    const saveResult = await saveChatToFirestore(
      userId,
      message,
      { role: "model", text: aiResponse },
      attachedFileIds
    );

    return NextResponse.json({
      success: saveResult.success,
      userMessageId: saveResult.userMessageId,
      aiMessageId: saveResult.aiMessageId,
    });

  } catch (error: unknown) {
    console.error("Error manually saving chat history:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
