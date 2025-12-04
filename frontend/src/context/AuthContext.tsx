"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { User, LoginResponse } from "@/types";
import { api } from "@/lib/api-client";
import { toast } from "sonner";

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string) => Promise<void>;
  verifyOTP: (email: string, otpCode: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  linkWallet: (walletAddress: string) => Promise<number>;
  unlinkWallet: () => Promise<void>;
  updateProfile: (data: { display_name?: string; bio?: string }) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = "auth_token";
const USER_KEY = "auth_user";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // Load user and token from localStorage on mount
  useEffect(() => {
    const storedToken = localStorage.getItem(TOKEN_KEY);
    const storedUser = localStorage.getItem(USER_KEY);

    if (storedToken && storedUser) {
      try {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
        // Verify token is still valid by fetching current user
        refreshUser();
      } catch (error) {
        console.error("Failed to load auth state:", error);
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
      }
    }
    setIsLoading(false);
  }, []);

  const refreshUser = async () => {
    try {
      const response = await api.get<{ user_id: string; email: string; wallet_address?: string; display_name?: string; bio?: string; email_verified: boolean; created_at?: string; last_login_at?: string }>("/api/v1/auth/me");
      const userData = response.data;
      setUser(userData as User);
      localStorage.setItem(USER_KEY, JSON.stringify(userData));
    } catch (error: any) {
      // Token invalid or expired
      if (error.response?.status === 401) {
        logout();
      }
    }
  };

  const login = async (email: string) => {
    try {
      await api.post("/api/v1/auth/login", { email: email.toLowerCase().trim() });
      toast.success("OTP code sent to your email");
    } catch (error: any) {
      const message = error.response?.data?.detail || "Failed to send OTP code";
      toast.error(message);
      throw error;
    }
  };

  const verifyOTP = async (email: string, otpCode: string) => {
    try {
      const response = await api.post<LoginResponse>("/api/v1/auth/verify", {
        email: email.toLowerCase().trim(),
        otp_code: otpCode.trim(),
      });

      const { access_token, user: userData } = response.data;

      setToken(access_token);
      setUser(userData);
      localStorage.setItem(TOKEN_KEY, access_token);
      localStorage.setItem(USER_KEY, JSON.stringify(userData));

      toast.success("Login successful!");
      router.push("/");
    } catch (error: any) {
      const message = error.response?.data?.detail || "Invalid OTP code";
      toast.error(message);
      throw error;
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    router.push("/login");
    toast.success("Logged out successfully");
  };

  const linkWallet = async (walletAddress: string): Promise<number> => {
    try {
      const response = await api.post<{ message: string; wallet_address: string; grants_linked: number; user: User }>("/api/v1/users/wallet/link", {
        wallet_address: walletAddress.toLowerCase(),
      });

      const { grants_linked, user: updatedUser } = response.data;
      setUser(updatedUser);
      localStorage.setItem(USER_KEY, JSON.stringify(updatedUser));

      if (grants_linked > 0) {
        toast.success(`Wallet linked! ${grants_linked} existing grant${grants_linked > 1 ? "s" : ""} found.`);
      } else {
        toast.success("Wallet linked successfully");
      }

      return grants_linked;
    } catch (error: any) {
      const message = error.response?.data?.detail || "Failed to link wallet";
      toast.error(message);
      throw error;
    }
  };

  const unlinkWallet = async () => {
    try {
      const response = await api.post<{ message: string; user: User }>("/api/v1/users/wallet/unlink");
      const { user: updatedUser } = response.data;
      setUser(updatedUser);
      localStorage.setItem(USER_KEY, JSON.stringify(updatedUser));
      toast.success("Wallet unlinked successfully");
    } catch (error: any) {
      const message = error.response?.data?.detail || "Failed to unlink wallet";
      toast.error(message);
      throw error;
    }
  };

  const updateProfile = async (data: { display_name?: string; bio?: string }) => {
    try {
      const response = await api.patch<{ message: string; user: User }>("/api/v1/users/me", data);
      const { user: updatedUser } = response.data;
      setUser(updatedUser);
      localStorage.setItem(USER_KEY, JSON.stringify(updatedUser));
      toast.success("Profile updated successfully");
    } catch (error: any) {
      const message = error.response?.data?.detail || "Failed to update profile";
      toast.error(message);
      throw error;
    }
  };

  const value: AuthContextType = {
    user,
    token,
    isLoading,
    isAuthenticated: !!token && !!user,
    login,
    verifyOTP,
    logout,
    refreshUser,
    linkWallet,
    unlinkWallet,
    updateProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

