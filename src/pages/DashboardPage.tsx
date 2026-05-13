import { useAuth } from "@/contexts/AuthContext";
import AdminDashboard from "@/pages/admin/AdminDashboard";
import LearnerDashboard from "@/pages/client/LearnerDashboard";

const DashboardPage = () => {
  const { user } = useAuth();
  return user?.role === "admin" ? <AdminDashboard /> : <LearnerDashboard />;
};

export default DashboardPage;
