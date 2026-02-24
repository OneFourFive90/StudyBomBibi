import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { slideTitle } = await req.json();

    if (!slideTitle) {
      return NextResponse.json({ error: "Missing slideTitle" }, { status: 400 });
    }

    // 1. Secret Prompt Engineering
    // We append specific keywords so the AI generates a nice background 
    // instead of a chaotic picture with weird fake text.
 const optimizedPrompt = `A minimalist, professional, dark mode presentation slide background about ${slideTitle}. Abstract tech shapes, no text, clean, gradient.`;
    // 2. The Cloudflare Workers AI Endpoint
    // We are using Stable Diffusion XL (SDXL) which makes great images
    const model = "@cf/stabilityai/stable-diffusion-xl-base-1.0";
    const url = `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/ai/run/${model}`;

    // 3. Call Cloudflare API
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
      return NextResponse.json({ error: "Cloudflare API failed" }, { status: 500 });
    }

    // 4. Convert the image to Base64
    // Cloudflare returns raw binary data (a Blob/Buffer). 
    // We need to convert it to a Base64 string so our frontend <img /> tag can read it.
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Image = buffer.toString("base64");

    // 5. Send it back to the frontend!
    return NextResponse.json({
      imageUrl: `data:image/png;base64,${base64Image}`,
    });
  } catch (error) {
    console.error("Image Generation Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}