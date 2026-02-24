/*
Firestore folder collection management functions: 
create folder, get folder, update folder name, move folder, delete folder, get user folders, get root folders, get subfolders, get folder breadcrumb
 */
import {
  collection,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  getDocs,
  writeBatch,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../firebase';

export interface Folder {
  id: string;
  ownerId: string;
  name: string;
  parentFolderId: string | null;
  path: string[]; // ["Root", "Sem 1", "Biology"]
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface CreateFolderInput {
  ownerId: string;
  name: string;
  parentFolderId?: string | null;
}

/**
 * Create a new folder
 * Automatically calculates the breadcrumb path based on parent folder
 */
export async function createFolder(input: CreateFolderInput): Promise<Folder> {
  const { ownerId, name, parentFolderId = null } = input;

  // Validate parent folder exists if provided
  let parentPath: string[] = [];
  if (parentFolderId) {
    const parentFolder = await getFolder(parentFolderId, ownerId);
    if (!parentFolder) {
      throw new Error('Parent folder not found or does not belong to this user');
    }
    parentPath = parentFolder.path;
  }

  // Calculate full path
  const path = [...parentPath, name];

  // Create folder document
  const folderRef = doc(collection(db, 'folders'));
  const newFolder: Folder = {
    id: folderRef.id,
    ownerId,
    name,
    parentFolderId: parentFolderId || null,
    path,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  };

  await setDoc(folderRef, newFolder);
  return newFolder;
}

/**
 * Get a folder by ID with ownership validation
 */
export async function getFolder(
  folderId: string,
  ownerId: string
): Promise<Folder | null> {
  const folderRef = doc(db, 'folders', folderId);
  const folderDoc = await getDoc(folderRef);

  if (!folderDoc.exists()) {
    return null;
  }

  const folder = folderDoc.data() as Folder;
  if (folder.ownerId !== ownerId) {
    throw new Error('Unauthorized: Folder does not belong to this user');
  }

  return folder;
}

/**
 * Update folder name
 */
export async function updateFolderName(
  folderId: string,
  ownerId: string,
  newName: string
): Promise<void> {
  const folder = await getFolder(folderId, ownerId);
  if (!folder) {
    throw new Error('Folder not found');
  }

  // Update the name in path
  const newPath = [...folder.path.slice(0, -1), newName];

  const folderRef = doc(db, 'folders', folderId);
  await updateDoc(folderRef, {
    name: newName,
    path: newPath,
    updatedAt: Timestamp.now(),
  });

  // Update all child folders' paths
  await updateChildFolderPaths(folderId, ownerId, newPath);
}

/**
 * Move folder to a different parent
 */
export async function moveFolderToParent(
  folderId: string,
  ownerId: string,
  newParentFolderId: string | null
): Promise<void> {
  const folder = await getFolder(folderId, ownerId);
  if (!folder) {
    throw new Error('Folder not found');
  }

  // Validate new parent exists if provided
  let newParentPath: string[] = [];
  if (newParentFolderId) {
    const newParent = await getFolder(newParentFolderId, ownerId);
    if (!newParent) {
      throw new Error('New parent folder not found');
    }
    newParentPath = newParent.path;
  }

  // Check for circular reference
  if (newParentFolderId === folderId) {
    throw new Error('Cannot move folder to itself');
  }

  // Calculate new path
  const newPath = [...newParentPath, folder.name];

  const folderRef = doc(db, 'folders', folderId);
  await updateDoc(folderRef, {
    parentFolderId: newParentFolderId || null,
    path: newPath,
    updatedAt: Timestamp.now(),
  });

  // Update all child folders' paths
  await updateChildFolderPaths(folderId, ownerId, newPath);
}

/**
 * Delete a folder (requires it to be empty)
 */
export async function deleteFolder(
  folderId: string,
  ownerId: string
): Promise<void> {
  const folder = await getFolder(folderId, ownerId);
  if (!folder) {
    throw new Error('Folder not found');
  }

  // Check if folder has any files
  const filesQuery = query(
    collection(db, 'files'),
    where('ownerId', '==', ownerId),
    where('folderId', '==', folderId)
  );
  const files = await getDocs(filesQuery);

  if (files.size > 0) {
    throw new Error(
      `Cannot delete folder with ${files.size} file(s). Please move or delete files first.`
    );
  }

  // Check if folder has any subfolders
  const subfolderQuery = query(
    collection(db, 'folders'),
    where('ownerId', '==', ownerId),
    where('parentFolderId', '==', folderId)
  );
  const subfolders = await getDocs(subfolderQuery);

  if (subfolders.size > 0) {
    throw new Error(
      `Cannot delete folder with ${subfolders.size} subfolder(s). Please delete subfolders first.`
    );
  }

  const folderRef = doc(db, 'folders', folderId);
  await deleteDoc(folderRef);
}

/**
 * Delete folder recursively with all nested subfolders
 * IMPORTANT: Call deleteFilesInFolder first to clean up files!
 * This only deletes folder documents and their nested structure
 */
export async function deleteFolderRecursively(
  folderId: string,
  ownerId: string
): Promise<number> {
  let deletedCount = 0;

  // Get all subfolders
  const subfolderQuery = query(
    collection(db, 'folders'),
    where('ownerId', '==', ownerId),
    where('parentFolderId', '==', folderId)
  );
  const subfolders = await getDocs(subfolderQuery);

  // Recursively delete all subfolders first
  for (const subfolder of subfolders.docs) {
    const subfolderData = subfolder.data() as Folder;
    deletedCount += await deleteFolderRecursively(subfolderData.id, ownerId);
  }

  // Delete the folder itself
  const folderRef = doc(db, 'folders', folderId);
  await deleteDoc(folderRef);
  deletedCount++;

  return deletedCount;
}

/**
 * Get all folders for a user (for tree view/select)
 */
export async function getUserFolders(ownerId: string): Promise<Folder[]> {
  const foldersQuery = query(
    collection(db, 'folders'),
    where('ownerId', '==', ownerId)
  );
  const querySnapshot = await getDocs(foldersQuery);

  return querySnapshot.docs.map((doc) => doc.data() as Folder);
}

/**
 * Get root-level folders (parentFolderId is null)
 */
export async function getRootFolders(ownerId: string): Promise<Folder[]> {
  const foldersQuery = query(
    collection(db, 'folders'),
    where('ownerId', '==', ownerId),
    where('parentFolderId', '==', null)
  );
  const querySnapshot = await getDocs(foldersQuery);

  return querySnapshot.docs.map((doc) => doc.data() as Folder);
}

/**
 * Get subfolders of a specific folder
 */
export async function getSubfolders(
  parentFolderId: string,
  ownerId: string
): Promise<Folder[]> {
  const subfolderQuery = query(
    collection(db, 'folders'),
    where('ownerId', '==', ownerId),
    where('parentFolderId', '==', parentFolderId)
  );
  const querySnapshot = await getDocs(subfolderQuery);

  return querySnapshot.docs.map((doc) => doc.data() as Folder);
}

/**
 * Get breadcrumb path for a folder
 * Returns: ["Root", "Sem 1", "Biology"]
 */
export async function getFolderBreadcrumb(
  folderId: string,
  ownerId: string
): Promise<string[]> {
  const folder = await getFolder(folderId, ownerId);
  if (!folder) {
    throw new Error('Folder not found');
  }
  return folder.path;
}

/**
 * Internal: Update all child folders when parent path changes
 */
async function updateChildFolderPaths(
  parentFolderId: string,
  ownerId: string,
  newParentPath: string[]
): Promise<void> {
  const subfolders = await getSubfolders(parentFolderId, ownerId);

  if (subfolders.length === 0) return;

  const batch = writeBatch(db);

  for (const subfolder of subfolders) {
    const newPath = [...newParentPath, subfolder.name];
    const folderRef = doc(db, 'folders', subfolder.id);
    batch.update(folderRef, {
      path: newPath,
      updatedAt: Timestamp.now(),
    });
  }

  await batch.commit();

  // Recursively update nested children
  for (const subfolder of subfolders) {
    await updateChildFolderPaths(subfolder.id, ownerId, [...newParentPath, subfolder.name]);
  }
}
