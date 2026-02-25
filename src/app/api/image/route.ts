import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { imagePrompt } = await req.json();

    if (!imagePrompt) {
      return NextResponse.json({ error: "Missing imagePrompt" }, { status: 400 });
    }
    const sanitizedPrompt = imagePrompt.replace(/'/g, "\\'");

    // 1. Prompt Engineering: Use the sanitizedPrompt here!
    const optimizedPrompt = `${sanitizedPrompt}, highly detailed educational presentation slide, 16:9 aspect ratio, clear and legible typography, professional layout.`;
   
    // 2. The Hugging Face Endpoint
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
        inputs: optimizedPrompt,
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

    // 4. Convert the image to Base64
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Image = buffer.toString("base64");

    // ==========================================
    // 🌟 5. CREATE THE FULL STRING VARIABLE
    // ==========================================
    const fullImageString = `data:image/jpeg;base64,${base64Image}`;

    // ==========================================
    // 🛑 FRIEND PASTES HER FIREBASE CODE HERE 🛑
    // ==========================================
    // Example:
    // const storageRef = ref(storage, 'slides/lesson_1.jpg');
    // await uploadString(storageRef, fullImageString, 'data_url'); 
    // ==========================================

    // 6. Send it back to the frontend
    return NextResponse.json({
      imageUrl: fullImageString,
    });
  } catch (error) {
    console.error("Image Generation Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}