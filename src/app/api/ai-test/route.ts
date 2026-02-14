import { NextResponse } from 'next/server';
import { generateContent } from '@/lib/gemini'; 

export async function POST(req: Request) {
  try {
    // 1. Get the prompt from the request body
    const body = await req.json();
    const { message } = body;

    if (!message) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    // 2. Call your Centralized AI Service
    const aiResponse = await generateContent(message);

    // 3. Return the result
    return NextResponse.json({ result: aiResponse });

  } catch (error) {
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}