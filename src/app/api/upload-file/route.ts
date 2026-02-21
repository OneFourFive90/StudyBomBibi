/*
Upload API Route for handling file uploads from the client. 
This route processes incoming files
call api in ai-extract-text-from-file [extract text from files]
and then call function from lib/userFileManagement/uploadFile.ts [upload file to Firebase Storage and write metadata to Firestore]
*/
import { NextResponse } from "next/server";
import { uploadFile } from "@/lib/firebase/userFileManagement/uploadFile";

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

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: `File type ${file.type} is not supported.` },
        { status: 400 }
      );
    }

    // Call AI extract endpoint
    const aiFormData = new FormData();
    aiFormData.append("file", file);

    const aiResponse = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/api/ai-extract-text-from-file`,
      {
        method: "POST",
        body: aiFormData,
      }
    );

    if (!aiResponse.ok) {
      const errorData = await aiResponse.json();
      throw new Error(errorData.error || "AI extraction failed");
    }

    const aiData = await aiResponse.json();
    const extractedText = aiData.extractText;

    // Upload file to Firebase
    const uploadResult = await uploadFile(userId, file, extractedText);

    return NextResponse.json({
      success: true,
      uploadResult: {
        path: uploadResult.path,
        url: uploadResult.url,
        hash: uploadResult.hash,
      },
    });

  } catch (error) {
    console.error("Upload Error:", error);
    return NextResponse.json(
      { error: "Failed to process file" },
      { status: 500 }
    );
  }
}
