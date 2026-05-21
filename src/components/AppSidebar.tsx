import {
  LayoutDashboard, BookOpen, Users, LogOut, GraduationCap, MessageSquare, Star, UserCircle, Tags,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarFooter, useSidebar,
} from "@/components/ui/sidebar";

const adminLinks = [
  { title: "Dashboard",       url: "/dashboard",    icon: LayoutDashboard },
  { title: "Courses",         url: "/courses",      icon: BookOpen },
  { title: "Categories",      url: "/categories",   icon: Tags },
  { title: "Learners",        url: "/learners",     icon: Users },
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
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const navigate = useNavigate();
  const links = user?.role === "admin" ? adminLinks : learnerLinks;

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>
            <GraduationCap className="mr-2 h-4 w-4" />
            {!collapsed && <span>Training Portal</span>}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {links.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} end className="hover:bg-sidebar-accent/50" activeClassName="bg-sidebar-accent text-sidebar-primary-foreground font-medium">
                      <item.icon className="mr-2 h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={handleLogout} className="text-destructive hover:bg-destructive/10">
              <LogOut className="mr-2 h-4 w-4" />
              {!collapsed && <span>Logout</span>}
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
