import { NextResponse } from "next/server";
import { deleteUserChatHistory } from "@/lib/firebase/firestore/saveChatToFirestore";

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 }
      );
    }

    await deleteUserChatHistory(userId);

    return NextResponse.json({ success: true, message: "History cleared" });
  } catch (error: unknown) {
    console.error("Delete History API Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to delete history", details: errorMessage },
      { status: 500 }
    );
  }
}
