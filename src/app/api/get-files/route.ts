/*
Get all files for a user
*/
import { NextResponse } from "next/server";
import { getUserFiles } from "@/lib/firebase/userFileManagement/readFiles";

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

    const files = await getUserFiles(userId);

    return NextResponse.json({ files });
  } catch (error: unknown) {
    console.error("Files API Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to fetch files", details: errorMessage },
      { status: 500 }
    );
  }
}
