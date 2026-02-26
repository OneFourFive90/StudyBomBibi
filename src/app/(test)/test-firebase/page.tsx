'use client';

import { useEffect, useState } from 'react';
import { db } from '@/lib/firebase/firebase';
import { collection, getDocs } from 'firebase/firestore';
import {
  getUserFilesByType,
  getUserStorageStatsFromFirestore,
  FirestoreFile,
} from '@/lib/firebase/userFileManagement/readFiles';
import { deleteFile } from '@/lib/firebase/userFileManagement/deleteFile';

// Temporary test user ID (replace with actual auth user ID in production)
const TEST_USER_ID = 'test-user-123';

type FileType = 'pdf' | 'image' | 'document';

export default function FirebaseTestPage() {
  const [firestoreStatus, setFirestoreStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [firestoreMessage, setFirestoreMessage] = useState('');
  const [storageStatus, setStorageStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [storageMessage, setStorageMessage] = useState('');
  const [pdfs, setPdfs] = useState<FirestoreFile[]>([]);
  const [images, setImages] = useState<FirestoreFile[]>([]);
  const [documents, setDocuments] = useState<FirestoreFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadType, setUploadType] = useState<FileType>('pdf');
  const [stats, setStats] = useState<{ totalFiles: number; totalSize: number; pdfCount: number; imageCount: number; textCount: number } | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const refreshFiles = async () => {
    try {
      const [pdfList, imageList, documentList, storageStats] = await Promise.all([
        getUserFilesByType(TEST_USER_ID, 'pdf').catch(() => []),
        getUserFilesByType(TEST_USER_ID, 'image').catch(() => []),
        getUserFilesByType(TEST_USER_ID, 'text').catch(() => []),
        getUserStorageStatsFromFirestore(TEST_USER_ID).catch(() => null),
      ]);
      setPdfs(pdfList);
      setImages(imageList);
      setDocuments(documentList);
      setStats(storageStats);
    } catch (error) {
      console.error('Failed to refresh files:', error);
    }
  };

  const handleDeleteFile = async (fileId: string, storagePath: string, fileName: string) => {
    if (!confirm(`Are you sure you want to delete "${fileName}"?`)) return;
    
    setDeleting(fileId);
    try {
      await deleteFile(fileId, storagePath);
      await refreshFiles();
      alert('File deleted successfully!');
    } catch (error: unknown) {
      if (error instanceof Error) {
        alert(`Failed to delete file: ${error.message}`);
      }
    } finally {
      setDeleting(null);
    }
  };

  useEffect(() => {
    // Test Firestore connection
    const testFirestore = async () => {
      try {
        const testRef = collection(db, '_test_connection');
        await getDocs(testRef);
        setFirestoreStatus('success');
        setFirestoreMessage('✅ Firestore connected!');
      } catch (error: unknown) {
        setFirestoreStatus('error');
        if (error instanceof Error) {
          setFirestoreMessage(`❌ Firestore failed: ${error.message}`);
        } else {
          setFirestoreMessage('❌ Firestore failed: Unknown error');
        }
      }
    };

    // Test Storage connection
    const testStorage = async () => {
      try {
        await refreshFiles();
        setStorageStatus('success');
        setStorageMessage('✅ Storage connected!');
      } catch (error: unknown) {
        setStorageStatus('error');
        if (error instanceof Error) {
          setStorageMessage(`❌ Storage failed: ${error.message}`);
        } else {
          setStorageMessage('❌ Storage failed: Unknown error');
        }
      }
    };

    testFirestore();
    testStorage();
  }, []);

  // Handle file upload using /api/upload route
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('userId', TEST_USER_ID);

      const response = await fetch('/api/upload-file', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Upload failed');
      }

      const result = await response.json();
      alert(`✅ File uploaded and extracted!\nURL: ${result.uploadResult.url}`);
      
      // Refresh file list
      await refreshFiles();
    } catch (error: unknown) {
      if (error instanceof Error) {
        alert(`❌ Upload failed: ${error.message}`);
      }
    } finally {
      setUploading(false);
      // Reset file input
      e.target.value = '';
    }
  };

  const getAcceptTypes = () => {
    switch (uploadType) {
      case 'pdf': return '.pdf';
      case 'image': return 'image/*';
      case 'document': return '.txt,.md,.csv';
    }
  };

  const StatusBadge = ({ status, message }: { status: string; message: string }) => (
    <div className={`p-3 rounded-lg ${
      status === 'loading' ? 'bg-yellow-100 dark:bg-yellow-900' :
      status === 'success' ? 'bg-green-100 dark:bg-green-900' :
      'bg-red-100 dark:bg-red-900'
    }`}>
      <p className={`text-sm ${
        status === 'loading' ? 'text-yellow-700 dark:text-yellow-300' :
        status === 'success' ? 'text-green-700 dark:text-green-300' :
        'text-red-700 dark:text-red-300'
      }`}>
        {status === 'loading' ? '⏳ Testing...' : message}
      </p>
    </div>
  );

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-black p-4">
      <div className="w-full max-w-md p-8 rounded-lg bg-white dark:bg-zinc-900 shadow-lg">
        <h1 className="text-2xl font-bold mb-6 text-black dark:text-white text-center">
          Firebase Connection Test
        </h1>
        
        <div className="space-y-4">
          {/* Firestore Status */}
          <div>
            <h2 className="text-sm font-semibold text-zinc-600 dark:text-zinc-400 mb-2">
              Firestore Database
            </h2>
            <StatusBadge status={firestoreStatus} message={firestoreMessage} />
          </div>

          {/* Storage Status */}
          <div>
            <h2 className="text-sm font-semibold text-zinc-600 dark:text-zinc-400 mb-2">
              Firebase Storage
            </h2>
            <StatusBadge status={storageStatus} message={storageMessage} />
          </div>

          {/* Storage Stats */}
          {stats && (
            <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900">
              <p className="text-sm text-blue-700 dark:text-blue-300">
                📊 {stats.totalFiles} files | {(stats.totalSize / 1024).toFixed(1)} KB total
              </p>
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                📄 {stats.pdfCount} PDFs | 🖼️ {stats.imageCount} Images | 📝 {stats.textCount} Text
              </p>
            </div>
          )}

          {/* File Upload Test */}
          {storageStatus === 'success' && (
            <div className="pt-4 border-t border-zinc-200 dark:border-zinc-700">
              <h2 className="text-sm font-semibold text-zinc-600 dark:text-zinc-400 mb-2">
                Test Upload (User: {TEST_USER_ID})
              </h2>
              
              {/* Upload Type Selection */}
              <div className="flex gap-2 mb-3 flex-wrap">
                <button
                  onClick={() => setUploadType('pdf')}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                    uploadType === 'pdf'
                      ? 'bg-blue-600 text-white'
                      : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300'
                  }`}
                >
                  📄 PDF
                </button>
                <button
                  onClick={() => setUploadType('image')}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                    uploadType === 'image'
                      ? 'bg-blue-600 text-white'
                      : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300'
                  }`}
                >
                  🖼️ Image
                </button>
                <button
                  onClick={() => setUploadType('document')}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                    uploadType === 'document'
                      ? 'bg-blue-600 text-white'
                      : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300'
                  }`}
                >
                  📝 TXT/MD/CSV
                </button>
              </div>

              <label className="block">
                <span className="sr-only">Choose file</span>
                <input
                  type="file"
                  accept={getAcceptTypes()}
                  onChange={handleFileUpload}
                  disabled={uploading}
                  className="block w-full text-sm text-zinc-500 dark:text-zinc-400
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-full file:border-0
                    file:text-sm file:font-semibold
                    file:bg-blue-50 file:text-blue-700
                    hover:file:bg-blue-100
                    dark:file:bg-blue-900 dark:file:text-blue-300
                    disabled:opacity-50"
                />
              </label>
              {uploading && (
                <p className="text-sm text-blue-600 mt-2">⏳ Uploading...</p>
              )}
            </div>
          )}

          {/* PDFs List */}
          {pdfs.length > 0 && (
            <div className="pt-4 border-t border-zinc-200 dark:border-zinc-700">
              <h2 className="text-sm font-semibold text-zinc-600 dark:text-zinc-400 mb-2">
                📄 PDFs ({pdfs.length})
              </h2>
              <ul className="text-sm text-zinc-600 dark:text-zinc-400 space-y-1 max-h-32 overflow-y-auto">
                {pdfs.map((file, i) => (
                  <li key={i} className="flex items-center justify-between">
                    <a href={file.downloadURL} target="_blank" rel="noopener noreferrer" className="hover:text-blue-500 truncate flex-1">
                      {file.originalName}
                    </a>
                    <button
                      onClick={() => handleDeleteFile(file.id, file.storagePath, file.originalName)}
                      disabled={deleting === file.id}
                      className="ml-2 px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
                    >
                      {deleting === file.id ? '...' : '🗑️'}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Images List */}
          {images.length > 0 && (
            <div className="pt-4 border-t border-zinc-200 dark:border-zinc-700">
              <h2 className="text-sm font-semibold text-zinc-600 dark:text-zinc-400 mb-2">
                🖼️ Images ({images.length})
              </h2>
              <ul className="text-sm text-zinc-600 dark:text-zinc-400 space-y-1 max-h-32 overflow-y-auto">
                {images.map((file, i) => (
                  <li key={i} className="flex items-center justify-between">
                    <a href={file.downloadURL} target="_blank" rel="noopener noreferrer" className="hover:text-blue-500 truncate flex-1">
                      {file.originalName}
                    </a>
                    <button
                      onClick={() => handleDeleteFile(file.id, file.storagePath, file.originalName)}
                      disabled={deleting === file.id}
                      className="ml-2 px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
                    >
                      {deleting === file.id ? '...' : '🗑️'}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Documents List */}
          {documents.length > 0 && (
            <div className="pt-4 border-t border-zinc-200 dark:border-zinc-700">
              <h2 className="text-sm font-semibold text-zinc-600 dark:text-zinc-400 mb-2">
                📝 Documents ({documents.length})
              </h2>
              <ul className="text-sm text-zinc-600 dark:text-zinc-400 space-y-1 max-h-32 overflow-y-auto">
                {documents.map((file, i) => (
                  <li key={i} className="flex items-center justify-between">
                    <a href={file.downloadURL} target="_blank" rel="noopener noreferrer" className="hover:text-blue-500 truncate flex-1">
                      {file.originalName}
                    </a>
                    <button
                      onClick={() => handleDeleteFile(file.id, file.storagePath, file.originalName)}
                      disabled={deleting === file.id}
                      className="ml-2 px-2 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
                    >
                      {deleting === file.id ? '...' : '🗑️'}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
