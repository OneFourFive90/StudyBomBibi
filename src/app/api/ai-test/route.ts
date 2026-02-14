import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(req: Request) {
  try {
    // 1. Receive the message from the frontend
    const { message } = await req.json();

    // 2. Setup Gemini
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'API Key missing' }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    // 3. Ask Gemini
    const result = await model.generateContent(message);
    const response = await result.response;
    const text = response.text();

    // 4. Send answer back to frontend
    return NextResponse.json({ reply: text });

  } catch (error: unknown) {
    console.error('AI Error:', error);
    
    // Check if the error is actually an Error object to safely read the .message
    const errorMessage = error instanceof Error ? error.message : 'Something went wrong with the AI.';
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
