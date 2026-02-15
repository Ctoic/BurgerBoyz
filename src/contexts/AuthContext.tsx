import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";
import type { ApiCustomerUser } from "@/lib/types";

interface AuthContextValue {
  user: ApiCustomerUser | null;
  isReady: boolean;
  signup: (payload: {
    email: string;
    name?: string;
    phone?: string;
    addressLine1?: string;
    addressLine2?: string;
    addressCity?: string;
    addressPostcode?: string;
    addressInstructions?: string;
  }) => Promise<ApiCustomerUser>;
  login: (email: string) => Promise<ApiCustomerUser>;
  updateProfile: (payload: {
    name?: string;
    phone?: string;
    addressLine1?: string;
    addressLine2?: string;
    addressCity?: string;
    addressPostcode?: string;
    addressInstructions?: string;
  }) => Promise<ApiCustomerUser>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<ApiCustomerUser | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const loadMe = async () => {
      try {
        const response = await apiFetch<{ user: ApiCustomerUser }>("/auth/me");
        setUser(response.user);
      } catch {
        setUser(null);
      } finally {
        setIsReady(true);
      }
    };

    loadMe();
  }, []);

  const signup = async (payload: {
    email: string;
    name?: string;
    phone?: string;
    addressLine1?: string;
    addressLine2?: string;
    addressCity?: string;
    addressPostcode?: string;
    addressInstructions?: string;
  }) => {
    const response = await apiFetch<{ user: ApiCustomerUser }>("/auth/signup", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    setUser(response.user);
    return response.user;
  };

  const login = async (email: string) => {
    const response = await apiFetch<{ user: ApiCustomerUser }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
    setUser(response.user);
    return response.user;
  };

  const updateProfile = async (payload: {
    name?: string;
    phone?: string;
    addressLine1?: string;
    addressLine2?: string;
    addressCity?: string;
    addressPostcode?: string;
    addressInstructions?: string;
  }) => {
    const response = await apiFetch<{ user: ApiCustomerUser }>("/auth/profile", {
      method: "PUT",
      body: JSON.stringify(payload),
    });
    setUser(response.user);
    return response.user;
  };

  const logout = async () => {
    await apiFetch("/auth/logout", { method: "POST" });
    setUser(null);
  };

  const value = useMemo(
    () => ({ user, isReady, signup, login, updateProfile, logout }),
    [user, isReady],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};
