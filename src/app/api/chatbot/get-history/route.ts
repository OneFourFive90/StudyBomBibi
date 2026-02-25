import { NextResponse } from "next/server";
import { getUserChatHistory } from "@/lib/firebase/firestore/saveChatToFirestore";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 }
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
