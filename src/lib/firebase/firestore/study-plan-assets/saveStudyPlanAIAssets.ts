import { db } from "@/lib/firebase/firebase";
import {
  collection,
  doc,
  WriteBatch,
  Timestamp,
} from "firebase/firestore";

// Asset document for AI-generated media
export interface StudyPlanAssetDocument {
  ownerId: string;
  planId: string;
  dailyModuleId: string;
  activityIndex: number;
  assetType: "slide_image" | "script_audio" | "single_image";
  segmentIndex?: number; // For video segments
  prompt?: string; // Image description or TTS script
  status: "pending" | "generating" | "ready" | "failed";
  storagePath: string | null;
  downloadUrl: string | null;
  errorMessage?: string;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
}

export interface CreateAssetInput {
  ownerId: string;
  planId: string;
  dailyModuleId: string;
  activityIndex: number;
  assetType: "slide_image" | "script_audio" | "single_image";
  segmentIndex?: number;
  prompt?: string;
}

export interface CreateAssetResult {
  assetId: string;
  assetRef: ReturnType<typeof doc>;
  assetData: StudyPlanAssetDocument;
}

/**
 * Create a pending asset entry for video/image activities
 * Returns the asset ID and data to be added to a batch
 */
export function createPendingAsset(
  input: CreateAssetInput,
  timestamp: Timestamp
): CreateAssetResult {
  const { ownerId, planId, dailyModuleId, activityIndex, assetType, segmentIndex, prompt } = input;

  const assetRef = doc(collection(db, "studyplanAIAssets"));
  
  // Build asset data conditionally - only include fields with actual values
  // Firestore doesn't allow undefined values
  const assetData: StudyPlanAssetDocument = {
    ownerId,
    planId,
    dailyModuleId,
    activityIndex,
    assetType,
    status: "pending",
    storagePath: null,
    downloadUrl: null,
    createdAt: timestamp,
  };
  
  // Conditionally add optional fields
  if (segmentIndex !== undefined) {
    assetData.segmentIndex = segmentIndex;
  }
  if (prompt !== undefined) {
    assetData.prompt = prompt;
  }

  return {
    assetId: assetRef.id,
    assetRef,
    assetData,
  };
}

/**
 * Add a pending asset to a Firestore batch
 * Use this when you want to batch multiple asset creations
 */
export function addAssetToBatch(
  batch: WriteBatch,
  input: CreateAssetInput,
  timestamp: Timestamp
): string {
  const { assetRef, assetData } = createPendingAsset(input, timestamp);
  batch.set(assetRef, assetData);
  return assetRef.id;
}
