import { useAuth } from "@/contexts/AuthContext";
import AdminDashboard from "@/pages/AdminDashboard";
import LearnerDashboard from "@/pages/LearnerDashboard";

const DashboardPage = () => {
  const { user } = useAuth();
  return user?.role === "admin" ? <AdminDashboard /> : <LearnerDashboard />;
};

export default DashboardPage;
