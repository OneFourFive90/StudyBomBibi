import { NextResponse } from "next/server";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/firebase";
import { generateVideoAsset } from "@/lib/ai/generateVideoAsset";
import { generateImageAsset } from "@/lib/ai/generateImageAsset";
import { uploadStudyPlanAsset } from "@/lib/firebase/storage/uploadStudyPlanAsset";
import {
  getAssetById,
  markAssetGenerating,
  markAssetReady,
  markAssetFailed,
  updateActivityAssetUrl,
} from "@/lib/firebase/firestore/study-plan-assets/updateStudyPlanAIAsset";
import { StoredActivity } from "@/lib/firebase/firestore/study-plan/saveStudyPlanToFirestore";

/**
 * POST /api/study-plan/assets/generate
 * 
 * Generates a single asset (video/image) for a study plan activity
 * 
 * Body: { assetId: string }
 * 
 * Flow:
 * 1. Get asset doc from studyplanAIAssets
 * 2. Get activity data from dailyModule
 * 3. Generate video/image based on type
 * 4. Upload to Firebase Storage
 * 5. Update asset doc and activity with downloadUrl
 */
export async function POST(req: Request) {
  let assetId: string | undefined;

  try {
    const body = await req.json();
    assetId = body.assetId;

    // ============ VALIDATION ============
    if (!assetId || typeof assetId !== "string") {
      return NextResponse.json(
        { error: "Missing required field: 'assetId'" },
        { status: 400 }
      );
    }

    // ============ STEP 1: GET ASSET DOCUMENT ============
    console.log(`[AssetGen] Processing asset: ${assetId}`);

    const asset = await getAssetById(assetId);
    if (!asset) {
      return NextResponse.json(
        { error: "Asset not found" },
        { status: 404 }
      );
    }

    // Check if already processed
    if (asset.status === "ready") {
      return NextResponse.json({
        success: true,
        message: "Asset already generated",
        downloadUrl: asset.downloadUrl,
      });
    }

    if (asset.status === "generating") {
      return NextResponse.json(
        { error: "Asset is currently being generated" },
        { status: 409 }
      );
    }

    // ============ STEP 2: GET ACTIVITY DATA ============
    const moduleRef = doc(db, "plans", asset.planId, "dailyModule", asset.dailyModuleId);
    const moduleDoc = await getDoc(moduleRef);

    if (!moduleDoc.exists()) {
      return NextResponse.json(
        { error: "Daily module not found" },
        { status: 404 }
      );
    }

    const moduleData = moduleDoc.data();
    const activity: StoredActivity = moduleData.activities[asset.activityIndex];

    if (!activity) {
      return NextResponse.json(
        { error: "Activity not found at specified index" },
        { status: 404 }
      );
    }

    // ============ STEP 3: MARK AS GENERATING ============
    await markAssetGenerating(assetId);
    console.log(`[AssetGen] Marked as generating: ${assetId}`);

    // ============ STEP 4: GENERATE ASSET ============
    let buffer: Buffer;
    let mimeType: string;
    let extension: string;

    try {
      if (asset.type === "video") {
        if (!activity.video_segments || activity.video_segments.length === 0) {
          throw new Error("Video activity missing video_segments");
        }

        const result = await generateVideoAsset({
          title: activity.title,
          video_segments: activity.video_segments,
        });

        buffer = result.buffer;
        mimeType = result.mimeType;
        extension = result.extension;
      } else if (asset.type === "image") {
        if (!activity.image_description) {
          throw new Error("Image activity missing image_description");
        }

        const result = await generateImageAsset({
          title: activity.title,
          image_description: activity.image_description,
        });

        buffer = result.buffer;
        mimeType = result.mimeType;
        extension = result.extension;
      } else {
        throw new Error(`Unknown asset type: ${asset.type}`);
      }
    } catch (genError) {
      // Mark as failed if generation fails
      const errorMessage = genError instanceof Error ? genError.message : String(genError);
      await markAssetFailed(assetId, errorMessage);
      console.error(`[AssetGen] Generation failed: ${errorMessage}`);
      
      return NextResponse.json(
        { error: "Asset generation failed", details: errorMessage },
        { status: 500 }
      );
    }

    // ============ STEP 5: UPLOAD TO STORAGE ============
    console.log(`[AssetGen] Uploading to storage...`);

    const uploadResult = await uploadStudyPlanAsset({
      ownerId: asset.ownerId,
      planId: asset.planId,
      assetId: asset.id,
      buffer,
      mimeType,
      extension,
      type: asset.type,
    });

    // ============ STEP 6: UPDATE FIRESTORE ============
    console.log(`[AssetGen] Updating Firestore...`);

    // Update asset document
    await markAssetReady(assetId, uploadResult.storagePath, uploadResult.downloadUrl);

    // Update activity with asset URL
    await updateActivityAssetUrl(
      asset.planId,
      asset.dailyModuleId,
      asset.activityIndex,
      uploadResult.downloadUrl
    );

    console.log(`[AssetGen] Successfully generated asset: ${assetId}`);

    return NextResponse.json({
      success: true,
      assetId,
      type: asset.type,
      storagePath: uploadResult.storagePath,
      downloadUrl: uploadResult.downloadUrl,
      message: "Asset generated successfully",
    });

  } catch (error: unknown) {
    console.error("[AssetGen] Error:", error);
    
    // Try to mark as failed if we have the assetId
    if (assetId) {
      try {
        const errorMessage = error instanceof Error ? error.message : String(error);
        await markAssetFailed(assetId, errorMessage);
      } catch {
        // Ignore errors when marking as failed
      }
    }

    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Failed to generate asset", details: errorMessage },
      { status: 500 }
    );
  }
}
