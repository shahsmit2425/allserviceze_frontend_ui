import { useState, useEffect } from "react";
import logger from "@/utils/logger";
import { useNavigate, Link } from "react-router-dom";
import { AppShell } from "../components/AppShell";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Card, CardContent } from "../components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { useAuth } from "../context/AuthContext";
import { toast } from "sonner";
import axios from "axios";
import { usePendingActions } from "../hooks/usePendingActions";
import { 
  Briefcase, DollarSign, Calendar, MessageSquare, Eye,
  Plus, Loader2, Trash2, Send, CheckCircle, Edit,
  Pause, RotateCcw, StopCircle
} from "lucide-react";

const API_URL = `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'}/api`;

const statusColors = {
  draft: "status-badge-neutral",
  pending: "status-badge-warning",
  approved: "status-badge-success",
  rejected: "status-badge-danger",
  live: "status-badge-info",
  awarded: "status-badge-warning",
  sold: "status-badge-accent",
  in_progress: "status-badge-violet",
  completed: "status-badge-success",
  closed: "status-badge-neutral",
  paused: "status-badge-warning"
};

const statusLabels = {
  draft: "Draft",
  pending: "Pending Approval",
  approved: "Approved",
  rejected: "Rejected",
  live: "Live",
  awarded: "Awarded",
  sold: "Sold",
  in_progress: "In Progress",
  completed: "Completed",
  closed: "Closed",
  paused: "Paused"
};

