import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { UserRole } from "@/data/types";

interface RoleGuardProps {
  children: ReactNode;
  allowedRoles: UserRole[];
  fallbackPath?: string;
}

export const RoleGuard = ({ children, allowedRoles, fallbackPath = "/access-denied" }: RoleGuardProps) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Loading…
      </div>
    );
  }

  if (!user) {
    const isStaffOrAdmin = allowedRoles.includes("admin") || allowedRoles.includes("internal_staff");
    return <Navigate to={isStaffOrAdmin ? "/login/staff" : "/login/provider"} replace />;
  }

  if (!allowedRoles.includes(user.role)) {
    return <Navigate to={fallbackPath} replace />;
  }

  return <>{children}</>;
};
export default RoleGuard;
