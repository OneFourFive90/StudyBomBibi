import { storage } from "../firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

export interface UploadAssetInput {
  ownerId: string;
  planId: string;
  assetId: string;
  buffer: Buffer;
  mimeType: string;
  extension: string;
  type: "video" | "image";
}

export interface UploadAssetResult {
  storagePath: string;
  downloadUrl: string;
}

/**
 * Upload a generated asset (video/image) to Firebase Storage
 * 
 * Storage path: users/{userId}/studyplan_ai_assets/plan_{planId}_{type}_{assetId}.{ext}
 * Example: users/user123/studyplan_ai_assets/plan_abc123_vid_xyz789.mp4
 */
export async function uploadStudyPlanAsset(
  input: UploadAssetInput
): Promise<UploadAssetResult> {
  const { 
    ownerId, 
    planId, 
    assetId, 
    buffer, 
    mimeType, 
    extension, 
    type 
  } = input;

  // Build storage path with type prefix (vid for video, img for image)
  const typePrefix = type === "video" ? "vid" : "img";
  const fileName = `plan_${planId}_${typePrefix}_${assetId}.${extension}`;
  const storagePath = `users/${ownerId}/studyplan_ai_assets/${fileName}`;

  // Create reference and upload
  const storageRef = ref(storage, storagePath);
  
  // Convert Buffer to Uint8Array for Firebase
  const uint8Array = new Uint8Array(buffer);
  
  await uploadBytes(storageRef, uint8Array, {
    contentType: mimeType,
    customMetadata: {
      planId,
      assetId,
      generatedAt: new Date().toISOString(),
    },
  });

  // Get download URL
  const downloadUrl = await getDownloadURL(storageRef);

  return {
    storagePath,
    downloadUrl,
  };
}

/**
 * Build the expected storage path for an asset
 * Useful for checking if asset already exists
 * 
 * Example: users/user123/studyplan_ai_assets/plan_abc123_vid_xyz789.mp4
 */
export function getAssetStoragePath(
  ownerId: string,
  planId: string,
  assetId: string,
  extension: string,
  type: "video" | "image"
): string {
  const typePrefix = type === "video" ? "vid" : "img";
  const fileName = `plan_${planId}_${typePrefix}_${assetId}.${extension}`;
  return `users/${ownerId}/studyplan_ai_assets/${fileName}`;
}
