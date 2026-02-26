/*
Get all files for a user
*/
import { NextResponse } from "next/server";
import { getUserFiles } from "@/lib/firebase/userFileManagement/readFiles";
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
