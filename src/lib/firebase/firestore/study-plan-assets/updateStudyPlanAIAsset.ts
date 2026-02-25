import { db } from "@/lib/firebase/firebase";
import {
  doc,
  getDoc,
  updateDoc,
  Timestamp,
} from "firebase/firestore";
import { StudyPlanAssetDocument } from "./saveStudyPlanAIAssets";

export type AssetStatus = "pending" | "generating" | "ready" | "failed";

export interface UpdateAssetStatusInput {
  assetId: string;
  status: AssetStatus;
  storagePath?: string;
  downloadUrl?: string;
  errorMessage?: string;
}

/**
 * Update the status of a study plan asset
 */
export async function updateAssetStatus(
  input: UpdateAssetStatusInput
): Promise<void> {
  const { assetId, status, storagePath, downloadUrl, errorMessage } = input;

  const assetRef = doc(db, "studyplanAIAssets", assetId);
  
  const updateData: Record<string, unknown> = {
    status,
    updatedAt: Timestamp.now(),
  };

  if (storagePath !== undefined) {
    updateData.storagePath = storagePath;
  }

  if (downloadUrl !== undefined) {
    updateData.downloadUrl = downloadUrl;
  }

  if (errorMessage !== undefined) {
    updateData.errorMessage = errorMessage;
  }

  await updateDoc(assetRef, updateData);
}

/**
 * Mark asset as "generating" (in progress)
 */
export async function markAssetGenerating(assetId: string): Promise<void> {
  await updateAssetStatus({ assetId, status: "generating" });
}

/**
 * Mark asset as "ready" with storage URLs
 */
export async function markAssetReady(
  assetId: string,
  storagePath: string,
  downloadUrl: string
): Promise<void> {
  await updateAssetStatus({
    assetId,
    status: "ready",
    storagePath,
    downloadUrl,
  });
}

/**
 * Mark asset as "failed" with error message
 */
export async function markAssetFailed(
  assetId: string,
  errorMessage: string
): Promise<void> {
  await updateAssetStatus({
    assetId,
    status: "failed",
    errorMessage,
  });
}

/**
 * Get asset document by ID
 */
export async function getAssetById(
  assetId: string
): Promise<StudyPlanAssetDocument & { id: string } | null> {
  const assetRef = doc(db, "studyplanAIAssets", assetId);
  const assetDoc = await getDoc(assetRef);

  if (!assetDoc.exists()) {
    return null;
  }

  return {
    id: assetDoc.id,
    ...assetDoc.data(),
  } as StudyPlanAssetDocument & { id: string };
}

/**
 * Update a specific asset URL within an activity
 * Call this after asset is ready to link it back to the activity
 */
export async function updateActivityAssetUrl(
  planId: string,
  dailyModuleId: string,
  activityIndex: number,
  assetId: string,
  downloadUrl: string
): Promise<void> {
  const moduleRef = doc(db, "plans", planId, "dailyModule", dailyModuleId);
  const moduleDoc = await getDoc(moduleRef);

  if (!moduleDoc.exists()) {
    throw new Error(`Daily module ${dailyModuleId} not found`);
  }

  const moduleData = moduleDoc.data();
  const activities = [...moduleData.activities];

  if (activityIndex >= activities.length) {
    throw new Error(`Activity index ${activityIndex} out of bounds`);
  }

  const activity = activities[activityIndex];
  if (!activity.assets) {
    throw new Error(`Activity ${activityIndex} has no assets array`);
  }

  // Update the specific asset's URL
  const updatedAssets = activity.assets.map((asset: any) =>
    asset.assetId === assetId ? { ...asset, url: downloadUrl } : asset
  );

  // Check if all assets in this activity are now ready
  const allAssetsReady = updatedAssets.every((asset: any) => asset.url);
  
  activities[activityIndex] = {
    ...activity,
    assets: updatedAssets,
    assetStatus: allAssetsReady ? "ready" : "pending",
  };

  await updateDoc(moduleRef, { activities });
}

/**
 * Mark an activity asset as failed
 */
export async function markActivityAssetFailed(
  planId: string,
  dailyModuleId: string,
  activityIndex: number,
  assetId: string,
  errorMessage: string
): Promise<void> {
  const moduleRef = doc(db, "plans", planId, "dailyModule", dailyModuleId);
  const moduleDoc = await getDoc(moduleRef);

  if (!moduleDoc.exists()) {
    throw new Error(`Daily module ${dailyModuleId} not found`);
  }

  const moduleData = moduleDoc.data();
  const activities = [...moduleData.activities];

  if (activityIndex >= activities.length) {
    throw new Error(`Activity index ${activityIndex} out of bounds`);
  }

  const activity = activities[activityIndex];
  
  // Mark the overall activity as failed
  activities[activityIndex] = {
    ...activity,
    assetStatus: "failed",
    errorMessage,
  };

  await updateDoc(moduleRef, { activities });
}
