import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import AppLayout from "@/components/AppLayout";
import LandingPage from "@/pages/LandingPage";
import NotFound from "@/pages/NotFound";
import AccessDeniedPage from "@/pages/AccessDeniedPage";
import PortalSelectionPage from "@/pages/PortalSelectionPage";
import ProviderLoginPage from "@/pages/ProviderLoginPage";
import StaffLoginPage from "@/pages/StaffLoginPage";
import ProviderRegisterPage from "@/pages/ProviderRegisterPage";
import StaffRegisterPage from "@/pages/StaffRegisterPage";
import DashboardPage from "@/pages/DashboardPage";
import CourseListPage from "@/pages/client/CourseListPage";
import CoursePlayerPage from "@/pages/client/CoursePlayerPage";
import ProfilePage from "@/pages/ProfilePage";
import ResetPinPage from "@/pages/ResetPinPage";
import CreateCoursePage from "@/pages/admin/CreateCoursePage";
import TestimonialsPage from "@/pages/admin/Testimonials";
import CourseFeedbackPage from "@/pages/admin/CourseFeedbackPage";
import CategoriesPage from "@/pages/admin/CategoriesPage";
import UsersPage from "@/pages/admin/UsersPage";
import { ReactNode } from "react";

const queryClient = new QueryClient();

// ── Route Guards ─────────────────────────────────────────────────────────────

/** Blocks authenticated users from public routes */
const PublicRoute = ({ children }: { children: ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (user) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
};

/** Requires any authenticated user */
const AuthRoute = ({ children }: { children: ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  return <AppLayout>{children}</AppLayout>;
};

/** Admin only */
const AdminRoute = ({ children }: { children: ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login/staff" replace />;
  if (user.role !== "admin") return <Navigate to="/access-denied" replace />;
  return <AppLayout>{children}</AppLayout>;
};

/** Shared dashboard — provider OR staff OR admin */
const DashboardRoute = ({ children }: { children: ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  return <AppLayout>{children}</AppLayout>;
};

const LoadingScreen = () => (
  <div className="min-h-screen flex items-center justify-center bg-white">
    <div className="flex flex-col items-center gap-3">
      <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center animate-pulse">
        <div className="h-5 w-5 rounded-md bg-primary/40" />
      </div>
      <p className="text-sm text-muted-foreground font-medium">Loading…</p>
    </div>
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Public */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<PublicRoute><PortalSelectionPage /></PublicRoute>} />
            <Route path="/login/provider" element={<PublicRoute><ProviderLoginPage /></PublicRoute>} />
            <Route path="/login/staff" element={<PublicRoute><StaffLoginPage /></PublicRoute>} />
            <Route path="/register/provider" element={<PublicRoute><ProviderRegisterPage /></PublicRoute>} />
            <Route path="/register/staff" element={<PublicRoute><StaffRegisterPage /></PublicRoute>} />
            <Route path="/reset-pin" element={<ResetPinPage />} />
            <Route path="/reset-pin/provider" element={<ResetPinPage portal="provider" />} />
            <Route path="/reset-pin/staff" element={<ResetPinPage portal="staff" />} />
            <Route path="/access-denied" element={<AccessDeniedPage />} />

            {/* Shared authenticated routes */}
            <Route path="/dashboard" element={<DashboardRoute><DashboardPage /></DashboardRoute>} />
            <Route path="/profile" element={<DashboardRoute><ProfilePage /></DashboardRoute>} />

            {/* Provider routes */}
            <Route path="/courses" element={<AuthRoute><CourseListPage /></AuthRoute>} />
            <Route path="/courses/:courseId/player" element={<AuthRoute><CoursePlayerPage /></AuthRoute>} />

            {/* Admin / Staff management routes */}
            <Route path="/courses/create" element={<AdminRoute><CreateCoursePage /></AdminRoute>} />
            <Route path="/courses/:courseId/edit" element={<AdminRoute><CreateCoursePage /></AdminRoute>} />
            <Route path="/users" element={<AdminRoute><UsersPage /></AdminRoute>} />
            <Route path="/testimonials" element={<AdminRoute><TestimonialsPage /></AdminRoute>} />
            <Route path="/feedback" element={<AdminRoute><CourseFeedbackPage /></AdminRoute>} />
            <Route path="/categories" element={<AdminRoute><CategoriesPage /></AdminRoute>} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
