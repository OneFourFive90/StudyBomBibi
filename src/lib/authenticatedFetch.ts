/**
 * Helper function to make authenticated API calls
 * Automatically adds Authorization header with ID token
 */
import { auth } from "@/lib/firebase/firebase";

interface FetchOptions extends RequestInit {
  headers?: Record<string, string>;
}

export async function authenticatedFetch(
  url: string,
  options: FetchOptions = {}
): Promise<Response> {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error("User not authenticated");
    }

    const idToken = await currentUser.getIdToken();
    const headers = {
      ...options.headers,
      Authorization: `Bearer ${idToken}`,
    };

    return fetch(url, {
      ...options,
      headers,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Authentication failed";
    throw new Error(`Failed to make authenticated request: ${message}`);
  }
}
