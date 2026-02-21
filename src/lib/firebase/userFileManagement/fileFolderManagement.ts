/*
functions for managing file-folder relationships
*/
import {
  collection,
  doc,
  updateDoc,
  query,
  where,
  getDocs,
  Timestamp,
  getDoc,
} from 'firebase/firestore';
import { db } from '../firebase';
import { getFolder, getSubfolders } from '../firestore/folderManagement';
import { deleteFile } from './deleteFile';

interface FileDocument {
  id: string;
  ownerId: string;
  folderId: string | null;
  [key: string]: unknown;
}

/**
 * Move a file to a different folder
 * @param fileId - The ID of the file to move
 * @param folderId - The target folder ID (null to move to root)
 * @param ownerId - The owner's user ID for validation
 */
export async function moveFileToFolder(
  fileId: string,
  folderId: string | null,
  ownerId: string
): Promise<void> {
  // Get the file to validate it exists and belongs to user
  const fileRef = doc(db, 'files', fileId);
  const fileDoc = await getDoc(fileRef);

  if (!fileDoc.exists()) {
    throw new Error('File not found');
  }

  const fileData = fileDoc.data();
  if (fileData.ownerId !== ownerId) {
    throw new Error('Unauthorized: File does not belong to this user');
  }

  // Validate target folder exists if provided
  if (folderId) {
    const folder = await getFolder(folderId, ownerId);
    if (!folder) {
      throw new Error('Target folder not found or does not belong to this user');
    }
  }

  // Update file with new folder
  await updateDoc(fileRef, {
    folderId: folderId || null,
    updatedAt: Timestamp.now(),
  });
}

/**
 * Move multiple files to a folder
 */
export async function moveFilesToFolder(
  fileIds: string[],
  folderId: string | null,
  ownerId: string
): Promise<void> {
  const promises = fileIds.map((fileId) =>
    moveFileToFolder(fileId, folderId, ownerId)
  );
  await Promise.all(promises);
}

/**
 * Get all files in a specific folder
 */
export async function getFilesByFolder(
  folderId: string | null,
  ownerId: string
): Promise<FileDocument[]> {
  if (folderId) {
    // Validate folder belongs to user
    const folder = await getFolder(folderId, ownerId);
    if (!folder) {
      throw new Error('Folder not found or does not belong to this user');
    }
  }

  const filesQuery = query(
    collection(db, 'files'),
    where('ownerId', '==', ownerId),
    where('folderId', '==', folderId || null)
  );

  const querySnapshot = await getDocs(filesQuery);
  return querySnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as FileDocument[];
}

/**
 * Get all root-level files (no folder assigned)
 */
export async function getRootFiles(ownerId: string): Promise<FileDocument[]> {
  return getFilesByFolder(null, ownerId);
}

/**
 * Delete all files in a folder (bulk delete)
 * Deletes from both Firestore and Firebase Storage
 * @returns Number of files deleted
 */
export async function deleteFilesInFolder(
  folderId: string,
  ownerId: string
): Promise<number> {
  const files = await getFilesByFolder(folderId, ownerId);

  if (files.length === 0) return 0;

  // Delete each file from Storage and Firestore
  await Promise.all(
    files.map((file) =>
      deleteFile(
        file.id,
        file.storagePath as string
      ).catch((error) => {
        console.warn(`Failed to delete file ${file.id}:`, error);
        // Continue with other files even if one fails
      })
    )
  );

  return files.length;
}

/**
 * Delete all files in a folder and all nested subfolders recursively
 * @returns Total number of files deleted
 */
export async function deleteFilesInFolderRecursively(
  folderId: string,
  ownerId: string
): Promise<number> {
  let totalDeleted = 0;

  // Delete files in current folder
  totalDeleted += await deleteFilesInFolder(folderId, ownerId);

  // Get all subfolders
  const subfolders = await getSubfolders(folderId, ownerId);

  // Recursively delete files in all subfolders
  for (const subfolder of subfolders) {
    totalDeleted += await deleteFilesInFolderRecursively(subfolder.id, ownerId);
  }

  return totalDeleted;
}

/**
 * Check if a file exists in a specific folder
 */
export async function fileExistsInFolder(
  fileId: string,
  folderId: string | null,
  ownerId: string
): Promise<boolean> {
  const files = await getFilesByFolder(folderId, ownerId);
  return files.some((file) => file.id === fileId);
}

/**
 * Get folder path for breadcrumb display
 */
export async function getFileFolder(fileId: string, ownerId: string): Promise<string[] | null> {
  const db_import = await import('../firebase');
  const db = db_import.db;

  const fileRef = doc(db, 'files', fileId);
  const fileDoc = await getDoc(fileRef);

  if (!fileDoc.exists()) {
    throw new Error('File not found');
  }

  const fileData = fileDoc.data();
  if (fileData.ownerId !== ownerId) {
    throw new Error('Unauthorized: File does not belong to this user');
  }

  if (!fileData.folderId) {
    return null; // In root
  }

  const folder = await getFolder(fileData.folderId, ownerId);
  return folder?.path || null;
}
