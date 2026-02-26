import { NextResponse } from "next/server";
import { getUserChatHistory } from "@/lib/firebase/firestore/saveChatToFirestore";
import { verifyFirebaseIdToken } from "@/lib/firebase/verifyIdToken";

export async function GET(req: Request) {
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

    const history = await getUserChatHistory(userId);

    return NextResponse.json({ history });
  } catch (error: unknown) {
    console.error("Chat History API Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to fetch chat history", details: errorMessage },
      { status: 500 }
    );
  }
}
