/*
When users press save, call the api to store
quiz data (already in Firestore format) into Firestore
*/

import { NextResponse } from "next/server";
import { saveQuizToFirestore } from "@/lib/firebase/firestore/saveQuizToFirestore";
import { QuizQuestion, QuizScore } from "@/lib/firebase/firestore/saveQuizToFirestore";
import { verifyFirebaseIdToken } from "@/lib/firebase/verifyIdToken";

export async function POST(req: Request) {
  try {
    // Verify ID token
    const authHeader = req.headers.get("Authorization");
    let ownerId: string;
    try {
      const decodedToken = await verifyFirebaseIdToken(authHeader);
      ownerId = decodedToken.uid;
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { mode, quizData, customTitle, timerSettings } = body;

    // Validate required fields
    if (!mode || !["mcq", "past_year"].includes(mode)) {
      return NextResponse.json(
        { error: "Invalid mode. Use 'mcq' or 'past_year'." },
        { status: 400 }
      );
    }

    if (
      !quizData ||
      !quizData.title ||
      !Array.isArray(quizData.questions) ||
      !quizData.score
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid quizData. Must include title, questions array, and score.",
        },
        { status: 400 }
      );
    }

    if (quizData.questions.length === 0) {
      return NextResponse.json(
        { error: "Quiz must contain at least one question." },
        { status: 400 }
      );
    }

    // Save to Firestore using utility function
    const docRef = await saveQuizToFirestore(
      ownerId,
      customTitle || quizData.title,
      mode,
      quizData.questions as QuizQuestion[],
      quizData.score as QuizScore,
      {
        durationMinutes:
          timerSettings && typeof timerSettings.durationMinutes === "number"
            ? timerSettings.durationMinutes
            : null,
        timerEnabled:
          timerSettings && typeof timerSettings.timerEnabled === "boolean"
            ? timerSettings.timerEnabled
            : true,
      }
    );

    return NextResponse.json({
      success: true,
      quizId: docRef.id,
      title: customTitle || quizData.title,
      questionCount: quizData.questions.length,
      message: "Quiz saved successfully",
    });
  } catch (error: unknown) {
    console.error("Save Quiz Error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to save quiz", details: errorMessage },
      { status: 500 }
    );
  }
}
