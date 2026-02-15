/*
Read files feature should be:
- Get all files for a user from Firestore
- Get files by MIME type category (PDFs, images, text)
- UI can view the file by accessing to the downloadURL stored in Firestore metadata, instead of fetching from Storage directly
*/
import { collection, query, where, getDocs, doc, getDoc, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';

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
 * Get all files for a user from Firestore
 */
export async function getUserFiles(userId: string): Promise<FirestoreFile[]> {
  try {
    const filesRef = collection(db, 'files');
    const q = query(filesRef, where('ownerId', '==', userId));
    const querySnapshot = await getDocs(q);
    
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as FirestoreFile));
  } catch (error) {
    console.error('Error fetching user files:', error);
    throw new Error('Failed to fetch files');
  }
}

/**
 * Get a specific file by its ID
 */
export async function getFileById(fileId: string): Promise<FirestoreFile | null> {
  try {
    const fileRef = doc(db, 'files', fileId);
    const fileSnap = await getDoc(fileRef);
    
    if (fileSnap.exists()) {
      return {
        id: fileSnap.id,
        ...fileSnap.data()
      } as FirestoreFile;
    } else {
      return null;
    }
  } catch (error) {
    console.error('Error fetching file by ID:', error);
    throw new Error('Failed to fetch file');
  }
}

/**
 * Get files by MIME type category
 */
export async function getUserFilesByType(userId: string, type: 'pdf' | 'image' | 'text'): Promise<FirestoreFile[]> {
  const allFiles = await getUserFiles(userId);
  
  switch (type) {
    case 'pdf':
      return allFiles.filter(file => file.mimeType === 'application/pdf');
    case 'image':
      return allFiles.filter(file => file.mimeType.startsWith('image/'));
    case 'text':
      return allFiles.filter(file => 
        file.mimeType.startsWith('text/') || 
        file.mimeType === 'text/plain' ||
        file.mimeType === 'text/markdown' ||
        file.mimeType === 'text/csv'
      );
    default:
      return [];
  }
}

/**
 * Get storage statistics for a user based on Firestore metadata
 */
export async function getUserStorageStatsFromFirestore(userId: string): Promise<{
  totalFiles: number;
  totalSize: number;
  pdfCount: number;
  imageCount: number;
  textCount: number;
}> {
  try {
    const files = await getUserFiles(userId);
    
    const pdfs = files.filter(f => f.mimeType === 'application/pdf');
    const images = files.filter(f => f.mimeType.startsWith('image/'));
    const textFiles = files.filter(f => f.mimeType.startsWith('text/'));
    
    const totalSize = files.reduce((acc, file) => acc + (file.fileSize || 0), 0);
    
    return {
      totalFiles: files.length,
      totalSize,
      pdfCount: pdfs.length,
      imageCount: images.length,
      textCount: textFiles.length,
    };
  } catch (error) {
    console.error('Error getting storage stats:', error);
    return {
      totalFiles: 0,
      totalSize: 0,
      pdfCount: 0,
      imageCount: 0,
      textCount: 0,
    };
  }
}