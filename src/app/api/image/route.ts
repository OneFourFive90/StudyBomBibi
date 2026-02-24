import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    // 1. We now expect the full 'imagePrompt' from your frontend/Gemini
    const { imagePrompt } = await req.json();

    if (!imagePrompt) {
      return NextResponse.json({ error: "Missing imagePrompt" }, { status: 400 });
    }

    // 2. Use the AI's prompt directly! 
    // I added a tiny quality booster at the end to make it look like a textbook diagram, 
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
      return NextResponse.json({ error: "Cloudflare API failed", details: errorText }, { status: 500 });
    }

    // 5. Convert the image to Base64
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Image = buffer.toString("base64");

    // 6. Send it back to the frontend!
    return NextResponse.json({
      imageUrl: `data:image/png;base64,${base64Image}`,
    });
  } catch (error) {
    console.error("Image Generation Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}