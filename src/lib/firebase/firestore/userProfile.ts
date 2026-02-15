import { db } from '../firebase';
import { doc, setDoc, serverTimestamp, Timestamp, FieldValue } from 'firebase/firestore';

export interface UserProfile {
  displayName: string;
  email: string;
  createdAt: Timestamp | FieldValue; 
  stats: {
    totalFilesUploaded: number;
    studyStreaks: number;
  };
}

/**
 * Create or update user profile in Firestore
 */
export async function createUserProfile(
  uid: string,
  email: string,
  displayName: string = ''
): Promise<void> {
  try {
    const userRef = doc(db, 'users', uid);
    const userProfile: UserProfile = {
      displayName: displayName || email.split('@')[0], // Use email prefix as default display name
      email,
      createdAt: serverTimestamp(),
      stats: {
        totalFilesUploaded: 0,
        studyStreaks: 0,
      },
    };

    await setDoc(userRef, userProfile);
  } catch (error) {
    console.error('Error creating user profile:', error);
    throw error;
  }
}

/**
 * Get user profile from Firestore
 */
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  try {
    const { getDoc } = await import('firebase/firestore');
    const userRef = doc(db, 'users', uid);
    const userDoc = await getDoc(userRef);

    if (userDoc.exists()) {
      return userDoc.data() as UserProfile;
    }
    return null;
  } catch (error) {
    console.error('Error getting user profile:', error);
    throw error;
  }
}
