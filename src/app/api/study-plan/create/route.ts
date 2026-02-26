import { NextResponse } from "next/server";
import { getExtractedTextsFromFiles } from "@/lib/firebase/firestore/getExtractedTextFromFile";
import { saveStudyPlanToFirestore } from "@/lib/firebase/firestore/study-plan/saveStudyPlanToFirestore";
import { generateStudyPlan } from "@/lib/ai/generateStudyPlan";
import { verifyFirebaseIdToken } from "@/lib/firebase/verifyIdToken";

/**
 * POST /api/study-plan/create
 * 
 * Creates a complete study plan:
 * 1. Verifies user via ID token
 * 2. Retrieves extracted text from file IDs
 * 3. Calls AI to generate study plan
 * 4. Saves plan to Firestore
 * 5. Returns planId for frontend navigation
 */
export async function POST(req: Request) {
  try {
    // ============ VERIFY ID TOKEN ============
    const authHeader = req.headers.get("Authorization");
    let userId: string;
    try {
      const decodedToken = await verifyFirebaseIdToken(authHeader);
      userId = decodedToken.uid;
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const {
      fileIds,       // Array of file document IDs
      days,          // Number of days for the study plan
      hoursPerDay,   // Hours per day
      formats,       // ["video", "text", "image"]
    } = body;

    // ============ VALIDATION ============
    if (!fileIds || !Array.isArray(fileIds) || fileIds.length === 0) {
      return NextResponse.json(
        { error: "Missing required field: 'fileIds' (must be non-empty array)" },
        { status: 400 }
      );
    }

    if (!days || typeof days !== "number" || days < 1) {
      return NextResponse.json(
        { error: "Missing required field: 'days' (must be positive number)" },
        { status: 400 }
      );
    }

    if (!hoursPerDay || typeof hoursPerDay !== "number" || hoursPerDay <= 0) {
      return NextResponse.json(
        { error: "Missing required field: 'hoursPerDay' (must be positive number)" },
        { status: 400 }
      );
    }

    // ============ STEP 1: RETRIEVE EXTRACTED TEXT FROM FILES ============
    console.log(`[StudyPlan] Retrieving text from ${fileIds.length} files...`);
    
    const fileResults = await getExtractedTextsFromFiles(fileIds, userId);
    
    // Check for errors
    const errors = fileResults.filter((r) => r.error);
    if (errors.length > 0) {
      return NextResponse.json(
        {
          error: "Failed to retrieve some files",
          details: errors.map((e) => ({ fileId: e.fileId, error: e.error })),
        },
        { status: 400 }
      );
    }

    // Check for missing extracted text
    const missingText = fileResults.filter((r) => !r.extractedText);
    if (missingText.length > 0) {
      return NextResponse.json(
        {
          error: "Some files have no extracted text",
          details: missingText.map((m) => m.fileId),
        },
        { status: 400 }
      );
    }

    // Prepare data for AI
    const fileNames = fileResults.map((r) => r.originalName);
    const extractedTexts = fileResults.map((r) => r.extractedText as string);

    // ============ STEP 2: CALL AI TO GENERATE STUDY PLAN ============
    console.log(`[StudyPlan] Calling AI to generate plan...`);

    let aiStudyPlan;
    try {
      aiStudyPlan = await generateStudyPlan({
        fileNames,
        extractedTexts,
        days,
        hoursPerDay,
        formats: formats || ["text"],
      });
    } catch (aiError) {
      console.error("[StudyPlan] AI generation failed:", aiError);
      const aiErrorMessage = aiError instanceof Error ? aiError.message : String(aiError);
      return NextResponse.json(
        { error: "AI generation failed", details: aiErrorMessage },
        { status: 500 }
      );
    }

    console.log(`[StudyPlan] AI generated plan: "${aiStudyPlan.courseTitle}" with ${aiStudyPlan.schedule.length} days`);

    // ============ STEP 3: SAVE TO FIRESTORE ============
    console.log(`[StudyPlan] Saving to Firestore...`);

    const saveResult = await saveStudyPlanToFirestore({
      ownerId: userId,
      sourceFileIds: fileIds,
      hoursPerDay,
      prefStyle: formats,
      aiResponse: aiStudyPlan,
    });

    console.log(`[StudyPlan] Saved plan ${saveResult.planId} with ${saveResult.dailyModuleIds.length} modules`);

    // ============ STEP 4: RETURN RESULT ============
    return NextResponse.json({
      success: true,
      planId: saveResult.planId,
      courseTitle: aiStudyPlan.courseTitle,
      totalDays: aiStudyPlan.schedule.length,
      dailyModuleIds: saveResult.dailyModuleIds,
      pendingAssets: saveResult.pendingAssetIds.length,
      message: `Study plan created successfully. ${saveResult.pendingAssetIds.length} assets pending generation.`,
    });

  } catch (error: unknown) {
    console.error("[StudyPlan] Error:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Failed to create study plan", details: errorMessage },
      { status: 500 }
    );
  }
}
