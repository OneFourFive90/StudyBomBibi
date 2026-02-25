import { NextResponse } from 'next/server';
import {
  createFolder,
  updateFolderName,
  moveFolderToParent,
  getUserFolders,
  getRootFolders,
  getSubfolders,
  getFolderBreadcrumb,
  deleteFolderRecursively,
} from '@/lib/firebase/firestore/folderManagement';
import {
  moveFileToFolder,
  moveFilesToFolder,
  updateFileName,
  deleteFileById,
  getFilesByFolder,
  getRootFiles,
  deleteFilesInFolderRecursively,
} from '@/lib/firebase/userFileManagement/fileFolderManagement';

/**
 * GET: Fetch folders or files
 * Query params:
 *   - action: 'get-all' | 'get-root' | 'get-subfolders' | 'get-files' | 'get-breadcrumb'
 *   - userId: required
 *   - folderId: required for get-subfolders, get-files, get-breadcrumb
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');
    const userId = searchParams.get('userId') as string;
    const folderId = searchParams.get('folderId') as string | null;

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    switch (action) {
      case 'get-all':
        const allFolders = await getUserFolders(userId);
        return NextResponse.json({ folders: allFolders });

      case 'get-root':
        const rootFolders = await getRootFolders(userId);
        return NextResponse.json({ folders: rootFolders });

      case 'get-subfolders':
        if (!folderId) {
          return NextResponse.json(
            { error: 'folderId is required for this action' },
            { status: 400 }
          );
        }
        const subfolders = await getSubfolders(folderId, userId);
        return NextResponse.json({ folders: subfolders });

      case 'get-files':
        const files = await getFilesByFolder(folderId || null, userId);
        return NextResponse.json({ files });

      case 'get-root-files':
        const rootFiles = await getRootFiles(userId);
        return NextResponse.json({ files: rootFiles });

      case 'get-breadcrumb':
        if (!folderId) {
          return NextResponse.json(
            { error: 'folderId is required for this action' },
            { status: 400 }
          );
        }
        const breadcrumb = await getFolderBreadcrumb(folderId, userId);
        return NextResponse.json({ path: breadcrumb });

      default:
        return NextResponse.json(
          { error: 'Invalid action parameter' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Folder GET error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch folders' },
      { status: 500 }
    );
  }
}

/**
 * POST: Create folder or move files
 * Body:
 *   - action: 'create-folder' | 'move-file' | 'move-files'
 *   - userId: required
 *   - For create-folder: name, parentFolderId (optional)
 *   - For move-file: fileId, folderId (null for root)
 *   - For move-files: fileIds (array), folderId (null for root)
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, userId } = body;

    if (!userId || !action) {
      return NextResponse.json(
        { error: 'userId and action are required' },
        { status: 400 }
      );
    }

    switch (action) {
      case 'create-folder': {
        const { name, parentFolderId } = body;
        if (!name) {
          return NextResponse.json(
            { error: 'name is required' },
            { status: 400 }
          );
        }
        const folder = await createFolder({
          ownerId: userId,
          name,
          parentFolderId: parentFolderId || null,
        });
        return NextResponse.json(
          { success: true, folder },
          { status: 201 }
        );
      }

      case 'move-file': {
        const { fileId, folderId } = body;
        if (!fileId) {
          return NextResponse.json(
            { error: 'fileId is required' },
            { status: 400 }
          );
        }
        await moveFileToFolder(fileId, folderId || null, userId);
        return NextResponse.json({ success: true });
      }

      case 'move-files': {
        const { fileIds, folderId } = body;
        if (!Array.isArray(fileIds) || fileIds.length === 0) {
          return NextResponse.json(
            { error: 'fileIds array is required and must not be empty' },
            { status: 400 }
          );
        }
        await moveFilesToFolder(fileIds, folderId || null, userId);
        return NextResponse.json({
          success: true,
          movedCount: fileIds.length,
        });
      }

      case 'delete-file': {
        const { fileId } = body;
        if (!fileId) {
          return NextResponse.json(
            { error: 'fileId is required' },
            { status: 400 }
          );
        }
        await deleteFileById(fileId, userId);
        return NextResponse.json({ success: true });
      }

      default:
        return NextResponse.json(
          { error: 'Invalid action parameter' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Folder POST error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process request' },
      { status: 500 }
    );
  }
}

/**
 * PUT: Update folder
 * Body:
 *   - action: 'rename-folder' | 'move-folder' | 'rename-file'
 *   - userId: required
 *   - folderId: required for rename-folder and move-folder
 *   - fileId: required for rename-file
 *   - For rename-folder: name
 *   - For rename-file: name
 *   - For move-folder: parentFolderId (can be null for root)
 */
