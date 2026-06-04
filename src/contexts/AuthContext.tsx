import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { UserRole, Designation } from "@/data/types";

export type { UserRole };

export interface User {
  id: string;
  nationalId?: string;
  email: string;
  organization?: string;
  facilityName?: string;
  county?: string;
  designation?: Designation | string;
  role: UserRole;
  name: string;
  isActive: boolean;
}

export type Portal = "provider" | "staff";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (
    identifier: string,
    pin: string,
    portal: Portal,
  ) => Promise<{ success: boolean; error?: string; crossPortal?: boolean }>;
  registerProvider: (data: {
    nationalId: string;
    name: string;
    email: string;
    organization: string;
    county: string;
    pin: string;
  }) => Promise<{ success: boolean; error?: string }>;
  registerStaff: (data: {
    name: string;
    email: string;
    designation: string;
    pin: string;
  }) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  updateProfile: (
    data: Partial<Pick<User, "name" | "email" | "organization" | "county" | "designation">>,
  ) => Promise<{ success: boolean; error?: string }>;
  changePin: (
    currentPin: string,
    newPin: string,
  ) => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};

const API = import.meta.env.VITE_API_URL || "http://localhost:5000";
const STORAGE_KEY = "edupath_user";

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Persist user session in sessionStorage
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      if (stored) setUser(JSON.parse(stored));
    } catch {
      sessionStorage.removeItem(STORAGE_KEY);
    } finally {
      setLoading(false);
    }
  }, []);

  const persistUser = (u: User | null) => {
    if (u) sessionStorage.setItem(STORAGE_KEY, JSON.stringify(u));
    else sessionStorage.removeItem(STORAGE_KEY);
    setUser(u);
  };

  const login = async (identifier: string, pin: string, portal: Portal) => {
    try {
      const res = await fetch(`${API}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, pin, portal }),
      });
      const data = await res.json();
      if (!res.ok) return { success: false, error: data.error, crossPortal: data.crossPortal };
      persistUser(data);
      return { success: true };
    } catch {
      return { success: false, error: "Server error. Please try again." };
    }
  };

  const registerProvider = async (data: {
    nationalId: string;
    name: string;
    email: string;
    organization: string;
    county: string;
    pin: string;
  }) => {
    try {
      const res = await fetch(`${API}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, role: "healthcare_provider" }),
      });
      const result = await res.json();
      if (!res.ok) return { success: false, error: result.error };
      persistUser(result);
      return { success: true };
    } catch {
      return { success: false, error: "Server error. Please try again." };
    }
  };

  const registerStaff = async (data: {
    name: string;
    email: string;
    designation: string;
    pin: string;
  }) => {
    try {
      const res = await fetch(`${API}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, role: "internal_staff" }),
      });
      const result = await res.json();
      if (!res.ok) return { success: false, error: result.error };
      persistUser(result);
      return { success: true };
    } catch {
      return { success: false, error: "Server error. Please try again." };
    }
  };

  const logout = async () => {
    try {
      await fetch(`${API}/auth/logout`, { method: "POST" });
    } finally {
      persistUser(null);
    }
  };

  const updateProfile = async (
    data: Partial<Pick<User, "name" | "email" | "organization" | "county" | "designation">>,
  ) => {
    if (!user) return { success: false, error: "Not logged in" };
    try {
      const res = await fetch(`${API}/auth/profile`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          nationalId: user.nationalId,
          ...data,
        }),
      });
      const result = await res.json();
      if (!res.ok) return { success: false, error: result.error };
      persistUser({ ...user, ...result });
      return { success: true };
    } catch {
      return { success: false, error: "Server error. Please try again." };
    }
  };

  const changePin = async (currentPin: string, newPin: string) => {
    if (!user) return { success: false, error: "Not logged in" };
    try {
      const res = await fetch(`${API}/auth/change-pin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          nationalId: user.nationalId,
          email: user.email,
          currentPin,
          newPin,
        }),
      });
      const result = await res.json();
      if (!res.ok) return { success: false, error: result.error };
      return { success: true };
    } catch {
      return { success: false, error: "Server error. Please try again." };
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, login, registerProvider, registerStaff, logout, updateProfile, changePin }}
    >
      {children}
    </AuthContext.Provider>
  );
};
