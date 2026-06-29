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
  Trash2, StopCircle, Heart, Search, Headphones, CheckCheck, BarChart3, Copy, Lock
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

        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          {/* LEFT COLUMN: Main Project Content */}
          <div className="space-y-6">
            {/* Project Header Card */}
            <Card className="border border-deep-navy-100">
              <CardContent className="p-6">
                <div className="space-y-4">
                  {/* Badges Row */}
                  <div className="flex flex-wrap gap-2">
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

                  {/* Title */}
                  <h1 className="text-2xl sm:text-3xl font-bold text-deep-navy-800">{project.title}</h1>

                  {/* Description */}
                  <p className="text-sm sm:text-base leading-6 text-deep-navy-600">
                    {project.description}
                  </p>

                  {/* Meta Info Chips */}
                  <div className="flex flex-wrap gap-2 pt-2 border-t border-deep-navy-50">
                    <span className="text-xs text-deep-navy-500 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Posted {formatDistanceToNow(new Date(project.created_at), { addSuffix: true })}
                    </span>
                    <span className="text-xs text-deep-navy-500 flex items-center gap-1">
                      <MessageSquare className="h-3 w-3" />
                      {project.bid_count} bids
                    </span>
                    <span className="text-xs text-deep-navy-500 flex items-center gap-1">
                      <Eye className="h-3 w-3" />
                      {project.view_count} views
                    </span>
                    {project.location && (
                      <span className="text-xs text-deep-navy-500 flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {project.location}
                      </span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Stats Cards Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* Budget Card */}
              <Card className="border border-deep-navy-100">
                <CardContent className="p-3">
                  <p className="text-xs font-semibold text-deep-navy-500 mb-2">Budget</p>
                  <p className="text-lg font-bold text-deep-navy-800">
                    {project.budget_min && project.budget_max
                      ? `$${project.budget_min}`
                      : "N/A"}
                  </p>
                  <p className="text-xs text-deep-navy-400">to ${project.budget_max || "TBD"}</p>
                </CardContent>
              </Card>

              {/* Deadline Card */}
              <Card className="border border-deep-navy-100">
                <CardContent className="p-3">
                  <p className="text-xs font-semibold text-deep-navy-500 mb-2">Deadline</p>
                  <p className="text-lg font-bold text-deep-navy-800">{new Date(project.deadline).toLocaleDateString()}</p>
                </CardContent>
              </Card>

              {/* Status Card */}
              <Card className="border border-deep-navy-100">
                <CardContent className="p-3">
                  <p className="text-xs font-semibold text-deep-navy-500 mb-2">Status</p>
                  <p className="text-sm font-bold text-deep-navy-800 capitalize">
                    {project.status === "sold" ? "Sold" : project.status === "awarded" ? "Awarded" : project.status.replace("_", " ")}
                  </p>
                </CardContent>
              </Card>

              {/* Bids Card */}
              <Card className="border border-deep-navy-100">
                <CardContent className="p-3">
                  <p className="text-xs font-semibold text-deep-navy-500 mb-2">Bids</p>
                  <p className="text-lg font-bold text-copper-600">{project.bid_count}</p>
                </CardContent>
              </Card>
            </div>

            {project.status === "rejected" && project.rejection_reason && (
              <div className="alert-danger">
                <div className="mb-1 flex items-center gap-2 font-medium text-red-800">
                  <AlertTriangle className="w-4 h-4" />
                  Rejection reason
                </div>
                <p className="text-sm text-red-700">{project.rejection_reason}</p>
              </div>
            )}

            {(project.required_skills?.length > 0 || projectAnswerEntries.length > 0) && (
              <div>
                {/* Required Skills */}
                {project.required_skills?.length > 0 && (
                  <Card className="border border-deep-navy-100 mb-6">
                    <CardHeader>
                      <CardTitle className="text-lg font-semibold">Required Skills</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {project.required_skills.map((skill, idx) => (
                          <Badge key={idx} variant="outline" className="rounded-full">{skill}</Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Project Details Info Cards Grid */}
                {projectAnswerEntries.length > 0 && (
                  <Card className="border border-deep-navy-100">
                    <CardHeader>
                      <CardTitle className="text-lg font-semibold">Project Details</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {projectAnswerEntries.map(([key, value]) => {
                          const formattedValue = formatProjectAnswerValue(value);
                          const meta = getProjectAnswerMeta(key);
                          const IconComponent = meta.icon;

                          return (
                            <div key={key} className="border border-deep-navy-50 rounded-lg p-4 bg-white">
                              <div className="flex items-start gap-2 mb-2">
                                <IconComponent className="h-4 w-4 text-copper-600 flex-shrink-0 mt-0.5" />
                                <p className="text-xs font-semibold text-deep-navy-500 uppercase">{formatProjectAnswerLabel(key)}</p>
                              </div>
                              <p className="text-sm font-semibold text-deep-navy-800">{formattedValue}</p>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
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

          {/* RIGHT COLUMN: Fixed Sidebar */}
          <div className="space-y-4 lg:sticky lg:top-24 lg:self-start">
            {/* Posted By Card */}
            <Card className="border-2 border-deep-navy-100 rounded-lg overflow-hidden">
              <CardContent className="p-5">
                <p className="text-xs font-bold text-deep-navy-600 mb-4 uppercase tracking-wide">Posted By</p>
                <div className="flex items-center gap-4">
                  <Avatar className="w-14 h-14 border-2 border-deep-navy-100 flex-shrink-0">
                    <AvatarImage src={project.customer_image} />
                    <AvatarFallback className="bg-amber-100 text-amber-700 font-bold text-lg">{project.customer_name?.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="text-base font-bold text-deep-navy-900">{project.customer_name}</p>
                    <p className="text-sm text-deep-navy-600 font-medium">Customer</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Support Card */}
            <Card className="border-2 border-deep-navy-100 rounded-lg bg-gradient-to-br from-deep-navy-50 to-deep-navy-25 overflow-hidden">
              <CardContent className="p-5">
                <p className="text-sm font-bold text-deep-navy-900 mb-2">Need help with this project?</p>
                <p className="text-xs text-deep-navy-700 mb-4">Our support team is here to help you find the right professional.</p>
                <Button variant="outline" className="w-full rounded-lg border-amber-300 text-amber-700 hover:bg-amber-50 font-semibold">
                  <Headphones className="w-4 h-4 mr-2" />
                  Contact Support
                </Button>
              </CardContent>
            </Card>

            {/* Next Steps Progress Card */}
            <Card className="border-2 border-deep-navy-100 rounded-lg overflow-hidden">
              <CardContent className="p-5">
                <p className="text-sm font-bold text-deep-navy-900 mb-5">Next Step</p>
                <div className="space-y-3">
                  {/* Review Bids */}
                  <div className="flex gap-3 p-3 rounded-lg hover:bg-deep-navy-50 transition-colors">
                    <div className="flex-shrink-0 w-5 h-5 rounded-full bg-amber-100 flex items-center justify-center mt-0.5">
                      <Award className="w-3 h-3 text-amber-700" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-deep-navy-900">Review bids from providers</p>
                      <p className="text-xs text-deep-navy-600">Compare and message</p>
                    </div>
                  </div>

                  {/* Ask Questions */}
                  <div className="flex gap-3 p-3 rounded-lg hover:bg-deep-navy-50 transition-colors">
                    <div className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center mt-0.5">
                      <MapPin className="w-3 h-3 text-blue-700" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-deep-navy-900">Ask questions</p>
                      <p className="text-xs text-deep-navy-600">Get more details</p>
                    </div>
                  </div>

                  {/* Accept a Bid */}
                  <div className="flex gap-3 p-3 rounded-lg hover:bg-deep-navy-50 transition-colors">
                    <div className="flex-shrink-0 w-5 h-5 rounded-full bg-green-100 flex items-center justify-center mt-0.5">
                      <CheckCheck className="w-3 h-3 text-green-700" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-deep-navy-900">Accept a bid</p>
                      <p className="text-xs text-deep-navy-600">Choose the best match</p>
                    </div>
                  </div>

                  {/* Project in Progress */}
                  <div className="flex gap-3 p-3 rounded-lg hover:bg-deep-navy-50 transition-colors">
                    <div className="flex-shrink-0 w-5 h-5 rounded-full bg-purple-100 flex items-center justify-center mt-0.5">
                      <Play className="w-3 h-3 text-purple-700" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-deep-navy-900">Project in progress</p>
                      <p className="text-xs text-deep-navy-600">Stay updated</p>
                    </div>
                  </div>

                  {/* Project Completion */}
                  <div className="flex gap-3 p-3 rounded-lg hover:bg-deep-navy-50 transition-colors">
                    <div className="flex-shrink-0 w-5 h-5 rounded-full bg-yellow-100 flex items-center justify-center mt-0.5">
                      <Star className="w-3 h-3 text-yellow-700" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-deep-navy-900">Project completion</p>
                      <p className="text-xs text-deep-navy-600">Rate and review</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Actions Card */}
            <Card className="border-2 border-deep-navy-100 rounded-lg overflow-hidden">
              <CardContent className="p-5 space-y-3">
                {/* Provider Actions */}
                {isProvider && project.status === "live" && (
                  <>
                    {myBid ? (
                      <div className="space-y-3">
                        <div className="rounded-lg border border-copper-200 bg-copper-50 p-4">
                          <p className="text-xs font-semibold text-copper-700 mb-2">Your Bid</p>
                          <p className="text-3xl font-bold text-copper-700">${myBid.amount}</p>
                          <p className="text-xs text-copper-600 mb-3">{myBid.estimated_days} days to complete</p>
                          <Badge className={statusColors[myBid.status] || "bg-gray-100"}>
                            {myBid.status}
                          </Badge>
                        </div>
                        {myBid.status === "active" && (
                          <Button 
                            variant="outline" 
                            className="w-full rounded-lg border-red-200 text-red-700 hover:bg-red-50" 
                            onClick={handleWithdrawBid}
                            disabled={projectActionPending || withdrawBidPending}
                          >
                            {withdrawBidPending ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Withdrawing...
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
                          <Button className="w-full rounded-lg bg-gradient-to-r from-copper-500 to-copper-600 text-white hover:from-copper-600 hover:to-copper-700 font-semibold" data-testid="submit-bid-btn">
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

        {/* Trust Badges Footer */}
        <div className="mt-12 border-t border-deep-navy-100 pt-8">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="flex justify-center mb-2">
                <CheckCircle className="h-5 w-5 text-teal-600" />
              </div>
              <p className="text-xs font-bold text-deep-navy-900">Verified Professionals</p>
              <p className="text-xs text-deep-navy-600 mt-1">Background checked</p>
            </div>
            <div className="text-center">
              <div className="flex justify-center mb-2">
                <Lock className="h-5 w-5 text-teal-600" />
              </div>
              <p className="text-xs font-bold text-deep-navy-900">Secure Payments</p>
              <p className="text-xs text-deep-navy-600 mt-1">Safe and protected</p>
            </div>
            <div className="text-center">
              <div className="flex justify-center mb-2">
                <Headphones className="h-5 w-5 text-amber-600" />
              </div>
              <p className="text-xs font-bold text-deep-navy-900">24/7 Support</p>
              <p className="text-xs text-deep-navy-600 mt-1">We're here to help</p>
            </div>
            <div className="text-center">
              <div className="flex justify-center mb-2">
                <Heart className="h-5 w-5 text-teal-600" />
              </div>
              <p className="text-xs font-bold text-deep-navy-900">Satisfaction Guaranteed</p>
              <p className="text-xs text-deep-navy-600 mt-1">Quality work, every time</p>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
