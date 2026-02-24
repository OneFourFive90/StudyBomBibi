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
  type: "video" | "image";
  status: "pending" | "generating" | "ready" | "failed";
  storagePath: string | null;
  downloadUrl: string | null;
  createdAt: Timestamp;
}

export interface CreateAssetInput {
  ownerId: string;
  planId: string;
  dailyModuleId: string;
  activityIndex: number;
  type: "video" | "image";
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
  const { ownerId, planId, dailyModuleId, activityIndex, type } = input;

  const assetRef = doc(collection(db, "studyplanAIAssets"));
  const assetData: StudyPlanAssetDocument = {
    ownerId,
    planId,
    dailyModuleId,
    activityIndex,
    type,
    status: "pending",
    storagePath: null,
    downloadUrl: null,
    createdAt: timestamp,
  };

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
