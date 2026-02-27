"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { User, onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase/firebase";
import {
  signInWithGoogle as firebaseSignInWithGoogle,
  logout as firebaseLogout,
  signUp as firebaseSignUp,
  signIn as firebaseSignIn,
} from "@/lib/firebase/auth";
import { useRouter } from "next/navigation";

interface AuthContextType {
  user: User | null;
  userId: string | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  getIdToken: () => Promise<string>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userId: null,
  loading: true,
  signInWithGoogle: async () => {},
  signUp: async () => {},
  signIn: async () => {},
  logout: async () => {},
  getIdToken: async () => "",
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const userId = user?.uid ?? null;

  const signInWithGoogle = async () => {
    try {
      await firebaseSignInWithGoogle();
      router.push("/dashboard");
    } catch (error) {
      console.error("Error signing in with Google", error);
    }
  };

  const signUp = async (email: string, password: string) => {
    try {
      await firebaseSignUp(email, password);
      router.push("/dashboard");
    } catch (error) {
      console.error("Error signing up", error);
      throw error;
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      await firebaseSignIn(email, password);
      router.push("/dashboard");
    } catch (error) {
      console.error("Error signing in", error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await firebaseLogout();
      router.push("/login");
    } catch (error) {
      console.error("Error signing out", error);
    }
  };

  const getIdToken = async (): Promise<string> => {
    if (!user) {
      throw new Error("No user logged in");
    }
    return await user.getIdToken();
  };

  return (
    <AuthContext.Provider value={{ user, userId, loading, signInWithGoogle, signUp, signIn, logout, getIdToken }}>
      {children}
    </AuthContext.Provider>
  );
};
