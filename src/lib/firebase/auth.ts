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
import { createUserProfile } from './firestore/userProfile';

/**
 * Sign up with email and password
 */
export async function signUp(email: string, password: string): Promise<UserCredential> {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  
  // Create user profile in Firestore
  try {
    await createUserProfile(userCredential.user.uid, email);
  } catch (error) {
    console.error('Failed to create user profile:', error);
    // Continue even if profile creation fails (auth is still created)
  }
  
  return userCredential;
}

/**
 * Sign in with email and password
 */
export async function signIn(email: string, password: string): Promise<UserCredential> {
  return signInWithEmailAndPassword(auth, email, password);
}

/**
 * Sign in with Google (popup)
 */
export async function signInWithGoogle(): Promise<UserCredential> {
  const provider = new GoogleAuthProvider();
  const userCredential = await signInWithPopup(auth, provider);

  // If this is a new user, create a Firestore profile
  try {
    // additionalUserInfo may be undefined, guard it
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const anyCred = userCredential as any;
    if (anyCred?.additionalUserInfo?.isNewUser) {
      const email = userCredential.user.email ?? '';
      await createUserProfile(userCredential.user.uid, email);
    }
  } catch (err) {
    console.error('Failed to create Firestore profile for Google sign-in:', err);
  }

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