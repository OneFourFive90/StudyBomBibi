import { NextResponse } from "next/server";
import { uploadAssetToStorage } from "@/lib/firebase/storage/uploadAssetToStorage";

export async function POST(req: Request) {
  try {
    // 1. Get parameters
    const { imagePrompt, storagePath, userId } = await req.json();

    if (!imagePrompt) {
      return NextResponse.json({ error: "Missing imagePrompt" }, { status: 400 });
    }

    // Determine if this is for storage or immediate use
    const isForStorage = storagePath && userId;

    // 2. Optimize the prompt
    const optimizedPrompt = `${imagePrompt}, highly detailed educational illustration, textbook quality, 4k.`;

    // 3. The Cloudflare Workers AI Endpoint
    const model = "@cf/stabilityai/stable-diffusion-xl-base-1.0";
    const url = `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/ai/run/${model}`;

    // 4. Call Cloudflare API
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ prompt: optimizedPrompt }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Cloudflare Error:", errorText);
      return NextResponse.json(
        { error: "Cloudflare API failed", details: errorText },
        { status: 500 }
      );
    }

    // 5. Convert the image to Buffer
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // If no storage path, return Base64 (backward compatibility)
    if (!isForStorage) {
      const base64Image = buffer.toString("base64");
      const fullImageString = `data:image/png;base64,${base64Image}`;
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