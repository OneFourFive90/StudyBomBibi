/*
Upload API Route for handling file uploads from the client. 
This route processes incoming files
call api in ai-extract-text-from-file [extract text from files]
and then call function from lib/userFileManagement/uploadFile.ts [upload file to Firebase Storage and write metadata to Firestore]
*/
import { NextResponse } from "next/server";
import { uploadFile } from "@/lib/firebase/userFileManagement/uploadFile";
import {
  ALLOWED_UPLOAD_MIME_TYPES,
  normalizeUploadMimeType,
  SUPPORTED_UPLOAD_TYPES_LABEL,
} from "@/lib/upload/fileTypePolicy";

export async function POST(req: Request) {
  try {
    // Parse the incoming form data
    const formData = await req.formData();
    const file = formData.get("file") as File;
    const userId = formData.get("userId") as string;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    if (!userId) {
      return NextResponse.json({ error: "No userId provided" }, { status: 400 });
    }

    const normalizedMimeType = normalizeUploadMimeType(file.type, file.name);

    if (!ALLOWED_UPLOAD_MIME_TYPES.includes(normalizedMimeType as (typeof ALLOWED_UPLOAD_MIME_TYPES)[number])) {
      return NextResponse.json(
        { error: `File type ${file.type || "unknown"} is not supported. Allowed: ${SUPPORTED_UPLOAD_TYPES_LABEL}.` },
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
        alreadyExists: uploadResult.alreadyExists === true,
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
