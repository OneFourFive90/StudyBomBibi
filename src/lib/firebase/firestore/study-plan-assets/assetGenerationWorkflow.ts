import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
} from "firebase/firestore";
import { db } from "@/lib/firebase/firebase";
import { StudyPlanAssetDocument } from "./saveStudyPlanAIAssets";

/**
 * Get all pending assets that need generation
 */
export async function getPendingAssets(): Promise<(StudyPlanAssetDocument & { id: string })[]> {
  const assetsRef = collection(db, "studyplanAIAssets");
  const q = query(
    assetsRef,
    where("status", "==", "pending"),
    orderBy("createdAt", "asc")
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  })) as (StudyPlanAssetDocument & { id: string })[];
}

/**
 * Get assets for a specific plan (useful for monitoring progress)
 */
export async function getAssetsByPlan(planId: string): Promise<(StudyPlanAssetDocument & { id: string })[]> {
  const assetsRef = collection(db, "studyplanAIAssets");
  const q = query(
    assetsRef,
    where("planId", "==", planId),
    orderBy("activityIndex", "asc")
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  })) as (StudyPlanAssetDocument & { id: string })[];
}

/**
 * Generate storage path for an asset
 */
export function generateStoragePath(
  userId: string,
  planId: string,
  assetType: "slide_image" | "script_audio" | "single_image",
  activityIndex: number,
  segmentIndex?: number
): string {
  const basePath = `users/${userId}/studyplan_ai_assets/${planId}`;
  
  switch (assetType) {
    case "single_image":
      return `${basePath}/images/activity_${activityIndex}_single.jpg`;
    case "slide_image":
      return `${basePath}/images/activity_${activityIndex}_slide_${segmentIndex}.jpg`;
    case "script_audio":
      return `${basePath}/audio/activity_${activityIndex}_script_${segmentIndex}.mp3`;
    default:
      throw new Error(`Unknown asset type: ${assetType}`);
  }
}