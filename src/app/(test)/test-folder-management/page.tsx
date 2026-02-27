'use client';

import { Timestamp } from 'firebase/firestore';
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { authenticatedFetch } from '@/lib/authenticatedFetch';
import { ConfirmationModal } from '@/components/ui/confirmation-modal';

interface Folder {
  id: string;
  ownerId: string;
  name: string;
  parentFolderId: string | null;
  path: string[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

interface File {
  id: string;
  originalName: string;
  folderId: string | null;
  mimeType: string;
  fileSize: number;
  uploadedAt: Timestamp;
}

export default function FolderManagementPage() {
  const { user } = useAuth();
  const [folders, setFolders] = useState<Folder[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [breadcrumb, setBreadcrumb] = useState<string[]>(['Root']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Modal states
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [renameTarget, setRenameTarget] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [folderToDelete, setFolderToDelete] = useState<string | null>(null);

  // Fetch current folder contents
  const loadFolderContents = async (folderId: string | null) => {
    setLoading(true);
    setError('');
    try {
      const action = folderId ? 'get-files' : 'get-root-files';
      const url = new URL('/api/folders', window.location.origin);
      url.searchParams.set('action', action);
      if (folderId) url.searchParams.set('folderId', folderId);

      const response = await authenticatedFetch(url.toString());
      if (!response.ok) throw new Error('Failed to load files');
      const data = await response.json();
      setFiles(data.files);

      // Load breadcrumb
      if (folderId) {
        const breadcrumbUrl = new URL('/api/folders', window.location.origin);
        breadcrumbUrl.searchParams.set('action', 'get-breadcrumb');
        breadcrumbUrl.searchParams.set('folderId', folderId);
        const breadcrumbResp = await authenticatedFetch(breadcrumbUrl.toString());
        if (breadcrumbResp.ok) {
          const breadcrumbData = await breadcrumbResp.json();
          setBreadcrumb(breadcrumbData.path);
        }
      } else {
        setBreadcrumb(['Root']);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading folder');
    } finally {
      setLoading(false);
    }
  };

  // Fetch all folders for sidebar
  const loadFolders = async () => {
    try {
      const url = new URL('/api/folders', window.location.origin);
      url.searchParams.set('action', 'get-all');

      const response = await authenticatedFetch(url.toString());
      if (!response.ok) throw new Error('Failed to load folders');
      const data = await response.json();
      setFolders(data.folders);
    } catch (err) {
      console.error('Error loading folders:', err);
    }
  };

  useEffect(() => {
    loadFolders();
    loadFolderContents(null);
  }, []);

  // Create folder
  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;

    setLoading(true);
    setError('');
    try {
      const response = await authenticatedFetch('/api/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create-folder',
          name: newFolderName,
          parentFolderId: currentFolderId,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error);
      }

      setNewFolderName('');
      setShowCreateFolder(false);
      await loadFolders();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create folder');
    } finally {
      setLoading(false);
    }
  };

  // Delete folder
  const handleDeleteFolder = (folderId: string) => {
    setFolderToDelete(folderId);
  };

  const processDeleteFolder = async () => {
    if (!folderToDelete) return;

    setLoading(true);
    setError('');
    try {
      const url = new URL('/api/folders', window.location.origin);
      url.searchParams.set('folderId', folderToDelete);

      const response = await authenticatedFetch(url.toString(), { method: 'DELETE' });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error);
      }

      await loadFolders();
      if (currentFolderId === folderToDelete) {
        setCurrentFolderId(null);
        await loadFolderContents(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete folder');
    } finally {
      setLoading(false);
      setFolderToDelete(null);
    }
  };

  // Rename folder
  const handleRenameFolder = async (folderId: string) => {
    if (!renameValue.trim()) return;

    setLoading(true);
    setError('');
    try {
      const response = await authenticatedFetch('/api/folders', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'rename-folder',
          folderId,
          name: renameValue,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error);
      }

      setRenameTarget(null);
      setRenameValue('');
      await loadFolders();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to rename folder');
    } finally {
      setLoading(false);
    }
  };

  // Move files
  const handleMoveFiles = async (targetFolderId: string | null) => {
    if (selectedFiles.size === 0) return;

    setLoading(true);
    setError('');
    try {
      const response = await authenticatedFetch('/api/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'move-files',
          fileIds: Array.from(selectedFiles),
          folderId: targetFolderId,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error);
      }

      setSelectedFiles(new Set());
      await loadFolderContents(currentFolderId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to move files');
    } finally {
      setLoading(false);
    }
  };

  // Navigate to folder
  const navigateToFolder = async (folderId: string | null) => {
    setCurrentFolderId(folderId);
    await loadFolderContents(folderId);
  };

  // Get subfolders for current folder
  const currentSubfolders = folders.filter((f) => f.parentFolderId === currentFolderId);

  // Helper to format file size
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="flex min-h-screen bg-zinc-50 dark:bg-black">
      {/* Sidebar */}
      <div className="w-64 bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 p-4 overflow-y-auto">
        <h2 className="text-lg font-bold text-black dark:text-white mb-4">📁 Folders</h2>

        <div className="space-y-2">
          {/* Root folder */}
          <button
            onClick={() => navigateToFolder(null)}
            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
              currentFolderId === null
                ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                : 'hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
            }`}
          >
            📁 Root
          </button>

          {/* All folders tree */}
          {folders.length === 0 ? (
            <p className="text-xs text-zinc-500 px-3 py-2">No folders yet</p>
          ) : (
            folders
              .filter((f) => f.parentFolderId === null)
              .map((folder) => (
                <FolderTreeItem
                  key={folder.id}
                  folder={folder}
                  allFolders={folders}
                  currentFolderId={currentFolderId}
                  onNavigate={navigateToFolder}
                  onDelete={handleDeleteFolder}
                  onRename={(folderId) => {
                    setRenameTarget(folderId);
                    setRenameValue(folder.name);
                  }}
                  isRenaming={renameTarget === folder.id}
                  renameValue={renameValue}
                  onRenameChange={setRenameValue}
                  onRenameSave={() => handleRenameFolder(folder.id)}
                  onRenameCancel={() => setRenameTarget(null)}
                />
              ))
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-black dark:text-white mb-2">File Manager</h1>
            <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
              {breadcrumb.map((name, i) => (
                <div key={i} className="flex items-center gap-2">
                  {i > 0 && <span>/</span>}
                  <span>{name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-4 p-4 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded-lg">
              {error}
            </div>
          )}

          {/* Toolbar */}
          <div className="mb-6 flex gap-3">
            <button
              onClick={() => setShowCreateFolder(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              disabled={loading}
            >
              ➕ New Folder
            </button>

            {selectedFiles.size > 0 && (
              <>
                <button
                  onClick={() => handleMoveFiles(null)}
                  className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors disabled:opacity-50"
                  disabled={loading}
                >
                  📤 Move to Root ({selectedFiles.size})
                </button>

                {currentSubfolders.length > 0 && (
                  <div className="flex gap-2">
                    {currentSubfolders.map((folder) => (
                      <button
                        key={folder.id}
                        onClick={() => handleMoveFiles(folder.id)}
                        className="px-3 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                        disabled={loading}
                      >
                        → {folder.name}
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Current folder subfolders */}
          {currentSubfolders.length > 0 && (
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-black dark:text-white mb-4">📁 Subfolders</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {currentSubfolders.map((folder) => (
                  <div
                    key={folder.id}
                    className="p-4 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:shadow-lg transition-shadow cursor-pointer"
                    onClick={() => navigateToFolder(folder.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-semibold text-black dark:text-white text-lg">📁 {folder.name}</h4>
                        <p className="text-xs text-zinc-500 mt-1">{folder.path.length} levels deep</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setRenameTarget(folder.id);
                            setRenameValue(folder.name);
                          }}
                          className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded text-sm"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteFolder(folder.id);
                          }}
                          className="p-1 hover:bg-red-100 dark:hover:bg-red-900 rounded text-sm"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>

                    {renameTarget === folder.id && (
                      <div className="mt-3 flex gap-2">
                        <input
                          type="text"
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          className="flex-1 px-2 py-1 text-sm border border-zinc-300 dark:border-zinc-700 rounded dark:bg-zinc-800 dark:text-white"
                          autoFocus
                        />
                        <button
                          onClick={() => handleRenameFolder(folder.id)}
                          className="px-2 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
                        >
                          ✓
                        </button>
                        <button
                          onClick={() => setRenameTarget(null)}
                          className="px-2 py-1 text-sm bg-zinc-400 text-white rounded hover:bg-zinc-500"
                        >
                          ✕
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Files */}
          <div>
            <h3 className="text-lg font-semibold text-black dark:text-white mb-4">
              📄 Files ({files.length})
            </h3>
            {files.length === 0 ? (
              <p className="text-zinc-500 dark:text-zinc-400">No files in this folder</p>
            ) : (
              <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 overflow-hidden">
                <table className="w-full">
                  <thead className="bg-zinc-50 dark:bg-zinc-800 border-b border-zinc-200 dark:border-zinc-700">
                    <tr>
                      <th className="px-6 py-3 text-left">
                        <input
                          type="checkbox"
                          checked={selectedFiles.size === files.length && files.length > 0}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedFiles(new Set(files.map((f) => f.id)));
                            } else {
                              setSelectedFiles(new Set());
                            }
                          }}
                          className="rounded"
                        />
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                        Name
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                        Size
                      </th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                        Type
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                    {files.map((file) => (
                      <tr
                        key={file.id}
                        className="hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                      >
                        <td className="px-6 py-3">
                          <input
                            type="checkbox"
                            checked={selectedFiles.has(file.id)}
                            onChange={(e) => {
                              const newSelected = new Set(selectedFiles);
                              if (e.target.checked) {
                                newSelected.add(file.id);
                              } else {
                                newSelected.delete(file.id);
                              }
                              setSelectedFiles(newSelected);
                            }}
                            className="rounded"
                          />
                        </td>
                        <td className="px-6 py-3 text-sm text-black dark:text-white">
                          {file.originalName}
                        </td>
                        <td className="px-6 py-3 text-sm text-zinc-600 dark:text-zinc-400">
                          {formatFileSize(file.fileSize)}
                        </td>
                        <td className="px-6 py-3 text-sm text-zinc-600 dark:text-zinc-400">
                          {file.mimeType}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create Folder Modal */}
      {showCreateFolder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-zinc-900 rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-bold text-black dark:text-white mb-4">Create New Folder</h2>
            <input
              type="text"
              placeholder="Folder name"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg dark:bg-zinc-800 dark:text-white mb-4"
              autoFocus
              onKeyPress={(e) => e.key === 'Enter' && handleCreateFolder()}
            />
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowCreateFolder(false);
                  setNewFolderName('');
                }}
                className="px-4 py-2 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateFolder}
                disabled={!newFolderName.trim() || loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmationModal
        isOpen={!!folderToDelete}
        onOpenChange={(open) => !open && setFolderToDelete(null)}
        title="Delete Folder"
        message="Are you sure you want to delete this folder?"
        confirmText="Delete"
        variant="destructive"
        onConfirm={processDeleteFolder}
        onCancel={() => setFolderToDelete(null)}
      />
    </div>
  );
}

// Tree item component for recursive folder display
function FolderTreeItem({
  folder,
  allFolders,
  currentFolderId,
  onNavigate,
  onDelete,
  onRename,
  isRenaming,
  renameValue,
  onRenameChange,
  onRenameSave,
  onRenameCancel,
  level = 0,
}: {
  folder: Folder;
  allFolders: Folder[];
  currentFolderId: string | null;
  onNavigate: (folderId: string) => void;
  onDelete: (folderId: string) => void;
  onRename: (folderId: string) => void;
  isRenaming: boolean;
  renameValue: string;
  onRenameChange: (value: string) => void;
  onRenameSave: (folderId: string) => void;
  onRenameCancel: () => void;
  level?: number;
}) {
  const subfolders = allFolders.filter((f) => f.parentFolderId === folder.id);

  return (
    <div>
      <div
        style={{ paddingLeft: `${level * 12}px` }}
        className={`flex items-center justify-between px-2 py-1 rounded text-sm transition-colors ${
          currentFolderId === folder.id
            ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
            : 'hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
        }`}
      >
        <button
          onClick={() => onNavigate(folder.id)}
          className="flex-1 text-left truncate"
        >
          📁 {folder.name}
        </button>
        <div className="flex gap-1">
          <button
            onClick={() => onRename(folder.id)}
            className="p-0.5 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded text-xs"
          >
            ✏️
          </button>
          <button
            onClick={() => onDelete(folder.id)}
            className="p-0.5 hover:bg-red-200 dark:hover:bg-red-900 rounded text-xs"
          >
            🗑️
          </button>
        </div>
      </div>

      {isRenaming && (
        <div style={{ paddingLeft: `${level * 12 + 8}px` }} className="flex gap-1 py-1">
          <input
            type="text"
            value={renameValue}
            onChange={(e) => onRenameChange(e.target.value)}
            className="flex-1 px-2 py-0.5 text-xs border border-zinc-300 dark:border-zinc-700 rounded dark:bg-zinc-800 dark:text-white"
            autoFocus
          />
          <button
            onClick={() => onRenameSave(folder.id)}
            className="px-1.5 text-xs bg-green-600 text-white rounded hover:bg-green-700"
          >
            ✓
          </button>
          <button
            onClick={onRenameCancel}
            className="px-1.5 text-xs bg-zinc-400 text-white rounded hover:bg-zinc-500"
          >
            ✕
          </button>
        </div>
      )}

      {subfolders.map((subfolder) => (
        <FolderTreeItem
          key={subfolder.id}
          folder={subfolder}
          allFolders={allFolders}
          currentFolderId={currentFolderId}
          onNavigate={onNavigate}
          onDelete={onDelete}
          onRename={onRename}
          isRenaming={isRenaming}
          renameValue={renameValue}
          onRenameChange={onRenameChange}
          onRenameSave={onRenameSave}
          onRenameCancel={onRenameCancel}
          level={level + 1}
        />
      ))}
    </div>
  );
}
