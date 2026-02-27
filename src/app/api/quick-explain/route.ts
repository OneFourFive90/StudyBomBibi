import { NextResponse } from 'next/server';
import { quickExplainText } from '@/lib/ai/quickExplain';

export async function POST(req: Request) {
  try {
    // 1. Receive the highlighted word AND the surrounding notes from the frontend
    const { highlightedWord, contextNotes, action = 'explain' } = await req.json();

    const explanation = await quickExplainText({
      highlightedText: highlightedWord,
      context: contextNotes,
      action: action as 'explain' | 'summarise'
    });

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