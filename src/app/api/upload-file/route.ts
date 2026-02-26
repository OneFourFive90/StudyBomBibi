/*
Upload API Route for handling file uploads from the client. 
This route processes incoming files
call api in ai-extract-text-from-file [extract text from files]
and then call function from lib/userFileManagement/uploadFile.ts [upload file to Firebase Storage and write metadata to Firestore]
*/
import { NextResponse } from "next/server";
import { uploadFile } from "@/lib/firebase/userFileManagement/uploadFile";
import { verifyFirebaseIdToken } from "@/lib/firebase/verifyIdToken";

const ALLOWED_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "text/plain",
  "text/markdown",
  "text/csv",
];

const EXTENSION_MIME_MAP: Record<string, string> = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  txt: "text/plain",
  md: "text/markdown",
  markdown: "text/markdown",
  csv: "text/csv",
};

function normalizeFileMimeType(file: File): string {
  const rawType = (file.type || "").toLowerCase();
  if (ALLOWED_TYPES.includes(rawType)) {
    return rawType;
  }

  const extension = file.name.split(".").pop()?.toLowerCase() || "";
  return EXTENSION_MIME_MAP[extension] || rawType;
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

    // Parse the incoming form data
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const normalizedMimeType = normalizeFileMimeType(file);

    if (!ALLOWED_TYPES.includes(normalizedMimeType)) {
      return NextResponse.json(
        { error: `File type ${file.type || "unknown"} is not supported.` },
        { status: 400 }
      );
    }

    // Call AI extract endpoint
    const aiFormData = new FormData();
    const fileForAi =
      file.type === normalizedMimeType
        ? file
        : new File([file], file.name, {
            type: normalizedMimeType,
            lastModified: Date.now(),
          });

    aiFormData.append("file", fileForAi);

    const aiResponse = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/api/ai-extract-text-from-file`,
      {
        method: "POST",
        body: aiFormData,
      }
    );

    if (!aiResponse.ok) {
      const errorData = await aiResponse.json();
      const detailText = [errorData.error, errorData.details]
        .filter(Boolean)
        .join(" ");
      throw new Error(detailText || "AI extraction failed");
    }

    const aiData = await aiResponse.json();
    const extractedText = aiData.extractText;

    // Upload file to Firebase
    const fileForUpload =
      file.type === normalizedMimeType
        ? file
        : new File([file], file.name, {
            type: normalizedMimeType,
            lastModified: Date.now(),
          });

    const uploadResult = await uploadFile(userId, fileForUpload, extractedText);

    return NextResponse.json({
      success: true,
      extractText: extractedText,
      uploadResult: {
        path: uploadResult.path,
        url: uploadResult.url,
        hash: uploadResult.hash,
      },
    });

  } catch (error) {
    console.error("Upload Error:", error);
    const message = error instanceof Error ? error.message : "Failed to process file";
    return NextResponse.json(
      { error: "Failed to process file", details: message },
      { status: 500 }
    );
  }
}
