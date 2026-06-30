"use client"

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { clientApi } from "@/lib/client-api";

export interface User {
  _id: string;
  fullName: string;
  email: string;
  phone?: string;
  role: "ADMIN" | "ORGANIZER" | "PARTICIPANT" | "STAFF";
  accountStatus: "ACTIVE" | "BANNED";
  avatar?: string;
  createdAt: string;
  updatedAt: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, passwordPlain: string) => Promise<void>;
  register: (data: any) => Promise<void>;
  loginWithGoogle: (credential: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const router = useRouter();

  const refreshUser = async () => {
    try {
      setLoading(true);
      const res = await clientApi.get<{ success: boolean; data: User }>("/users/me");
      if (res.success && res.data) {
        setUser(res.data);
      } else {
        setUser(null);
      }
    } catch (err) {
      // Ignore error when not authenticated on load
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const login = async (email: string, passwordPlain: string) => {
    const res = await clientApi.post<{ success: boolean; data: { user: User } }>("/users/login", {
      email,
      password: passwordPlain,
    });
    if (res.success && res.data.user) {
      setUser(res.data.user);
      router.push("/dashboard");
    }
  };

  const register = async (data: any) => {
    const res = await clientApi.post<{ success: boolean; data: { user: User } }>("/users/register", data);
    if (res.success && res.data.user) {
      setUser(res.data.user);
      router.push("/dashboard");
    }
  };

  const loginWithGoogle = async (credential: string) => {
    const res = await clientApi.post<{ success: boolean; data: { user: User } }>("/users/google", {
      credential,
    });
    if (res.success && res.data.user) {
      setUser(res.data.user);
      router.push("/dashboard");
    }
  };

  const logout = async () => {
    try {
      await clientApi.post("/users/logout", {});
    } catch (err) {
      console.error("Logout request failed:", err);
    } finally {
      setUser(null);
      router.push("/login");
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        loginWithGoogle,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
