import { getAuth } from "firebase-admin/auth";
import { initializeApp, getApps, App } from "firebase-admin/app";
import { cert } from "firebase-admin/app";

let adminApp: App;

/**
 * Initialize Firebase Admin SDK
 */
function initializeAdmin(): App {
  if (adminApp) {
    return adminApp;
  }

  if (getApps().length === 0) {
    // Get the private key from environment variables
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const projectId = process.env.FIREBASE_PROJECT_ID;

    if (!privateKey || !clientEmail || !projectId) {
      throw new Error(
        "Missing Firebase Admin SDK credentials. Please set FIREBASE_PRIVATE_KEY, FIREBASE_CLIENT_EMAIL, and FIREBASE_PROJECT_ID in your environment variables."
      );
    }

    adminApp = initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });
  } else {
    adminApp = getApps()[0];
  }

  return adminApp;
}

/**
 * Verify Firebase ID token from Authorization header
 * @param authHeader - The Authorization header (should be "Bearer <token>")
 * @returns The decoded token with uid
 * @throws Error if token is invalid or missing
 */
export async function verifyFirebaseIdToken(
  authHeader: string | null | undefined
): Promise<{ uid: string; email?: string }> {
  if (!authHeader?.startsWith("Bearer ")) {
    throw new Error("Missing or invalid Authorization header");
  }

  const idToken = authHeader.replace("Bearer ", "").trim();

  if (!idToken) {
    throw new Error("Empty ID token");
  }

  try {
    initializeAdmin();
    const decodedToken = await getAuth().verifyIdToken(idToken);
    return {
      uid: decodedToken.uid,
      email: decodedToken.email,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to verify token";
    throw new Error(`Invalid ID token: ${message}`);
  }
}
