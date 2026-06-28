import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import logger from "@/utils/logger";
import { useParams, useNavigate } from "react-router-dom";
import { AppShell } from "../components/AppShell";
import { Button } from "../components/ui/button";
import { LIMITS } from "../lib/validation";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Badge } from "../components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../components/ui/dialog";
import { useAuth } from "../context/AuthContext";
import { toast } from "sonner";
import axios from "axios";
import { usePendingActions } from "../hooks/usePendingActions";
import { cn } from "@/lib/utils";
import { 
  DollarSign, Calendar, MapPin, Clock, Eye, MessageSquare,
  Star, CheckCircle, Send, Loader2, User, ArrowLeft, Paperclip,
  AlertTriangle, ThumbsUp, Award, XCircle, Image as ImageIcon,
  ChevronLeft, ChevronRight, Play, ShoppingBag, Pause, RotateCcw, Briefcase,
  Trash2, StopCircle, Heart, Search
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

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

const urgencyColors = {
  low: "status-badge-neutral",
  normal: "status-badge-info",
  high: "status-badge-warning",
  urgent: "status-badge-danger"
};

const formatProjectAnswerLabel = (key) => key
  .replace(/_/g, " ")
  .replace(/\b\w/g, (character) => character.toUpperCase());

const formatProjectAnswerValue = (value) => {
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
};

const getProjectAnswerMeta = (key) => {
  const normalizedKey = key.toLowerCase();

  if (/(service|category|trade|task|project)/.test(normalizedKey)) {
    return { icon: Briefcase, toneClass: "project-answer-icon--primary" };
  }
  if (/(area|location|yard|room|address)/.test(normalizedKey)) {
    return { icon: MapPin, toneClass: "project-answer-icon--sky" };
  }
  if (/(frequency|schedule|date|day|time)/.test(normalizedKey)) {
    return { icon: Calendar, toneClass: "project-answer-icon--amber" };
  }
  if (/(size|budget|price|cost|rate)/.test(normalizedKey)) {
    return { icon: DollarSign, toneClass: "project-answer-icon--emerald" };
  }
  if (/(priority|urgent|goal|focus)/.test(normalizedKey)) {
    return { icon: AlertTriangle, toneClass: "project-answer-icon--rose" };
  }
  if (/(owner|customer|occup|tenant|property)/.test(normalizedKey)) {
    return { icon: User, toneClass: "project-answer-icon--violet" };
  }
  if (/(note|comment|message|details|description)/.test(normalizedKey)) {
    return { icon: MessageSquare, toneClass: "project-answer-icon--sky" };
  }

  return { icon: CheckCircle, toneClass: "project-answer-icon--neutral" };
};

export default function ProjectDetail() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { user, getAuthHeader } = useAuth();
  
  const [project, setProject] = useState(null);
  const [bids, setBids] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [bidDialogOpen, setBidDialogOpen] = useState(false);
  const [submittingBid, setSubmittingBid] = useState(false);
  const [myBid, setMyBid] = useState(null);
  const { isPending, runPendingAction } = usePendingActions();
  
  const [bidForm, setBidForm] = useState({
    amount: "",
    proposal: "",
    estimated_days: ""
  });
  const [bidSearchQuery, setBidSearchQuery] = useState("");
  const [bidStatusFilter, setBidStatusFilter] = useState("all");
  
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  // Review state
  const [existingReview, setExistingReview] = useState(null);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewHover, setReviewHover] = useState(0);
  const [reviewComment, setReviewComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  const getProjectActionKey = (action) => `${action}:${projectId}`;
  const getBidActionKey = (action, bidId) => `${action}:${bidId}`;
  const isBidActionPending = (bidId) =>
    ["withdraw", "shortlist", "award"].some((action) => isPending(getBidActionKey(action, bidId)));

  const isOwner = user && project?.customer_id === user.id;
  const isProvider = user?.role === "provider";
  const isAdmin = user?.is_admin;
  const pageTheme = user?.role === "provider" ? "provider" : "customer";
  const projectAnswerEntries = project?.questionnaire_responses ? Object.entries(project.questionnaire_responses) : [];
  const normalizedBidSearch = bidSearchQuery.trim().toLowerCase();
  const filteredBids = bids.filter((bid) => {
    const matchesSearch = !normalizedBidSearch || `${bid.provider_name || ""} ${bid.proposal || ""}`.toLowerCase().includes(normalizedBidSearch);
    const matchesStatus =
      bidStatusFilter === "all" ||
      (bidStatusFilter === "shortlisted" ? bid.is_shortlisted : bid.status === bidStatusFilter);

    return matchesSearch && matchesStatus;
  });

  useEffect(() => {
    fetchProjectData();
  }, [projectId]);

  const fetchProjectData = async () => {
    setLoadError("");
    try {
      logger.log("Fetching project:", projectId);
      const projectRes = await axios.get(`${API_URL}/projects/${projectId}`, {
        headers: user ? getAuthHeader() : {}
      });
      logger.log("Project fetched:", projectRes.data);
      setProject(projectRes.data);
      
      // Fetch bids if owner or admin
      if (user) {
        try {
          const bidsRes = await axios.get(`${API_URL}/bids/project/${projectId}`, {
            headers: getAuthHeader()
          });
          setBids(bidsRes.data);
          
          // Find user's own bid if provider (exclude withdrawn bids so they can re-bid)
          if (user.role === "provider") {
            const myBidData = bidsRes.data.find(b => b.provider_id === user.id && b.status !== "withdrawn");
            setMyBid(myBidData);
          }
        } catch (e) {
          // May not have permission
        }
      }
      
      // Fetch existing review if project is completed
      if (projectRes.data.status === "completed") {
        try {
          const reviewRes = await axios.get(`${API_URL}/reviews/project/${projectId}`);
          if (reviewRes.data) setExistingReview(reviewRes.data);
        } catch (e) { /* no review yet */ }
      }
      
    } catch (error) {
      const message = error.response?.data?.detail || error.message || "Failed to load project";
      setLoadError(message);
      logger.error("Error fetching project:", error);
      logger.error("Error response:", error.response?.data);
      if (error.response?.status === 404) {
        toast.error(message);
      } else if (error.response?.status === 403) {
        toast.error(message);
      } else {
        toast.error(message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitBid = async () => {
    if (!bidForm.amount || !bidForm.proposal || !bidForm.estimated_days) {
      toast.error("Please fill all required fields");
      return;
    }
    
    setSubmittingBid(true);
    try {
      await axios.post(`${API_URL}/bids`, {
        project_id: projectId,
        amount: parseFloat(bidForm.amount),
        proposal: bidForm.proposal,
        estimated_days: parseInt(bidForm.estimated_days),
        milestones: []
      }, { headers: getAuthHeader() });
      
      toast.success("Bid submitted successfully!");
      setBidDialogOpen(false);
      fetchProjectData();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to submit bid");
    } finally {
      setSubmittingBid(false);
    }
  };

  const handleWithdrawBid = async () => {
    if (!window.confirm("Are you sure you want to withdraw your bid?")) return;
    
    await runPendingAction(getBidActionKey("withdraw", myBid.id), async () => {
      try {
        await axios.post(`${API_URL}/bids/${myBid.id}/withdraw`, {}, { headers: getAuthHeader() });
        toast.success("Bid withdrawn - you can submit a new proposal");
        setBidForm({ amount: "", proposal: "", estimated_days: "" });
        await fetchProjectData();
      } catch (error) {
        toast.error("Failed to withdraw bid");
      }
    });
  };

  const handleShortlistBid = async (bidId) => {
    await runPendingAction(getBidActionKey("shortlist", bidId), async () => {
      try {
        await axios.post(`${API_URL}/bids/${bidId}/shortlist`, {}, { headers: getAuthHeader() });
        toast.success("Bid shortlisted");
        await fetchProjectData();
      } catch (error) {
        toast.error("Failed to shortlist bid");
      }
    });
  };

  const handleAwardBid = async (bidId) => {
    if (!window.confirm("Award this project? Other bids will be rejected.")) return;
    
    await runPendingAction(getBidActionKey("award", bidId), async () => {
      try {
        await axios.post(`${API_URL}/bids/${bidId}/award`, {}, { headers: getAuthHeader() });
        toast.success("Project awarded!");
        await fetchProjectData();
      } catch (error) {
        toast.error("Failed to award project");
      }
    });
  };

  const handleSubmitForApproval = async () => {
    await runPendingAction(getProjectActionKey("submit"), async () => {
      try {
        await axios.post(`${API_URL}/projects/${projectId}/submit`, {}, { headers: getAuthHeader() });
        toast.success("Submitted for approval!");
        await fetchProjectData();
      } catch (error) {
        toast.error("Failed to submit");
      }
    });
  };

  const handleGoLive = async () => {
    await runPendingAction(getProjectActionKey("go-live"), async () => {
      try {
        await axios.post(`${API_URL}/projects/${projectId}/go-live`, {}, { headers: getAuthHeader() });
        toast.success("Project is now live!");
        await fetchProjectData();
      } catch (error) {
        toast.error("Failed to go live");
      }
    });
  };

  const handleCloseProject = async () => {
    if (!window.confirm("Close this project? All pending bids will be rejected.")) return;
    
    await runPendingAction(getProjectActionKey("close"), async () => {
      try {
        await axios.post(`${API_URL}/projects/${projectId}/close`, {}, { headers: getAuthHeader() });
        toast.success("Project closed");
        await fetchProjectData();
      } catch (error) {
        toast.error("Failed to close project");
      }
    });
  };

  const handlePauseProject = async () => {
    if (!window.confirm("Pause this project? It will be temporarily hidden.")) return;
    await runPendingAction(getProjectActionKey("pause"), async () => {
      try {
        await axios.post(`${API_URL}/projects/${projectId}/pause`, {}, { headers: getAuthHeader() });
        toast.success("Project paused");
        await fetchProjectData();
      } catch (error) {
        toast.error(error.response?.data?.detail || "Failed to pause project");
      }
    });
  };

  const handleResumeProject = async () => {
    await runPendingAction(getProjectActionKey("resume"), async () => {
      try {
        await axios.post(`${API_URL}/projects/${projectId}/resume`, {}, { headers: getAuthHeader() });
        toast.success("Project resumed!");
        await fetchProjectData();
      } catch (error) {
        toast.error(error.response?.data?.detail || "Failed to resume project");
      }
    });
  };

  const handleStopProject = async () => {
    if (!window.confirm("Stop this project? It will revert to live and all bids will be re-activated.")) return;
    await runPendingAction(getProjectActionKey("stop"), async () => {
      try {
        await axios.post(`${API_URL}/projects/${projectId}/stop`, {}, { headers: getAuthHeader() });
        toast.success("Project stopped. It is now live again.");
        await fetchProjectData();
      } catch (error) {
        toast.error(error.response?.data?.detail || "Failed to stop project");
      }
    });
  };

  const handleDeleteProject = async () => {
    if (!window.confirm("Permanently delete this project? This cannot be undone.")) return;
    await runPendingAction(getProjectActionKey("delete"), async () => {
      try {
        await axios.delete(`${API_URL}/projects/${projectId}`, { headers: getAuthHeader() });
        toast.success("Project deleted");
        navigate("/dashboard");
      } catch (error) {
        toast.error(error.response?.data?.detail || "Failed to delete project");
      }
    });
  };

  const handleToggleFavorite = async () => {
    await runPendingAction(getProjectActionKey("favorite"), async () => {
      try {
        if (project.is_favorited) {
          await axios.delete(`${API_URL}/projects/${projectId}/favorite`, { headers: getAuthHeader() });
          toast.success("Removed from favorites");
        } else {
          await axios.post(`${API_URL}/projects/${projectId}/favorite`, {}, { headers: getAuthHeader() });
          toast.success("Added to favorites");
        }
        await fetchProjectData();
      } catch (error) {
        toast.error(error.response?.data?.detail || "Failed to update favorite");
      }
    });
  };

  const handleCompleteProject = async () => {
    if (!window.confirm("Mark this project as completed?")) return;
    
    await runPendingAction(getProjectActionKey("complete"), async () => {
      try {
        await axios.post(`${API_URL}/projects/${projectId}/complete`, {}, { headers: getAuthHeader() });
        toast.success("Project completed!");
        await fetchProjectData();
      } catch (error) {
        toast.error("Failed to complete project");
      }
    });
  };

  const handleStartProject = async () => {
    await runPendingAction(getProjectActionKey("start"), async () => {
      try {
        await axios.post(`${API_URL}/projects/${projectId}/start`, {}, { headers: getAuthHeader() });
        toast.success("Project started! Marked as Sold.");
        await fetchProjectData();
      } catch (error) {
        toast.error(error.response?.data?.detail || "Failed to start project");
      }
    });
  };

  const handleSubmitReview = async () => {
    if (reviewRating === 0) {
      toast.error("Please select a rating");
      return;
    }
    if (!reviewComment.trim()) {
      toast.error("Please write a comment");
      return;
    }
    setSubmittingReview(true);
    try {
      const res = await axios.post(`${API_URL}/reviews`, {
        project_id: projectId,
        rating: reviewRating,
        comment: reviewComment
      }, { headers: getAuthHeader() });
      setExistingReview(res.data);
      toast.success("Review submitted! Thank you.");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to submit review");
    } finally {
      setSubmittingReview(false);
    }
  };

  const projectActionPending = ["submit", "go-live", "pause", "resume", "stop", "delete", "favorite", "complete", "start", "close"].some((action) =>
    isPending(getProjectActionKey(action))
  );
  const withdrawBidPending = myBid ? isPending(getBidActionKey("withdraw", myBid.id)) : false;

  if (loading) {
    return (
      <AppShell theme={pageTheme} className="bg-background" contentClassName="pb-0">
        <div className="flex items-center justify-center py-32">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AppShell>
    );
  }

  if (!project) {
    return (
      <AppShell theme={pageTheme} className="bg-background" contentClassName="pb-12">
        <div className="page-shell py-16 text-center">
          <h2 className="heading-2">Project Not Found</h2>
          {loadError ? <p className="mt-3 text-sm text-muted-foreground">{loadError}</p> : null}
          <Button onClick={() => navigate("/projects")} className="mt-4 rounded-lg">
            Browse Projects
          </Button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell theme={pageTheme} className="bg-background pb-12" contentClassName="pb-12" data-testid="project-detail">
      {project && (
        <Helmet>
          <title>{project.title} | ServiceTones</title>
          <meta name="description" content={project.description ? project.description.slice(0, 155) + (project.description.length > 155 ? "..." : "") : `${project.category || "Home service"} project on ServiceTones. Get free quotes from verified professionals.`} />
          <meta property="og:title" content={`${project.title} | ServiceTones`} />
          <meta property="og:description" content={project.description ? project.description.slice(0, 155) : `${project.category || "Home service"} project on ServiceTones.`} />
          <meta property="og:url" content={`https://servicetones.com/projects/${project.id}`} />
          <link rel="canonical" href={`https://servicetones.com/projects/${project.id}`} />
        </Helmet>
      )}

      <div className="page-shell space-y-5 py-6 sm:py-8">
        {/* Back Button */}
        <Button 
          variant="ghost" 
          onClick={() => navigate(-1)} 
          className="w-fit rounded-lg bg-card px-4 shadow-sm"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_19rem]">
          {/* Main Content */}
          <div className="space-y-5">
            {/* Project Header */}
            <section className="page-hero">
              <div className="space-y-6">
                <div>
                  <div className="mb-5 flex flex-wrap gap-2">
                    <span className="page-kicker">Project</span>
                    {project.category && (
                      <Badge variant="outline" className="rounded-lg px-3 py-1 text-xs font-semibold">{project.category}</Badge>
                    )}
                    <Badge className={statusColors[project.status]}>
                      {project.status === "sold" ? "Sold" : project.status === "awarded" ? "Awarded" : project.status.replace("_", " ")}
                    </Badge>
                    <Badge className={urgencyColors[project.urgency]}>
                      {project.urgency} priority
                    </Badge>
                  </div>

                  <h1 className="max-w-4xl text-[clamp(2rem,3.8vw,3.15rem)] font-heading font-bold leading-[1.03] tracking-[-0.06em] text-foreground">{project.title}</h1>

                  <p className="mt-4 whitespace-pre-wrap break-words text-[15px] leading-7 text-muted-foreground overflow-wrap-anywhere sm:text-base">
                    {project.description}
                  </p>

                  <div className="mt-5 flex flex-wrap gap-2">
                    <span className="info-chip">
                      <Clock className="h-4 w-4 text-primary" />
                      Posted {formatDistanceToNow(new Date(project.created_at), { addSuffix: true })}
                    </span>
                    <span className="info-chip">
                      <MessageSquare className="h-4 w-4 text-copper-600" />
                      {project.bid_count} bids
                    </span>
                    <span className="info-chip">
                      <Eye className="h-4 w-4 text-sky-600" />
                      {project.view_count} views
                    </span>
                    {project.location && (
                      <span className="info-chip">
                        <MapPin className="h-4 w-4 text-primary" />
                        {project.location}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="project-detail-summary-grid sm:grid-cols-2 xl:grid-cols-2">
                <div className="project-detail-summary-item">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Budget</p>
                  <div className="mt-3 flex items-start gap-3">
                    <DollarSign className="mt-1 h-5 w-5 text-primary" />
                    <p className="text-base font-semibold leading-7 text-foreground">
                      {project.budget_min && project.budget_max
                        ? `$${project.budget_min} - $${project.budget_max}`
                        : "Not sure yet"}
                    </p>
                  </div>
                </div>

                <div className="project-detail-summary-item">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Deadline</p>
                  <div className="mt-3 flex items-start gap-3">
                    <Calendar className="mt-1 h-5 w-5 text-primary" />
                    <p className="text-base font-semibold leading-7 text-foreground">{new Date(project.deadline).toLocaleDateString()}</p>
                  </div>
                </div>

                <div className="project-detail-summary-item">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Status</p>
                  <div className="mt-3 space-y-1">
                    <p className="text-base font-semibold capitalize leading-7 text-foreground">
                      {project.status === "sold" ? "Sold" : project.status === "awarded" ? "Awarded" : project.status.replace("_", " ")}
                    </p>
                    <p className="text-sm leading-6 text-muted-foreground">
                      {project.bid_count > 0 ? `${project.bid_count} provider proposal${project.bid_count === 1 ? " is" : "s are"} attached to this project.` : "No provider proposals yet."}
                    </p>
                  </div>
                </div>

                {project.location && (
                  <div className="project-detail-summary-item">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Location</p>
                    <div className="mt-3 flex items-start gap-3">
                      <MapPin className="mt-1 h-5 w-5 text-primary" />
                      <p className="text-base font-semibold leading-7 text-foreground">{project.location}</p>
                    </div>
                  </div>
                )}

                {project.property_type && (
                  <div className={cn("project-detail-summary-item", project.location ? "xl:col-span-1" : "sm:col-span-2 xl:col-span-2")}>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Property</p>
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-base font-semibold text-foreground">
                      <span>{project.property_type}</span>
                      {project.property_ownership && (
                        <span className="text-muted-foreground">({project.property_ownership})</span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {project.status === "rejected" && project.rejection_reason && (
                <div className="alert-danger mt-6">
                  <div className="mb-1 flex items-center gap-2 font-medium text-red-800">
                    <AlertTriangle className="w-4 h-4" />
                    Rejection reason
                  </div>
                  <p className="text-sm text-red-700">{project.rejection_reason}</p>
                </div>
              )}
            </section>

            {(project.required_skills?.length > 0 || projectAnswerEntries.length > 0) && (
              <Card className="result-card-surface">
                <CardHeader className="pb-2">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                      <CardTitle className="content-card-title">Project details</CardTitle>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">Skills and customer answers in one place.</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-5">
                  {project.required_skills?.length > 0 && (
                    <div className="space-y-3">
                      <p className="mb-3 text-sm font-medium uppercase tracking-[0.18em] text-muted-foreground">Required skills</p>
                      <div className="project-answer-skill-cloud">
                        {project.required_skills.map((skill, idx) => (
                          <Badge key={idx} className="project-answer-skill-chip">{skill}</Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {projectAnswerEntries.length > 0 && (
                    <div>
                      <p className="mb-3 text-sm font-medium uppercase tracking-[0.18em] text-muted-foreground">Project answers</p>
                      <dl className="project-answer-table">
                        {projectAnswerEntries.map(([key, value]) => {
                          const formattedValue = formatProjectAnswerValue(value);

                          return (
                            <div key={key} className="project-answer-row">
                              <dt className="project-answer-question">{formatProjectAnswerLabel(key)}</dt>
                              <dd className="project-answer-value">{formattedValue}</dd>
                            </div>
                          );
                        })}
                      </dl>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Project Images Gallery */}
            {project.images && project.images.length > 0 && (
              <Card className="result-card-surface" data-testid="project-images-section">
                <CardHeader className="pb-3">
                  <CardTitle className="content-card-title flex items-center gap-2">
                    <ImageIcon className="w-5 h-5" />
                    Project Images ({project.images.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {/* Main Image Display */}
                  <div className="relative mb-4">
                    <div 
                      className="aspect-video rounded-lg overflow-hidden bg-muted cursor-pointer"
                      onClick={() => setLightboxOpen(true)}
                    >
                      <img 
                        src={project.images[currentImageIndex]} 
                        alt={`Project image ${currentImageIndex + 1}`}
                        className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                    
                    {/* Navigation Arrows */}
                    {project.images.length > 1 && (
                      <>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setCurrentImageIndex(prev => 
                              prev === 0 ? project.images.length - 1 : prev - 1
                            );
                          }}
                          className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-lg bg-copper-600/50 text-white flex items-center justify-center hover:bg-copper-600/70 transition-colors"
                        >
                          <ChevronLeft className="w-6 h-6" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setCurrentImageIndex(prev => 
                              prev === project.images.length - 1 ? 0 : prev + 1
                            );
                          }}
                          className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-lg bg-copper-600/50 text-white flex items-center justify-center hover:bg-copper-600/70 transition-colors"
                        >
                          <ChevronRight className="w-6 h-6" />
                        </button>
                      </>
                    )}
                    
                    {/* Image Counter */}
                    <div className="absolute bottom-2 right-2 rounded-lg bg-copper-600/60 px-3 py-1 text-sm text-white">
                      {currentImageIndex + 1} / {project.images.length}
                    </div>
                  </div>
                  
                  {/* Thumbnails */}
                  {project.images.length > 1 && (
                    <div className="flex gap-2 overflow-x-auto pb-2">
                      {project.images.map((image, idx) => (
                        <button
                          key={idx}
                          onClick={() => setCurrentImageIndex(idx)}
                          className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all ${
                            currentImageIndex === idx 
                              ? "border-primary ring-2 ring-primary/30" 
                              : "border-transparent hover:border-gray-300"
                          }`}
                        >
                          <img 
                            src={image} 
                            alt={`Thumbnail ${idx + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </button>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Lightbox Modal */}
            {lightboxOpen && project.images && project.images.length > 0 && (
              <div 
                className="fixed inset-0 z-50 bg-copper-600/90 flex items-center justify-center"
                onClick={() => setLightboxOpen(false)}
              >
                <button
                  onClick={() => setLightboxOpen(false)}
                  className="absolute top-4 right-4 flex h-10 w-10 items-center justify-center rounded-lg bg-white/10 text-white transition-colors hover:bg-white/20"
                >
                  <XCircle className="w-6 h-6" />
                </button>
                
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentImageIndex(prev => 
                      prev === 0 ? project.images.length - 1 : prev - 1
                    );
                  }}
                  className="absolute left-4 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-lg bg-white/10 text-white transition-colors hover:bg-white/20"
                >
                  <ChevronLeft className="w-8 h-8" />
                </button>
                
                <img 
                  src={project.images[currentImageIndex]} 
                  alt={`Project image ${currentImageIndex + 1}`}
                  className="max-h-[90vh] max-w-[90vw] object-contain"
                  onClick={(e) => e.stopPropagation()}
                />
                
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentImageIndex(prev => 
                      prev === project.images.length - 1 ? 0 : prev + 1
                    );
                  }}
                  className="absolute right-4 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-lg bg-white/10 text-white transition-colors hover:bg-white/20"
                >
                  <ChevronRight className="w-8 h-8" />
                </button>
                
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-lg bg-white/10 px-4 py-2 text-white">
                  {currentImageIndex + 1} / {project.images.length}
                </div>
              </div>
            )}

            {/* Bids Section (Owner only) */}
            {(isOwner || isAdmin) && bids.length > 0 && (
              <Card className="result-card-surface">
                <CardHeader className="pb-3">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                    <div>
                      <CardTitle className="content-card-title">Bids ({filteredBids.length}{filteredBids.length !== bids.length ? ` of ${bids.length}` : ""})</CardTitle>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">Search and filter proposals without leaving the project view.</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { value: "all", label: "All" },
                        { value: "active", label: "Active" },
                        { value: "shortlisted", label: "Shortlisted" },
                      ].map((option) => (
                        <Button
                          key={option.value}
                          type="button"
                          size="sm"
                          variant={bidStatusFilter === option.value ? "default" : "outline"}
                          className="rounded-lg"
                          onClick={() => setBidStatusFilter(option.value)}
                        >
                          {option.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                  <div className="relative mt-4 max-w-md">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={bidSearchQuery}
                      onChange={(e) => setBidSearchQuery(e.target.value)}
                      placeholder="Search by provider or proposal"
                      className="pl-10"
                    />
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {filteredBids.length === 0 ? (
                    <div className="empty-state-panel py-10">
                      <p className="text-lg font-semibold text-foreground">No bids match this search.</p>
                      <p className="mt-2 text-sm text-muted-foreground">Try a different provider name or switch the bid filter.</p>
                    </div>
                  ) : filteredBids.map((bid) => (
                    <div
                      key={bid.id}
                      className={cn(
                        "rounded-xl border bg-card p-4 shadow-sm sm:p-5",
                        bid.is_shortlisted ? "border-primary/25 bg-primary/5 ring-1 ring-primary/10" : "border-border/60"
                      )}
                    >
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-3">
                            <Avatar className="cursor-pointer ring-1 ring-border" onClick={() => navigate(`/providers/${bid.provider_id}`)}>
                              <AvatarImage src={bid.provider_image} />
                              <AvatarFallback>{bid.provider_name?.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="cursor-pointer font-medium hover:text-primary hover:underline" onClick={() => navigate(`/providers/${bid.provider_id}`)}>{bid.provider_name}</span>
                                {bid.provider_verified && <CheckCircle className="w-4 h-4 text-green-500" />}
                                {bid.is_shortlisted && <Badge className="bg-primary/10 text-primary">Shortlisted</Badge>}
                              </div>
                              <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                                <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                                <span>{bid.provider_rating?.toFixed(1) || "New"}</span>
                                <span>({bid.provider_reviews || 0} reviews)</span>
                              </div>
                            </div>
                          </div>

                          <p className="mt-4 line-clamp-3 text-sm leading-6 text-muted-foreground">
                            {bid.proposal}
                          </p>
                        </div>

                        <div className="flex min-w-[11rem] flex-row items-center justify-between gap-4 rounded-lg bg-muted px-4 py-3 lg:flex-col lg:items-end lg:bg-transparent lg:px-0 lg:py-0">
                          <div className="text-left lg:text-right">
                            <p className="text-2xl font-bold text-primary">${bid.amount}</p>
                            <p className="text-sm text-muted-foreground">{bid.estimated_days} days</p>
                          </div>
                          <Badge className={statusColors[bid.status] || "bg-gray-100"}>
                            {bid.status}
                          </Badge>
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border/60 pt-4">
                        {project.status === "live" && bid.status === "active" && (
                          <>
                            <Button size="sm" variant="outline" className="rounded-lg" onClick={() => handleShortlistBid(bid.id)} disabled={projectActionPending || isBidActionPending(bid.id)}>
                              {isPending(getBidActionKey("shortlist", bid.id)) ? (
                                <>
                                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                  Shortlisting...
                                </>
                              ) : (
                                <>
                                  <ThumbsUp className="w-4 h-4 mr-1" />
                                  Shortlist
                                </>
                              )}
                            </Button>
                            <Button size="sm" className="rounded-lg" onClick={() => handleAwardBid(bid.id)} disabled={projectActionPending || isBidActionPending(bid.id)}>
                              {isPending(getBidActionKey("award", bid.id)) ? (
                                <>
                                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                  Awarding...
                                </>
                              ) : (
                                <>
                                  <Award className="w-4 h-4 mr-1" />
                                  Award
                                </>
                              )}
                            </Button>
                          </>
                        )}

                        {project.status === "live" && bid.status === "shortlisted" && (
                          <Button size="sm" className="rounded-lg" onClick={() => handleAwardBid(bid.id)} disabled={projectActionPending || isBidActionPending(bid.id)}>
                            {isPending(getBidActionKey("award", bid.id)) ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                Awarding...
                              </>
                            ) : (
                              <>
                                <Award className="w-4 h-4 mr-1" />
                                Award Project
                              </>
                            )}
                          </Button>
                        )}

                        <Button
                          size="sm"
                          variant="ghost"
                          className="rounded-lg"
                          onClick={() => navigate(`/messages/${bid.provider_id}`)}
                        >
                          <MessageSquare className="w-4 h-4 mr-1" />
                          Message
                        </Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Review Section - shown for completed projects to project owner */}
            {project.status === "completed" && isOwner && (
              <Card className="result-card-surface">
                <CardHeader className="pb-3">
                  <CardTitle className="content-card-title flex items-center gap-2">
                    <Star className="w-5 h-5" />
                    {existingReview ? "Your Review" : "Leave a Review"}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {existingReview ? (
                    <div className="space-y-3">
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`w-5 h-5 ${star <= existingReview.rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`}
                          />
                        ))}
                      </div>
                      <p className="text-sm text-muted-foreground">{existingReview.comment}</p>
                      <p className="text-xs text-muted-foreground">
                        Submitted {formatDistanceToNow(new Date(existingReview.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div>
                        <p className="text-sm font-medium mb-2">How was your experience?</p>
                        <div className="flex gap-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              type="button"
                              onClick={() => setReviewRating(star)}
                              onMouseEnter={() => setReviewHover(star)}
                              onMouseLeave={() => setReviewHover(0)}
                              className="p-1 transition-transform hover:scale-110"
                            >
                              <Star
                                className={`w-7 h-7 ${
                                  star <= (reviewHover || reviewRating)
                                    ? "fill-yellow-400 text-yellow-400"
                                    : "text-gray-300"
                                }`}
                              />
                            </button>
                          ))}
                          {reviewRating > 0 && (
                            <span className="ml-2 text-sm text-muted-foreground self-center">
                              {reviewRating === 1 ? "Poor" : reviewRating === 2 ? "Fair" : reviewRating === 3 ? "Good" : reviewRating === 4 ? "Very Good" : "Excellent"}
                            </span>
                          )}
                        </div>
                      </div>
                      <div>
                        <Textarea
                          placeholder="Share your experience with this provider..."
                          value={reviewComment}
                          onChange={(e) => setReviewComment(e.target.value.slice(0, 3000))}
                          maxLength={3000}
                          rows={4}
                        />
                        <p className="text-xs text-muted-foreground text-right">{reviewComment.length}/3000</p>
                      </div>
                      <Button
                        className="w-full rounded-lg"
                        onClick={handleSubmitReview}
                        disabled={submittingReview || reviewRating === 0}
                      >
                        {submittingReview ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Star className="w-4 h-4 mr-2" />
                        )}
                        Submit Review
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-5 xl:sticky xl:top-[5.85rem] xl:self-start">
            {/* Customer Info */}
            <Card className="result-card-surface">
              <CardContent className="p-6">
                <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Posted by</p>
                <div className="flex items-center gap-3">
                  <Avatar className="w-12 h-12">
                    <AvatarFallback>{project.customer_name?.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-base font-semibold text-foreground">{project.customer_name}</p>
                    <p className="text-sm text-muted-foreground">Customer</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Actions */}
            <Card className="result-card-surface">
              <CardContent className="p-6 space-y-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Next step</p>
                {/* Provider Actions */}
                {isProvider && project.status === "live" && (
                  <>
                    {myBid ? (
                      <div className="space-y-3">
                        <div className="rounded-xl border border-primary/12 bg-primary/5 p-4">
                          <p className="text-sm font-medium">Your bid</p>
                          <p className="text-2xl font-bold text-primary">${myBid.amount}</p>
                          <p className="text-sm text-muted-foreground">{myBid.estimated_days} days</p>
                          <Badge className={statusColors[myBid.status] || "bg-gray-100"}>
                            {myBid.status}
                          </Badge>
                        </div>
                        {myBid.status === "active" && (
                          <Button 
                            variant="outline" 
                            className="w-full rounded-lg" 
                            onClick={handleWithdrawBid}
                            disabled={projectActionPending || withdrawBidPending}
                          >
                            {withdrawBidPending ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Withdrawing Bid...
                              </>
                            ) : (
                              "Withdraw Bid"
                            )}
                          </Button>
                        )}
                      </div>
                    ) : (
                      <Dialog open={bidDialogOpen} onOpenChange={setBidDialogOpen}>
                        <DialogTrigger asChild>
                          <Button className="w-full rounded-lg" data-testid="submit-bid-btn">
                            <Send className="w-4 h-4 mr-2" />
                            Submit Proposal
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-lg">
                          <DialogHeader>
                            <DialogTitle>Submit Your Proposal</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4 mt-4">
                            <div>
                              <Label>Bid Amount ($) *</Label>
                              <Input
                                type="number"
                                min="0"
                                placeholder={project.budget_min && project.budget_max ? `${project.budget_min} - ${project.budget_max}` : "Enter your bid"}
                                value={bidForm.amount}
                                onChange={(e) => setBidForm({...bidForm, amount: e.target.value.replace(/^0+(\d)/, '$1')})}
                                className="mt-1"
                              />
                              {project.budget_min && project.budget_max && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  Customer budget: ${project.budget_min} - ${project.budget_max}
                                </p>
                              )}
                            </div>
                            <div>
                              <Label>Estimated Days *</Label>
                              <Input
                                type="number"
                                min="1"
                                placeholder="How many days to complete?"
                                value={bidForm.estimated_days}
                                onChange={(e) => setBidForm({...bidForm, estimated_days: e.target.value.replace(/^0+(\d)/, '$1')})}
                                className="mt-1"
                              />
                            </div>
                            <div>
                              <Label>Cover Letter / Proposal *</Label>
                              <Textarea
                                placeholder="Explain why you're the best fit for this project..."
                                value={bidForm.proposal}
                                onChange={(e) => setBidForm({...bidForm, proposal: e.target.value.slice(0, 5000)})}
                                maxLength={5000}
                                rows={5}
                                className="mt-1"
                              />
                              <p className="text-xs text-muted-foreground text-right mt-0.5">{bidForm.proposal.length}/5000</p>
                            </div>
                            <Button 
                              className="w-full rounded-lg" 
                              onClick={handleSubmitBid}
                              disabled={submittingBid}
                            >
                              {submittingBid ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              ) : (
                                <Send className="w-4 h-4 mr-2" />
                              )}
                              Submit Proposal
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    )}
                  </>
                )}

                {/* Owner Actions */}
                {isOwner && (
                  <>
                    {project.status === "draft" && (
                      <>
                        <Button 
                          className="w-full rounded-lg" 
                          onClick={() => navigate(`/projects/${projectId}/edit`)}
                        >
                          Edit Project
                        </Button>
                        <Button 
                          className="w-full rounded-lg" 
                          variant="outline"
                          onClick={handleSubmitForApproval}
                          disabled={projectActionPending}
                        >
                          {isPending(getProjectActionKey("submit")) ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Submitting...
                            </>
                          ) : (
                            "Submit for Approval"
                          )}
                        </Button>
                        <Button variant="ghost" className="danger-ghost-action w-full rounded-lg" onClick={handleDeleteProject} disabled={projectActionPending}>
                          {isPending(getProjectActionKey("delete")) ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Deleting...
                            </>
                          ) : (
                            <>
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete Project
                            </>
                          )}
                        </Button>
                      </>
                    )}
                    
                    {project.status === "approved" && (
                      <Button className="w-full rounded-lg" onClick={handleGoLive} disabled={projectActionPending}>
                        {isPending(getProjectActionKey("go-live")) ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Going Live...
                          </>
                        ) : (
                          "Go Live - Start Accepting Bids"
                        )}
                      </Button>
                    )}
                    
                    {project.status === "live" && (
                      <>
                        <Button variant="outline" className="w-full rounded-lg" onClick={handlePauseProject} disabled={projectActionPending}>
                          {isPending(getProjectActionKey("pause")) ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Pausing...
                            </>
                          ) : (
                            <>
                              <Pause className="w-4 h-4 mr-2" />
                              Pause Project
                            </>
                          )}
                        </Button>
                        <Button variant="ghost" className="danger-ghost-action w-full rounded-lg" onClick={handleDeleteProject} disabled={projectActionPending}>
                          {isPending(getProjectActionKey("delete")) ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Deleting...
                            </>
                          ) : (
                            <>
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete Project
                            </>
                          )}
                        </Button>
                      </>
                    )}

                    {project.status === "paused" && (
                      <>
                        <Button className="w-full rounded-lg" onClick={handleResumeProject} disabled={projectActionPending}>
                          {isPending(getProjectActionKey("resume")) ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Resuming...
                            </>
                          ) : (
                            <>
                              <RotateCcw className="w-4 h-4 mr-2" />
                              Resume Project
                            </>
                          )}
                        </Button>
                        <Button variant="ghost" className="danger-ghost-action w-full rounded-lg" onClick={handleDeleteProject} disabled={projectActionPending}>
                          {isPending(getProjectActionKey("delete")) ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Deleting...
                            </>
                          ) : (
                            <>
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete Project
                            </>
                          )}
                        </Button>
                      </>
                    )}
                    
                    {(project.status === "awarded" || project.status === "sold") && (
                      <>
                        <Button variant="outline" className="w-full rounded-lg" onClick={handlePauseProject} disabled={projectActionPending}>
                          {isPending(getProjectActionKey("pause")) ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Pausing...
                            </>
                          ) : (
                            <>
                              <Pause className="w-4 h-4 mr-2" />
                              Pause Project
                            </>
                          )}
                        </Button>
                        <Button variant="destructive" className="w-full rounded-lg" onClick={handleStopProject} disabled={projectActionPending}>
                          {isPending(getProjectActionKey("stop")) ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Stopping...
                            </>
                          ) : (
                            <>
                              <StopCircle className="w-4 h-4 mr-2" />
                              Stop & Revert to Live
                            </>
                          )}
                        </Button>
                      </>
                    )}

                    {project.status === "in_progress" && (
                      <Button className="w-full rounded-lg" onClick={handleCompleteProject} disabled={projectActionPending}>
                        {isPending(getProjectActionKey("complete")) ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Completing...
                          </>
                        ) : (
                          <>
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Mark as Completed
                          </>
                        )}
                      </Button>
                    )}

                    {project.status === "sold" && (
                      <Button className="w-full rounded-lg" onClick={handleCompleteProject} disabled={projectActionPending}>
                        {isPending(getProjectActionKey("complete")) ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Completing...
                          </>
                        ) : (
                          <>
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Mark as Completed
                          </>
                        )}
                      </Button>
                    )}

                    {project.status === "awarded" && (
                      <div className="alert-warning p-3 text-center">
                        <ShoppingBag className="w-6 h-6 text-copper-600 mx-auto mb-1" />
                        <p className="text-sm text-amber-800 font-medium">Waiting for provider to start</p>
                      </div>
                    )}
                    
                    {project.status === "rejected" && (
                      <>
                        <Button 
                          className="w-full rounded-lg" 
                          onClick={() => navigate(`/projects/${projectId}/edit`)}
                        >
                          Edit & Resubmit
                        </Button>
                        <Button variant="ghost" className="danger-ghost-action w-full rounded-lg" onClick={handleDeleteProject} disabled={projectActionPending}>
                          {isPending(getProjectActionKey("delete")) ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Deleting...
                            </>
                          ) : (
                            <>
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete Project
                            </>
                          )}
                        </Button>
                      </>
                    )}

                    {["closed", "completed"].includes(project.status) && (
                      <Button variant="ghost" className="danger-ghost-action w-full rounded-lg" onClick={handleDeleteProject} disabled={projectActionPending}>
                        {isPending(getProjectActionKey("delete")) ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Deleting...
                          </>
                        ) : (
                          <>
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete Project
                          </>
                        )}
                      </Button>
                    )}
                  </>
                )}

                {/* Awarded Provider Actions */}
                {project.awarded_to === user?.id && project.status === "awarded" && (
                  <>
                    <Button className="w-full rounded-lg" onClick={handleStartProject} disabled={projectActionPending}>
                      {isPending(getProjectActionKey("start")) ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Starting...
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4 mr-2" />
                          Start Project
                        </>
                      )}
                    </Button>
                    <Button variant="destructive" className="w-full rounded-lg" onClick={handleStopProject} disabled={projectActionPending}>
                      {isPending(getProjectActionKey("stop")) ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Stopping...
                        </>
                      ) : (
                        <>
                          <StopCircle className="w-4 h-4 mr-2" />
                          Stop Project
                        </>
                      )}
                    </Button>
                  </>
                )}

                {project.awarded_to === user?.id && project.status === "sold" && (
                  <>
                    <Button className="w-full rounded-lg" onClick={handleCompleteProject} disabled={projectActionPending}>
                      {isPending(getProjectActionKey("complete")) ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Completing...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Mark as Completed
                        </>
                      )}
                    </Button>
                    <Button variant="destructive" className="w-full" onClick={handleStopProject} disabled={projectActionPending}>
                      {isPending(getProjectActionKey("stop")) ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Stopping...
                        </>
                      ) : (
                        <>
                          <StopCircle className="w-4 h-4 mr-2" />
                          Stop Project
                        </>
                      )}
                    </Button>
                  </>
                )}

                {project.awarded_to === user?.id && project.status === "in_progress" && (
                  <Button className="w-full" onClick={handleCompleteProject} disabled={projectActionPending}>
                    {isPending(getProjectActionKey("complete")) ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Completing...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Mark as Completed
                      </>
                    )}
                  </Button>
                )}

                {/* Favorite Button for Providers */}
                {isProvider && !isOwner && (
                  <Button 
                    variant={project.is_favorited ? "default" : "outline"} 
                    className="w-full rounded-lg"
                    onClick={handleToggleFavorite}
                    disabled={projectActionPending}
                  >
                    {isPending(getProjectActionKey("favorite")) ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Updating...
                      </>
                    ) : (
                      <>
                        <Heart className={`w-4 h-4 mr-2 ${project.is_favorited ? "fill-current" : ""}`} />
                        {project.is_favorited ? "Favorited" : "Favorite Project"}
                      </>
                    )}
                  </Button>
                )}

                {/* Message Button - only show after provider has placed a bid */}
                {user && !isOwner && project.customer_id && myBid && myBid.status !== "withdrawn" && (
                  <Button 
                    variant="outline" 
                    className="w-full rounded-lg"
                    onClick={() => navigate(`/messages/${project.customer_id}`)}
                  >
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Message Customer
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
