import { NextResponse } from "next/server";
import { fileManager, reasoningModel } from "@/lib/gemini";
import { writeFile, unlink } from "fs/promises";
import path from "path";
import os from "os";

export async function POST(req: Request) {
  try {
    // 1. Parse the incoming form data
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    // 2. Convert file to buffer and save to a temporary location
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    // Create a temp path (works on Vercel and Localhost)
    const tempFilePath = path.join(os.tmpdir(), file.name);
    await writeFile(tempFilePath, buffer);
    console.log(`Saved temp file to: ${tempFilePath}`);

    // 3. Upload to Gemini
    const uploadResponse = await fileManager.uploadFile(tempFilePath, {
      mimeType: file.type,
      displayName: file.name,
    });
    
    console.log(`Uploaded to Gemini: ${uploadResponse.file.uri}`);

    // 4. Verification: Ask Gemini to summarize it immediately
    const result = await reasoningModel.generateContent([
      {
        fileData: {
          mimeType: uploadResponse.file.mimeType,
          fileUri: uploadResponse.file.uri,
        },
      },
      //prompt
      { text: "Summarize this document in 3 bullet points." },
    ]);

    // 5. Cleanup: Delete the temp file to save space
    await unlink(tempFilePath);

    // 6. Return the AI's summary and the File URI (You'll save this URI to Firebase later)
    return NextResponse.json({
      success: true,
      fileUri: uploadResponse.file.uri,
      summary: result.response.text(),
    });

  } catch (error) {
    console.error("Ingestion Error:", error);
    return NextResponse.json({ error: "Failed to process file" }, { status: 500 });
  }
}