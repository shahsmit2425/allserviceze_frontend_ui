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
  Briefcase, DollarSign, Calendar, Clock, ArrowRight,
  Loader2, XCircle, CheckCircle, Star, Trophy, Play, ShoppingBag, StopCircle, Pause
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const API_URL = `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'}/api`;

const statusColors = {
  active: "status-badge-warning",
  shortlisted: "status-badge-info",
  awarded: "status-badge-success",
  rejected: "status-badge-danger",
  withdrawn: "status-badge-neutral"
};

const statusLabels = {
  active: "Pending",
  shortlisted: "Shortlisted",
  awarded: "Awarded",
  rejected: "Not Selected",
  withdrawn: "Withdrawn"
};

export default function MyBids() {
  const navigate = useNavigate();
  const { user, getAuthHeader } = useAuth();
  
  const [bids, setBids] = useState([]);
  const [projects, setProjects] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const { isPending, runPendingAction } = usePendingActions();

  const getBidActionKey = (action, bidId) => `${action}:${bidId}`;
  const getProjectActionKey = (action, projectId) => `${action}:${projectId}`;
  const isBidActionPending = (bidId) => isPending(getBidActionKey("withdraw", bidId));
  const isProjectActionPending = (projectId) =>
    ["start", "stop", "complete"].some((action) => isPending(getProjectActionKey(action, projectId)));

  useEffect(() => {
    if (!user || user.role !== "provider") {
      navigate("/");
      return;
    }
    fetchBids();
  }, [user]);

  const fetchBids = async () => {
    try {
      const response = await axios.get(`${API_URL}/bids/my`, {
        headers: getAuthHeader()
      });
      setBids(response.data);
      
      // Fetch project details for each bid
      const projectIds = [...new Set(response.data.map(b => b.project_id))];
      const projectData = {};
      for (const pid of projectIds) {
        try {
          const projectRes = await axios.get(`${API_URL}/projects/${pid}`, {
            headers: getAuthHeader()
          });
          projectData[pid] = projectRes.data;
        } catch (e) {
          // Project might not be accessible
        }
      }
      setProjects(projectData);
    } catch (error) {
      logger.error("Error fetching bids:", error);
      toast.error("Failed to load bids");
    } finally {
      setLoading(false);
    }
  };

  const handleWithdrawBid = async (bidId) => {
    if (!window.confirm("Are you sure you want to withdraw this bid?")) return;
    
    await runPendingAction(getBidActionKey("withdraw", bidId), async () => {
      try {
        await axios.post(`${API_URL}/bids/${bidId}/withdraw`, {}, {
          headers: getAuthHeader()
        });
        toast.success("Bid withdrawn");
        await fetchBids();
      } catch (error) {
        toast.error("Failed to withdraw bid");
      }
    });
  };

  const handleStartProject = async (projectId) => {
    await runPendingAction(getProjectActionKey("start", projectId), async () => {
      try {
        await axios.post(`${API_URL}/projects/${projectId}/start`, {}, {
          headers: getAuthHeader()
        });
        toast.success("Project started! Marked as Sold.");
        await fetchBids();
      } catch (error) {
        toast.error(error.response?.data?.detail || "Failed to start project");
      }
    });
  };

  const handleStopProject = async (projectId) => {
    if (!window.confirm("Stop this project? It will revert to live.")) return;

    await runPendingAction(getProjectActionKey("stop", projectId), async () => {
      try {
        await axios.post(`${API_URL}/projects/${projectId}/stop`, {}, {
          headers: getAuthHeader()
        });
        toast.success("Project stopped. Now live again.");
        await fetchBids();
      } catch (error) {
        toast.error(error.response?.data?.detail || "Failed to stop project");
      }
    });
  };

  const handleCompleteProject = async (projectId) => {
    await runPendingAction(getProjectActionKey("complete", projectId), async () => {
      try {
        await axios.post(`${API_URL}/projects/${projectId}/complete`, {}, {
          headers: getAuthHeader()
        });
        toast.success("Project marked as complete!");
        await fetchBids();
      } catch (error) {
        toast.error("Failed to complete project");
      }
    });
  };

  const filteredBids = activeTab === "all" 
    ? bids 
    : bids.filter(b => {
        if (activeTab === "active") return ["active", "shortlisted"].includes(b.status);
        if (activeTab === "won") return b.status === "awarded";
        if (activeTab === "closed") return ["rejected", "withdrawn"].includes(b.status);
        return true;
      });

  const counts = {
    all: bids.length,
    active: bids.filter(b => ["active", "shortlisted"].includes(b.status)).length,
    won: bids.filter(b => b.status === "awarded").length,
    closed: bids.filter(b => ["rejected", "withdrawn"].includes(b.status)).length
  };

  const shortlistedCount = bids.filter((bid) => bid.is_shortlisted && bid.status !== "awarded").length;
  const totalBidValue = bids.reduce((sum, bid) => sum + (Number(bid.amount) || 0), 0);
  const focusBid = bids.find((bid) => bid.status === "awarded") || bids.find((bid) => bid.is_shortlisted) || bids[0];

  if (loading) {
    return (
      <AppShell theme="provider" className="bg-background" contentClassName="pb-0">
        <div className="flex items-center justify-center py-32">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell theme="provider" className="pb-12" contentClassName="pb-12" data-testid="my-bids">
      <div className="page-shell space-y-8 py-8">
        <section className="page-hero">
          <div className="workspace-hero-grid">
            <div className="max-w-3xl">
              <span className="page-kicker">Provider pipeline</span>
              <h1 className="heading-2 mt-4 text-foreground">My bids</h1>
              <p className="body-lg mt-3 max-w-2xl text-muted-foreground">
                Track live proposals, won projects, and withdrawn work from one cleaner operating view.
              </p>

              <div className="mt-5 flex flex-wrap gap-2">
                <span className="info-chip">
                  <Briefcase className="h-4 w-4 text-primary" />
                  {counts.all} submitted bids
                </span>
                <span className="info-chip">
                  <Star className="h-4 w-4 text-copper-600" />
                  {shortlistedCount} shortlisted
                </span>
                <span className="info-chip">
                  <Trophy className="h-4 w-4 text-emerald-600" />
                  {counts.won} awarded
                </span>
              </div>

              <div className="mt-6 flex flex-wrap gap-3">
                <Button onClick={() => navigate("/projects")} className="rounded-lg">
                  <Briefcase className="w-4 h-4 mr-2" />
                  Browse Projects
                </Button>
              </div>
            </div>

            <div className="workspace-hero-aside">
              <div className="relative space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/65">Provider command center</p>
                    <h2 className="mt-2 text-xl font-semibold tracking-[-0.04em] text-white">Stay close to the bids that can still convert.</h2>
                  </div>
                  <div className="rounded-lg border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold text-white/80">Pipeline</div>
                </div>

                <div className="workspace-hero-metrics">
                  <div className="workspace-hero-metric">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/62">Active</p>
                    <p className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-white">{counts.active}</p>
                  </div>
                  <div className="workspace-hero-metric">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/62">Shortlisted</p>
                    <p className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-white">{shortlistedCount}</p>
                  </div>
                  <div className="workspace-hero-metric">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/62">Won</p>
                    <p className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-white">{counts.won}</p>
                  </div>
                  <div className="workspace-hero-metric">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/62">Value</p>
                    <p className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-white">${totalBidValue.toLocaleString()}</p>
                  </div>
                </div>

                <div className="rounded-xl border border-white/12 bg-white/8 p-4 backdrop-blur-sm">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/62">Next focus</p>
                  {focusBid ? (
                    <>
                      <p className="mt-2 text-base font-semibold text-white">{focusBid.project_title || projects[focusBid.project_id]?.title || "Project"}</p>
                      <p className="mt-2 text-sm leading-6 text-white/72">
                        {focusBid.status === "awarded" ? "This project is yours to move forward." : "Stay on top of the conversation while the customer is still comparing proposals."} Submitted {formatDistanceToNow(new Date(focusBid.created_at), { addSuffix: true })}.
                      </p>
                    </>
                  ) : (
                    <p className="mt-2 text-sm leading-6 text-white/72">No bids submitted yet. Browse live projects and start building your pipeline.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="form-shell p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Total bids</p>
            <p className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-foreground">{counts.all}</p>
            <p className="mt-2 text-sm text-muted-foreground">Every proposal you have sent across the marketplace.</p>
          </div>
          <div className="form-shell p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Active</p>
            <p className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-foreground">{counts.active}</p>
            <p className="mt-2 text-sm text-muted-foreground">Bids still in play or already shortlisted by customers.</p>
          </div>
          <div className="form-shell p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Awarded</p>
            <p className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-foreground">{counts.won}</p>
            <p className="mt-2 text-sm text-muted-foreground">Projects you have already converted into work.</p>
          </div>
          <div className="form-shell p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Bid value</p>
            <p className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-foreground">${totalBidValue.toLocaleString()}</p>
            <p className="mt-2 text-sm text-muted-foreground">Total quoted value currently sitting across your proposal book.</p>
          </div>
        </section>

        <section className="form-shell p-4 sm:p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <h2 className="text-2xl font-semibold tracking-[-0.04em] text-foreground">Bid queue</h2>
                <p className="mt-2 text-sm text-muted-foreground">Move between active, won, and closed proposals without losing the project context beside each bid.</p>
              </div>
              <Button onClick={() => navigate("/projects")} className="rounded-lg lg:self-start">
                <Briefcase className="w-4 h-4 mr-2" />
                Browse Projects
              </Button>
            </div>

            <div className="overflow-x-auto pb-1">
              <TabsList className="grid min-w-[24rem] grid-cols-4">
                <TabsTrigger value="all" className="rounded-lg">All ({counts.all})</TabsTrigger>
                <TabsTrigger value="active" className="rounded-lg">Active ({counts.active})</TabsTrigger>
                <TabsTrigger value="won" className="rounded-lg">Won ({counts.won})</TabsTrigger>
                <TabsTrigger value="closed" className="rounded-lg">Closed ({counts.closed})</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value={activeTab} className="mt-0">
              {filteredBids.length > 0 ? (
                <div className="space-y-3">
                  {filteredBids.map((bid) => {
                    const project = projects[bid.project_id];
                    return (
                      <Card key={bid.id} className="result-card-surface">
                        <CardContent className="p-4 sm:p-5">
                          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-start gap-3">
                                <div className="min-w-0 flex-1">
                                  <Link to={`/projects/${bid.project_id}`} className="group inline-flex max-w-full items-center">
                                    <h3 className="truncate text-lg font-semibold tracking-[-0.02em] text-foreground transition-colors group-hover:text-primary">
                                      {bid.project_title || project?.title || "Project"}
                                    </h3>
                                  </Link>
                                  <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground line-clamp-2">
                                    {bid.proposal}
                                  </p>
                                </div>

                                <div className="flex flex-wrap gap-2">
                                  <Badge className={`rounded-lg px-3 py-1 text-xs font-semibold ${statusColors[bid.status]}`}>
                                    {bid.status === "awarded" && <Trophy className="w-3 h-3 mr-1" />}
                                    {statusLabels[bid.status]}
                                  </Badge>
                                  {bid.status === "awarded" && (bid.project_status === "completed" || project?.status === "completed") && (
                                    <Badge className="rounded-lg status-badge-success">
                                      <CheckCircle className="w-3 h-3 mr-1" />
                                      Completed
                                    </Badge>
                                  )}
                                  {bid.status === "awarded" && (bid.project_status === "sold" || project?.status === "sold") && (
                                    <Badge className="rounded-lg status-badge-accent">
                                      <ShoppingBag className="w-3 h-3 mr-1" />
                                      Sold
                                    </Badge>
                                  )}
                                  {bid.status === "awarded" && (bid.project_status === "awarded" || project?.status === "awarded") && (
                                    <Badge className="rounded-lg status-badge-warning">Awaiting Start</Badge>
                                  )}
                                  {bid.status === "awarded" && (bid.project_status === "paused" || project?.status === "paused") && (
                                    <Badge className="rounded-lg status-badge-warning">
                                      <Pause className="w-3 h-3 mr-1" />
                                      Paused
                                    </Badge>
                                  )}
                                  {bid.is_shortlisted && bid.status !== "awarded" && (
                                    <Badge className="rounded-lg status-badge-info">
                                      <Star className="w-3 h-3 mr-1" />
                                      Shortlisted
                                    </Badge>
                                  )}
                                </div>
                              </div>

                              <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                                <div className="info-tile px-3.5 py-3">
                                  <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                                    <DollarSign className="w-4 h-4 text-primary" />
                                    Your bid
                                  </span>
                                  <p className="mt-2 text-sm font-semibold text-foreground">${bid.amount}</p>
                                </div>
                                <div className="info-tile px-3.5 py-3">
                                  <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                                    <Calendar className="w-4 h-4 text-primary" />
                                    Delivery
                                  </span>
                                  <p className="mt-2 text-sm font-semibold text-foreground">{bid.estimated_days} days</p>
                                </div>
                                <div className="info-tile px-3.5 py-3">
                                  <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                                    <Clock className="w-4 h-4 text-primary" />
                                    Submitted
                                  </span>
                                  <p className="mt-2 text-sm font-semibold text-foreground">{formatDistanceToNow(new Date(bid.created_at), { addSuffix: true })}</p>
                                </div>
                                <div className="info-tile px-3.5 py-3">
                                  <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                                    <DollarSign className="w-4 h-4 text-primary" />
                                    Project budget
                                  </span>
                                  <p className="mt-2 text-sm font-semibold text-foreground">
                                    {project ? `$${project.budget_min} - $${project.budget_max}` : "Unavailable"}
                                  </p>
                                </div>
                              </div>
                            </div>

                            <div className="flex flex-wrap gap-2 xl:max-w-[14rem] xl:justify-end">
                              <Button size="sm" className="rounded-lg" onClick={() => navigate(`/projects/${bid.project_id}`)}>
                                View Project
                                <ArrowRight className="w-4 h-4 ml-1" />
                              </Button>

                              {["active", "shortlisted"].includes(bid.status) && (
                                <Button size="sm" variant="ghost" onClick={() => handleWithdrawBid(bid.id)} className="danger-ghost-action rounded-lg" disabled={isBidActionPending(bid.id) || isProjectActionPending(bid.project_id)}>
                                  {isPending(getBidActionKey("withdraw", bid.id)) ? (
                                    <>
                                      <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                      Withdrawing...
                                    </>
                                  ) : (
                                    <>
                                      <XCircle className="w-4 h-4 mr-1" />
                                      Withdraw
                                    </>
                                  )}
                                </Button>
                              )}

                              {bid.status === "awarded" && (project?.status === "awarded" || bid.project_status === "awarded") && (
                                <Button
                                  size="sm"
                                  className="rounded-lg"
                                  onClick={() => handleStartProject(bid.project_id)}
                                  disabled={isProjectActionPending(bid.project_id) || isBidActionPending(bid.id)}
                                >
                                  {isPending(getProjectActionKey("start", bid.project_id)) ? (
                                    <>
                                      <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                      Starting...
                                    </>
                                  ) : (
                                    <>
                                      <Play className="w-4 h-4 mr-1" />
                                      Start Project
                                    </>
                                  )}
                                </Button>
                              )}

                              {bid.status === "awarded" && (project?.status === "awarded" || project?.status === "sold" || bid.project_status === "awarded" || bid.project_status === "sold") && (
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  className="rounded-lg"
                                  onClick={() => handleStopProject(bid.project_id)}
                                  disabled={isProjectActionPending(bid.project_id) || isBidActionPending(bid.id)}
                                >
                                  {isPending(getProjectActionKey("stop", bid.project_id)) ? (
                                    <>
                                      <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                      Stopping...
                                    </>
                                  ) : (
                                    <>
                                      <StopCircle className="w-4 h-4 mr-1" />
                                      Stop Project
                                    </>
                                  )}
                                </Button>
                              )}

                              {bid.status === "awarded" && (project?.status === "sold" || bid.project_status === "sold") && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="rounded-lg"
                                  onClick={() => handleCompleteProject(bid.project_id)}
                                  disabled={isProjectActionPending(bid.project_id) || isBidActionPending(bid.id)}
                                >
                                  {isPending(getProjectActionKey("complete", bid.project_id)) ? (
                                    <>
                                      <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                      Completing...
                                    </>
                                  ) : (
                                    <>
                                      <CheckCircle className="w-4 h-4 mr-1" />
                                      Mark Complete
                                    </>
                                  )}
                                </Button>
                              )}

                              {bid.status === "awarded" && project?.status === "in_progress" && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="rounded-lg"
                                  onClick={() => handleCompleteProject(bid.project_id)}
                                  disabled={isProjectActionPending(bid.project_id) || isBidActionPending(bid.id)}
                                >
                                  {isPending(getProjectActionKey("complete", bid.project_id)) ? (
                                    <>
                                      <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                      Completing...
                                    </>
                                  ) : (
                                    <>
                                      <CheckCircle className="w-4 h-4 mr-1" />
                                      Mark Complete
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
                  <h3 className="heading-3 mb-2 text-foreground">No bids yet</h3>
                  <p className="mx-auto mb-6 max-w-xl text-sm leading-6 text-muted-foreground">
                    Browse available projects and submit proposals that fit your service lineup and timeline.
                  </p>
                  <Button onClick={() => navigate("/projects")} className="rounded-lg">
                    <Briefcase className="w-4 h-4 mr-2" />
                    Browse Projects
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
