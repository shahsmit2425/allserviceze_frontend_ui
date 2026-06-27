import { useState, useEffect } from "react";
import logger from "@/utils/logger";
import { useNavigate, Link } from "react-router-dom";
import { AppShell } from "../components/AppShell";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Textarea } from "../components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle
} from "../components/ui/dialog";
import { Avatar, AvatarFallback } from "../components/ui/avatar";
import { useAuth } from "../context/AuthContext";
import { toast } from "sonner";
import axios from "axios";
import { usePendingActions } from "../hooks/usePendingActions";
import { 
  Calendar, MessageSquare, Star, 
  DollarSign, Briefcase, TrendingUp, Loader2,
  FileText, Package, CheckCircle, Clock, MapPin,
  ExternalLink, ArrowRight, XCircle, Trophy, Play, 
  ShoppingBag, StopCircle, Pause, Heart
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { usePlatform } from "@/mobile/hooks/usePlatform";

const API_URL = `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'}/api`;

const bidStatusColors = {
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

const formatCurrency = (value) => `$${Number(value || 0).toLocaleString()}`;

const formatBudgetRange = (project) => {
  const min = Number(project?.budget_min) || 0;
  const max = Number(project?.budget_max) || 0;
  if (min && max) return `${formatCurrency(min)} - ${formatCurrency(max)}`;
  if (max) return `Up to ${formatCurrency(max)}`;
  if (min) return `From ${formatCurrency(min)}`;
  return "Custom budget";
};

const formatActivityTime = (value) => {
  if (!value) return "Recently";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Recently";
  return formatDistanceToNow(date, { addSuffix: true });
};

export default function ProviderDashboard() {
  const navigate = useNavigate();
  const { user, getAuthHeader } = useAuth();
  const { isNativePhone, isNativeTablet } = usePlatform();
  
  const [stats, setStats] = useState(null);
  const [bids, setBids] = useState([]);
  const [projects, setProjects] = useState({});
  const [reviews, setReviews] = useState([]);
  const [marketProjects, setMarketProjects] = useState([]);
  const [chatConversations, setChatConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("active");

  // Dialogs
  const [selectedProject, setSelectedProject] = useState(null);
  const [projectDetails, setProjectDetails] = useState(null);
  const [projectReview, setProjectReview] = useState(null);
  const [loadingReview, setLoadingReview] = useState(false);
  const [showAllReviews, setShowAllReviews] = useState(false);
  const [lightboxImage, setLightboxImage] = useState(null);

  // Reply
  const [replyText, setReplyText] = useState("");
  const [submittingReply, setSubmittingReply] = useState(false);
  const { isPending, runPendingAction } = usePendingActions();

  const getBidActionKey = (action, bidId) => `${action}:${bidId}`;
  const getProjectActionKey = (action, projectId) => `${action}:${projectId}`;
  const isBidActionPending = (bidId) => isPending(getBidActionKey("withdraw", bidId));
  const isProjectActionPending = (projectId) =>
    ["favorite", "start", "stop", "complete"].some((action) => isPending(getProjectActionKey(action, projectId)));

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const headers = getAuthHeader();
      const [statsRes, bidsRes, reviewsRes, liveProjectsRes, conversationsRes] = await Promise.allSettled([
        axios.get(`${API_URL}/stats/provider`, { headers }),
        axios.get(`${API_URL}/bids/my`, { headers }),
        axios.get(`${API_URL}/reviews/provider/${user?.id}`),
        axios.get(`${API_URL}/projects/live?limit=12`, { withCredentials: true, headers }),
        axios.get(`${API_URL}/chat/conversations`, { headers })
      ]);

      const nextStats = statsRes.status === "fulfilled" ? statsRes.value.data : null;
      const nextBids = bidsRes.status === "fulfilled" && Array.isArray(bidsRes.value.data) ? bidsRes.value.data : [];
      const nextReviews = reviewsRes.status === "fulfilled" && Array.isArray(reviewsRes.value.data) ? reviewsRes.value.data : [];
      const nextMarketProjects = liveProjectsRes.status === "fulfilled" && Array.isArray(liveProjectsRes.value.data) ? liveProjectsRes.value.data : [];
      const nextConversations = conversationsRes.status === "fulfilled" && Array.isArray(conversationsRes.value.data) ? conversationsRes.value.data : [];

      setStats(nextStats);
      setBids(nextBids);
      setReviews(nextReviews);
      setMarketProjects(nextMarketProjects);
      setChatConversations(nextConversations);

      // Fetch project details in one parallel batch (avoid N+1 sequential calls)
      const projectIds = [...new Set(nextBids.map(b => b.project_id))];
      const projectData = {};
      const projectResults = await Promise.allSettled(
        projectIds.map(pid =>
          axios.get(`${API_URL}/projects/${pid}`, { withCredentials: true, headers })
        )
      );
      projectIds.forEach((pid, i) => {
        if (projectResults[i].status === 'fulfilled') {
          projectData[pid] = projectResults[i].value.data;
        }
      });
      setProjects(projectData);
    } catch (error) {
      logger.error("Error fetching dashboard data:", error);
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
        await fetchDashboardData();
      } catch (error) {
        toast.error("Failed to withdraw bid");
      }
    });
  };

  const handleToggleFavorite = async (projectId, isFavorited) => {
    await runPendingAction(getProjectActionKey("favorite", projectId), async () => {
      try {
        if (isFavorited) {
          await axios.delete(`${API_URL}/projects/${projectId}/favorite`, { 
            withCredentials: true,
            headers: getAuthHeader() 
          });
          toast.success("Removed from favorites");
        } else {
          await axios.post(`${API_URL}/projects/${projectId}/favorite`, {}, { 
            withCredentials: true,
            headers: getAuthHeader() 
          });
          toast.success("Added to favorites");
        }
        setProjects(prev => ({
          ...prev,
          [projectId]: {
            ...prev[projectId],
            is_favorited: !isFavorited
          }
        }));
      } catch (error) {
        const message = error.response?.data?.detail || "Failed to update favorite";
        toast.error(message);
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
        await fetchDashboardData();
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
        await fetchDashboardData();
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
        await fetchDashboardData();
      } catch (error) {
        toast.error("Failed to complete project");
      }
    });
  };


  const activeBids = bids.filter(b => b.status === "active" || b.status === "shortlisted");
  const shortlistedBids = bids.filter(b => b.is_shortlisted && b.status !== "awarded");
  const wonBids = bids.filter(b => b.status === "awarded");
  const inProgressBids = bids.filter(b => b.status === "awarded" && (b.project_status === "sold" || b.project_status === "in_progress"));
  const completedProjects = bids.filter(b => b.status === "awarded" && b.project_status === "completed");
  const withdrawnBids = bids.filter(b => b.status === "withdrawn");

  // Filter by tab
  const tabFilteredBids = activeTab === "all" 
    ? bids 
    : activeTab === "active"
    ? activeBids
    : activeTab === "won"
    ? wonBids.filter(b => !["sold", "in_progress", "completed"].includes(b.project_status))
    : activeTab === "in_progress"
    ? inProgressBids
    : activeTab === "completed"
    ? completedProjects
    : activeTab === "withdrawn"
    ? withdrawnBids
    : bids;
  const filteredBids = tabFilteredBids;

  const counts = {
    all: bids.length,
    active: activeBids.length,
    shortlisted: shortlistedBids.length,
    won: wonBids.filter(b => !["sold", "in_progress", "completed"].includes(b.project_status)).length,
    in_progress: inProgressBids.length,
    completed: completedProjects.length,
    withdrawn: withdrawnBids.length
  };

  const bidProjectIds = new Set(bids.map((bid) => bid.project_id));
  const preferredCategoryWeights = bids.reduce((accumulator, bid) => {
    const category = projects[bid.project_id]?.category;
    if (category) {
      accumulator[category] = (accumulator[category] || 0) + 1;
    }
    return accumulator;
  }, {});

  const recommendedProjects = [...marketProjects]
    .filter((project) => !bidProjectIds.has(project.id))
    .sort((left, right) => {
      const categoryDelta = (preferredCategoryWeights[right.category] || 0) - (preferredCategoryWeights[left.category] || 0);
      if (categoryDelta !== 0) return categoryDelta;

      const rightBudget = Number(right.budget_max) || Number(right.budget_min) || 0;
      const leftBudget = Number(left.budget_max) || Number(left.budget_min) || 0;
      if (rightBudget !== leftBudget) return rightBudget - leftBudget;

      return new Date(right.created_at || 0).getTime() - new Date(left.created_at || 0).getTime();
    })
    .slice(0, 3);

  const unreadMessageCount = chatConversations.reduce(
    (sum, conversation) => sum + (Number(conversation.unread_count) || 0),
    0
  );
  const openBidValue = activeBids.reduce((sum, bid) => sum + (Number(bid.amount) || 0), 0);
  const wonValue = wonBids.reduce((sum, bid) => sum + (Number(bid.amount) || 0), 0);

  const recentActivity = [
    ...chatConversations
      .filter((conversation) => conversation.last_message_at)
      .map((conversation) => ({
        id: `message-${conversation.id}`,
        type: "message",
        title: conversation.unread_count > 0 ? "New customer message" : "Conversation updated",
        meta: conversation.title || conversation.last_message?.content || "Project conversation",
        timestamp: conversation.last_message_at,
      })),
    ...activeBids.map((bid) => ({
      id: `active-${bid.id}`,
      type: bid.is_shortlisted ? "shortlist" : "bid",
      title: bid.is_shortlisted ? "Bid shortlisted" : "Bid awaiting response",
      meta: bid.project_title || projects[bid.project_id]?.title || "Project opportunity",
      timestamp: bid.created_at,
    })),
    ...wonBids.map((bid) => ({
      id: `won-${bid.id}`,
      type: "won",
      title: "Project won",
      meta: bid.project_title || projects[bid.project_id]?.title || "Awarded project",
      timestamp: bid.updated_at || bid.created_at,
    })),
    ...recommendedProjects.map((project) => ({
      id: `match-${project.id}`,
      type: "match",
      title: "New project match",
      meta: project.title,
      timestamp: project.created_at,
    })),
  ]
    .filter((item) => item.timestamp)
    .sort((left, right) => new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime())
    .slice(0, 5);

  const renderActivityIcon = (type) => {
    if (type === "message") return <MessageSquare className="h-4 w-4 text-primary" />;
    if (type === "won") return <Trophy className="h-4 w-4 text-emerald-600" />;
    if (type === "shortlist") return <Star className="h-4 w-4 text-copper-500" />;
    return <Briefcase className="h-4 w-4 text-sky-600" />;
  };

  const handleProjectClick = async (bid) => {
    setSelectedProject(bid);
    setProjectDetails(null);
    setProjectReview(null);
    setReplyText("");
    setLoadingReview(true);
    try {
      const [projectRes, reviewRes] = await Promise.allSettled([
        axios.get(`${API_URL}/projects/${bid.project_id}`, { 
          withCredentials: true,
          headers: getAuthHeader() 
        }),
        axios.get(`${API_URL}/reviews/project/${bid.project_id}`)
      ]);
      if (projectRes.status === "fulfilled") setProjectDetails(projectRes.value.data);
      if (reviewRes.status === "fulfilled") setProjectReview(reviewRes.value.data);
    } catch {
      // ignore
    } finally {
      setLoadingReview(false);
    }
  };

  const handleReplySubmit = async (reviewId) => {
    if (!replyText.trim()) return;
    setSubmittingReply(true);
    try {
      const res = await axios.post(`${API_URL}/reviews/${reviewId}/reply`, { reply: replyText.trim() }, {
        withCredentials: true,
        headers: getAuthHeader()
      });
      toast.success("Reply posted successfully");
      setProjectReview(res.data);
      setReplyText("");
      // Refresh reviews list
      const reviewsRes = await axios.get(`${API_URL}/reviews/provider/${user?.id}`);
      setReviews(reviewsRes.data || []);
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to post reply");
    } finally {
      setSubmittingReply(false);
    }
  };

  const handleReviewReply = async (reviewId) => {
    if (!replyText.trim()) return;
    setSubmittingReply(true);
    try {
      await axios.post(`${API_URL}/reviews/${reviewId}/reply`, { reply: replyText.trim() }, {
        withCredentials: true,
        headers: getAuthHeader()
      });
      toast.success("Reply posted successfully");
      setReplyText("");
      // Refresh reviews list
      const reviewsRes = await axios.get(`${API_URL}/reviews/provider/${user?.id}`);
      setReviews(reviewsRes.data || []);
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to post reply");
    } finally {
      setSubmittingReply(false);
    }
  };

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
    <>
      <AppShell theme="provider" className="bg-background pb-12" contentClassName="pb-12" data-testid="provider-dashboard">
        <div className="page-shell space-y-7 py-7 sm:space-y-8 sm:py-8">
          <section className="toolbar-surface overflow-hidden border-0 bg-[linear-gradient(135deg,#f8fcff_0%,#eef8f5_55%,#ffffff_100%)] px-5 py-5 sm:px-6 sm:py-6">
            <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <p className="detail-kicker">Welcome back {user?.name || user?.full_name || "Provider"}</p>
                <h1 className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-foreground sm:text-4xl">
                  Marketplace activity should lead your day.
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
                  Find new projects, follow up on active bids, answer customers faster, and move awarded work into delivery from one focused workspace.
                </p>
              </div>
              <Button onClick={() => navigate("/projects")} className="rounded-lg">
                <Briefcase className="mr-2 h-4 w-4" />
                Find New Jobs
              </Button>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-white/80 bg-white/85 px-4 py-4 shadow-sm shadow-deep-navy-800/5">
                <p className="caption">New matching projects</p>
                <p className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-foreground">{recommendedProjects.length}</p>
                <p className="mt-2 text-sm text-muted-foreground">Fresh live jobs you have not bid on yet.</p>
              </div>
              <div className="rounded-xl border border-white/80 bg-white/85 px-4 py-4 shadow-sm shadow-deep-navy-800/5">
                <p className="caption">Open bid pipeline</p>
                <p className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-foreground">{formatCurrency(openBidValue)}</p>
                <p className="mt-2 text-sm text-muted-foreground">Current proposal value waiting on customer action.</p>
              </div>
              <div className="rounded-xl border border-white/80 bg-white/85 px-4 py-4 shadow-sm shadow-deep-navy-800/5">
                <p className="caption">Won work</p>
                <p className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-foreground">{formatCurrency(wonValue)}</p>
                <p className="mt-2 text-sm text-muted-foreground">Awarded pipeline already converted into revenue opportunities.</p>
              </div>
            </div>
          </section>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_23rem]">
            <div className="space-y-6">
              <Card className="form-shell border-0">
                <CardHeader className="pb-0">
                  <div className="flex items-end justify-between gap-4">
                    <div>
                      <p className="caption">Action Center</p>
                      <CardTitle className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-foreground">Keep work moving</CardTitle>
                    </div>
                    <Button variant="outline" className="rounded-lg bg-white/70" onClick={() => navigate("/messages")}>
                      Open messages
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <button type="button" onClick={() => navigate("/projects")} className="rounded-xl border border-border/60 bg-white px-4 py-4 text-left shadow-sm transition hover:border-primary/20 hover:bg-primary/5">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="caption">New project matches</p>
                          <p className="mt-2 text-2xl font-semibold tracking-[-0.05em] text-foreground">{recommendedProjects.length}</p>
                        </div>
                        <Briefcase className="h-5 w-5 text-sky-600" />
                      </div>
                      <p className="mt-3 text-sm leading-6 text-muted-foreground">Prioritize live jobs that fit your current pipeline.</p>
                    </button>
                    <button type="button" onClick={() => navigate("/messages")} className="rounded-xl border border-border/60 bg-white px-4 py-4 text-left shadow-sm transition hover:border-primary/20 hover:bg-primary/5">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="caption">Customer messages</p>
                          <p className="mt-2 text-2xl font-semibold tracking-[-0.05em] text-foreground">{unreadMessageCount}</p>
                        </div>
                        <MessageSquare className="h-5 w-5 text-emerald-600" />
                      </div>
                      <p className="mt-3 text-sm leading-6 text-muted-foreground">Unread conversations that can unblock hiring decisions.</p>
                    </button>
                    <button type="button" onClick={() => setActiveTab("active")} className="rounded-xl border border-border/60 bg-white px-4 py-4 text-left shadow-sm transition hover:border-primary/20 hover:bg-primary/5">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="caption">Bids awaiting response</p>
                          <p className="mt-2 text-2xl font-semibold tracking-[-0.05em] text-foreground">{counts.active}</p>
                        </div>
                        <FileText className="h-5 w-5 text-copper-600" />
                      </div>
                      <p className="mt-3 text-sm leading-6 text-muted-foreground">Follow up on proposals still sitting in customer review.</p>
                    </button>
                  </div>
                </CardContent>
              </Card>

              <Card className="form-shell border-0">
                <CardHeader className="pb-0">
                  <div className="flex items-end justify-between gap-4">
                    <div>
                      <p className="caption">Recommended Projects</p>
                      <CardTitle className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-foreground">Fresh jobs to bid now</CardTitle>
                    </div>
                    <Button variant="outline" className="rounded-lg bg-white/70" onClick={() => navigate("/projects")}>Browse all</Button>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  {recommendedProjects.length > 0 ? (
                    <div className="space-y-3">
                      {recommendedProjects.map((project) => (
                        <div key={project.id} className="rounded-xl border border-border/60 bg-white px-4 py-4 shadow-sm">
                          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                {project.category ? (
                                  <Badge variant="outline" className="rounded-lg px-3 py-1 text-xs font-semibold">{project.category}</Badge>
                                ) : null}
                                {project.urgency ? <Badge className="status-badge-warning">{project.urgency}</Badge> : null}
                              </div>
                              <h3 className="mt-3 text-lg font-semibold tracking-[-0.03em] text-foreground">{project.title}</h3>
                              <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">{project.description}</p>
                              <div className="mt-4 flex flex-wrap gap-2.5 text-sm">
                                <span className="inline-flex items-center gap-2 rounded-lg border border-border/60 bg-background/85 px-3 py-2 text-foreground/85 shadow-sm shadow-deep-navy-800/5">
                                  <DollarSign className="h-4 w-4 text-primary" />
                                  <span className="font-medium">{formatBudgetRange(project)}</span>
                                </span>
                                <span className="inline-flex items-center gap-2 rounded-lg border border-border/60 bg-background/85 px-3 py-2 text-foreground/85 shadow-sm shadow-deep-navy-800/5">
                                  <MapPin className="h-4 w-4 text-primary" />
                                  <span className="font-medium">{project.location || "Flexible location"}</span>
                                </span>
                                <span className="inline-flex items-center gap-2 rounded-lg border border-border/60 bg-background/85 px-3 py-2 text-foreground/85 shadow-sm shadow-deep-navy-800/5">
                                  <Calendar className="h-4 w-4 text-primary" />
                                  <span className="font-medium">{formatActivityTime(project.created_at)}</span>
                                </span>
                              </div>
                            </div>
                            <div className="flex shrink-0 flex-col gap-2 lg:w-40">
                              <Button className="rounded-lg" onClick={() => navigate(`/projects/${project.id}`)}>
                                Bid Now
                              </Button>
                              <Button variant="outline" className="rounded-lg border-border/60" onClick={() => navigate(`/projects/${project.id}`)}>
                                View Details
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="empty-state-panel px-5 py-8 text-center">
                      <Briefcase className="mx-auto h-10 w-10 text-muted-foreground" />
                      <h3 className="mt-4 text-lg font-semibold text-foreground">No fresh matches right now</h3>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">Browse all live projects to widen the pipeline and uncover nearby opportunities.</p>
                      <Button onClick={() => navigate("/projects")} className="mt-4 rounded-lg">
                        <Briefcase className="mr-2 h-4 w-4" />
                        Find New Jobs
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="form-shell border-0">
          <CardHeader className="pb-0">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="caption">Pipeline</p>
                <CardTitle className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-foreground">Bids and won work</CardTitle>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">Stay focused on proposals, shortlist movement, wins, and delivery handoff.</p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-xl border border-border/60 bg-white px-4 py-4 shadow-sm">
                <p className="caption">Active bids</p>
                <p className="mt-2 text-2xl font-semibold tracking-[-0.05em] text-foreground">{counts.active}</p>
                <p className="mt-2 text-sm text-muted-foreground">Waiting on customer review.</p>
              </div>
              <div className="rounded-xl border border-border/60 bg-white px-4 py-4 shadow-sm">
                <p className="caption">Shortlisted</p>
                <p className="mt-2 text-2xl font-semibold tracking-[-0.05em] text-foreground">{counts.shortlisted}</p>
                <p className="mt-2 text-sm text-muted-foreground">Closer to conversion.</p>
              </div>
              <div className="rounded-xl border border-border/60 bg-white px-4 py-4 shadow-sm">
                <p className="caption">Won</p>
                <p className="mt-2 text-2xl font-semibold tracking-[-0.05em] text-foreground">{counts.won}</p>
                <p className="mt-2 text-sm text-muted-foreground">Ready to start delivery.</p>
              </div>
              <div className="rounded-xl border border-border/60 bg-white px-4 py-4 shadow-sm">
                <p className="caption">Completed</p>
                <p className="mt-2 text-2xl font-semibold tracking-[-0.05em] text-foreground">{counts.completed}</p>
                <p className="mt-2 text-sm text-muted-foreground">Finished jobs and reviews.</p>
              </div>
            </div>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className={isNativePhone ? "mobile-tabs-rail mb-6 flex" : "mb-6 h-auto flex-wrap gap-2"}>
                <TabsTrigger value="active">Active ({counts.active})</TabsTrigger>
                <TabsTrigger value="won">Won ({counts.won})</TabsTrigger>
                <TabsTrigger value="in_progress">In Progress ({counts.in_progress})</TabsTrigger>
                <TabsTrigger value="completed">Completed ({counts.completed})</TabsTrigger>
                <TabsTrigger value="withdrawn">Withdrawn ({counts.withdrawn})</TabsTrigger>
                <TabsTrigger value="all">All ({counts.all})</TabsTrigger>
              </TabsList>

              <TabsContent value={activeTab}>
                {filteredBids.length > 0 ? (
                  <div className="space-y-3">
                    {filteredBids.map((bid) => {
                      const project = projects[bid.project_id];
                      return (
                        <Card key={bid.id} className="result-card-surface">
                          <CardContent className="p-5 sm:p-6">
                            <div className={isNativeTablet ? "flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between" : "flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"}>
                              <div className="min-w-0 flex-1">
                                <div className="project-card-badges">
                                  <Badge className={bidStatusColors[bid.status]}>
                                    {bid.status === "awarded" && <Trophy className="w-3 h-3 mr-1" />}
                                    {statusLabels[bid.status]}
                                  </Badge>
                                  {bid.status === "awarded" && (bid.project_status === "completed" || project?.status === "completed") && (
                                    <Badge className="status-badge-success">
                                      <CheckCircle className="w-3 h-3 mr-1" />
                                      Completed
                                    </Badge>
                                  )}
                                  {bid.status === "awarded" && (bid.project_status === "sold" || project?.status === "sold") && (
                                    <Badge className="status-badge-accent">
                                      <ShoppingBag className="w-3 h-3 mr-1" />
                                      Sold
                                    </Badge>
                                  )}
                                  {bid.status === "awarded" && (bid.project_status === "awarded" || project?.status === "awarded") && (
                                    <Badge className="status-badge-warning">Awaiting Start</Badge>
                                  )}
                                  {bid.status === "awarded" && (bid.project_status === "paused" || project?.status === "paused") && (
                                    <Badge className="status-badge-warning">
                                      <Pause className="w-3 h-3 mr-1" />
                                      Paused
                                    </Badge>
                                  )}
                                  {bid.is_shortlisted && bid.status !== "awarded" && (
                                    <Badge className="status-badge-info">
                                      <Star className="w-3 h-3 mr-1" />
                                      Shortlisted
                                    </Badge>
                                  )}
                                  {project?.category && (
                                    <Badge variant="outline" className="rounded-lg px-3 py-1 text-xs font-semibold">{project.category}</Badge>
                                  )}
                                </div>

                                <div className="mt-3 flex items-start gap-3">
                                  <Briefcase className="mt-1 h-5 w-5 shrink-0 text-primary" />
                                  <div className="min-w-0">
                                    <Link to={`/projects/${bid.project_id}`}>
                                      <h3 className="project-card-title hover:text-primary break-words">
                                        {bid.project_title || project?.title || "Project"}
                                      </h3>
                                    </Link>
                                    <p className="mt-2 text-sm leading-6 text-muted-foreground line-clamp-2">
                                      {bid.proposal}
                                    </p>
                                  </div>
                                </div>

                                <div className="mt-4 flex flex-wrap gap-2.5 text-sm">
                                  <span className="inline-flex items-center gap-2 rounded-lg border border-border/60 bg-background/85 px-3 py-2 text-foreground/85 shadow-sm shadow-deep-navy-800/5">
                                    <DollarSign className="h-4 w-4 text-primary" />
                                    <span className="font-medium">Bid ${bid.amount}</span>
                                  </span>
                                  <span className="inline-flex items-center gap-2 rounded-lg border border-border/60 bg-background/85 px-3 py-2 text-foreground/85 shadow-sm shadow-deep-navy-800/5">
                                    <Clock className="h-4 w-4 text-primary" />
                                    <span className="font-medium">{bid.estimated_days} days</span>
                                  </span>
                                  <span className="inline-flex items-center gap-2 rounded-lg border border-border/60 bg-background/85 px-3 py-2 text-foreground/85 shadow-sm shadow-deep-navy-800/5">
                                    <Calendar className="h-4 w-4 text-primary" />
                                    <span className="font-medium">{formatDistanceToNow(new Date(bid.created_at), { addSuffix: true })}</span>
                                  </span>
                                  {project ? (
                                    <span className="inline-flex items-center gap-2 rounded-lg border border-border/60 bg-background/85 px-3 py-2 text-foreground/85 shadow-sm shadow-deep-navy-800/5">
                                      <Briefcase className="h-4 w-4 text-primary" />
                                      <span className="font-medium">${project.budget_min} - ${project.budget_max}</span>
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-2 rounded-lg border border-border/60 bg-background/85 px-3 py-2 text-foreground/85 shadow-sm shadow-deep-navy-800/5">
                                      <FileText className="h-4 w-4 text-primary" />
                                      <span className="font-medium">{statusLabels[bid.status]}</span>
                                    </span>
                                  )}
                                </div>

                                <div className="mt-5 flex flex-wrap gap-2.5">
                                  {project && (
                                    <button
                                      onClick={() => handleToggleFavorite(project.id, project.is_favorited)}
                                      disabled={isProjectActionPending(project.id)}
                                      className={`favorite-toggle p-2 ${project.is_favorited ? "favorite-toggle-active" : "favorite-toggle-idle"}`}
                                      title={project.is_favorited ? "Remove from favorites" : "Add to favorites"}
                                    >
                                      {isPending(getProjectActionKey("favorite", project.id)) ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                      ) : (
                                        <Heart className={`h-4 w-4 ${project.is_favorited ? "fill-current" : ""}`} />
                                      )}
                                    </button>
                                  )}
                                  <Button 
                                    size="sm" 
                                    className="justify-between rounded-lg"
                                    onClick={() => navigate(`/projects/${bid.project_id}`)}
                                  >
                                    View Project
                                    <ArrowRight className="w-4 h-4 ml-2" />
                                  </Button>
                                  
                                  {["active", "shortlisted"].includes(bid.status) && (
                                    <Button 
                                      size="sm" 
                                      variant="ghost"
                                      onClick={() => handleWithdrawBid(bid.id)}
                                      className="danger-ghost-action rounded-lg"
                                      disabled={isBidActionPending(bid.id) || isProjectActionPending(bid.project_id)}
                                    >
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

                                  {bid.status === "awarded" && (project?.status === "sold" || bid.project_status === "sold" || project?.status === "in_progress") && (
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
                                  
                                  {bid.status === "awarded" && (bid.project_status === "completed" || project?.status === "completed") && (
                                    <Button 
                                      size="sm" 
                                      variant="outline"
                                      className="rounded-lg"
                                      onClick={(e) => { e.stopPropagation(); handleProjectClick(bid); }}
                                    >
                                      <Star className="w-4 h-4 mr-1" />
                                      View Review
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                ) : (
                  <div className="empty-state-panel py-20">
                    <Briefcase className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="heading-3 mb-2">No Bids Yet</h3>
                    <p className="text-muted-foreground mb-6">
                      Browse live projects, send a sharp proposal, and start building a healthier provider pipeline.
                    </p>
                    <Button onClick={() => navigate("/projects")} className="rounded-lg">
                      <Briefcase className="w-4 h-4 mr-2" />
                      Browse Projects
                    </Button>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <Card className="form-shell border-0">
                <CardHeader className="pb-0">
                  <div className="flex items-end justify-between gap-4">
                    <div>
                      <p className="caption">Recent Activity</p>
                      <CardTitle className="mt-2 text-xl font-semibold tracking-[-0.04em] text-foreground">Signals that need attention</CardTitle>
                    </div>
                    <Button variant="ghost" className="rounded-lg px-0 text-primary" onClick={() => navigate("/messages")}>View inbox</Button>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  {recentActivity.length > 0 ? (
                    <div className="space-y-3">
                      {recentActivity.map((item) => (
                        <div key={item.id} className="flex items-start gap-3 rounded-xl border border-border/60 bg-white px-4 py-3 shadow-sm">
                          <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-2xl bg-slate-50">
                            {renderActivityIcon(item.type)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-foreground">{item.title}</p>
                            <p className="mt-1 truncate text-sm text-muted-foreground">{item.meta}</p>
                          </div>
                          <span className="shrink-0 text-xs font-medium text-muted-foreground">{formatActivityTime(item.timestamp)}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-border/60 bg-white px-4 py-6 text-sm text-muted-foreground">
                      Activity will appear here as bids move, customers reply, and new project matches come in.
                    </div>
                  )}
                </CardContent>
              </Card>

              <button
                type="button"
                onClick={() => navigate("/schedule")}
                className="form-shell w-full border-0 p-5 text-left transition hover:border-primary/20 hover:bg-primary/5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="caption">Calendar And Appointments</p>
                    <h2 className="mt-2 text-xl font-semibold tracking-[-0.04em] text-foreground">Move scheduling into a dedicated workspace</h2>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">Open your full schedule page to manage blocked dates, upcoming appointments, and customer audio or video call permissions.</p>
                  </div>
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 shadow-sm">
                    <Calendar className="h-5 w-5 text-primary" />
                  </div>
                </div>
                <div className="mt-5 flex flex-wrap gap-3">
                  <span className="inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm font-semibold text-foreground shadow-sm">
                    Calendar availability
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm font-semibold text-foreground shadow-sm">
                    Appointments
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm font-semibold text-foreground shadow-sm">
                    Call settings
                  </span>
                </div>
                <div className="mt-5 flex items-center text-sm font-semibold text-primary">
                  Open schedule page
                  <ArrowRight className="ml-2 h-4 w-4" />
                </div>
              </button>

              <button type="button" onClick={() => setShowAllReviews(true)} className="form-shell w-full border-0 p-5 text-left transition hover:border-primary/20 hover:bg-primary/5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="caption">Reputation</p>
                    <h2 className="mt-2 text-xl font-semibold tracking-[-0.04em] text-foreground">Reviews that help you win</h2>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">Use customer proof to strengthen future bids and follow-ups.</p>
                  </div>
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-yellow-100 shadow-sm">
                    <TrendingUp className="h-5 w-5 text-yellow-600" />
                  </div>
                </div>
                <div className="mt-5 flex flex-wrap gap-3">
                  <span className="inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm font-semibold text-foreground shadow-sm">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    {stats?.avg_rating?.toFixed(1) || "New"}
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm font-semibold text-foreground shadow-sm">
                    {stats?.total_reviews || 0} reviews
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm font-semibold text-foreground shadow-sm">
                    {stats?.completed_projects || counts.completed} completed jobs
                  </span>
                </div>
              </button>
            </div>
          </div>
      </div>
    </AppShell>

      {/* Project Detail Dialog */}
      <Dialog open={!!selectedProject} onOpenChange={(open) => { if (!open) { setSelectedProject(null); setProjectDetails(null); setReplyText(""); } }}>
        <DialogContent className="max-h-[85vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedProject?.project_title || `Project #${selectedProject?.project_id}`}
              <Badge className="status-badge-success ml-2">Completed</Badge>
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-5">
            {/* Project Details */}
            {projectDetails ? (
              <div className="space-y-5">
                <div className="rounded-xl border border-border/60 bg-white/90 p-5 shadow-sm backdrop-blur-sm">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Completed project overview</p>
                  <p className="mt-3 text-base leading-7 text-muted-foreground break-words overflow-wrap-anywhere">{projectDetails.description}</p>
                </div>

                <div className="project-detail-summary-grid">
                  <div className="project-detail-summary-item">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Budget</p>
                    <div className="mt-2 flex items-start gap-3">
                      <DollarSign className="mt-1 h-5 w-5 text-primary" />
                      <p className="text-base font-semibold leading-7 text-foreground">${projectDetails.budget_min} - ${projectDetails.budget_max}</p>
                    </div>
                  </div>
                  <div className="project-detail-summary-item">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Deadline</p>
                    <div className="mt-2 flex items-start gap-3">
                      <Calendar className="mt-1 h-5 w-5 text-primary" />
                      <p className="text-base font-semibold leading-7 text-foreground">{projectDetails.deadline}</p>
                    </div>
                  </div>
                  {projectDetails.location && (
                    <div className="project-detail-summary-item">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Location</p>
                      <div className="mt-2 flex items-start gap-3">
                        <MapPin className="mt-1 h-5 w-5 text-primary" />
                        <p className="text-base font-semibold leading-7 text-foreground">{projectDetails.location}</p>
                      </div>
                    </div>
                  )}
                  <div className="project-detail-summary-item">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Category</p>
                    <div className="mt-2 flex items-start gap-3">
                      <Briefcase className="mt-1 h-5 w-5 text-primary" />
                      <p className="text-base font-semibold leading-7 text-foreground">{projectDetails.category}</p>
                    </div>
                  </div>
                </div>

                {projectDetails.required_skills?.length > 0 && (
                  <div className="rounded-xl border border-border/60 bg-muted/35 p-4 shadow-sm">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Required skills</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {projectDetails.required_skills.map((skill, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">{skill}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {projectDetails.images?.length > 0 && (
                  <div className="rounded-xl border border-border/60 bg-muted/35 p-4 shadow-sm">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Project images</p>
                    <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                      {projectDetails.images.map((img, i) => (
                        <img
                          key={i}
                          src={img}
                          alt={`Image ${i + 1}`}
                          className="h-28 w-full cursor-pointer rounded-lg border border-border/60 object-cover shadow-sm transition-opacity hover:opacity-80"
                          onClick={() => setLightboxImage(img)}
                        />
                      ))}
                    </div>
                  </div>
                )}

                <div className="rounded-xl border border-primary/10 bg-primary/5 p-4 shadow-sm shadow-primary/5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary">Your winning bid</p>
                  <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-foreground">
                    <span className="inline-flex items-center gap-2 rounded-lg bg-white/80 px-3 py-2 font-semibold shadow-sm">
                      <DollarSign className="h-4 w-4 text-primary" />
                      ${selectedProject?.amount}
                    </span>
                    {selectedProject?.estimated_days && (
                      <span className="inline-flex items-center gap-2 rounded-lg bg-white/80 px-3 py-2 font-semibold shadow-sm">
                        <Clock className="h-4 w-4 text-primary" />
                        {selectedProject.estimated_days} days
                      </span>
                    )}
                    {projectDetails.completed_at && (
                      <span className="inline-flex items-center gap-2 rounded-lg bg-white/80 px-3 py-2 font-semibold shadow-sm">
                        <CheckCircle className="h-4 w-4 text-primary" />
                        Completed {new Date(projectDetails.completed_at).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ) : loadingReview ? (
              <div className="flex justify-center py-4">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
              </div>
            ) : (
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <DollarSign className="w-4 h-4" />
                  Bid: ${selectedProject?.amount}
                </span>
              </div>
            )}

            {/* Review Section */}
            <div className="border-t pt-4">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Star className="w-4 h-4 text-yellow-400" />
                Customer Review
              </h3>
              
              {loadingReview ? (
                <div className="flex justify-center py-6">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : projectReview ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className="bg-muted text-sm">
                        {projectReview.reviewer_name?.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-sm">{projectReview.reviewer_name}</p>
                      <div className="flex items-center gap-1">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} className={`w-3.5 h-3.5 ${i < projectReview.rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`} />
                        ))}
                        <span className="text-xs text-muted-foreground ml-2">
                          {new Date(projectReview.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">{projectReview.comment}</p>

                  {/* Provider Reply */}
                  {projectReview.provider_reply ? (
                    <div className="ml-4 pl-4 border-l-2 border-primary/30 bg-muted/30 rounded-r-lg p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <MessageSquare className="w-3.5 h-3.5 text-primary" />
                        <span className="text-sm font-semibold text-primary">Your Reply</span>
                        {projectReview.provider_reply_at && (
                          <span className="text-xs text-muted-foreground">
                            {new Date(projectReview.provider_reply_at).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{projectReview.provider_reply}</p>
                    </div>
                  ) : (
                    <div className="mt-2 space-y-2">
                      <Textarea
                        placeholder="Write your reply to this review..."
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        className="min-h-[80px] text-sm"
                        maxLength={2000}
                      />
                      <div className="flex justify-end">
                        <Button
                          size="sm"
                          onClick={() => handleReplySubmit(projectReview.id)}
                          disabled={submittingReply || !replyText.trim()}
                        >
                          {submittingReply ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <MessageSquare className="w-4 h-4 mr-1" />}
                          Post Reply
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground py-4 text-center">No review yet for this project.</p>
              )}
            </div>

            {/* View Full Project Page */}
            <div className="border-t pt-3">
              <Button
                variant="outline"
                size="sm"
                className="w-full rounded-lg border-border/60"
                onClick={() => { setSelectedProject(null); navigate(`/projects/${selectedProject?.project_id}`); }}
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                View Full Project Page
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Image Lightbox */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setLightboxImage(null)}
        >
          <button className="absolute top-4 right-4 text-white text-3xl font-bold hover:text-gray-300 z-[101]" onClick={() => setLightboxImage(null)}>&times;</button>
          <img src={lightboxImage} alt="Full size" className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl" onClick={(e) => e.stopPropagation()} />
        </div>
      )}

      {/* All Reviews Dialog */}
      <Dialog open={showAllReviews} onOpenChange={setShowAllReviews}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
              All Reviews & Ratings
              {stats?.avg_rating > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {stats.avg_rating.toFixed(1)} avg &middot; {stats.total_reviews} review{stats.total_reviews !== 1 ? 's' : ''}
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>

          {reviews.length > 0 ? (
            <div className="space-y-4">
              {reviews.map((review) => (
                <div key={review.id} className="border rounded-xl p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarFallback className="bg-muted text-sm">
                          {review.reviewer_name?.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-sm">{review.reviewer_name}</p>
                        <div className="flex items-center gap-1">
                          {[...Array(5)].map((_, i) => (
                            <Star key={i} className={`w-3.5 h-3.5 ${i < review.rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`} />
                          ))}
                        </div>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {new Date(review.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  {review.project_title && (
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-muted-foreground">
                        Project: <span className="font-medium text-foreground">{review.project_title}</span>
                      </p>
                      {review.project_id && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs h-6 px-2"
                          onClick={() => { setShowAllReviews(false); navigate(`/projects/${review.project_id}`); }}
                        >
                          View Project <ArrowRight className="w-3 h-3 ml-1" />
                        </Button>
                      )}
                    </div>
                  )}

                  <p className="text-sm text-muted-foreground">{review.comment}</p>

                  {/* Provider Reply */}
                  {review.provider_reply ? (
                    <div className="ml-4 pl-4 border-l-2 border-primary/30 bg-muted/30 rounded-r-lg p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <MessageSquare className="w-3.5 h-3.5 text-primary" />
                        <span className="text-sm font-semibold text-primary">Your Reply</span>
                        {review.provider_reply_at && (
                          <span className="text-xs text-muted-foreground">
                            {new Date(review.provider_reply_at).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{review.provider_reply}</p>
                    </div>
                  ) : (
                    <div className="mt-1 space-y-2">
                      <Textarea
                        placeholder="Write your reply..."
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        className="min-h-[70px] text-sm"
                        maxLength={2000}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div className="flex justify-end">
                        <Button
                          size="sm"
                          onClick={() => handleReviewReply(review.id)}
                          disabled={submittingReply || !replyText.trim()}
                        >
                          {submittingReply ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <MessageSquare className="w-4 h-4 mr-1" />}
                          Reply
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Star className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No reviews yet</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
