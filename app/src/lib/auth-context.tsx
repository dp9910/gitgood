"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import {
  onAuthChange,
  signInWithGitHub,
  signOut,
  type User,
} from "./firebase-client";
import type { UserProfile } from "./user-profile";

/** Profile shape returned to clients (no encryptedGithubToken). */
export type ClientUserProfile = Omit<UserProfile, "encryptedGithubToken">;

interface AuthState {
  user: User | null;
  loading: boolean;
  userProfile: ClientUserProfile | null;
  profileLoading: boolean;
  isNewUser: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<ClientUserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  const fetchProfile = useCallback(async () => {
    setProfileLoading(true);
    try {
      const res = await fetch("/api/user/profile");
      if (res.ok) {
        const profile: ClientUserProfile = await res.json();
        setUserProfile(profile);
      }
    } catch {
      // Silently fail — profile will be null
    } finally {
      setProfileLoading(false);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthChange((firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
      if (firebaseUser) {
        fetchProfile();
      } else {
        setUserProfile(null);
      }
    });
    return unsubscribe;
  }, [fetchProfile]);

  async function login() {
    await signInWithGitHub();
  }

  async function logout() {
    await signOut();
    setUser(null);
    setUserProfile(null);
  }

  const refreshProfile = useCallback(async () => {
    await fetchProfile();
  }, [fetchProfile]);

  const isNewUser = userProfile !== null && !userProfile.onboardingComplete;

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        userProfile,
        profileLoading,
        isNewUser,
        login,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
