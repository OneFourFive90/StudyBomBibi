import { NextResponse } from "next/server";
import { fileManager, reasoningModel } from "@/lib/gemini";
import { writeFile, unlink } from "fs/promises";
import path from "path";
import os from "os";

const ALLOWED_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "text/plain",
  "text/markdown",
  "text/csv",
];

export async function POST(req: Request) {
  let tempFilePath: string | null = null;

  try {
    // Parse the incoming form data
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: `File type ${file.type} is not supported.` },
        { status: 400 }
      );
    }

    // Save temp file
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const sanitizedName = file.name.replace(/\s+/g, "_");
    tempFilePath = path.join(os.tmpdir(), sanitizedName);
    await writeFile(tempFilePath, buffer);

    // Upload to Gemini
    const uploadedFile = await fileManager.uploadFile(tempFilePath, {
      mimeType: file.type,
      displayName: sanitizedName,
    });

    //Polling Loop
    let fileStatus = await fileManager.getFile(uploadedFile.file.name);
    let attempts = 0;
    const maxAttempts = 30; // 60 seconds max
    while (fileStatus.state === "PROCESSING" && attempts < maxAttempts) {
      console.log("Waiting for file to process...");
      await new Promise((resolve) => setTimeout(resolve, 2000)); // Wait 2s
      fileStatus = await fileManager.getFile(uploadedFile.file.name);
      attempts++;
    }

    if (fileStatus.state === "FAILED") {
      throw new Error("Gemini failed to process this file.");
    }

    if (fileStatus.state === "PROCESSING") {
      throw new Error("File processing timeout. Please try again.");
    }

    // DEFINE SMART PROMPTS
    let aiInstruction = "";

    if (file.type.startsWith("image/")) {
      // IMAGE / HANDWRITING LOGIC
      aiInstruction = `
    Analyze this image. 
    1. If it is a diagram or chart, describe the components and relationships in detail.
    2. If it contains handwriting, transcribe it into digital text and correct obvious spelling errors.
    3. If it is a slide, transcribe the text and describe any visuals.
    Output the result in clean Markdown.
  `;
    } else if (file.type === "application/pdf") {
      // PDF / SLIDE LOGIC
      aiInstruction = `
    Read this document and extract all text.
    - Ignore headers, footers, page numbers, and references.
    - Format the output as clean, readable Markdown.
    - If there are images/diagrams within the PDF, describe them briefly in [brackets].
  `;
    } else {
      // TEXT / CSV LOGIC
      aiInstruction = "Analyze this text and format it as clean Markdown.";
    }

    // Generate content
    const result = await reasoningModel.generateContent([
      {
        fileData: {
          mimeType: fileStatus.mimeType,
          fileUri: fileStatus.uri,
        },
      },
      { text: aiInstruction },
    ]);

    const responseText = result.response.text();
    if (!responseText) {
      throw new Error("Empty response from AI model.");
    }

    return NextResponse.json({
      success: true,
      fileUri: fileStatus.uri,
      summary: responseText,
    });

  } catch (error) {
    console.error("Upload Error:", error);
    return NextResponse.json({ error: "Failed to process file" }, { status: 500 });
  } finally {
    // Cleanup temp file
    if (tempFilePath) {
      try {
        await unlink(tempFilePath);
      } catch (e) {
        console.warn("Failed to delete temp file:", e);
      }
    }
  }
}