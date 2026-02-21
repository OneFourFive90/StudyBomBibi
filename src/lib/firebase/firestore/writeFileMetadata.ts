import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

export interface FileMetadataInput {
  userId: string;
  file: File;
  fileHash: string;
  storagePath: string;
  downloadURL: string;
  mimeType: string;
  extractedText: string;
}

export async function writeFileMetadataToFirestore(
  input: FileMetadataInput
): Promise<void> {
  const payload = {
    ownerId: input.userId,
    originalName: input.file.name,
    fileHash: input.fileHash,
    storagePath: input.storagePath,
    downloadURL: input.downloadURL,
    mimeType: input.mimeType,
    fileSize: input.file.size,
    uploadedAt: serverTimestamp(),
    folderId: null,
    extractedText: input.extractedText,
    vectorEmbedding: [] as number[],
  };

  try{
    await addDoc(collection(db, 'files'), payload);
  } catch (error) {
    console.error('Error writing file metadata to Firestore:', error);
    throw new Error('Failed to save file metadata. Please try again.');
  }
}
