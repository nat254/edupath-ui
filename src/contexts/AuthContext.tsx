import React, { createContext, useContext, useState, ReactNode } from "react";

export type UserRole = "admin" | "learner";

export interface User {
  nationalId: string;
  email: string;
  organization: string;
  county: string;
  role: UserRole;
  name: string;
}

interface AuthContextType {
  user: User | null;
  login: (
    nationalId: string,
    pin: string,
  ) => Promise<{ success: boolean; error?: string }>;
  register: (data: {
    nationalId: string;
    name: string;
    email: string;
    organization: string;
    county: string;
    pin: string;
  }) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  updateProfile: (
    data: Partial<Pick<User, "name" | "email" | "organization" | "county">>,
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

const API = "http://localhost:5000";

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);

  const login = async (nationalId: string, pin: string) => {
    try {
      const res = await fetch(`${API}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nationalId, pin }),
      });
      const data = await res.json();
      if (!res.ok) return { success: false, error: data.error };
      setUser(data);
      return { success: true };
    } catch {
      return { success: false, error: "Server error" };
    }
  };

  const register = async (data: {
    nationalId: string;
    email: string;
    organization: string;
    name:string;
    county: string;
    pin: string;
  }) => {
    try {
      const res = await fetch(`${API}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (!res.ok) return { success: false, error: result.error };
      setUser(result);
      return { success: true };
    } catch (err){
      console.error("Register error:", err); // just log it
      return { success: false, error: "Server error" };
    }
  };

  const logout = async () => {
    try {
      await fetch(`${API}/auth/logout`, { method: "POST" });
    } finally {
      setUser(null);
    }
  };

  const updateProfile = async (
    data: Partial<Pick<User, "name" | "email" | "organization" | "county">>,
  ) => {
    if (!user) return { success: false, error: "Not logged in" };
    try {
      const res = await fetch(`${API}/auth/profile`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nationalId: user.nationalId, ...data }),
      });
      const result = await res.json();
      if (!res.ok) return { success: false, error: result.error };
      setUser({ ...user, ...result });
      return { success: true };
    } catch {
      return { success: false, error: "Server error" };
    }
  };

  const changePin = async (currentPin: string, newPin: string) => {
    if (!user) return { success: false, error: "Not logged in" };
    try {
      const res = await fetch(`${API}/auth/change-pin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nationalId: user.nationalId,
          currentPin,
          newPin,
        }),
      });
      const result = await res.json();
      if (!res.ok) return { success: false, error: result.error };
      return { success: true };
    } catch {
      return { success: false, error: "Server error" };
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, login, register, logout, updateProfile, changePin }}
    >
      {children}
    </AuthContext.Provider>
  );
};
