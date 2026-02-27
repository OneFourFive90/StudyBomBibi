import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";

/**
 * Upload an asset (image or audio) to Firebase Storage
 * 
 * @param storagePath - Path in storage (e.g., users/{userId}/studyplan_ai_assets/{planId}/images/...)
 * @param buffer - Buffer containing the file data
 * @param contentType - MIME type (e.g., "image/jpeg", "audio/mpeg")
 * @returns Download URL for the uploaded asset
 */
export async function uploadAssetToStorage(
  storagePath: string,
  buffer: Buffer,
  contentType: string
): Promise<string> {
  try {
    const storage = getStorage();
    const fileRef = ref(storage, storagePath);

    // Upload the file with metadata
    await uploadBytes(fileRef, buffer, {
      contentType,
    });

    // Get the download URL
    const downloadUrl = await getDownloadURL(fileRef);
    
    console.log(`[Storage] Uploaded to ${storagePath}`);
    return downloadUrl;

  } catch (error) {
    console.error(`[Storage] Upload failed for ${storagePath}:`, error);
    throw new Error(
      `Failed to upload asset to Firebase Storage: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Get MIME type based on file extension
 */
export function getMimeType(extension: string): string {
  const mimeTypes: Record<string, string> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    gif: "image/gif",
    mp3: "audio/mpeg",
    wav: "audio/wav",
    m4a: "audio/mp4",
  };

  return mimeTypes[extension.toLowerCase()] || "application/octet-stream";
}
