import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import AppLayout from "@/components/AppLayout";
import LoginPage from "@/pages/LoginPage";
import RegisterPage from "@/pages/RegisterPage";
import DashboardPage from "@/pages/DashboardPage";
import CourseListPage from "@/pages/CourseListPage";
import CreateCoursePage from "@/pages/CreateCoursePage";
import CoursePlayerPage from "@/pages/CoursePlayerPage";
import LearnersPage from "@/pages/LearnersPage";
import TestimonialsPage from "@/pages/Testimonials";
import LandingPage from "@/pages/LandingPage";
import NotFound from "@/pages/NotFound";
import { ReactNode } from "react";
import ResetPinPage from "@/pages/ResetPinPage";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children, adminOnly = false }: { children: ReactNode; adminOnly?: boolean }) => {
  const { user } = useAuth();
  // if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && user.role !== "admin") return <Navigate to="/dashboard" replace />;
  return <AppLayout>{children}</AppLayout>;
};

const PublicRoute = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  //if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Loading…</div>;
  if (user) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
            <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
            <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
            <Route path="/courses" element={<ProtectedRoute><CourseListPage /></ProtectedRoute>} />
            <Route path="/courses/create" element={<ProtectedRoute adminOnly><CreateCoursePage /></ProtectedRoute>} />
            <Route path="/courses/:courseId/edit" element={<ProtectedRoute adminOnly><CreateCoursePage /></ProtectedRoute>} />
            <Route path="/courses/:courseId/player" element={<ProtectedRoute><CoursePlayerPage /></ProtectedRoute>} />
            <Route path="/learners" element={<ProtectedRoute adminOnly><LearnersPage /></ProtectedRoute>} />
            <Route path="/testimonials" element={<ProtectedRoute adminOnly><TestimonialsPage /></ProtectedRoute>} />
            <Route path="/reset-pin" element={<PublicRoute><ResetPinPage /></PublicRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
