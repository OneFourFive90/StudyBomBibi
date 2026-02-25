import { NextResponse } from "next/server";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { getDownloadURL, ref, uploadString } from "firebase/storage";
import { db, storage } from "@/lib/firebase/firebase";

interface CreateNoteRequest {
  userId?: string;
  title?: string;
  content?: string;
  folderId?: string | null;
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
    const body = (await req.json()) as CreateNoteRequest;
    const userId = body.userId?.trim();
    const folderId = body.folderId ?? null;

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

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
