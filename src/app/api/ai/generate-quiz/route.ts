import { NextResponse } from "next/server";
import { generateQuizWithAI } from "@/lib/ai/AIgenerateQuiz";
import {
  transformAIQuizToFirestore,
  calculateInitialScore,
  QuizQuestion,
  QuizScore,
} from "@/lib/firebase/firestore/saveQuizToFirestore";

/**
 * Generate a quiz preview in Firestore format (does NOT save to Firestore)
 * User can regenerate multiple times before confirming
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      mode,
      sourceText,
      pastYearText,
      numQuestions,
      customPrompt,
      duration,
      totalMarks,
    } = body;

    // Validate required fields
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

    if (mode === "past_year") {
      if (!Number.isFinite(totalMarks) || totalMarks <= 0) {
        return NextResponse.json(
          { error: "totalMarks must be a positive number for past_year mode." },
          { status: 400 }
        );
      }
    }

    // Generate quiz with AI
    const aiQuiz = await generateQuizWithAI(
      mode,
      sourceText,
      numQuestions,
      customPrompt,
      pastYearText,
      duration,
      mode === "past_year" ? Number(totalMarks) : undefined
    );

    // Transform to Firestore format
    const transformedQuestions: QuizQuestion[] = transformAIQuizToFirestore(
      aiQuiz,
      mode
    );

    if (mode === "past_year") {
      const transformedTotalMarks = transformedQuestions.reduce(
        (sum, question) => sum + question.marks,
        0
      );

      if (transformedTotalMarks !== Number(totalMarks)) {
        return NextResponse.json(
          {
            error: "Generated quiz total marks mismatch.",
            details: `Expected ${Number(totalMarks)}, got ${transformedTotalMarks}. Please regenerate.`,
          },
          { status: 422 }
        );
      }
    }

    const score: QuizScore = calculateInitialScore(transformedQuestions);

    return NextResponse.json({
      success: true,
      title: aiQuiz.title,
      duration: aiQuiz.duration || null,
      totalMarks:
        mode === "past_year"
          ? transformedQuestions.reduce((sum, question) => sum + question.marks, 0)
          : null,
      questions: transformedQuestions,
      score,
      message: "Quiz generated successfully. Preview before saving.",
    });
  } catch (error: unknown) {
    console.error("Quiz Generation Error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to generate quiz", details: errorMessage },
      { status: 500 }
    );
  }
}
