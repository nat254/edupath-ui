import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { SidebarTrigger } from "@/components/ui/sidebar";

const TopNavbar = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="h-14 border-b bg-card flex items-center justify-between px-4">
      <div className="flex items-center gap-2">
        <SidebarTrigger />
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate("/profile")}
          className="hidden sm:flex items-center gap-2 text-sm rounded-lg px-2 py-1 hover:bg-muted transition-colors"
          title="View profile"
        >
          <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-medium text-xs shrink-0">
            {user?.name?.charAt(0)}
          </div>
          <div className="text-left">
            <p className="font-medium leading-none">{user?.name}</p>
            <p className="text-xs text-muted-foreground capitalize">{user?.role}</p>
          </div>
        </button>
      </div>
    </header>
  );
};

export default TopNavbar;
