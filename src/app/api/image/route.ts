import { NextResponse } from "next/server";
import { uploadAssetToStorage } from "@/lib/firebase/storage/uploadAssetToStorage";

export async function POST(req: Request) {
  try {
    const { imagePrompt, storagePath, userId } = await req.json();

    if (!imagePrompt) {
      return NextResponse.json({ error: "Missing imagePrompt" }, { status: 400 });
    }

    const sanitizedPrompt = imagePrompt.replace(/'/g, "\\'");
    let finalPrompt = sanitizedPrompt;

    // 1. Logic to extract the last two words of the slide_title
    let topicExtension = "";
    try {
      // We parse the string into a real object to safely access the title
      const promptObj = JSON.parse(imagePrompt);
      const title = promptObj.slide_title || "";
      
      // Split by spaces and grab the last two elements
      const words = title.trim().split(/\s+/);
      if (words.length >= 2) {
        topicExtension = words.slice(-2).join(" "); // "to Biology"
      } else {
        topicExtension = title; // Fallback if title is only one word
      }
    } catch (e) {
      // If JSON.parse fails, we skip extraction or use a fallback
      console.error("Could not parse imagePrompt for title extraction");
    }

    // 2. Check if the prompt is the "JSON-style" slide prompt
    if (sanitizedPrompt.includes("slide_title") || sanitizedPrompt.includes("bullets")) {
      // Use the extracted topicExtension variable at the end of the string
      finalPrompt = `A premium, tech, abstract 16*9 slide background related to ${topicExtension}. Dark elegant colors, corporate tech aesthetic, empty negative space. Absolutely zero text, no letters, no words, no fonts, purely abstract background art`;
    } else {
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
    if (!storagePath) {
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