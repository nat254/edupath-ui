import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { SidebarTrigger } from "@/components/ui/sidebar";

const TopNavbar = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="h-14 border-b border-border bg-white flex items-center justify-between px-4 sticky top-0 z-50">
      <div className="flex items-center gap-2">
        <SidebarTrigger className="text-muted-foreground hover:text-foreground transition-colors duration-150" />
      </div>

      <button
        onClick={() => navigate("/profile")}
        className="hidden sm:flex items-center gap-2.5 rounded-xl px-3 py-1.5 hover:bg-muted border border-transparent hover:border-border transition-all duration-150 group"
        title="View profile"
      >
        {/* Avatar */}
        <div className="h-7 w-7 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold text-xs shrink-0 shadow-sm shadow-primary/20 group-hover:shadow-md group-hover:shadow-primary/25 transition-all duration-200">
          {user?.name?.charAt(0)}
        </div>

        {/* Name + role */}
        <div className="text-left">
          <p className="text-sm font-semibold text-foreground leading-none">{user?.name}</p>
          <p className="text-[10px] text-muted-foreground capitalize mt-0.5 leading-none">
            {user?.role?.replace(/_/g, " ")}
          </p>
        </div>
      </button>
    </header>
  );
};

export default TopNavbar;
