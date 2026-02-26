import { NextResponse } from "next/server";
import { processChatbot } from "@/lib/ai/processChatbot";
import { saveChatToFirestore } from "@/lib/firebase/firestore/saveChatToFirestore";
import { getExtractedTextsFromFiles } from "@/lib/firebase/firestore/getExtractedTextFromFile";
import { verifyFirebaseIdToken } from "@/lib/firebase/verifyIdToken";

interface HistoryMessage {
  role: string;
  text: string;
}

/**
 * Unified chatbot endpoint that:
 * 1. Fetches extracted text for attached files
 * 2. Processes message through Gemini with file context
 * 3. Saves chat exchange to Firestore (with file IDs for UI display)
 * 4. Returns response to client
 *
 * POST /api/chatbot
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
      message, // REQUIRED: User message
      history = [], // OPTIONAL: Chat history for context
      attachedFileIds = [], // OPTIONAL: Array of file IDs attached to this message
    } = body;

    if (!message) {
      return NextResponse.json(
        { error: "message is required" },
        { status: 400 }
      );
    }

    // Step 1: Fetch extracted text for attached files
    let fileContexts: string[] = [];
    let fileNames: string[] = [];

    if (attachedFileIds && attachedFileIds.length > 0) {
      try {
        const fileData = await getExtractedTextsFromFiles(
          attachedFileIds,
          userId // Pass userId for security validation
        );

        // Filter out files with errors and extract text + names
        fileContexts = fileData
          .filter((f) => f.extractedText && !f.error)
          .map((f) => f.extractedText as string);

        fileNames = fileData
          .filter((f) => f.extractedText && !f.error)
          .map((f) => f.originalName || "Document");
      } catch (error) {
        console.error("Error fetching file contents:", error);
        // Continue without file context rather than failing
      }
    }

    // Step 2: Process chat through Gemini with file context
    const aiResponse = await processChatbot({
      message,
      history: history as HistoryMessage[],
      fileContexts,
      fileNames,
    });

    // Step 3: Save to Firestore (file IDs stored for UI display)
    const saveResult = await saveChatToFirestore(
      userId,
      message,
      { role: "model", text: aiResponse.text },
      attachedFileIds // Store file IDs for UI to show which files were referenced
    );

    // Step 4: Return response with both AI response and save confirmation
    return NextResponse.json({
      role: aiResponse.role,
      text: aiResponse.text,
      saved: saveResult.success,
      userMessageId: saveResult.userMessageId,
      aiMessageId: saveResult.aiMessageId,
      filesProcessed: fileContexts.length,
    });
  } catch (error: unknown) {
    console.error("Chatbot API Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { 
        error: "Failed to process chat", 
        details: errorMessage 
      },
      { status: 500 }
    );
  }
}
