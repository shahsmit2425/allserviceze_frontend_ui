import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Button } from "./ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { NotificationBell } from "./NotificationBell";
import { 
  ChevronRight, Menu, X, Home, Briefcase, Search, MessageSquare, 
  Heart, Settings, LogOut, Bell, User, Building2, Calendar, Crown, Shield 
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getRoleNavItems } from "./navigationConfig";

const SidebarLink = ({ to, icon: Icon, label, isActive, onClick }) => (
  <Link
    to={to}
    onClick={onClick}
    className={cn(
      "group flex items-center gap-3.5 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 relative",
      isActive
        ? "bg-gradient-to-r from-copper-600/10 to-copper-600/5 text-deep-navy-800 shadow-sm border border-copper-600/30"
        : "text-deep-navy-500 hover:text-deep-navy-800 hover:bg-white"
    )}
  >
    <Icon className={cn("w-5 h-5 flex-shrink-0", isActive && "text-copper-500")} />
    <span className="flex-1">{label}</span>
    {isActive && (
      <div className="w-1.5 h-1.5 rounded-full bg-gradient-to-r from-copper-500 to-copper-600" />
    )}
  </Link>
);

export const Sidebar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const getInitials = (name) => {
    return name?.split(" ").map(n => n[0]).join("").toUpperCase() || "U";
  };

  const navItems = user ? getRoleNavItems(user) : [];

  const allNavItems = [
    ...navItems,
    ...(user && !user.is_admin
      ? [
          { to: "/messages", icon: MessageSquare, label: "Messages" },
          { to: "/favorites", icon: Heart, label: "Favorites" },
        ]
      : []),
  ];

  const isAdmin = user?.is_admin;

  return (
    <>
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex flex-col border-r border-deep-navy-100 bg-white transition-all duration-300",
          sidebarOpen ? "w-64" : "w-20"
        )}
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-deep-navy-100 px-4 py-4 sm:px-5">
          {sidebarOpen && (
            <Link to="/" className="flex items-center gap-2.5 font-heading text-lg font-bold text-deep-navy-800">
              <img
                src="/favicon.svg"
                alt="ServiceTones"
                width="32"
                height="32"
                className="h-8 w-8 rounded-lg object-cover ring-1 ring-copper-600/20"
              />
              <span>ServiceTones</span>
            </Link>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="rounded-lg hover:bg-deep-navy-50"
          >
            {sidebarOpen ? <ChevronRight className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
        </div>

        {/* Search Bar */}
        {sidebarOpen && user && (
          <div className="border-b border-deep-navy-100 px-4 py-3 sm:px-5">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search..."
                className="w-full rounded-lg border border-deep-navy-200 bg-white pl-9 pr-3 py-2 text-sm text-deep-navy-800 placeholder:text-slate-400 transition-colors focus:border-copper-600 focus:outline-none focus:ring-2 focus:ring-copper-600/20"
              />
            </div>
          </div>
        )}

        {/* Navigation Menu */}
        {user && (
          <nav className={cn("flex-1 overflow-y-auto", sidebarOpen ? "px-4 py-5 sm:px-5" : "px-2 py-4")}>
            <div className="space-y-2">
              {allNavItems.map((item) => (
                <SidebarLink
                  key={item.to}
                  to={item.to}
                  icon={item.icon}
                  label={item.label}
                  isActive={location.pathname === item.to}
                  onClick={() => {
                    // Could close sidebar on mobile if needed
                  }}
                />
              ))}
            </div>

            {/* Divider */}
            {sidebarOpen && (
              <div className="my-6 border-t border-deep-navy-100" />
            )}

            {/* Additional Options */}
            {sidebarOpen && (
              <div className="space-y-2">
                <SidebarLink
                  to="/settings"
                  icon={Settings}
                  label="Settings"
                  isActive={location.pathname === "/settings"}
                />
              </div>
            )}
          </nav>
        )}

        {/* Notifications Badge */}
        {!sidebarOpen && user && (
          <div className="border-t border-deep-navy-100 px-2 py-3 text-center">
            <NotificationBell />
          </div>
        )}

        {/* User Profile Section */}
        {user && (
          <div className={cn(
            "border-t border-deep-navy-100 bg-white p-3 sm:p-4",
            sidebarOpen ? "" : "flex flex-col items-center"
          )}>
            <div
              className={cn(
                "group relative rounded-lg cursor-pointer transition-all",
                sidebarOpen ? "p-3 hover:bg-deep-navy-50" : "flex flex-col items-center gap-2"
              )}
              onClick={() => setUserMenuOpen(!userMenuOpen)}
            >
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10 border-2 border-copper-600/30 ring-2 ring-white">
                  <AvatarImage src={user.profile_image} />
                  <AvatarFallback className="bg-gradient-to-br from-copper-600 to-copper-500 text-white font-semibold">
                    {getInitials(user.full_name)}
                  </AvatarFallback>
                </Avatar>
                {sidebarOpen && (
                  <div className="flex-1 min-w-0">
                    <p className="truncate font-semibold text-deep-navy-800 text-sm">{user.full_name}</p>
                    <p className="truncate text-xs text-slate-500">{user.email}</p>
                  </div>
                )}
              </div>

              {/* User Menu Dropdown */}
              {userMenuOpen && sidebarOpen && (
                <div className="absolute bottom-full left-0 right-0 mb-2 rounded-lg border border-deep-navy-100 bg-white shadow-lg p-2 z-50">
                  {user.role === "customer" && !isAdmin && (
                    <button
                      onClick={() => navigate("/dashboard")}
                      className="w-full flex items-center gap-3 px-3 py-2 text-sm text-deep-navy-600 hover:bg-deep-navy-50 rounded-lg transition-colors"
                    >
                      <Home className="w-4 h-4" />
                      Dashboard
                    </button>
                  )}
                  {user.role === "provider" && !isAdmin && (
                    <>
                      <button
                        onClick={() => navigate("/dashboard")}
                        className="w-full flex items-center gap-3 px-3 py-2 text-sm text-deep-navy-600 hover:bg-deep-navy-50 rounded-lg transition-colors"
                      >
                        <Home className="w-4 h-4" />
                        Dashboard
                      </button>
                      <button
                        onClick={() => navigate("/business-profile")}
                        className="w-full flex items-center gap-3 px-3 py-2 text-sm text-deep-navy-600 hover:bg-deep-navy-50 rounded-lg transition-colors"
                      >
                        <Building2 className="w-4 h-4" />
                        Business Profile
                      </button>
                      <button
                        onClick={() => navigate("/schedule")}
                        className="w-full flex items-center gap-3 px-3 py-2 text-sm text-deep-navy-600 hover:bg-deep-navy-50 rounded-lg transition-colors"
                      >
                        <Calendar className="w-4 h-4" />
                        Schedule
                      </button>
                      <button
                        onClick={() => navigate("/subscription")}
                        className="w-full flex items-center gap-3 px-3 py-2 text-sm text-deep-navy-600 hover:bg-deep-navy-50 rounded-lg transition-colors"
                      >
                        <Crown className="w-4 h-4" />
                        Subscription
                      </button>
                    </>
                  )}
                  <div className="border-t border-deep-navy-100 my-2" />
                  <button
                    onClick={() => navigate("/settings")}
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm text-deep-navy-600 hover:bg-deep-navy-50 rounded-lg transition-colors"
                  >
                    <Shield className="w-4 h-4" />
                    Account Settings
                  </button>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </aside>

      {/* Main Content Spacer */}
      <div
        className={cn(
          "transition-all duration-300",
          sidebarOpen ? "ml-64" : "ml-20"
        )}
      >
        {/* This div pushes content to the right of the sidebar */}
      </div>
    </>
  );
};
