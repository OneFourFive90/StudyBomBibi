import { NextResponse } from "next/server";
import { doc, getDoc, serverTimestamp, updateDoc } from "firebase/firestore";
import { ref, uploadString } from "firebase/storage";
import { db, storage } from "@/lib/firebase/firebase";
import { verifyFirebaseIdToken } from "@/lib/firebase/verifyIdToken";

interface UpdateNoteRequest {
  fileId?: string;
  content?: string;
}

export async function PUT(req: Request) {
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

    const body = (await req.json()) as UpdateNoteRequest;
    const fileId = body.fileId?.trim();
    const content = body.content ?? "";

    if (!fileId) {
      return NextResponse.json(
        { error: "fileId is required" },
        { status: 400 }
      );
    }

    const fileRef = doc(db, "files", fileId);
    const fileSnap = await getDoc(fileRef);

    if (!fileSnap.exists()) {
      return NextResponse.json({ error: "Note file not found" }, { status: 404 });
    }

    const fileData = fileSnap.data() as {
      ownerId?: string;
      storagePath?: string;
      mimeType?: string;
      category?: string;
    };

    if (fileData.ownerId !== userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    if (!fileData.storagePath) {
      return NextResponse.json({ error: "Note storage path is missing" }, { status: 400 });
    }

    if (fileData.category !== "note" && fileData.mimeType !== "text/markdown") {
      return NextResponse.json({ error: "Target file is not a note" }, { status: 400 });
    }

    const storageRef = ref(storage, fileData.storagePath);
    await uploadString(storageRef, content, "raw", {
      contentType: "text/markdown",
    });

    const fileSize = new TextEncoder().encode(content).length;
    await updateDoc(fileRef, {
      extractedText: content,
      fileSize,
      updatedAt: serverTimestamp(),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Update note error:", error);
    const message = error instanceof Error ? error.message : "Failed to update note";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
