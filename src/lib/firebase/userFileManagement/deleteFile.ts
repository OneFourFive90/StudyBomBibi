import { deleteDoc, doc, Timestamp } from 'firebase/firestore';
import { deleteObject, ref } from 'firebase/storage';
import { db, storage } from '../firebase';

export interface FirestoreFile {
  id: string;
  ownerId: string;
  originalName: string;
  fileHash: string;
  storagePath: string;
  downloadURL: string;
  mimeType: string;
  fileSize: number;
  uploadedAt: Timestamp;
  folderId: string | null;
  tags: string[];
  category: string;
  extractedText: string;
  vectorEmbedding: number[];
}

/**
 * Delete a file from both Firestore and Firebase Storage
 */
export async function deleteFile(fileId: string, storagePath: string): Promise<void> {
  try {
    // Delete from Firestore
    await deleteDoc(doc(db, 'files', fileId));
    
    // Delete from Storage
    const storageRef = ref(storage, storagePath);
    await deleteObject(storageRef);
  } catch (error) {
    console.error('Error deleting file:', error);
    throw new Error('Failed to delete file');
  }
}