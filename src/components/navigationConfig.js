import {
  Briefcase,
  Building2,
  Calendar,
  Crown,
  Heart,
  LayoutDashboard,
  MessageSquare,
  Plus,
  Search,
  Shield,
  User,
} from "lucide-react";

export const isActiveRoute = (pathname, to) => {
  if (pathname === to) {
    return true;
  }

  if (["/providers", "/projects", "/messages"].includes(to) && pathname.startsWith(`${to}/`)) {
    return true;
  }

  return false;
};

export const getPublicNavItems = () => [
  { to: "/projects", label: "Projects", icon: Briefcase, testId: "browse-projects-link" },
  { to: "/providers", label: "Providers", icon: Search, testId: "browse-providers-link" },
];

export const getRoleNavItems = (user) => {
  if (!user || user.is_admin) {
    return [];
  }

  if (user.role === "provider") {
    return [
      { to: "/projects", label: "Browse Projects", icon: Briefcase, testId: "browse-projects-link" },
      { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, testId: "dashboard-link" },
      { to: "/schedule", label: "Schedule", icon: Calendar, testId: "schedule-link" },
    ];
  }

  if (user.role === "customer") {
    return [
      { to: "/providers", label: "Providers", icon: Search, testId: "browse-providers-link" },
      { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, testId: "dashboard-link" },
      { to: "/projects/post", label: "Post Project", icon: Plus, testId: "post-project-link" },
    ];
  }

  return [];
};

export const getTabletNavItems = (user) => {
  if (!user) {
    return [
      ...getPublicNavItems(),
      { to: "/auth", label: "Log In", icon: User },
    ];
  }

  const items = [
    ...getRoleNavItems(user),
    { to: "/messages", label: "Messages", icon: MessageSquare },
  ];

  if (!user.is_admin) {
    items.push({ to: "/favorites", label: "Favorites", icon: Heart });
  }

  if (user.role === "provider" && !user.is_admin) {
    items.push({ to: "/schedule", label: "Schedule", icon: Calendar });
    items.push({ to: "/business-profile", label: "Business Profile", icon: Building2 });
    items.push({ to: "/subscription", label: "Subscription", icon: Crown });
  }

  items.push({ to: "/settings", label: "Settings", icon: Shield });

  return items;
};

export const getBottomTabItems = (user) => {
  if (!user || user.is_admin) {
    return [];
  }

  if (user.role === "provider") {
    return [
      { to: "/projects", label: "Projects", icon: Briefcase },
      { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { to: "/schedule", label: "Schedule", icon: Calendar },
      { to: "/messages", label: "Messages", icon: MessageSquare },
      { to: "/business-profile", label: "Business", icon: Building2 },
    ];
  }

  return [
    { to: "/providers", label: "Providers", icon: Search },
    { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { to: "/projects/post", label: "Post", icon: Plus },
    { to: "/messages", label: "Messages", icon: MessageSquare },
    { to: "/favorites", label: "Saved", icon: Heart },
  ];
};

export const shouldShowBottomNav = (pathname, user) => {
  if (!user || user.is_admin) {
    return false;
  }

  return [
    "/dashboard",
    "/favorites",
    "/providers",
    "/projects",
    "/settings",
    "/business-profile",
    "/schedule",
    "/subscription",
    "/messages",
  ].includes(pathname);
};