import { useEffect, useState } from "react";
import logger from "@/utils/logger";
import { Helmet } from "react-helmet-async";
import { Link, useNavigate } from "react-router-dom";
import { AppShell } from "../components/AppShell";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { useAuth } from "../context/AuthContext";
import { toast } from "sonner";
import axios from "axios";
import { usePendingActions } from "../hooks/usePendingActions";
import { usePlatform } from "@/mobile/hooks/usePlatform";
import {
  ArrowRight,
  BellRing,
  Briefcase,
  Calendar,
  CheckCircle,
  ChevronRight,
  DollarSign,
  Edit,
  Loader2,
  MessageSquare,
  Pause,
  Plus,
  RotateCcw,
  Send,
  ShieldCheck,
  Sparkles,
  Star,
  StopCircle,
  Trash2,
  TrendingUp,
} from "lucide-react";

const DASHBOARD_CANONICAL_URL = "https://servicetones.com/dashboard";
const API_URL = `${import.meta.env.VITE_BACKEND_URL || "http://localhost:5000"}/api`;

const statusColors = {
  draft: "bg-deep-navy-50 text-deep-navy-600",
  pending_approval: "bg-blue-100 text-blue-700",
  pending: "bg-blue-100 text-blue-700",
  approved: "bg-emerald-100 text-emerald-700",
  live: "bg-emerald-100 text-emerald-700",
  awarded: "bg-copper-100 text-amber-700",
  sold: "bg-emerald-100 text-emerald-700",
  in_progress: "bg-blue-100 text-blue-700",
  completed: "bg-emerald-100 text-emerald-700",
  closed: "bg-deep-navy-100 text-deep-navy-600",
  rejected: "bg-rose-100 text-rose-700",
  paused: "bg-orange-100 text-orange-700",
};

const statusLabels = {
  draft: "Draft",
  pending: "Pending Approval",
  pending_approval: "Pending Approval",
  approved: "Approved",
  rejected: "Rejected",
  live: "Live",
  awarded: "Awarded",
  sold: "Sold",
  in_progress: "In Progress",
  completed: "Completed",
  closed: "Closed",
  paused: "Paused",
};

const formatDateLabel = (value, options) => {
  if (!value) return "No recent activity";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "No recent activity";
  return date.toLocaleDateString(undefined, options || { month: "short", day: "numeric" });
};

const formatDateTimeLabel = (value) => {
  if (!value) return "Schedule pending";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Schedule pending";
  return date.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
};

const formatRelativeLabel = (value) => {
  if (!value) return "No recent activity";
  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) return "No recent activity";

  const diffMs = Date.now() - timestamp;
  const diffMinutes = Math.max(1, Math.round(diffMs / 60000));
  if (diffMinutes < 60) return `${diffMinutes}m ago`;

  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.round(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;

  return formatDateLabel(value);
};

const formatBudgetRange = (project) => {
  const min = Number(project?.budget_min) || 0;
  const max = Number(project?.budget_max) || 0;
  if (min && max) return `$${min.toLocaleString()} - $${max.toLocaleString()}`;
  if (max) return `Up to $${max.toLocaleString()}`;
  if (min) return `From $${min.toLocaleString()}`;
  return "Custom budget";
};

const formatReviewCount = (count) => `${count || 0} review${Number(count) === 1 ? "" : "s"}`;

const normalizeProject = (project) => ({
  ...project,
  deadlineLabel: project.deadline ? new Date(project.deadline).toLocaleDateString() : "Flexible",
  bidCountValue: Number(project.bid_count) || 0,
  viewCountValue: Number(project.view_count) || 0,
  messageCountValue: 0,
  unreadProjectMessages: 0,
  lastActivityAt: project.updated_at || project.created_at,
  lastActivityLabel: formatRelativeLabel(project.updated_at || project.created_at),
});

