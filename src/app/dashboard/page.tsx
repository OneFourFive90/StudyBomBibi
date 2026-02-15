'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { logout } from '@/lib/firebase/auth';

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading, uid } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 dark:bg-black">
        <p className="text-zinc-600 dark:text-zinc-400">Loading...</p>
      </div>
    );
  }

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/auth/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      <nav className="border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-black dark:text-white">StudyBomBibi</h1>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg"
          >
            Logout
          </button>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-black dark:text-white mb-4">
            Welcome back!
          </h2>
          <p className="text-zinc-600 dark:text-zinc-400">
            Logged in as: <span className="font-semibold">{user?.email}</span>
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Quick Links */}
          <div className="p-6 rounded-lg bg-white dark:bg-zinc-900 shadow">
            <h3 className="text-lg font-semibold text-black dark:text-white mb-4">
              Quick Links
            </h3>
            <div className="space-y-2">
              <Link
                href="/test-firebase"
                className="block px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-center"
              >
                📤 Upload Files
              </Link>
              <Link
                href="/test-firebase"
                className="block px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-center"
              >
                📋 View Files
              </Link>
            </div>
          </div>

          {/* User Stats */}
          <div className="p-6 rounded-lg bg-white dark:bg-zinc-900 shadow">
            <h3 className="text-lg font-semibold text-black dark:text-white mb-4">
              Your Study Stats
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-zinc-50 dark:bg-zinc-800 rounded">
                <span className="text-zinc-600 dark:text-zinc-400">Files Uploaded</span>
                <span className="text-lg font-bold text-black dark:text-white">0</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-zinc-50 dark:bg-zinc-800 rounded">
                <span className="text-zinc-600 dark:text-zinc-400">Study Streak</span>
                <span className="text-lg font-bold text-black dark:text-white">0 days</span>
              </div>
            </div>
          </div>
        </div>

        {/* Getting Started */}
        <div className="mt-8 p-6 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
          <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-3">
            🎓 Getting Started
          </h3>
          <ul className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
            <li>✅ Create an account (You just did!)</li>
            <li>📤 Upload study materials (PDF, images, text files)</li>
            <li>🔍 Organize your files by type</li>
            <li>📊 Track your study progress</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
