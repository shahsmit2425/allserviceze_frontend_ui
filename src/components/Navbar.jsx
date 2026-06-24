import { useState } from "react";
import logger from "@/utils/logger";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { NotificationBell } from "./NotificationBell";
import { Search, MessageSquare, LayoutDashboard, LogOut, Menu, X, User, Heart, Shield, Briefcase, Crown, Building2, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePlatform } from "@/mobile/hooks/usePlatform";
import { getPublicNavItems, getRoleNavItems, getTabletNavItems, isActiveRoute } from "./navigationConfig";

// Role badge component
const RoleBadge = ({ role, isAdmin }) => {
  const getRoleInfo = () => {
    if (isAdmin) return { label: "Admin" };
    if (role === "provider") return { label: "Provider" };
    return { label: "Customer" };
  };
  
  const { label } = getRoleInfo();
  
  return (
    <span className="role-badge">
      <span className="role-indicator"></span>
      {label}
    </span>
  );
};

const desktopLinkClasses = (active, variant = "default") => cn(
  "group flex items-center gap-2 text-sm font-medium transition-all duration-200",
  variant === "landing"
    ? active
      ? "px-0 py-2 text-foreground"
      : "px-0 py-2 text-muted-foreground hover:text-foreground"
    : active
      ? "rounded-[0.95rem] border border-primary/12 bg-primary/6 px-3.5 py-2.5 text-primary"
      : "rounded-lg px-3.5 py-2.5 text-muted-foreground hover:bg-muted hover:text-foreground"
);

const mobileLinkClasses = (active) => cn(
  "flex items-center gap-3 rounded-lg border px-4 py-3 text-sm font-medium transition-all duration-200",
  active
    ? "border-primary/16 bg-primary/6 text-primary"
    : "border-border bg-background text-foreground/80 hover:bg-muted hover:text-foreground"
);

const tabletLinkClasses = (active) => cn(
  "inline-flex min-w-max items-center gap-2.5 rounded-lg border px-4 py-2.5 text-sm font-medium transition-all duration-200",
  active
    ? "border-primary/16 bg-primary/6 text-primary"
    : "border-border/60 bg-background/92 text-foreground/80 hover:bg-muted hover:text-foreground"
);

