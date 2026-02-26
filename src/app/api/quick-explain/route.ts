import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini with your secure environment variable
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string);

export async function POST(req: Request) {
  try {
    // 1. Receive the highlighted word AND the surrounding notes from the frontend
    const { highlightedWord, contextNotes } = await req.json();

    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    // 2. Build the context-aware prompt
    const prompt = `
      You are an expert academic tutor. The student is reading the following study notes:
      ---
      ${contextNotes}
      ---
      The student highlighted the word/phrase: "${highlightedWord}".
      
      Provide a brief, easily understandable explanation of this word strictly based on how it is used in the context of the notes provided above. 
      Keep the explanation to 2 or 3 short sentences.
    `;

    // 3. Call Gemini
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const explanation = response.text();

    // 4. Send the explanation back to the frontend popup
    return NextResponse.json({ explanation });

  } catch (error) {
    console.error("Error generating explanation:", error);
    return NextResponse.json(
      { error: "Failed to generate explanation." },
      { status: 500 }
    );
  }
}