export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { action, userId, folderId, fileId } = body;

    if (!userId || !action) {
      return NextResponse.json(
        { error: 'userId and action are required' },
        { status: 400 }
      );
    }

    switch (action) {
      case 'rename-folder': {
        if (!folderId) {
          return NextResponse.json(
            { error: 'folderId is required' },
            { status: 400 }
          );
        }

        const { name } = body;
        if (!name) {
          return NextResponse.json(
            { error: 'name is required' },
            { status: 400 }
          );
        }
        await updateFolderName(folderId, userId, name);
        return NextResponse.json({ success: true });
      }

      case 'move-folder': {
        if (!folderId) {
          return NextResponse.json(
            { error: 'folderId is required' },
            { status: 400 }
          );
        }

        const { parentFolderId } = body;
        await moveFolderToParent(folderId, userId, parentFolderId || null);
        return NextResponse.json({ success: true });
      }

      case 'rename-file': {
        const { name } = body;
        if (!fileId) {
          return NextResponse.json(
            { error: 'fileId is required' },
            { status: 400 }
          );
        }

        if (!name) {
          return NextResponse.json(
            { error: 'name is required' },
            { status: 400 }
          );
        }

        await updateFileName(fileId, userId, name);
        return NextResponse.json({ success: true });
      }

      default:
        return NextResponse.json(
          { error: 'Invalid action parameter' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Folder PUT error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update folder' },
      { status: 500 }
    );
  }
}

/**
 * DELETE: Delete folder
 * Query params:
 *   - userId: required
 *   - folderId: required
 * Will recursively delete all nested subfolders and their files.
 */
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId') as string;
    const folderId = searchParams.get('folderId') as string;

    if (!userId || !folderId) {
      return NextResponse.json(
        { error: 'userId and folderId are required' },
        { status: 400 }
      );
    }

    // Delete all files (recursively in nested folders)
    const deletedFilesCount = await deleteFilesInFolderRecursively(folderId, userId);

    // Delete all folders (recursively)
    const deletedFoldersCount = await deleteFolderRecursively(folderId, userId);

    return NextResponse.json({
      success: true,
      deletedFilesCount,
      deletedFoldersCount,
    });
  } catch (error) {
    console.error('Folder DELETE error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete folder' },
      { status: 500 }
    );
  }
}
/*
Complete REST API for folder & file operations:

**GET** - Fetch folders/files:
```
/api/folders?action=get-all&userId=user123
/api/folders?action=get-root&userId=user123
/api/folders?action=get-subfolders&userId=user123&folderId=folder123
/api/folders?action=get-files&userId=user123&folderId=folder123 (or null for root)
/api/folders?action=get-breadcrumb&userId=user123&folderId=folder123
```

**POST** - Create folder or move files:
```json
{ "action": "create-folder", "userId": "...", "name": "Biology", "parentFolderId": "optional" }
{ "action": "move-file", "userId": "...", "fileId": "...", "folderId": "null-or-id" }
{ "action": "move-files", "userId": "...", "fileIds": [...], "folderId": "null-or-id" }
```

**PUT** - Update folder:
```json
{ "action": "rename-folder", "userId": "...", "folderId": "...", "name": "NewName" }
{ "action": "move-folder", "userId": "...", "folderId": "...", "parentFolderId": "null-or-id" }
{ "action": "rename-file", "userId": "...", "fileId": "...", "name": "NewFileName.pdf" }
```

**DELETE** - Delete folder:
```
/api/folders?userId=user123&folderId=folder123
```
*/