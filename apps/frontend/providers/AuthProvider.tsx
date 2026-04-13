"use client";

import {
  createContext,
  useCallback,
  useEffect,
  useState,
} from "react";
import { User } from "@/types";
import { getCurrentUser, loginUser, logoutUser } from "@/lib/auth";
import { LoginInput } from "@/types";
import { useRouter } from "next/navigation";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (data: LoginInput) => Promise<void>;
  logout: () => Promise<void>;
  refetch: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const fetchUser = useCallback(async () => {
    try {
      const currentUser = await getCurrentUser();
      setUser(currentUser);
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  // Listen for unauthenticated events dispatched by the Axios interceptor so
  // we can redirect via the Next.js router instead of window.location.
  useEffect(() => {
    const handleUnauthenticated = () => {
      setUser(null);
      router.push("/login");
    };
    window.addEventListener("auth:unauthenticated", handleUnauthenticated);
    return () => {
      window.removeEventListener("auth:unauthenticated", handleUnauthenticated);
    };
  }, [router]);

  const login = useCallback(
    async (data: LoginInput) => {
      const loggedInUser = await loginUser(data);
      setUser(loggedInUser);
      router.push("/");
    },
    [router]
  );

  const logout = useCallback(async () => {
    await logoutUser();
    setUser(null);
    router.push("/login");
  }, [router]);

  return (
    <AuthContext.Provider
      value={{ user, isLoading, login, logout, refetch: fetchUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}
