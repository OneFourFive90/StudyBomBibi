import {
  addDoc,
  collection,
  getDocs,
  query,
  serverTimestamp,
  where,
} from 'firebase/firestore';
import { db } from '../firebase';

export interface FileMetadataInput {
  userId: string;
  file: File;
  fileHash: string;
  storagePath: string;
  downloadURL: string;
  mimeType: string;
  extractedText: string;
  folderId?: string | null;
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
    folderId: input.folderId || null,
    extractedText: input.extractedText,
    vectorEmbedding: [] as number[],
  };

  try{
    const filesCollection = collection(db, 'files');
    const existingQuery = query(
      filesCollection,
      where('ownerId', '==', input.userId),
      where('fileHash', '==', input.fileHash)
    );
    const existingSnapshot = await getDocs(existingQuery);

    if (!existingSnapshot.empty) {
      return;
    }

    await addDoc(filesCollection, payload);
  } catch (error) {
    console.error('Error writing file metadata to Firestore:', error);
    throw new Error('Failed to save file metadata. Please try again.');
  }
}
