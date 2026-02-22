/*
Input extracted text and get AI-generated quiz, then save to Firestore
*/

import { NextResponse } from "next/server";
import { generateQuizWithAI } from "@/lib/ai/AIgenerateQuiz";
import { saveQuizToFirestore } from "@/lib/firebase/firestore/saveQuizToFirestore";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      ownerId,
      mode,
      sourceText,
      pastYearText,
      numQuestions,
      customPrompt,
      duration,
      customTitle,
    } = body;

    // Validate required fields
    if (!ownerId) {
      return NextResponse.json({ error: "Missing ownerId." }, { status: 400 });
    }

    if (!sourceText || !Array.isArray(sourceText)) {
      return NextResponse.json(
        { error: "Missing or invalid source text." },
        { status: 400 }
      );
    }

    if (!mode || !["mcq", "past_year"].includes(mode)) {
      return NextResponse.json(
        { error: "Invalid mode. Use 'mcq' or 'past_year'." },
        { status: 400 }
      );
    }

    if (!numQuestions || numQuestions <= 0) {
      return NextResponse.json(
        { error: "numQuestions must be greater than 0." },
        { status: 400 }
      );
    }

    // Generate quiz with AI
    const aiQuiz = await generateQuizWithAI(
      mode,
      sourceText,
      numQuestions,
      customPrompt,
      pastYearText,
      duration
    );

    // Save quiz to Firestore
    const docRef = await saveQuizToFirestore(
      ownerId,
      customTitle || aiQuiz.title || "Untitled Quiz",
      aiQuiz,
      mode
    );

    return NextResponse.json({
      success: true,
      quizId: docRef.id,
      title: aiQuiz.title,
      questionCount: aiQuiz.questions.length,
      message: "Quiz generated and saved successfully",
    });
  } catch (error: unknown) {
    console.error("Generate and Save Quiz Error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to generate and save quiz", details: errorMessage },
      { status: 500 }
    );
  }
}
