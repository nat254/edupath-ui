import { useAuth } from "@/contexts/AuthContext";
import AdminDashboard from "@/pages/admin/AdminDashboard";
import LearnerDashboard from "@/pages/client/LearnerDashboard";
import InternalStaffDashboard from "@/pages/client/InternalStaffDashboard";

const DashboardPage = () => {
  const { user } = useAuth();
  if (user?.role === "admin") return <AdminDashboard />;
  if (user?.role === "internal_staff") return <InternalStaffDashboard />;
  return <LearnerDashboard />;
};

export default DashboardPage;
