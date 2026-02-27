import { NextResponse } from "next/server";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { getDownloadURL, ref, uploadString } from "firebase/storage";
import { db, storage } from "@/lib/firebase/firebase";
import { verifyFirebaseIdToken } from "@/lib/firebase/verifyIdToken";

interface CreateNoteRequest {
  title?: string;
  content?: string;
  folderId?: string | null;
  attachedFileIds?: string[];
}

function normalizeNoteFileName(title: string): string {
  const trimmed = title.trim();
  if (!trimmed) {
    return "New Note.md";
  }

  return trimmed.toLowerCase().endsWith(".md") ? trimmed : `${trimmed}.md`;
}

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

    const body = (await req.json()) as CreateNoteRequest;
    const folderId = body.folderId ?? null;
    const attachedFileIds = body.attachedFileIds || [];

    const fileName = normalizeNoteFileName(body.title || "New Note");
    const noteContent = body.content ?? "";

    const fileHash = crypto.randomUUID().replace(/-/g, "").slice(0, 12);
    const storagePath = `users/${userId}/uploads/user_notes/${fileHash}.md`;

    const storageRef = ref(storage, storagePath);
    await uploadString(storageRef, noteContent, "raw", {
      contentType: "text/markdown",
      customMetadata: {
        originalName: fileName,
        uploadedAt: new Date().toISOString(),
        hash: fileHash,
      },
    });

    const downloadURL = await getDownloadURL(storageRef);
    const fileSize = new TextEncoder().encode(noteContent).length;

    const docRef = await addDoc(collection(db, "files"), {
      ownerId: userId,
      originalName: fileName,
      fileHash,
      storagePath,
      downloadURL,
      mimeType: "text/markdown",
      fileSize,
      uploadedAt: serverTimestamp(),
      folderId,
      extractedText: noteContent,
      vectorEmbedding: [],
      tags: ["note"],
      category: "note",
      attachedFileIds: attachedFileIds,
    });

    return NextResponse.json(
      {
        success: true,
        fileId: docRef.id,
        note: {
          id: docRef.id,
          originalName: fileName,
          mimeType: "text/markdown",
          folderId,
          downloadURL,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create note error:", error);
    const message = error instanceof Error ? error.message : "Failed to create note";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
