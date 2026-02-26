import { NextResponse } from "next/server";
import { fileManager, reasoningModel } from "@/lib/gemini";
import { writeFile, unlink } from "fs/promises";
import path from "path";
import os from "os";

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
  let tempFilePath: string | null = null;

  try {
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

    // Save temp file
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const sanitizedName = file.name.replace(/\s+/g, "_");
    tempFilePath = path.join(os.tmpdir(), sanitizedName);
    await writeFile(tempFilePath, buffer);

    // Upload to Gemini
    const uploadedFile = await fileManager.uploadFile(tempFilePath, {
      mimeType: normalizedMimeType,
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

    if (normalizedMimeType.startsWith("image/")) {
      // IMAGE / HANDWRITING LOGIC
      aiInstruction = `
    Analyze this image. 
    1. If it is a diagram or chart, describe the components and relationships in detail.
    2. If it contains handwriting, transcribe it into digital text and correct obvious spelling errors.
    3. If it is a slide, transcribe the text and describe any visuals.
    Output the result in clean Markdown.
  `;
    } else if (normalizedMimeType === "application/pdf") {
      // PDF / SLIDE LOGIC
      aiInstruction = `
    Read this document and extract all text.
    - For header/footer/page numbers, can label them as [Header], [Footer], [Page Number: X].
    - Format the output as clean, readable Markdown.
    - If there are images/diagrams within the PDF, describe them briefly in [brackets].
  `;
    } else {
      // TEXT / CSV LOGIC
      aiInstruction = "Analyze this text and format it as clean Markdown.";
    }

    // Generate content with RECITATION-safe fallback
    let responseText = "";
    try {
      const result = await reasoningModel.generateContent([
        {
          fileData: {
            mimeType: fileStatus.mimeType,
            fileUri: fileStatus.uri,
          },
        },
        { text: aiInstruction },
      ]);

      responseText = result.response.text();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const isRecitationBlocked = message.includes("RECITATION");

      if (!isRecitationBlocked) {
        throw error;
      }

      const fallbackInstruction = `
      The prior extraction attempt was blocked due to recitation policy.
      Produce SAFE study notes by PARAPHRASING this document.
      Rules:
      - Do not copy long verbatim passages.
      - Summarize key points, definitions, formulas, and section structure.
      - If this is an exam paper, list the exam structure and question themes.
      - Output clean Markdown.
      `;

      const fallbackResult = await reasoningModel.generateContent([
        {
          fileData: {
            mimeType: fileStatus.mimeType,
            fileUri: fileStatus.uri,
          },
        },
        { text: fallbackInstruction },
      ]);

      responseText = fallbackResult.response.text();
    }

    if (!responseText) {
      throw new Error("Empty response from AI model.");
    }

    return NextResponse.json({
      success: true,
      fileUri: fileStatus.uri,
      extractText: responseText,
    });

  } catch (error) {
    console.error("Upload Error:", error);
    const message = error instanceof Error ? error.message : "Failed to process file";
    const isRecitationBlocked = message.includes("RECITATION");

    return NextResponse.json(
      {
        error: isRecitationBlocked
          ? "Content blocked by model recitation policy."
          : "Failed to process file",
        details: message,
      },
      { status: isRecitationBlocked ? 422 : 500 }
    );
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