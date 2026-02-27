import { NextRequest, NextResponse } from "next/server";
import { generateStoragePath, getAssetsByPlan } from "@/lib/firebase/firestore/study-plan-assets/assetGenerationWorkflow";
import {
  markAssetGenerating,
  markAssetReady,
  markAssetFailed,
  updateActivityAssetUrl,
} from "@/lib/firebase/firestore/study-plan-assets/updateStudyPlanAIAsset";

/**
 * POST /api/study-plan/assets/generate
 * 
 * Internal API that generates all AI assets for a study plan:
 * - Calls /api/image for slide_image and single_image
 * - Calls /api/tts for script_audio
 * - Updates asset status and activity URLs
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { planId, userId } = body;

    if (!planId || !userId) {
      return NextResponse.json(
        { error: "Missing required fields: planId, userId" },
        { status: 400 }
      );
    }

    console.log(`[AssetGen] Starting generation for plan ${planId}`);

    // Get assets to generate for this plan
    const allAssets = await getAssetsByPlan(planId);
    const pendingAssets = allAssets.filter(asset => asset.status === "pending");

    console.log(`[AssetGen] Found ${pendingAssets.length} pending assets`);

    if (pendingAssets.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No pending assets to generate",
        processed: 0,
        results: []
      });
    }

    const results = [];

    // Process each asset
    for (const asset of pendingAssets) {
      try {
        console.log(`[AssetGen] Processing asset ${asset.id} (${asset.assetType})`);
        
        // Mark as generating
        await markAssetGenerating(asset.id);

        // Generate storage path
        const storagePath = generateStoragePath(
          userId,
          asset.planId,
          asset.assetType,
          asset.activityIndex,
          asset.segmentIndex
        );

        let downloadUrl: string;

        // Generate asset based on type
        if (asset.assetType === "slide_image" || asset.assetType === "single_image") {
          // Call image generation API
          const imageResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/image`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              imagePrompt: asset.prompt || "Generate relevant educational image",
              storagePath,
              userId,
            }),
          });

          if (!imageResponse.ok) {
            const errorText = await imageResponse.text();
            throw new Error(`Image generation failed: ${errorText}`);
          }

          const imageResult = await imageResponse.json();
          downloadUrl = imageResult.downloadUrl;

        } else if (asset.assetType === "script_audio") {
          // Call TTS API
          const ttsResponse = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/tts`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              script: asset.prompt || "No script provided",
              storagePath,
              userId,
            }),
          });

          if (!ttsResponse.ok) {
            const errorText = await ttsResponse.text();
            throw new Error(`TTS generation failed: ${errorText}`);
          }

          const ttsResult = await ttsResponse.json();
          downloadUrl = ttsResult.downloadUrl;

        } else {
          throw new Error(`Unknown asset type: ${asset.assetType}`);
        }

        // Mark asset as ready
        await markAssetReady(asset.id, storagePath, downloadUrl);

        // Update activity with asset URL
        await updateActivityAssetUrl(
          asset.planId,
          asset.dailyModuleId,
          asset.activityIndex,
          asset.id,
          downloadUrl
        );

        console.log(`[AssetGen] ✅ Generated asset ${asset.id}`);

        results.push({
          assetId: asset.id,
          assetType: asset.assetType,
          segmentIndex: asset.segmentIndex,
          success: true,
          downloadUrl,
        });

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        console.error(`[AssetGen] ❌ Failed to generate asset ${asset.id}:`, errorMessage);

        // Mark asset as failed
        await markAssetFailed(asset.id, errorMessage);

        results.push({
          assetId: asset.id,
          assetType: asset.assetType,
          segmentIndex: asset.segmentIndex,
          success: false,
          error: errorMessage,
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    console.log(`[AssetGen] Completed: ${successCount} success, ${failCount} failed`);

    return NextResponse.json({
      success: true,
      processed: results.length,
      successCount,
      failCount,
      results,
      message: `Generated ${successCount}/${results.length} assets successfully`,
    });

  } catch (error) {
    console.error("[AssetGen] Critical error:", error);
    return NextResponse.json(
      { 
        error: "Asset generation failed", 
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/study-plan/assets/generate
 * 
 * Get generation status for a plan
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const planId = searchParams.get("planId");

    if (!planId) {
      return NextResponse.json(
        { error: "Missing required parameter: planId" },
        { status: 400 }
      );
    }

    const assets = await getAssetsByPlan(planId);
    
    const statusCounts = {
      pending: assets.filter(a => a.status === "pending").length,
      generating: assets.filter(a => a.status === "generating").length,
      ready: assets.filter(a => a.status === "ready").length,
      failed: assets.filter(a => a.status === "failed").length,
    };

    const progress = assets.length > 0 ? (statusCounts.ready / assets.length) * 100 : 100;

    return NextResponse.json({
      planId,
      totalAssets: assets.length,
      progress: Math.round(progress),
      statusCounts,
      isComplete: statusCounts.pending === 0 && statusCounts.generating === 0,
      assets: assets.map(asset => ({
        id: asset.id,
        assetType: asset.assetType,
        status: asset.status,
        activityIndex: asset.activityIndex,
        segmentIndex: asset.segmentIndex,
        downloadUrl: asset.downloadUrl,
        errorMessage: asset.errorMessage,
      }))
    });

  } catch (error) {
    console.error("[AssetGen] Status check failed:", error);
    return NextResponse.json(
      { error: "Failed to get generation status" },
      { status: 500 }
    );
  }
}
