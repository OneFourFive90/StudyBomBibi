// functions for user authentication

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
  User,
  UserCredential,
} from 'firebase/auth';
import { auth } from './firebase';
import { createUserProfile, getUserProfile } from './firestore/userProfile';

async function ensureUserProfileExists(user: User): Promise<void> {
  const email = user.email ?? '';
  if (!email) {
    return;
  }

  const existingProfile = await getUserProfile(user.uid);
  if (!existingProfile) {
    await createUserProfile(user.uid, email, user.displayName ?? '');
  }
}

async function ensureUserProfileSafe(user: User, context: string): Promise<void> {
  try {
    await ensureUserProfileExists(user);
  } catch (error) {
    console.error(`Failed to ensure user profile during ${context}:`, error);
  }
}

/**
 * Sign up with email and password
 */
export async function signUp(email: string, password: string): Promise<UserCredential> {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  await ensureUserProfileSafe(userCredential.user, 'email sign-up');
  
  return userCredential;
}

/**
 * Sign in with email and password
 */
export async function signIn(email: string, password: string): Promise<UserCredential> {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  await ensureUserProfileSafe(userCredential.user, 'email sign-in');
  return userCredential;
}

/**
 * Sign in with Google (popup)
 */
export async function signInWithGoogle(): Promise<UserCredential> {
  const provider = new GoogleAuthProvider();
  const userCredential = await signInWithPopup(auth, provider);

  await ensureUserProfileSafe(userCredential.user, 'Google sign-in');

  return userCredential;
}

/**
 * Sign out the current user
 */
export async function logout(): Promise<void> {
  await signOut(auth);
}

/**
 * Listen to auth state changes
 */
export function onAuthChange(callback: (user: User | null) => void): () => void {
  return onAuthStateChanged(auth, callback);
}

/**
 * Get current user as a promise
 */
export function getCurrentUser(): Promise<User | null> {
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      resolve(user);
    });
  });
}

/**
 * Get current user synchronously
 */
export function getCurrentUserSync(): User | null {
  return auth.currentUser;
}