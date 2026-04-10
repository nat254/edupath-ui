import React, { createContext, useContext, useState, ReactNode } from "react";

export type UserRole = "admin" | "learner";

export interface User {
  nationalId: string;
  email: string;
  organization: string;
  role: UserRole;
  name: string;
}

interface AuthContextType {
  user: User | null;
  login: (nationalId: string, pin: string) => { success: boolean; error?: string };
  register: (data: { nationalId: string; email: string; organization: string; pin: string }) => { success: boolean; error?: string };
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};

const mockUsers: User[] = [
  { nationalId: "1234", email: "admin@tms.co.ke", organization: "Kenyatta National Hospital - FID-12-324627", role: "admin", name: "Admin User" },
  { nationalId: "5678", email: "learner@tms.co.ke", organization: "Kenyatta National Hospital - FID-12-324627", role: "learner", name: "Jane Wanjiku" },
];

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);

  const login = (nationalId: string, pin: string): { success: boolean; error?: string } => {
    const found = mockUsers.find((u) => u.nationalId === nationalId);
    if (!found) return { success: false, error: "Invalid National ID or PIN" };
    if (pin !== "1234") return { success: false, error: "Invalid National ID or PIN" };
    setUser(found);
    return { success: true };
  };

  const register = (data: { nationalId: string; email: string; organization: string; pin: string }): { success: boolean; error?: string } => {
    if (mockUsers.find((u) => u.nationalId === data.nationalId)) {
      return { success: false, error: "National ID already registered" };
    }
    const newUser: User = {
      nationalId: data.nationalId,
      email: data.email,
      organization: data.organization,
      role: "learner",
      name: "New Learner",
    };
    mockUsers.push(newUser);
    setUser(newUser);
    return { success: true };
  };

  const logout = () => setUser(null);

  return <AuthContext.Provider value={{ user, login, register, logout }}>{children}</AuthContext.Provider>;
};