export default function MyProjects() {
  const navigate = useNavigate();
  const { user, getAuthHeader } = useAuth();
  
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const { isPending, runPendingAction } = usePendingActions();

  const getProjectActionKey = (action, projectId) => `${action}:${projectId}`;
  const isProjectActionPending = (projectId) =>
    ["submit", "go-live", "pause", "resume", "complete", "stop", "delete"].some((action) =>
      isPending(getProjectActionKey(action, projectId))
    );

  useEffect(() => {
    if (!user || user.role !== "customer") {
      navigate("/");
      return;
    }
    fetchProjects();
  }, [user]);

  const fetchProjects = async () => {
    try {
      logger.log("Fetching my projects...");
      const response = await axios.get(`${API_URL}/projects/my`, {
        headers: getAuthHeader()
      });
      logger.log("Projects fetched:", response.data);
      setProjects(response.data);
    } catch (error) {
      logger.error("Error fetching projects:", error);
      logger.error("Error response:", error.response?.data);
      toast.error("Failed to load projects");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (projectId) => {
    if (!window.confirm("Are you sure you want to delete this project?")) return;
    
    await runPendingAction(getProjectActionKey("delete", projectId), async () => {
      try {
        await axios.delete(`${API_URL}/projects/${projectId}`, {
          headers: getAuthHeader()
        });
        toast.success("Project deleted");
        await fetchProjects();
      } catch (error) {
        toast.error(error.response?.data?.detail || "Failed to delete project");
      }
    });
  };

  const handleSubmitForApproval = async (projectId) => {
    await runPendingAction(getProjectActionKey("submit", projectId), async () => {
      try {
        await axios.post(`${API_URL}/projects/${projectId}/submit`, {}, {
          headers: getAuthHeader()
        });
        toast.success("Submitted for approval!");
        await fetchProjects();
      } catch (error) {
        toast.error("Failed to submit");
      }
    });
  };

  const handleGoLive = async (projectId) => {
    await runPendingAction(getProjectActionKey("go-live", projectId), async () => {
      try {
        await axios.post(`${API_URL}/projects/${projectId}/go-live`, {}, {
          headers: getAuthHeader()
        });
        toast.success("Project is now live!");
        await fetchProjects();
      } catch (error) {
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
        await fetchProjects();
      } catch (error) {
        toast.error("Failed to pause");
      }
    });
  };

  const handleResume = async (projectId) => {
    await runPendingAction(getProjectActionKey("resume", projectId), async () => {
      try {
        await axios.post(`${API_URL}/projects/${projectId}/resume`, {}, { headers: getAuthHeader() });
        toast.success("Project resumed!");
        await fetchProjects();
      } catch (error) {
        toast.error("Failed to resume");
      }
    });
  };

  const handleComplete = async (projectId) => {
    await runPendingAction(getProjectActionKey("complete", projectId), async () => {
      try {
        await axios.post(`${API_URL}/projects/${projectId}/complete`, {}, {
          headers: getAuthHeader()
        });
        toast.success("Project completed!");
        await fetchProjects();
      } catch (error) {
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
        await fetchProjects();
      } catch (error) {
        toast.error("Failed to stop project");
      }
    });
  };

  const filteredProjects = activeTab === "all" 
    ? projects 
    : projects.filter(p => {
        if (activeTab === "active") return ["live", "awarded", "sold", "in_progress", "paused"].includes(p.status);
        if (activeTab === "pending") return ["draft", "pending", "approved"].includes(p.status);
        if (activeTab === "closed") return ["completed", "closed", "rejected"].includes(p.status);
        return true;
      });

  const counts = {
    all: projects.length,
    active: projects.filter(p => ["live", "awarded", "sold", "in_progress", "paused"].includes(p.status)).length,
    pending: projects.filter(p => ["draft", "pending", "approved"].includes(p.status)).length,
    closed: projects.filter(p => ["completed", "closed", "rejected"].includes(p.status)).length
  };

  const totalBidCount = projects.reduce((sum, project) => sum + (project.bid_count || 0), 0);
  const totalViewCount = projects.reduce((sum, project) => sum + (project.view_count || 0), 0);
  const nextDeadlineProject = [...projects]
    .filter((project) => project.deadline && !["completed", "closed", "rejected"].includes(project.status))
    .sort((left, right) => new Date(left.deadline) - new Date(right.deadline))[0];

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
    <AppShell theme="customer" className="pb-12" contentClassName="pb-12" data-testid="my-projects">
      <div className="page-shell space-y-8 py-8">
        <section className="page-hero">
          <div className="workspace-hero-grid">
            <div className="max-w-3xl">
              <span className="page-kicker">Customer workspace</span>
              <h1 className="heading-2 mt-4 text-foreground">My projects</h1>
              <p className="body-lg mt-3 max-w-2xl text-muted-foreground">
                Keep drafts, approvals, live bids, and completed work in one calmer operating view.
              </p>

              <div className="mt-5 flex flex-wrap gap-2">
                <span className="info-chip">
                  <Briefcase className="h-4 w-4 text-primary" />
                  {counts.all} tracked projects
                </span>
                <span className="info-chip">
                  <MessageSquare className="h-4 w-4 text-emerald-600" />
                  {totalBidCount} total bids
                </span>
                <span className="info-chip">
                  <Eye className="h-4 w-4 text-amber-600" />
                  {totalViewCount} total views
                </span>
              </div>

              <div className="mt-7 flex flex-wrap gap-3">
                <Button onClick={() => navigate("/projects/post")} className="rounded-lg">
                  <Plus className="w-4 h-4 mr-2" />
                  Post New Project
                </Button>
                <Button variant="outline" onClick={() => navigate("/providers")} className="rounded-lg bg-white/70">
                  Browse Providers
                </Button>
              </div>
            </div>

            <div className="workspace-hero-aside">
              <div className="relative space-y-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/65">Project pipeline</p>
                    <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-white">See what needs attention before momentum slips.</h2>
                  </div>
                  <div className="rounded-lg border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold text-white/80">Live view</div>
                </div>

                <div className="workspace-hero-metrics">
                  <div className="workspace-hero-metric">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/62">Pending</p>
                    <p className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-white">{counts.pending}</p>
                  </div>
                  <div className="workspace-hero-metric">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/62">Active</p>
                    <p className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-white">{counts.active}</p>
                  </div>
                  <div className="workspace-hero-metric">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/62">Closed</p>
                    <p className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-white">{counts.closed}</p>
                  </div>
                  <div className="workspace-hero-metric">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/62">Interest</p>
                    <p className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-white">{totalBidCount}</p>
                  </div>
                </div>

                <div className="rounded-xl border border-white/12 bg-white/8 p-4 backdrop-blur-sm">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/62">Next deadline</p>
                  {nextDeadlineProject ? (
                    <>
                      <p className="mt-2 text-base font-semibold text-white">{nextDeadlineProject.title}</p>
                      <p className="mt-2 text-sm leading-6 text-white/72">
                        Due {new Date(nextDeadlineProject.deadline).toLocaleDateString()}. Keep bids and approvals moving while provider attention is fresh.
                      </p>
                    </>
                  ) : (
                    <p className="mt-2 text-sm leading-6 text-white/72">No urgent deadline is standing out. This is a good window to refine a brief or post the next project.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="form-shell p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">All projects</p>
            <p className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-foreground">{counts.all}</p>
            <p className="mt-2 text-sm text-muted-foreground">Every brief currently tracked in your workspace.</p>
          </div>
          <div className="form-shell p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Active work</p>
            <p className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-foreground">{counts.active}</p>
            <p className="mt-2 text-sm text-muted-foreground">Live, awarded, sold, paused, or in-progress projects.</p>
          </div>
          <div className="form-shell p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Pending queue</p>
            <p className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-foreground">{counts.pending}</p>
            <p className="mt-2 text-sm text-muted-foreground">Drafts, submitted reviews, and approved projects waiting for the next step.</p>
          </div>
          <div className="form-shell p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Marketplace reach</p>
            <p className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-foreground">{totalViewCount}</p>
            <p className="mt-2 text-sm text-muted-foreground">Views across your posted work so you can gauge traction quickly.</p>
          </div>
        </section>

        <section className="form-shell p-4 sm:p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h2 className="text-2xl font-semibold tracking-[-0.04em] text-foreground">Project queue</h2>
                <p className="mt-2 text-sm text-muted-foreground">Filter your briefs by stage and take the next action without digging through separate screens.</p>
              </div>
              <Button onClick={() => navigate("/projects/post")} className="rounded-lg lg:self-start">
                <Plus className="w-4 h-4 mr-2" />
                Post New Project
              </Button>
            </div>

            <div className="overflow-x-auto pb-1">
              <TabsList className="grid min-w-[24rem] grid-cols-4">
                <TabsTrigger value="all" className="rounded-lg">All ({counts.all})</TabsTrigger>
                <TabsTrigger value="active" className="rounded-lg">Active ({counts.active})</TabsTrigger>
                <TabsTrigger value="pending" className="rounded-lg">Pending ({counts.pending})</TabsTrigger>
                <TabsTrigger value="closed" className="rounded-lg">Closed ({counts.closed})</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value={activeTab} className="mt-0">
              {filteredProjects.length > 0 ? (
                <div className="space-y-4">
                  {filteredProjects.map((project) => {
                    logger.log("Rendering project:", project.id, "Status:", project.status);
                    return (
                      <Card key={project.id} className="result-card-surface">
                        <CardContent className="p-5 sm:p-6">
                          <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-start gap-3">
                                <div className="min-w-0 flex-1">
                                  <Link to={`/projects/${project.id}`} className="group inline-flex max-w-full items-center">
                                    <h3 className="truncate text-lg font-semibold tracking-[-0.02em] text-foreground transition-colors group-hover:text-primary">
                                      {project.title}
                                    </h3>
                                  </Link>
                                  <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground line-clamp-2">
                                    {project.description}
                                  </p>
                                </div>
                                <Badge className={`rounded-lg px-3 py-1 text-xs font-semibold ${statusColors[project.status] || "bg-gray-100 text-gray-800"}`}>
                                  {statusLabels[project.status] || project.status}
                                </Badge>
                              </div>

                              <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                                <div className="info-tile px-3.5 py-3">
                                  <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                                    <DollarSign className="w-4 h-4 text-primary" />
                                    Budget
                                  </span>
                                  <p className="mt-2 text-sm font-semibold text-foreground">${project.budget_min} - ${project.budget_max}</p>
                                </div>
                                <div className="info-tile px-3.5 py-3">
                                  <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                                    <Calendar className="w-4 h-4 text-primary" />
                                    Deadline
                                  </span>
                                  <p className="mt-2 text-sm font-semibold text-foreground">{new Date(project.deadline).toLocaleDateString()}</p>
                                </div>
                                <div className="info-tile px-3.5 py-3">
                                  <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                                    <MessageSquare className="w-4 h-4 text-primary" />
                                    Bids
                                  </span>
                                  <p className="mt-2 text-sm font-semibold text-foreground">{project.bid_count} received</p>
                                </div>
                                <div className="info-tile px-3.5 py-3">
                                  <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                                    <Eye className="w-4 h-4 text-primary" />
                                    Visibility
                                  </span>
                                  <p className="mt-2 text-sm font-semibold text-foreground">{project.view_count} views</p>
                                </div>
                              </div>

                              {project.status === "rejected" && project.rejection_reason && (
                                <div className="alert-danger mt-4">
                                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-red-700">Review feedback</p>
                                  <p className="mt-2 text-sm leading-6 text-red-700">{project.rejection_reason}</p>
                                </div>
                              )}
                            </div>

                            <div className="flex flex-wrap gap-2 xl:max-w-[15rem] xl:justify-end">
                              {project.status === "draft" && (
                                <>
                                  <Button size="sm" className="rounded-lg" onClick={() => navigate(`/projects/${project.id}/edit`)}>
                                    <Edit className="w-4 h-4 mr-1" />
                                    Edit
                                  </Button>
                                  <Button size="sm" variant="outline" className="rounded-lg" onClick={() => handleSubmitForApproval(project.id)}>
                                    {isPending(getProjectActionKey("submit", project.id)) ? (
                                      <>
                                        <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                        Submitting...
                                      </>
                                    ) : (
                                      <>
                                        <Send className="w-4 h-4 mr-1" />
                                        Submit
                                      </>
                                    )}
                                  </Button>
                                  <Button size="sm" variant="ghost" onClick={() => handleDelete(project.id)} className="danger-ghost-action rounded-lg" disabled={isProjectActionPending(project.id)}>
                                    {isPending(getProjectActionKey("delete", project.id)) ? (
                                      <>
                                        <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                        Deleting...
                                      </>
                                    ) : (
                                      <>
                                        <Trash2 className="w-4 h-4 mr-1" />
                                        Delete
                                      </>
                                    )}
                                  </Button>
                                </>
                              )}

                              {project.status === "approved" && (
                                <Button
                                  size="sm"
                                  className="rounded-lg"
                                  onClick={() => handleGoLive(project.id)}
                                  disabled={isProjectActionPending(project.id)}
                                >
                                  {isPending(getProjectActionKey("go-live", project.id)) ? (
                                    <>
                                      <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                      Going Live...
                                    </>
                                  ) : (
                                    <>
                                      <CheckCircle className="w-4 h-4 mr-1" />
                                      Go Live
                                    </>
                                  )}
                                </Button>
                              )}

                              {project.status === "rejected" && (
                                <>
                                  <Button size="sm" className="rounded-lg" onClick={() => navigate(`/projects/${project.id}/edit`)}>
                                    <Edit className="w-4 h-4 mr-1" />
                                    Edit & Resubmit
                                  </Button>
                                  <Button size="sm" variant="ghost" onClick={() => handleDelete(project.id)} className="danger-ghost-action rounded-lg" disabled={isProjectActionPending(project.id)}>
                                    {isPending(getProjectActionKey("delete", project.id)) ? (
                                      <>
                                        <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                        Deleting...
                                      </>
                                    ) : (
                                      <>
                                        <Trash2 className="w-4 h-4 mr-1" />
                                        Delete
                                      </>
                                    )}
                                  </Button>
                                </>
                              )}

                              {project.status === "live" && (
                                <>
                                  <Button size="sm" className="rounded-lg" onClick={() => navigate(`/projects/${project.id}`)}>
                                    View Bids ({project.bid_count})
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="rounded-lg"
                                    onClick={() => handlePause(project.id)}
                                    disabled={isProjectActionPending(project.id)}
                                  >
                                    {isPending(getProjectActionKey("pause", project.id)) ? (
                                      <>
                                        <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                        Pausing...
                                      </>
                                    ) : (
                                      <>
                                        <Pause className="w-4 h-4 mr-1" />
                                        Pause
                                      </>
                                    )}
                                  </Button>
                                  <Button size="sm" variant="ghost" onClick={() => handleDelete(project.id)} className="danger-ghost-action rounded-lg" disabled={isProjectActionPending(project.id)}>
                                    {isPending(getProjectActionKey("delete", project.id)) ? (
                                      <>
                                        <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                        Deleting...
                                      </>
                                    ) : (
                                      <>
                                        <Trash2 className="w-4 h-4 mr-1" />
                                        Delete
                                      </>
                                    )}
                                  </Button>
                                </>
                              )}

                              {project.status === "paused" && (
                                <>
                                  <Button
                                    size="sm"
                                    className="rounded-lg"
                                    onClick={() => handleResume(project.id)}
                                    disabled={isProjectActionPending(project.id)}
                                  >
                                    {isPending(getProjectActionKey("resume", project.id)) ? (
                                      <>
                                        <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                        Resuming...
                                      </>
                                    ) : (
                                      <>
                                        <RotateCcw className="w-4 h-4 mr-1" />
                                        Resume
                                      </>
                                    )}
                                  </Button>
                                  <Button size="sm" variant="ghost" onClick={() => handleDelete(project.id)} className="danger-ghost-action rounded-lg" disabled={isProjectActionPending(project.id)}>
                                    {isPending(getProjectActionKey("delete", project.id)) ? (
                                      <>
                                        <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                        Deleting...
                                      </>
                                    ) : (
                                      <>
                                        <Trash2 className="w-4 h-4 mr-1" />
                                        Delete
                                      </>
                                    )}
                                  </Button>
                                </>
                              )}

                              {project.status === "in_progress" && (
                                <>
                                  <Button size="sm" className="rounded-lg" onClick={() => navigate(`/projects/${project.id}`)}>
                                    View Details
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="rounded-lg"
                                    onClick={() => handleComplete(project.id)}
                                    disabled={isProjectActionPending(project.id)}
                                  >
                                    {isPending(getProjectActionKey("complete", project.id)) ? (
                                      <>
                                        <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                        Completing...
                                      </>
                                    ) : (
                                      <>
                                        <CheckCircle className="w-4 h-4 mr-1" />
                                        Complete
                                      </>
                                    )}
                                  </Button>
                                </>
                              )}

                              {(project.status === "awarded" || project.status === "sold") && (
                                <>
                                  <Button size="sm" className="rounded-lg" onClick={() => navigate(`/projects/${project.id}`)}>
                                    View Details
                                  </Button>
                                  {project.status === "sold" && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="rounded-lg"
                                      onClick={() => handleComplete(project.id)}
                                      disabled={isProjectActionPending(project.id)}
                                    >
                                      {isPending(getProjectActionKey("complete", project.id)) ? (
                                        <>
                                          <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                          Completing...
                                        </>
                                      ) : (
                                        <>
                                          <CheckCircle className="w-4 h-4 mr-1" />
                                          Complete
                                        </>
                                      )}
                                    </Button>
                                  )}
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="rounded-lg"
                                    onClick={() => handlePause(project.id)}
                                    disabled={isProjectActionPending(project.id)}
                                  >
                                    {isPending(getProjectActionKey("pause", project.id)) ? (
                                      <>
                                        <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                        Pausing...
                                      </>
                                    ) : (
                                      <>
                                        <Pause className="w-4 h-4 mr-1" />
                                        Pause
                                      </>
                                    )}
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    className="rounded-lg"
                                    onClick={() => handleStop(project.id)}
                                    disabled={isProjectActionPending(project.id)}
                                  >
                                    {isPending(getProjectActionKey("stop", project.id)) ? (
                                      <>
                                        <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                        Stopping...
                                      </>
                                    ) : (
                                      <>
                                        <StopCircle className="w-4 h-4 mr-1" />
                                        Stop
                                      </>
                                    )}
                                  </Button>
                                </>
                              )}

                              {["closed", "completed"].includes(project.status) && (
                                <Button size="sm" variant="ghost" onClick={() => handleDelete(project.id)} className="danger-ghost-action rounded-lg" disabled={isProjectActionPending(project.id)}>
                                  {isPending(getProjectActionKey("delete", project.id)) ? (
                                    <>
                                      <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                      Deleting...
                                    </>
                                  ) : (
                                    <>
                                      <Trash2 className="w-4 h-4 mr-1" />
                                      Delete
                                    </>
                                  )}
                                </Button>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <div className="empty-state-panel px-6 py-16">
                  <Briefcase className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                  <h3 className="heading-3 mb-2 text-foreground">No projects yet</h3>
                  <p className="mx-auto mb-6 max-w-xl text-sm leading-6 text-muted-foreground">
                    Post your first project and start receiving bids from professionals matched to your brief.
                  </p>
                  <Button onClick={() => navigate("/projects/post")} className="rounded-lg">
                    <Plus className="w-4 h-4 mr-2" />
                    Post a Project
                  </Button>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </section>
      </div>
    </AppShell>
  );
}