export default function CustomerDashboard() {
  const navigate = useNavigate();
  const { user, getAuthHeader } = useAuth();
  const { isNativePhone, isNativeTablet } = usePlatform();
  const { isPending, runPendingAction } = usePendingActions();

  const [projects, setProjects] = useState([]);
  const [stats, setStats] = useState({ total_projects: 0, completed_projects: 0, live_projects: 0, favorites_count: 0 });
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [bookings, setBookings] = useState([]);
  const [recommendedProviders, setRecommendedProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [visibleCount, setVisibleCount] = useState(() => (isNativePhone ? 4 : 6));

  const getProjectActionKey = (action, projectId) => `${action}:${projectId}`;
  const isProjectActionPending = (projectId) =>
    ["submit", "go-live", "pause", "resume", "complete", "stop", "delete"].some((action) =>
      isPending(getProjectActionKey(action, projectId))
    );

  useEffect(() => {
    fetchDashboardData();
  }, []);

  useEffect(() => {
    setVisibleCount(isNativePhone ? 4 : 6);
  }, [activeTab, isNativePhone, projects.length]);

  const fetchDashboardData = async () => {
    try {
      const headers = getAuthHeader();
      const [projectsRes, statsRes, unreadRes, bookingsRes, providersRes, conversationsRes] = await Promise.allSettled([
        axios.get(`${API_URL}/projects/my`, { headers }),
        axios.get(`${API_URL}/stats/customer`, { headers }),
        axios.get(`${API_URL}/messages/unread-count`, { headers }),
        axios.get(`${API_URL}/bookings`, { headers }),
        axios.get(`${API_URL}/providers/featured?limit=4&scope=project_posting`, { withCredentials: false }),
        axios.get(`${API_URL}/chat/conversations`, { headers }),
      ]);

      const projectRows = projectsRes.status === "fulfilled" && Array.isArray(projectsRes.value.data)
        ? projectsRes.value.data
        : [];
      const conversationRows = conversationsRes.status === "fulfilled" && Array.isArray(conversationsRes.value.data)
        ? conversationsRes.value.data
        : [];

      const conversationByProject = conversationRows.reduce((accumulator, conversation) => {
        if (!conversation.project_id) return accumulator;

        const current = accumulator[conversation.project_id] || { count: 0, unread: 0, last_message_at: null };
        const lastMessageAt = conversation.last_message_at || conversation.last_message?.created_at || null;
        const currentTimestamp = current.last_message_at ? new Date(current.last_message_at).getTime() : 0;
        const nextTimestamp = lastMessageAt ? new Date(lastMessageAt).getTime() : 0;

        accumulator[conversation.project_id] = {
          count: current.count + 1,
          unread: current.unread + (Number(conversation.unread_count) || 0),
          last_message_at: nextTimestamp > currentTimestamp ? lastMessageAt : current.last_message_at,
        };
        return accumulator;
      }, {});

      const normalizedProjects = projectRows.map((project) => {
        const projectConversation = conversationByProject[project.id] || { count: 0, unread: 0, last_message_at: null };
        const baseActivity = [project.updated_at, project.live_at, project.approved_at, project.created_at].filter(Boolean);
        const lastActivityAt = [projectConversation.last_message_at, ...baseActivity]
          .filter(Boolean)
          .sort((left, right) => new Date(right).getTime() - new Date(left).getTime())[0] || project.updated_at || project.created_at;

        return {
          ...normalizeProject(project),
          messageCountValue: projectConversation.count,
          unreadProjectMessages: projectConversation.unread,
          lastActivityAt,
          lastActivityLabel: formatRelativeLabel(lastActivityAt),
        };
      });

      setProjects(normalizedProjects);
      setStats(
        statsRes.status === "fulfilled"
          ? statsRes.value.data || { total_projects: 0, completed_projects: 0, live_projects: 0, favorites_count: 0 }
          : { total_projects: 0, completed_projects: 0, live_projects: 0, favorites_count: 0 }
      );
      setUnreadMessages(unreadRes.status === "fulfilled" ? Number(unreadRes.value.data?.count) || 0 : 0);
      setBookings(bookingsRes.status === "fulfilled" && Array.isArray(bookingsRes.value.data) ? bookingsRes.value.data : []);
      setRecommendedProviders(providersRes.status === "fulfilled" && Array.isArray(providersRes.value.data) ? providersRes.value.data : []);
    } catch (error) {
      logger.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (projectId) => {
    if (!window.confirm("Are you sure you want to delete this project?")) return;

    await runPendingAction(getProjectActionKey("delete", projectId), async () => {
      try {
        await axios.delete(`${API_URL}/projects/${projectId}`, { headers: getAuthHeader() });
        toast.success("Project deleted");
        await fetchDashboardData();
      } catch (error) {
        toast.error(error.response?.data?.detail || "Failed to delete project");
      }
    });
  };

  const handleSubmitForApproval = async (projectId) => {
    await runPendingAction(getProjectActionKey("submit", projectId), async () => {
      try {
        await axios.post(`${API_URL}/projects/${projectId}/submit`, {}, { headers: getAuthHeader() });
        toast.success("Submitted for approval!");
        await fetchDashboardData();
      } catch {
        toast.error("Failed to submit");
      }
    });
  };

  const handleGoLive = async (projectId) => {
    await runPendingAction(getProjectActionKey("go-live", projectId), async () => {
      try {
        await axios.post(`${API_URL}/projects/${projectId}/go-live`, {}, { headers: getAuthHeader() });
        toast.success("Project is now live!");
        await fetchDashboardData();
      } catch {
        toast.error("Failed to go live");
      }
    });
  };

  const handlePause = async (projectId) => {
    if (!window.confirm("Pause this project?")) return;
    await runPendingAction(getProjectActionKey("pause", projectId), async () => {
      try {
        await axios.post(`${API_URL}/projects/${projectId}/pause`, {}, { headers: getAuthHeader() });
        toast.success("Project paused");
        await fetchDashboardData();
      } catch {
        toast.error("Failed to pause");
      }
    });
  };

  const handleResume = async (projectId) => {
    await runPendingAction(getProjectActionKey("resume", projectId), async () => {
      try {
        await axios.post(`${API_URL}/projects/${projectId}/resume`, {}, { headers: getAuthHeader() });
        toast.success("Project resumed!");
        await fetchDashboardData();
      } catch {
        toast.error("Failed to resume");
      }
    });
  };

  const handleComplete = async (projectId) => {
    await runPendingAction(getProjectActionKey("complete", projectId), async () => {
      try {
        await axios.post(`${API_URL}/projects/${projectId}/complete`, {}, { headers: getAuthHeader() });
        toast.success("Project completed!");
        await fetchDashboardData();
      } catch {
        toast.error("Failed to complete");
      }
    });
  };

  const handleStop = async (projectId) => {
    if (!window.confirm("Stop this project? It will revert to live.")) return;
    await runPendingAction(getProjectActionKey("stop", projectId), async () => {
      try {
        await axios.post(`${API_URL}/projects/${projectId}/stop`, {}, { headers: getAuthHeader() });
        toast.success("Project stopped. Now live again.");
        await fetchDashboardData();
      } catch {
        toast.error("Failed to stop project");
      }
    });
  };

  const filteredProjects = activeTab === "all"
    ? projects
    : activeTab === "pending"
      ? projects.filter((project) => ["draft", "pending", "pending_approval", "approved"].includes(project.status))
      : activeTab === "in_progress"
        ? projects.filter((project) => ["awarded", "sold", "in_progress"].includes(project.status))
        : projects.filter((project) => project.status === activeTab);

  const counts = {
    all: projects.length,
    live: projects.filter((project) => project.status === "live").length,
    pending: projects.filter((project) => ["draft", "pending", "pending_approval", "approved"].includes(project.status)).length,
    in_progress: projects.filter((project) => ["awarded", "sold", "in_progress"].includes(project.status)).length,
    completed: projects.filter((project) => project.status === "completed").length,
  };

  const upcomingBookings = bookings
    .filter((booking) => ["pending", "confirmed"].includes(booking.status))
    .sort((left, right) => new Date(left.scheduled_at_customer || left.scheduled_date).getTime() - new Date(right.scheduled_at_customer || right.scheduled_date).getTime());

  const actionableProjects = projects
    .filter((project) => project.bidCountValue > 0 || project.unreadProjectMessages > 0 || ["approved", "draft", "rejected"].includes(project.status))
    .sort((left, right) => {
      const leftScore = left.unreadProjectMessages + left.bidCountValue;
      const rightScore = right.unreadProjectMessages + right.bidCountValue;
      if (rightScore !== leftScore) return rightScore - leftScore;
      return new Date(right.lastActivityAt).getTime() - new Date(left.lastActivityAt).getTime();
    })
    .slice(0, 3);

  const projectsReadyForQuotes = projects.filter((project) => project.status === "live" && project.bidCountValue > 0);
  const activeConversationProjects = projects.filter((project) => project.messageCountValue > 0);
  const awardedProjects = projects.filter((project) => ["awarded", "sold", "in_progress"].includes(project.status));

  const newBidsCount = projects
    .filter((project) => project.status === "live")
    .reduce((sum, project) => sum + project.bidCountValue, 0);

  const topProjects = (projects.filter((project) => ["live", "awarded", "sold", "in_progress", "paused"].includes(project.status)).length
    ? projects.filter((project) => ["live", "awarded", "sold", "in_progress", "paused"].includes(project.status))
    : projects)
    .slice();

  const priorityProjects = topProjects
    .sort((left, right) => new Date(right.lastActivityAt).getTime() - new Date(left.lastActivityAt).getTime())
    .slice(0, visibleCount)
    .filter((project) => filteredProjects.some((item) => item.id === project.id));

  const recentActivityItems = [
    ...projects
      .filter((project) => project.bidCountValue > 0)
      .slice(0, 3)
      .map((project) => ({
        id: `bid-${project.id}`,
        type: "bid",
        title: `${project.bidCountValue} quote${project.bidCountValue === 1 ? "" : "s"} on ${project.title}`,
        detail: `${project.category} · ${formatBudgetRange(project)}`,
        timestamp: project.lastActivityAt,
      })),
    ...projects
      .filter((project) => project.unreadProjectMessages > 0)
      .slice(0, 3)
      .map((project) => ({
        id: `message-${project.id}`,
        type: "message",
        title: `${project.unreadProjectMessages} unread message${project.unreadProjectMessages === 1 ? "" : "s"} on ${project.title}`,
        detail: "Project thread waiting on your reply",
        timestamp: project.lastActivityAt,
      })),
    ...projects
      .filter((project) => project.viewCountValue > 0)
      .slice(0, 3)
      .map((project) => ({
        id: `view-${project.id}`,
        type: "view",
        title: `${project.viewCountValue} marketplace view${project.viewCountValue === 1 ? "" : "s"} on ${project.title}`,
        detail: "Visibility signal from active providers",
        timestamp: project.updated_at || project.created_at,
      })),
  ]
    .sort((left, right) => new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime())
    .slice(0, 6);

  if (loading) {
    return (
      <AppShell theme="customer" className="bg-background" contentClassName="pb-0">
        <div className="flex items-center justify-center py-32">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell theme="customer" className="bg-background pb-12" contentClassName="pb-12" data-testid="customer-dashboard">
      <Helmet>
        <title>Customer Dashboard | ServiceTones</title>
        <meta name="description" content="Manage customer projects, bookings, messages, and delivery progress from the ServiceTones dashboard." />
        <meta name="robots" content="noindex,nofollow" />
        <link rel="canonical" href={DASHBOARD_CANONICAL_URL} />
      </Helmet>

      <div className="page-shell space-y-5 py-6 sm:space-y-6 sm:py-7">
        <section className="overflow-hidden rounded-2xl border border-border/60 bg-background shadow-[0_28px_80px_-48px_rgba(15,23,42,0.18)]">
          <div className="grid gap-5 px-5 py-6 sm:px-7 sm:py-7 lg:grid-cols-[minmax(0,1.1fr)_22rem] lg:items-end">
            <div>
              <div className="inline-flex items-center gap-2 rounded-lg border border-primary/10 bg-white px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-primary shadow-sm">
                <Sparkles className="h-3.5 w-3.5" />
                Homeowner command center
              </div>
              <h1 className="mt-4 font-heading text-[clamp(2.2rem,4.2vw,3.9rem)] font-extrabold leading-[0.95] tracking-[-0.06em] text-foreground">
                Welcome back, {user?.full_name?.split(" ")?.[0] || "there"}.
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground sm:text-base">
                Review fresh quotes, reply to active providers, and move the next project forward without leaving one focused workspace.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
              <div className="rounded-xl border border-border/60 bg-white/95 p-4 shadow-sm">
                <p className="detail-kicker">Priority this week</p>
                <p className="mt-2 text-2xl font-semibold tracking-[-0.05em] text-foreground">{actionableProjects.length}</p>
                <p className="mt-1 text-sm text-muted-foreground">projects need attention</p>
              </div>
              <Button onClick={() => navigate("/projects/post")} className="rounded-lg h-11">
                <Plus className="mr-2 h-4 w-4" />
                Post Project
              </Button>
            </div>
          </div>
        </section>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Card className="result-card-surface border border-border/60 shadow-sm">
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="caption">Live Projects</p>
                  <p className="mt-2 text-3xl font-bold tracking-[-0.05em]">{stats.live_projects ?? counts.live}</p>
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 shadow-sm">
                  <Briefcase className="h-5 w-5 text-primary" />
                </div>
              </div>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">Projects currently collecting provider interest.</p>
            </CardContent>
          </Card>

          <Card className="result-card-surface border border-border/60 shadow-sm">
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="caption">New Bids</p>
                  <p className="mt-2 text-3xl font-bold tracking-[-0.05em]">{newBidsCount}</p>
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 shadow-sm">
                  <DollarSign className="h-5 w-5 text-emerald-700" />
                </div>
              </div>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">Quotes waiting to be reviewed across your live projects.</p>
            </CardContent>
          </Card>

          <Card className="result-card-surface border border-border/60 shadow-sm">
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="caption">Unread Messages</p>
                  <p className="mt-2 text-3xl font-bold tracking-[-0.05em]">{unreadMessages}</p>
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-copper-100 shadow-sm">
                  <MessageSquare className="h-5 w-5 text-amber-700" />
                </div>
              </div>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">Provider replies and project conversations needing a response.</p>
            </CardContent>
          </Card>

          <Card className="result-card-surface border border-border/60 shadow-sm">
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="caption">Ready To Hire</p>
                  <p className="mt-2 text-3xl font-bold tracking-[-0.05em]">{projectsReadyForQuotes.length}</p>
                </div>
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-100 shadow-sm">
                  <ShieldCheck className="h-5 w-5 text-sky-700" />
                </div>
              </div>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">Live projects that already have quotes and can move toward a hiring decision.</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
          <div className="form-shell border-0 p-4 sm:p-5">
            <div className="flex flex-col gap-3 border-b border-white/60 pb-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="caption">Action Center</p>
                <h2 className="mt-2 text-xl font-semibold tracking-[-0.04em] text-foreground">Surface the next hire decision first</h2>
              </div>
              <Button variant="outline" className="rounded-lg border-border/60 bg-white/85" onClick={() => navigate("/messages")}>Open Inbox</Button>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <button type="button" className="rounded-xl border border-border/60 bg-white p-4 text-left shadow-sm transition hover:border-primary/20 hover:bg-primary/5" onClick={() => navigate("/dashboard")}>
                <div className="flex items-center justify-between gap-3">
                  <p className="detail-kicker">Review New Quotes</p>
                  <BellRing className="h-4 w-4 text-primary" />
                </div>
                <p className="mt-3 text-2xl font-semibold tracking-[-0.05em] text-foreground">{newBidsCount}</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">Compare offers on live projects and shortlist the strongest fit.</p>
              </button>

              <button type="button" className="rounded-xl border border-border/60 bg-white p-4 text-left shadow-sm transition hover:border-primary/20 hover:bg-primary/5" onClick={() => navigate("/messages")}>
                <div className="flex items-center justify-between gap-3">
                  <p className="detail-kicker">Respond to Providers</p>
                  <MessageSquare className="h-4 w-4 text-primary" />
                </div>
                <p className="mt-3 text-2xl font-semibold tracking-[-0.05em] text-foreground">{unreadMessages}</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">Keep momentum with providers who already replied to your scope.</p>
              </button>

              <button type="button" className="rounded-xl border border-border/60 bg-white p-4 text-left shadow-sm transition hover:border-primary/20 hover:bg-primary/5" onClick={() => projectsReadyForQuotes[0] ? navigate(`/projects/${projectsReadyForQuotes[0].id}`) : navigate("/providers")}>
                <div className="flex items-center justify-between gap-3">
                  <p className="detail-kicker">Hire A Pro</p>
                  <ShieldCheck className="h-4 w-4 text-primary" />
                </div>
                <p className="mt-3 text-2xl font-semibold tracking-[-0.05em] text-foreground">{projectsReadyForQuotes.length}</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">Open the strongest live projects, compare bids, and choose the provider to award.</p>
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {actionableProjects.map((project) => (
                <div key={`action-${project.id}`} className="rounded-xl border border-border/60 bg-muted/35 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge className={statusColors[project.status] || "bg-gray-100 text-gray-800"}>{statusLabels[project.status] || project.status}</Badge>
                        {project.unreadProjectMessages > 0 && <Badge variant="outline" className="rounded-lg border-border/60 bg-background/85 px-3 py-1 text-xs font-semibold">{project.unreadProjectMessages} unread</Badge>}
                      </div>
                      <p className="mt-2 text-base font-semibold text-foreground">{project.title}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{project.bidCountValue} bids · {project.messageCountValue} threads · last activity {project.lastActivityLabel}</p>
                    </div>
                    <Button size="sm" className="rounded-lg" onClick={() => navigate(project.unreadProjectMessages > 0 ? "/messages" : `/projects/${project.id}`)}>
                      {project.unreadProjectMessages > 0 ? "Reply Now" : project.bidCountValue > 0 ? "Review Quotes" : "Open Project"}
                    </Button>
                  </div>
                </div>
              ))}
              {!actionableProjects.length && (
                <div className="rounded-xl border border-dashed border-border/60 bg-muted/30 p-4 text-sm text-muted-foreground">
                  Post a project or open messages to start receiving provider activity here.
                </div>
              )}
            </div>
          </div>

          <Card className="form-shell border border-border/60 shadow-sm">
            <CardHeader className="pb-3">
              <div>
                <p className="caption">Invite Providers</p>
                <CardTitle className="mt-2 text-xl font-semibold tracking-[-0.04em] text-foreground">Pros worth pulling into the marketplace</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {recommendedProviders.map((provider) => (
                <div key={provider.id} className="rounded-xl border border-border/60 bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{provider.full_name}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{provider.provider_profile?.business_name || provider.provider_profile?.skills?.[0] || "Home services"}</p>
                    </div>
                    {(provider.provider_profile?.is_verified || provider.document_verified) && (
                      <Badge className="market-card-chip"><ShieldCheck className="mr-1 h-3.5 w-3.5 text-primary" />Verified</Badge>
                    )}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 text-sm">
                    <span className="market-card-chip"><Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />{provider.avg_rating > 0 ? provider.avg_rating.toFixed(1) : "New"}</span>
                    <span className="market-card-chip">{formatReviewCount(provider.total_reviews)}</span>
                    <span className="market-card-chip">{provider.provider_profile?.location || "Local pro"}</span>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">Invite this provider into an open project or compare them against your current quote mix.</p>
                  <Button size="sm" variant="outline" className="mt-4 w-full rounded-lg border-border/60" onClick={() => navigate(`/providers/${provider.id}`)}>
                    Invite to Quote
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              ))}
              {!recommendedProviders.length && (
                <div className="rounded-xl border border-dashed border-border/60 bg-muted/30 p-4 text-sm text-muted-foreground">
                  Recommended providers will appear here as soon as featured marketplace profiles are available.
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,0.65fr)]">
          <Card className="form-shell border border-border/60 shadow-sm">
            <CardHeader className="pb-0">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <p className="caption">Active Projects</p>
                  <CardTitle className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-foreground">Projects driving your next hire</CardTitle>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">Compact project cards keep bids, messages, and next actions visible at a glance.</p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className={isNativePhone ? "mobile-tabs-rail mb-5 flex rounded-xl border border-border/60 bg-white/90 p-1.5" : "mb-5 h-auto flex-wrap gap-2 rounded-xl border border-border/60 bg-white/90 p-1.5"}>
                  <TabsTrigger value="all">All ({counts.all})</TabsTrigger>
                  <TabsTrigger value="live">Live ({counts.live})</TabsTrigger>
                  <TabsTrigger value="pending">Pending ({counts.pending})</TabsTrigger>
                  <TabsTrigger value="in_progress">In Progress ({counts.in_progress})</TabsTrigger>
                  <TabsTrigger value="completed">Completed ({counts.completed})</TabsTrigger>
                </TabsList>

                <TabsContent value={activeTab}>
                  {filteredProjects.length > 0 ? (
                    <div className="space-y-3">
                      {priorityProjects.map((project) => (
                        <Card key={project.id} className="result-card-surface border border-border/60 shadow-sm" style={{ contentVisibility: "auto", containIntrinsicSize: "360px" }}>
                          <CardContent className="p-4 sm:p-5">
                            <div className={isNativeTablet ? "grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_18rem]" : "grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_18rem]"}>
                              <div className="space-y-4">
                                <div className="flex flex-wrap items-center gap-2">
                                  <Badge className={statusColors[project.status] || "bg-deep-navy-50 text-deep-navy-600"}>{statusLabels[project.status] || project.status}</Badge>
                                  <Badge variant="outline" className="rounded-lg border-border/60 bg-background/85 px-3 py-1 text-xs font-semibold">{project.category}</Badge>
                                  {project.unreadProjectMessages > 0 && <Badge variant="outline" className="rounded-lg border-border/60 bg-background/85 px-3 py-1 text-xs font-semibold text-primary">{project.unreadProjectMessages} unread</Badge>}
                                </div>

                                <div>
                                  <Link to={`/projects/${project.id}`}>
                                    <h3 className="project-card-title hover:text-primary break-words">{project.title}</h3>
                                  </Link>
                                  <p className="mt-2 text-sm leading-6 text-muted-foreground line-clamp-2">{project.description}</p>
                                </div>

                                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                                  <div className="info-tile">
                                    <p className="detail-kicker">Status</p>
                                    <p className="mt-2 text-sm font-semibold text-foreground">{statusLabels[project.status] || project.status}</p>
                                  </div>
                                  <div className="info-tile">
                                    <p className="detail-kicker">Bid count</p>
                                    <p className="mt-2 text-sm font-semibold text-foreground">{project.bidCountValue}</p>
                                  </div>
                                  <div className="info-tile">
                                    <p className="detail-kicker">Message count</p>
                                    <p className="mt-2 text-sm font-semibold text-foreground">{project.messageCountValue}</p>
                                  </div>
                                  <div className="info-tile">
                                    <p className="detail-kicker">Last activity</p>
                                    <p className="mt-2 text-sm font-semibold text-foreground">{project.lastActivityLabel}</p>
                                  </div>
                                  <div className="info-tile">
                                    <p className="detail-kicker">Budget</p>
                                    <p className="mt-2 text-sm font-semibold text-foreground">{formatBudgetRange(project)}</p>
                                  </div>
                                </div>

                                {project.status === "rejected" && project.rejection_reason && (
                                  <div className="rounded-xl border border-red-100 bg-red-50/90 p-3 text-sm text-red-700">
                                    <strong>Rejection reason:</strong> {project.rejection_reason}
                                  </div>
                                )}
                              </div>

                              <div className="space-y-2">
                                {project.status === "draft" && (
                                  <>
                                    <Button size="sm" className="w-full rounded-lg justify-between" onClick={() => navigate(`/projects/${project.id}/edit`)}>
                                      <span className="inline-flex items-center"><Edit className="mr-2 h-4 w-4" />Edit Project</span>
                                      <ArrowRight className="h-4 w-4" />
                                    </Button>
                                    <Button size="sm" variant="outline" className="w-full rounded-lg border-border/60" onClick={() => handleSubmitForApproval(project.id)} disabled={isProjectActionPending(project.id)}>
                                      {isPending(getProjectActionKey("submit", project.id)) ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Submitting...</> : <><Send className="mr-2 h-4 w-4" />Submit for Review</>}
                                    </Button>
                                  </>
                                )}

                                {project.status === "approved" && (
                                  <Button size="sm" className="w-full rounded-lg bg-green-600 hover:bg-green-700" disabled={isProjectActionPending(project.id)} onClick={() => handleGoLive(project.id)}>
                                    {isPending(getProjectActionKey("go-live", project.id)) ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Going Live...</> : <><CheckCircle className="mr-2 h-4 w-4" />Go Live</>}
                                  </Button>
                                )}

                                {project.status === "rejected" && (
                                  <Button size="sm" className="w-full rounded-lg justify-between" onClick={() => navigate(`/projects/${project.id}/edit`)}>
                                    <span className="inline-flex items-center"><Edit className="mr-2 h-4 w-4" />Edit & Resubmit</span>
                                    <ArrowRight className="h-4 w-4" />
                                  </Button>
                                )}

                                {project.status === "live" && (
                                  <>
                                    <Button size="sm" className="w-full rounded-lg justify-between" onClick={() => navigate(`/projects/${project.id}`)}>
                                      View Quotes ({project.bidCountValue})
                                      <ArrowRight className="h-4 w-4" />
                                    </Button>
                                    <Button size="sm" variant="outline" className="w-full rounded-lg border-border/60" onClick={() => navigate(project.messageCountValue > 0 ? "/messages" : `/projects/${project.id}`)}>
                                      <MessageSquare className="mr-2 h-4 w-4" />
                                      {project.messageCountValue > 0 ? "Open Project Messages" : "Open Project"}
                                    </Button>
                                    <Button size="sm" variant="outline" className="w-full rounded-lg border-border/60" onClick={() => handlePause(project.id)} disabled={isProjectActionPending(project.id)}>
                                      {isPending(getProjectActionKey("pause", project.id)) ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Pausing...</> : <><Pause className="mr-2 h-4 w-4" />Pause Project</>}
                                    </Button>
                                  </>
                                )}

                                {project.status === "paused" && (
                                  <Button size="sm" className="w-full rounded-lg" onClick={() => handleResume(project.id)} disabled={isProjectActionPending(project.id)}>
                                    {isPending(getProjectActionKey("resume", project.id)) ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Resuming...</> : <><RotateCcw className="mr-2 h-4 w-4" />Resume Project</>}
                                  </Button>
                                )}

                                {project.status === "in_progress" && (
                                  <>
                                    <Button size="sm" className="w-full rounded-lg justify-between" onClick={() => navigate(`/projects/${project.id}`)}>
                                      View Project
                                      <ArrowRight className="h-4 w-4" />
                                    </Button>
                                    <Button size="sm" variant="outline" className="w-full rounded-lg border-border/60" onClick={() => navigate("/messages")}>
                                      <MessageSquare className="mr-2 h-4 w-4" />Respond to Provider
                                    </Button>
                                    <Button size="sm" variant="outline" className="w-full rounded-lg border-border/60" onClick={() => handleComplete(project.id)} disabled={isProjectActionPending(project.id)}>
                                      {isPending(getProjectActionKey("complete", project.id)) ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Completing...</> : <><CheckCircle className="mr-2 h-4 w-4" />Mark Complete</>}
                                    </Button>
                                  </>
                                )}

                                {(project.status === "awarded" || project.status === "sold") && (
                                  <>
                                    <Button size="sm" className="w-full rounded-lg justify-between" onClick={() => navigate(`/projects/${project.id}`)}>
                                      View Awarded Project
                                      <ArrowRight className="h-4 w-4" />
                                    </Button>
                                    <Button size="sm" variant="outline" className="w-full rounded-lg border-border/60" onClick={() => navigate("/messages")}>
                                      <MessageSquare className="mr-2 h-4 w-4" />Message Provider
                                    </Button>
                                    <Button size="sm" variant="outline" className="w-full rounded-lg border-border/60" onClick={() => handlePause(project.id)} disabled={isProjectActionPending(project.id)}>
                                      {isPending(getProjectActionKey("pause", project.id)) ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Pausing...</> : <><Pause className="mr-2 h-4 w-4" />Pause</>}
                                    </Button>
                                    <Button size="sm" variant="destructive" className="w-full rounded-lg" onClick={() => handleStop(project.id)} disabled={isProjectActionPending(project.id)}>
                                      {isPending(getProjectActionKey("stop", project.id)) ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Stopping...</> : <><StopCircle className="mr-2 h-4 w-4" />Stop Project</>}
                                    </Button>
                                  </>
                                )}

                                {(["draft", "rejected", "live", "paused"].includes(project.status)) && (
                                  <Button size="sm" variant="ghost" className="w-full rounded-lg text-red-500" onClick={() => handleDelete(project.id)} disabled={isProjectActionPending(project.id)}>
                                    {isPending(getProjectActionKey("delete", project.id)) ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Deleting...</> : <><Trash2 className="mr-2 h-4 w-4" />Delete</>}
                                  </Button>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}

                      {filteredProjects.length > visibleCount && (
                        <Button variant="outline" className="w-full rounded-lg border-border/60" onClick={() => setVisibleCount((current) => current + (isNativePhone ? 4 : 6))}>
                          Show more projects
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-border/60 bg-muted/30 px-5 py-10 text-center">
                      <Briefcase className="mx-auto h-10 w-10 text-muted-foreground" />
                      <h3 className="mt-4 text-lg font-semibold text-foreground">No projects in this lane</h3>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">Post a new project or switch tabs to review the rest of your marketplace activity.</p>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          <div className="space-y-5">
          <Card className="form-shell border border-border/60 shadow-sm">
            <CardHeader className="pb-3">
              <div>
                <p className="caption">Activity Feed</p>
                <CardTitle className="mt-2 text-xl font-semibold tracking-[-0.04em] text-foreground">Recent marketplace movement</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {recentActivityItems.map((item) => (
                <div key={item.id} className="rounded-xl border border-border/60 bg-white p-4 shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-2xl bg-deep-navy-50 text-deep-navy-600">
                      {item.type === "bid" ? <DollarSign className="h-4 w-4" /> : item.type === "message" ? <MessageSquare className="h-4 w-4" /> : <TrendingUp className="h-4 w-4" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-foreground">{item.title}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{item.detail}</p>
                      <p className="mt-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">{formatRelativeLabel(item.timestamp)}</p>
                    </div>
                  </div>
                </div>
              ))}
              {!recentActivityItems.length && (
                <div className="rounded-xl border border-dashed border-border/60 bg-muted/30 p-4 text-sm text-muted-foreground">
                  Activity will appear here as providers bid, message, and view your projects.
                </div>
              )}
            </CardContent>
          </Card>
          <Card className="form-shell border border-border/60 shadow-sm">
            <CardHeader className="pb-3">
              <div>
                <p className="caption">Hire Queue</p>
                <CardTitle className="mt-2 text-xl font-semibold tracking-[-0.04em] text-foreground">Projects closest to a decision</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {projectsReadyForQuotes.slice(0, 3).map((project) => (
                <div key={`hire-${project.id}`} className="rounded-xl border border-border/60 bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{project.title}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{project.bidCountValue} bids · {project.messageCountValue} threads</p>
                    </div>
                    <Badge className={statusColors[project.status] || "bg-gray-100 text-gray-800"}>{statusLabels[project.status] || project.status}</Badge>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2 text-sm">
                    <span className="market-card-chip">{formatBudgetRange(project)}</span>
                    <span className="market-card-chip">{project.lastActivityLabel}</span>
                  </div>
                  <Button size="sm" className="mt-4 w-full rounded-lg" onClick={() => navigate(`/projects/${project.id}`)}>
                    Review Bids
                  </Button>
                </div>
              ))}
              {!projectsReadyForQuotes.length && (
                <div className="rounded-xl border border-dashed border-border/60 bg-muted/30 p-4 text-sm text-muted-foreground">
                  Live projects with incoming quotes will appear here first so hiring decisions stay visible.
                </div>
              )}
            </CardContent>
          </Card>

          {(upcomingBookings.length > 0 || activeConversationProjects.length > 0 || awardedProjects.length > 0) && (
            <Card className="form-shell border border-border/60 shadow-sm">
              <CardHeader className="pb-3">
                <div>
                  <p className="caption">Delivery Support</p>
                  <CardTitle className="mt-2 text-xl font-semibold tracking-[-0.04em] text-foreground">Appointments and live coordination</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-lg border border-border/60 bg-white px-3 py-3 text-center shadow-sm">
                    <p className="detail-kicker">Bookings</p>
                    <p className="mt-2 text-xl font-semibold text-foreground">{upcomingBookings.length}</p>
                  </div>
                  <div className="rounded-lg border border-border/60 bg-white px-3 py-3 text-center shadow-sm">
                    <p className="detail-kicker">Active threads</p>
                    <p className="mt-2 text-xl font-semibold text-foreground">{activeConversationProjects.length}</p>
                  </div>
                  <div className="rounded-lg border border-border/60 bg-white px-3 py-3 text-center shadow-sm">
                    <p className="detail-kicker">Awarded</p>
                    <p className="mt-2 text-xl font-semibold text-foreground">{awardedProjects.length}</p>
                  </div>
                </div>
                {upcomingBookings.slice(0, 2).map((booking) => (
                  <div key={booking.id} className="rounded-xl border border-border/60 bg-white p-4 shadow-sm">
                    <div className="flex items-center justify-between gap-3">
                      <Badge className="market-card-chip">{booking.status}</Badge>
                      <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">{booking.service_title || "Consultation"}</span>
                    </div>
                    <p className="mt-3 text-base font-semibold text-foreground">{booking.provider_name || "Provider"}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{formatDateTimeLabel(booking.scheduled_at_customer || booking.scheduled_date)}</p>
                    <Button size="sm" variant="outline" className="mt-4 w-full rounded-lg border-border/60" onClick={() => navigate("/messages")}>
                      Coordinate Details
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
