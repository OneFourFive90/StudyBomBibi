import { NextResponse } from "next/server";
import { uploadAssetToStorage } from "@/lib/firebase/storage/uploadAssetToStorage";

export async function POST(req: Request) {
  try {
    // 1. Get parameters
    const { imagePrompt, storagePath, userId } = await req.json();

    if (!imagePrompt) {
      return NextResponse.json({ error: "Missing imagePrompt" }, { status: 400 });
    }
    const sanitizedPrompt = imagePrompt.replace(/'/g, "\\'");

    // Determine if this is for storage or immediate use
    const isForStorage = storagePath && userId;

let finalPrompt = sanitizedPrompt;

// Check if the prompt is the "JSON-style" slide prompt
if (sanitizedPrompt.includes("slide_title") || sanitizedPrompt.includes("bullets")) {
  // It's a Slide! Ask for a clean background ONLY.
  finalPrompt = "A beautiful, premium, abstract gradient desktop wallpaper. Dark elegant colors, soft blurred lighting, corporate tech aesthetic, empty negative space. Absolutely zero text, no letters, no words, no fonts, purely abstract background art.";
} else {
  // It's a Diagram! Use the original description.
  finalPrompt = `${sanitizedPrompt}, highly detailed educational diagram, 16:9 aspect ratio, professional layout.`;
}
    // 3. The HuggingFace Endpoint

    const url = "https://router.huggingface.co/hf-inference/models/black-forest-labs/FLUX.1-schnell";

    // 3. Call Hugging Face API
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
        "Content-Type": "application/json",
      },
      // IMPORTANT: We now pass exact 16:9 pixel dimensions in the "parameters" object!
      body: JSON.stringify({ 
        inputs: finalPrompt,
        parameters: {
          width: 1024, // 16
          height: 576  // 9
        }
      }), 
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Hugging Face Error:", errorText);
      return NextResponse.json({ error: "Hugging Face API failed", details: errorText }, { status: 500 });
    }

    // 5. Convert the image to Buffer
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // If no storage path, return Base64 (backward compatibility)
    if (!isForStorage) {
      const base64Image = buffer.toString("base64");
      const fullImageString = `data:image/jpeg;base64,${base64Image}`;
      return NextResponse.json({ imageUrl: fullImageString });
    }

    // 6. Upload to Firebase Storage if storagePath provided
    const downloadUrl = await uploadAssetToStorage(
      storagePath,
      buffer,
      "image/jpeg"
    );

    return NextResponse.json({ downloadUrl });

  } catch (error) {
    console.error("Image Generation Error:", error);
    return NextResponse.json(
      {
        error: "Internal Server Error",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}