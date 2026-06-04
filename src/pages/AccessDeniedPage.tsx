import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { ShieldX, Stethoscope, Users, ArrowLeft, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";

const AccessDeniedPage = () => {
  const { user, logout } = useAuth();

  const isProvider = user?.role === "healthcare_provider";
  const isStaff    = user?.role === "internal_staff";

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="absolute inset-0 dot-grid opacity-100 pointer-events-none" />

      <div className="relative z-10 w-full max-w-sm text-center space-y-6">
        {/* Icon */}
        <div className="mx-auto h-20 w-20 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center shadow-sm">
          <ShieldX className="h-10 w-10 text-red-500" />
        </div>

        {/* Copy */}
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Access Denied</h1>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-xs mx-auto">
            You don't have permission to view this page. This area is restricted to users with the required role.
          </p>
        </div>

        {/* User info card */}
        {user && (
          <div className="p-4 rounded-xl bg-muted/50 border border-border text-sm text-left space-y-1.5">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Signed in as</span>
              <span className="font-semibold text-foreground">{user.name}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Role</span>
              <span className="font-semibold text-foreground capitalize">{user.role.replace(/_/g, " ")}</span>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col gap-2.5">
          {isProvider && (
            <Button asChild className="h-10 bg-primary hover:bg-primary/90 text-white rounded-xl font-semibold shadow-sm shadow-primary/20">
              <Link to="/dashboard">
                <Stethoscope className="h-4 w-4 mr-2" />
                Go to Provider Dashboard
              </Link>
            </Button>
          )}
          {(isStaff || !user) && (
            <Button asChild className="h-10 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold shadow-sm shadow-emerald-500/20">
              <Link to="/dashboard">
                <Users className="h-4 w-4 mr-2" />
                Go to Staff Dashboard
              </Link>
            </Button>
          )}
          <Button
            variant="outline"
            className="h-10 rounded-xl font-medium border-border hover:border-foreground/20"
            asChild
          >
            <Link to="/">
              <ArrowLeft className="h-4 w-4 mr-2" /> Back to Home
            </Link>
          </Button>
          {user && (
            <button
              onClick={logout}
              className="text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors mt-1"
            >
              Sign out and switch account
            </button>
          )}
        </div>

        {/* Footer brand */}
        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground/40">
          <GraduationCap className="h-3.5 w-3.5" />
          Training Portal
        </div>
      </div>
    </div>
  );
};

export default AccessDeniedPage;