export const Navbar = ({ variant = "default" }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { isNativeTablet } = usePlatform();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isLandingNav = variant === "landing";
  const showTabletNav = isNativeTablet && !isLandingNav;
  const showDesktopNav = !showTabletNav;
  const showMobileMenuButton = !showTabletNav;

  const navItems = getRoleNavItems(user);
  const publicNavItems = getPublicNavItems();
  const landingNavItems = [
    { kind: "route", to: "/projects", label: "Projects", icon: Briefcase, testId: "browse-projects-link" },
    { kind: "route", to: "/providers", label: "Find Providers", icon: Search, testId: "browse-providers-link" },
    { kind: "anchor", href: "/#how-it-works", label: "How It Works", icon: Shield },
    { kind: "anchor", href: "/#pricing", label: "Pricing", icon: Crown },
  ];

  const tabletNavItems = getTabletNavItems(user);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const getInitials = (name) => {
    return name?.split(" ").map(n => n[0]).join("").toUpperCase() || "U";
  };
  const isAdmin = user?.is_admin;
  const brandBadge = user && !isAdmin
    ? <RoleBadge role={user.role} isAdmin={user.is_admin} />
    : <span className="rounded-lg bg-muted px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">Independent marketplace</span>;

  return (
    <nav
      className={cn(
        "fixed inset-x-0 top-0 z-50 overflow-visible",
        isLandingNav && "border-b border-border/60 bg-background/95 backdrop-blur-xl"
      )}
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <div className={cn(isLandingNav ? "mx-auto w-full max-w-[96rem] px-4 sm:px-6 lg:px-10" : "page-shell pt-2.5")}>
      <div className={cn("w-full overflow-visible", isLandingNav ? "bg-transparent shadow-none" : "rounded-lg border border-border/60 bg-background/96 shadow-[0_12px_28px_-24px_rgba(15,23,42,0.08)]")}>
        <div className={cn("overflow-visible", isLandingNav ? "px-0" : "px-3.5 sm:px-5 lg:px-6")}>
          <div className={cn("flex items-center justify-between overflow-visible", isLandingNav ? "h-[4.85rem]" : "h-[4.1rem]")}>
          {/* Logo */}
            <Link to="/" className={cn(
              "group flex items-center gap-2.5 transition-colors duration-200",
              isLandingNav
                ? "py-2"
                : "-ml-2 rounded-[0.95rem] px-2.5 py-2 hover:bg-muted"
            )} data-testid="logo-link">
              <img
                src="/favicon.svg"
                alt="ServiceTones"
                width="36"
                height="36"
                decoding="async"
                className="h-9 w-9 rounded-[0.9rem] object-cover ring-1 ring-border"
              />
              <div className="flex flex-col">
                <span className="font-heading text-base font-extrabold tracking-[-0.03em] text-foreground sm:text-[1.04rem]">ServiceTones</span>
                <span className="hidden text-[9px] font-semibold uppercase tracking-[0.26em] text-muted-foreground lg:block">
                  Structured local services
                </span>
              </div>
              {!isLandingNav && <div className="hidden lg:flex">{brandBadge}</div>}
            </Link>

          {/* Desktop Navigation */}
            {showDesktopNav && (
            <div className="hidden items-center gap-2.5 overflow-visible md:flex">
            {isLandingNav && !user ? (
              <>
                <div className="hidden items-center gap-7 lg:ml-10 lg:flex xl:ml-14">
                  {landingNavItems.map((item) => item.kind === "route" ? (
                    <Link
                      key={item.label}
                      to={item.to}
                      className={desktopLinkClasses(isActiveRoute(location.pathname, item.to), "landing")}
                      data-testid={item.testId}
                    >
                      <item.icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </Link>
                  ) : (
                    <a
                      key={item.label}
                      href={item.href}
                      className={desktopLinkClasses(false, "landing")}
                    >
                      <item.icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </a>
                  ))}
                </div>

                <div className="ml-4 flex items-center gap-3 lg:ml-auto">
                  <Link to="/auth">
                    <Button variant="ghost" className="rounded-lg px-4.5 text-foreground/80 hover:text-foreground">Log In</Button>
                  </Link>
                  <Link to="/auth?mode=register">
                    <Button className="rounded-lg px-5.5 shadow-[0_18px_40px_-26px_hsl(var(--primary)/0.48)]">Get Started</Button>
                  </Link>
                </div>
              </>
            ) : (
              <>
            {/* Public links for non-logged in users */}
            <div className="hidden items-center gap-1 lg:flex">
            {!user && (
              <>
                {publicNavItems.map((item) => (
                  <Link 
                    key={item.to}
                    to={item.to} 
                    className={desktopLinkClasses(isActiveRoute(location.pathname, item.to))}
                    data-testid={item.testId}
                  >
                    <item.icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </Link>
                ))}
              </>
            )}

            {/* Role-specific navigation */}
            {user && navItems.map((item) => (
              <Link 
                key={item.to}
                to={item.to} 
                className={desktopLinkClasses(isActiveRoute(location.pathname, item.to))}
                data-testid={item.testId}
              >
                <item.icon className="w-4 h-4" />
                <span>{item.label}</span>
              </Link>
            ))}

            {user && (
              <>
                <Link 
                  to="/messages" 
                  className={desktopLinkClasses(isActiveRoute(location.pathname, "/messages"))}
                  data-testid="messages-link"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Messages</span>
                </Link>

                {!user.is_admin && (
                  <Link 
                    to="/favorites" 
                    className={desktopLinkClasses(isActiveRoute(location.pathname, "/favorites"))}
                    data-testid="favorites-link"
                  >
                    <Heart className="w-4 h-4" />
                    <span>Favorites</span>
                  </Link>
                )}
              </>
            )}
            </div>

            {user ? (
              <>
                <NotificationBell />
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-10 w-10 rounded-[0.95rem] bg-muted p-0 shadow-sm hover:bg-accent" data-testid="user-menu-trigger">
                      <Avatar className="h-9 w-9 border-2 border-primary/18">
                        <AvatarImage src={user.profile_image} />
                        <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
                          {getInitials(user.full_name)}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-64 rounded-lg border border-border bg-background p-2 shadow-[0_18px_42px_-28px_rgba(15,23,42,0.16)]">
                    <div className="rounded-lg bg-muted px-3 py-3">
                      <p className="font-semibold tracking-[-0.01em]">{user.full_name}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{user.email}</p>
                      <div className="mt-3">
                        <RoleBadge role={user.role} isAdmin={user.is_admin} />
                      </div>
                    </div>
                    <DropdownMenuSeparator />
                    
                    {/* Dashboard - for customers and providers */}
                    {!isAdmin && (
                      <DropdownMenuItem onClick={() => navigate("/dashboard")} data-testid="dropdown-dashboard">
                        <LayoutDashboard className="w-4 h-4 mr-2" />
                        Dashboard
                      </DropdownMenuItem>
                    )}
                    
                    {/* Customer-specific menu items */}
                    {user.role === "customer" && !isAdmin && (
                      <>
                        <DropdownMenuItem onClick={() => navigate("/favorites")} data-testid="dropdown-favorites">
                          <Heart className="w-4 h-4 mr-2" />
                          Favorites
                        </DropdownMenuItem>
                      </>
                    )}
                    
                    {/* Provider-specific menu items */}
                    {user.role === "provider" && !isAdmin && (
                      <>
                        <DropdownMenuItem onClick={() => navigate("/favorites")} data-testid="dropdown-favorites">
                          <Heart className="w-4 h-4 mr-2" />
                          Favorites
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => navigate("/schedule")} data-testid="dropdown-schedule">
                          <Calendar className="w-4 h-4 mr-2" />
                          Schedule
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => navigate("/business-profile")} data-testid="dropdown-business-profile">
                          <Building2 className="w-4 h-4 mr-2" />
                          Business Profile
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => navigate("/subscription")} data-testid="dropdown-subscription">
                          <Crown className="w-4 h-4 mr-2" />
                          Subscription
                        </DropdownMenuItem>
                      </>
                    )}
                    
                    {/* Messages - for all users */}
                    <DropdownMenuItem onClick={() => navigate("/messages")} data-testid="dropdown-messages">
                      <MessageSquare className="w-4 h-4 mr-2" />
                      Messages
                    </DropdownMenuItem>

                    {/* Settings */}
                    <DropdownMenuItem onClick={() => navigate("/settings")} data-testid="dropdown-settings">
                      <Shield className="w-4 h-4 mr-2" />
                      Account Settings
                    </DropdownMenuItem>
                    
                    <DropdownMenuSeparator />
                    
                    <DropdownMenuItem onClick={handleLogout} data-testid="dropdown-logout" className="text-destructive">
                      <LogOut className="w-4 h-4 mr-2" />
                      Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <>
                <Link to="/auth">
                  <Button variant="outline" className="rounded-[0.95rem] bg-card px-4.5 shadow-none">Log In</Button>
                </Link>
                <Link to="/auth?mode=register">
                  <Button className="rounded-[0.95rem] px-4.5">Get Started</Button>
                </Link>
              </>
            )}
              </>
            )}
            </div>
            )}

          {/* Mobile Menu Button */}
            <div className={cn("items-center gap-2", showTabletNav ? "hidden" : "flex md:hidden", !showMobileMenuButton && "hidden")}>
              {user && <NotificationBell />}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="rounded-[0.95rem] bg-muted shadow-sm hover:bg-accent md:hidden"
                data-testid="mobile-menu-button"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </Button>
            </div>
          </div>
        </div>

        {showTabletNav && (
          <div className="border-t border-border/60 bg-card/96 px-4 pb-3 pt-2 backdrop-blur-xl sm:px-5 lg:px-6">
            <div className="flex items-center justify-between gap-4">
              <div className="tablet-nav-scroll flex min-w-0 flex-1 items-center gap-2 overflow-x-auto pb-1">
                {tabletNavItems.map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={tabletLinkClasses(isActiveRoute(location.pathname, item.to))}
                    data-testid={`tablet-nav-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </Link>
                ))}
                {!user && (
                  <Link
                    to="/auth?mode=register"
                    className="inline-flex min-w-max items-center rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-[0_18px_36px_-24px_hsl(var(--primary)/0.48)]"
                  >
                    Get Started
                  </Link>
                )}
              </div>

              <div className="flex items-center gap-2">
                {user && <NotificationBell />}
                {user ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="relative h-10 w-10 rounded-[0.95rem] bg-muted p-0 shadow-sm hover:bg-accent" data-testid="tablet-user-menu-trigger">
                        <Avatar className="h-9 w-9 border-2 border-primary/18">
                          <AvatarImage src={user.profile_image} />
                          <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
                            {getInitials(user.full_name)}
                          </AvatarFallback>
                        </Avatar>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-64 rounded-lg border border-border bg-background p-2 shadow-[0_18px_42px_-28px_rgba(15,23,42,0.16)]">
                      <div className="rounded-lg bg-muted px-3 py-3">
                        <p className="font-semibold tracking-[-0.01em]">{user.full_name}</p>
                        <p className="mt-1 text-sm text-muted-foreground">{user.email}</p>
                        <div className="mt-3">
                          <RoleBadge role={user.role} isAdmin={user.is_admin} />
                        </div>
                      </div>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => navigate("/settings")}>
                        <Shield className="mr-2 h-4 w-4" />
                        Account Settings
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                        <LogOut className="mr-2 h-4 w-4" />
                        Logout
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : null}
              </div>
            </div>
          </div>
        )}

        {/* Mobile Menu */}
        {mobileMenuOpen && !showTabletNav && (
          <div className="border-t border-border/60 bg-card md:hidden">
            <div className="space-y-2 px-4 pb-4 pt-3">
            {!user ? (
              <>
                {/* Public navigation for non-logged in users */}
                {(isLandingNav ? landingNavItems : publicNavItems).map((item) => item.kind === "anchor" ? (
                  <a
                    key={item.label}
                    href={item.href}
                    className={mobileLinkClasses(false)}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <item.icon className="w-5 h-5" />
                    <span>{item.label}</span>
                  </a>
                ) : (
                  <Link 
                    key={item.to}
                    to={item.to} 
                    className={mobileLinkClasses(isActiveRoute(location.pathname, item.to))}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <item.icon className="w-5 h-5" />
                    <span>{item.label}</span>
                  </Link>
                ))}
                <div className="pt-4 space-y-2">
                  <div className="pb-2">{brandBadge}</div>
                  <Link 
                    to="/auth" 
                    className={mobileLinkClasses(isActiveRoute(location.pathname, "/auth"))}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <User className="w-5 h-5" />
                    <span>Log In</span>
                  </Link>
                  <Link 
                    to="/auth?mode=register" 
                    className="flex items-center justify-center gap-3 rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-[0_18px_36px_-24px_hsl(var(--primary)/0.48)]"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <span>Get Started</span>
                  </Link>
                </div>
              </>
            ) : (
              <>
                {/* User Info */}
                <div className="mb-2 rounded-lg bg-muted px-4 py-4 shadow-sm">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10 border-2 border-primary/18">
                      <AvatarImage src={user.profile_image} />
                      <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
                        {getInitials(user.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{user.full_name}</p>
                      <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                      <div className="mt-1">
                        <RoleBadge role={user.role} isAdmin={user.is_admin} />
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 lg:hidden">{brandBadge}</div>
                </div>

                {/* Role-specific navigation */}
                {navItems.map((item) => (
                  <Link 
                    key={item.to}
                    to={item.to} 
                    className={mobileLinkClasses(isActiveRoute(location.pathname, item.to))}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <item.icon className="w-5 h-5" />
                    <span>{item.label}</span>
                  </Link>
                ))}

                {/* Messages */}
                <Link 
                  to="/messages" 
                  className={mobileLinkClasses(isActiveRoute(location.pathname, "/messages"))}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <MessageSquare className="w-5 h-5" />
                  <span>Messages</span>
                </Link>

                {!user.is_admin && (
                  <Link
                    to="/favorites"
                    className={mobileLinkClasses(isActiveRoute(location.pathname, "/favorites"))}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Heart className="w-5 h-5" />
                    <span>Favorites</span>
                  </Link>
                )}

                <Link
                  to="/settings"
                  className={mobileLinkClasses(isActiveRoute(location.pathname, "/settings"))}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Shield className="w-5 h-5" />
                  <span>Account Settings</span>
                </Link>

                {/* Provider-specific account actions */}
                {user.role === "provider" && !isAdmin && (
                  <Link
                    to="/schedule"
                    className={mobileLinkClasses(isActiveRoute(location.pathname, "/schedule"))}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Calendar className="w-5 h-5" />
                    <span>Schedule</span>
                  </Link>
                )}

                {user.role === "provider" && !isAdmin && (
                  <Link
                    to="/business-profile"
                    className={mobileLinkClasses(isActiveRoute(location.pathname, "/business-profile"))}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Building2 className="w-5 h-5" />
                    <span>Business Profile</span>
                  </Link>
                )}

                {user.role === "provider" && !isAdmin && (
                  <Link 
                    to="/subscription" 
                    className={mobileLinkClasses(isActiveRoute(location.pathname, "/subscription"))}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Crown className="w-5 h-5" />
                    <span>Subscription</span>
                  </Link>
                )}

                {/* Logout */}
                <button 
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleLogout();
                  }}
                  className="flex w-full items-center gap-3 rounded-lg border border-border bg-background px-4 py-3 text-sm font-medium text-destructive transition-all duration-200 hover:border-rose-200 hover:bg-rose-50"
                >
                  <LogOut className="w-5 h-5" />
                  <span>Logout</span>
                </button>
              </>
            )}
            </div>
          </div>
        )}
      </div>
      </div>
    </nav>
  );
};
