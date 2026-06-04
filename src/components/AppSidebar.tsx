import {
  LayoutDashboard, BookOpen, Users, LogOut, GraduationCap,
  MessageSquare, Star, UserCircle, Tags,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarFooter, useSidebar,
} from "@/components/ui/sidebar";

const adminLinks = [
  { title: "Dashboard",       url: "/dashboard",    icon: LayoutDashboard },
  { title: "Courses",         url: "/courses",      icon: BookOpen },
  { title: "Categories",      url: "/categories",   icon: Tags },
  { title: "Users",           url: "/users",        icon: Users },
  { title: "Course Feedback", url: "/feedback",     icon: Star },
  { title: "Testimonials",    url: "/testimonials", icon: MessageSquare },
  { title: "Profile",         url: "/profile",      icon: UserCircle },
];

const learnerLinks = [
  { title: "My Learning", url: "/dashboard", icon: LayoutDashboard },
  { title: "Courses",     url: "/courses",   icon: BookOpen },
  { title: "Profile",     url: "/profile",   icon: UserCircle },
];

export function AppSidebar() {
  const { user, logout } = useAuth();
  const { state }        = useSidebar();
  const collapsed        = state === "collapsed";
  const navigate         = useNavigate();
  const links            = user?.role === "admin" ? adminLinks : learnerLinks;

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <SidebarGroup>

          {/* ── Brand ── */}
          <div className={`flex items-center gap-2.5 px-4 py-4 mb-2 ${collapsed ? "justify-center" : ""}`}>
            <div
              className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center shadow-md shadow-primary/40 shrink-0 cursor-pointer"
              onClick={() => navigate("/dashboard")}
            >
              <GraduationCap className="h-4 w-4 text-primary-foreground" />
            </div>
            {!collapsed && (
              <div className="cursor-pointer" onClick={() => navigate("/dashboard")}>
                <p className="text-sm font-bold text-white leading-none tracking-tight">
                  Training<span className="text-sidebar-primary"> Portal</span>
                </p>
                {user?.role === "admin" && (
                  <p className="text-[10px] text-sidebar-foreground/50 mt-0.5 leading-none font-medium tracking-wider uppercase">
                    Administration
                  </p>
                )}
              </div>
            )}
          </div>

          {/* ── Divider ── */}
          <div className="mx-3 mb-3 h-px bg-sidebar-border" />

          <SidebarGroupContent>
            <SidebarMenu className="gap-0.5 px-2">
              {links.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end
                      className="group flex items-center gap-3 rounded-sm px-3 py-2 text-sm text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-all duration-150"
                      activeClassName="bg-primary/15 text-white font-semibold hover:bg-primary/20 hover:text-white"
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      {!collapsed && <span className="leading-none py-2">{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="px-3 pb-3">
        {/* ── User card ── */}
        {!collapsed && user && (
          <div className="mb-1 px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.06] flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold text-xs shrink-0 shadow-sm shadow-primary/30 select-none">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-white/80 truncate leading-tight">{user.name}</p>
              <p className="text-[10px] text-sidebar-foreground/50 capitalize truncate mt-0.5 leading-none">
                {user.role.replace(/_/g, " ")}
              </p>
            </div>
          </div>
        )}

        {/* ── Logout ── */}
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={handleLogout}
              className="rounded-lg text-sm text-sidebar-foreground/50 hover:text-red-400 hover:bg-red-500/8 transition-all duration-150 gap-3 px-3"
            >
              <LogOut className="h-4 w-4 shrink-0" />
              {!collapsed && <span>Log out</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
