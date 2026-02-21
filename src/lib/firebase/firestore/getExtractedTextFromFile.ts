import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Retrieve extracted text from a file by fileId
 * @param fileId - The ID of the file document
 * @param ownerId - Optional: Owner ID for validation (recommended for security)
 * @returns The extracted text string, or null if not found
 * @throws Error if file not found or unauthorized
 */
export async function getExtractedTextFromFile(
  fileId: string,
  ownerId?: string
): Promise<string | null> {
  const fileRef = doc(db, 'files', fileId);
  const fileDoc = await getDoc(fileRef);

  if (!fileDoc.exists()) {
    throw new Error('File not found');
  }

  const fileData = fileDoc.data();

  // Validate ownership if ownerId is provided
  if (ownerId && fileData.ownerId !== ownerId) {
    throw new Error('Unauthorized: File does not belong to this user');
  }

  // Return extracted text or null if not present
  return fileData.extractedText || null;
}

/**
 * Check if a file has extracted text
 */
export async function hasExtractedText(
  fileId: string,
  ownerId?: string
): Promise<boolean> {
  try {
    const text = await getExtractedTextFromFile(fileId, ownerId);
    return text !== null && text.trim().length > 0;
  } catch {
    return false;
  }
}

/**
 * Get extracted text from multiple files
 * @returns Array of objects with fileId and extractedText
 */
export async function getExtractedTextsFromFiles(
  fileIds: string[],
  ownerId?: string
): Promise<
  Array<{
    fileId: string;
    originalName: string;
    extractedText: string | null;
    error?: string;
  }>
> {
  const results = await Promise.all(
    fileIds.map(async (fileId) => {
      try {
        const fileRef = doc(db, 'files', fileId);
        const fileDoc = await getDoc(fileRef);

        if (!fileDoc.exists()) {
          return {
            fileId,
            originalName: '',
            extractedText: null,
            error: 'File not found',
          };
        }

        const fileData = fileDoc.data();

        // Validate ownership if ownerId is provided
        if (ownerId && fileData.ownerId !== ownerId) {
          return {
            fileId,
            originalName: fileData.originalName || '',
            extractedText: null,
            error: 'Unauthorized',
          };
        }

        return {
          fileId,
          originalName: fileData.originalName || '',
          extractedText: fileData.extractedText || null,
        };
      } catch (error) {
        return {
          fileId,
          originalName: '',
          extractedText: null,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    })
  );

  return results;
}
