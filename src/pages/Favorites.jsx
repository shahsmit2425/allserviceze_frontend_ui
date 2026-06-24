import { useState, useEffect } from "react";
import logger from "@/utils/logger";
import { useNavigate } from "react-router-dom";
import { AppShell } from "../components/AppShell";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Card, CardContent } from "../components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import { useAuth } from "../context/AuthContext";
import { useCategories } from "../hooks/useCategories";
import { toast } from "sonner";
import axios from "axios";
import {
  Heart,
  Loader2,
  Search,
  Star,
  MapPin,
  MessageSquare,
  CheckCircle,
  Users,
  Briefcase,
  DollarSign,
  Calendar,
  FileText,
  ArrowRight,
} from "lucide-react";

const API_URL = `${import.meta.env.VITE_BACKEND_URL || "http://localhost:5000"}/api`;

const statusColors = {
  draft: "status-badge-neutral",
  pending_approval: "status-badge-warning",
  approved: "status-badge-success",
  live: "status-badge-info",
  in_progress: "status-badge-violet",
  completed: "status-badge-success",
  closed: "status-badge-neutral",
  rejected: "status-badge-danger",
};

export default function Favorites() {
  const navigate = useNavigate();
  const { user, getAuthHeader } = useAuth();
  const projectPostingCategories = useCategories({ scope: "project_posting" });

  const [providers, setProviders] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  const isProvider = user?.role === "provider";
  const isCustomer = user?.role === "customer";
  const pageTheme = isProvider ? "provider" : "customer";

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    fetchAll();
  }, [user]);

  const fetchAll = async () => {
    try {
      if (isCustomer) {
        const providersRes = await axios.get(`${API_URL}/favorite-providers`, { headers: getAuthHeader() });
        setProviders(providersRes.data);
      } else if (isProvider) {
        const projectsRes = await axios.get(`${API_URL}/projects/favorites`, { headers: getAuthHeader() });
        setProjects(projectsRes.data);
      }
    } catch (error) {
      logger.error("Error fetching favorites:", error);
    } finally {
      setLoading(false);
    }
  };

  const removeProviderFavorite = async (providerId) => {
    try {
      await axios.delete(`${API_URL}/favorite-providers/${providerId}`, { headers: getAuthHeader() });
      setProviders((prev) => prev.filter((provider) => provider.id !== providerId));
      toast.success("Removed from favorites");
    } catch {
      toast.error("Failed to remove");
    }
  };

  const removeProjectFavorite = async (projectId) => {
    try {
      await axios.delete(`${API_URL}/projects/${projectId}/favorite`, { headers: getAuthHeader() });
      setProjects((prev) => prev.filter((project) => project.id !== projectId));
      toast.success("Removed from favorites");
    } catch {
      toast.error("Failed to remove");
    }
  };

  const savedCount = isCustomer ? providers.length : projects.length;
  const visibleProviders = providers.filter((provider) => {
    const skills = provider.provider_profile?.skills || [];
    return skills.some((skill) => projectPostingCategories.includes(skill));
  });
  const customerSavedCount = visibleProviders.length;
  const visibleProjects = projects.filter((project) => projectPostingCategories.includes(project.category));
  const providerSavedCount = visibleProjects.length;
  const activeFavoriteProjects = visibleProjects.filter((project) => ["approved", "live", "awarded", "sold", "in_progress"].includes(project.status)).length;
  const favoriteProjectBidCount = visibleProjects.reduce((sum, project) => sum + (project.bid_count || 0), 0);
  const spotlightProject = visibleProjects.find((project) => project.status === "live") || visibleProjects[0];

  const displayProviders = [...providers].sort((left, right) => {
    const leftRating = Number(left.avg_rating) || 0;
    const rightRating = Number(right.avg_rating) || 0;
    const leftRate = Number(left.provider_profile?.hourly_rate) || 0;
    const rightRate = Number(right.provider_profile?.hourly_rate) || 0;
    const leftVerified = left.provider_profile?.is_verified ? 1 : 0;
    const rightVerified = right.provider_profile?.is_verified ? 1 : 0;

    return rightVerified - leftVerified || rightRating - leftRating || leftRate - rightRate;
  });

  const customerResultsClassName = "space-y-6 sm:space-y-7";

  if (loading) {
    return (
      <AppShell theme={pageTheme} className="bg-background" contentClassName="pb-0">
        <div className="flex items-center justify-center py-32">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell theme={pageTheme} className="pb-12" contentClassName="pb-12">
      <div className="page-shell space-y-7 py-7 sm:space-y-8 sm:py-8">
        {isCustomer ? (
          <section className="toolbar-surface flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <span className="page-kicker">Saved providers</span>
              <h1 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-foreground sm:text-3xl">My favorites</h1>
            </div>
            <div className="flex flex-wrap gap-3">
              <span className="info-chip">
                <Heart className="h-4 w-4 fill-red-500 text-red-500" />
                {savedCount} saved providers
              </span>
              <Button onClick={() => navigate("/providers")} className="rounded-lg">
                <Search className="mr-2 h-4 w-4" />
                Find Providers
              </Button>
            </div>
          </section>
        ) : (
          <section className="page-hero">
            <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr] lg:items-start">
              <div className="max-w-3xl">
                <span className="page-kicker">Provider watchlist</span>
                <h1 className="heading-2 mt-4 text-foreground">My favorites</h1>
                <p className="body-lg mt-3 max-w-2xl text-muted-foreground">
                  Keep promising projects in one place so you can return quickly when timing, pricing, or scope fits.
                </p>

                <div className="mt-5 flex flex-wrap gap-2">
                  <span className="info-chip">
                    <Heart className="h-4 w-4 fill-red-500 text-red-500" />
                      {providerSavedCount} saved projects
                  </span>
                  <span className="info-chip">
                    <Briefcase className="h-4 w-4 text-primary" />
                    {activeFavoriteProjects} active opportunities
                  </span>
                  <span className="info-chip">
                    <FileText className="h-4 w-4 text-amber-600" />
                    {favoriteProjectBidCount} total bids tracked
                  </span>
                </div>

                <div className="mt-6 flex flex-wrap gap-3">
                  <Button onClick={() => navigate("/projects")} className="rounded-lg">
                    <Search className="mr-2 h-4 w-4" />
                    Browse Projects
                  </Button>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="glass-panel p-4">
                  <p className="caption">Saved</p>
                  <p className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-foreground">{isCustomer ? customerSavedCount : savedCount}</p>
                  <p className="mt-1 text-sm text-muted-foreground">Projects held in your watchlist.</p>
                </div>
                <div className="glass-panel p-4">
                  <p className="caption">Active</p>
                  <p className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-foreground">{activeFavoriteProjects}</p>
                  <p className="mt-1 text-sm text-muted-foreground">Work that is still worth tracking.</p>
                </div>
                <div className="glass-panel p-4">
                  <p className="caption">Tracked bids</p>
                  <p className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-foreground">{favoriteProjectBidCount}</p>
                  <p className="mt-1 text-sm text-muted-foreground">Bid activity across saved opportunities.</p>
                </div>
                <div className="glass-panel p-4">
                  <p className="caption">Spotlight</p>
                  {spotlightProject ? (
                    <>
                      <p className="mt-2 text-base font-semibold text-foreground">{spotlightProject.title}</p>
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">${spotlightProject.budget_min} - ${spotlightProject.budget_max}. Deadline {new Date(spotlightProject.deadline).toLocaleDateString()}.</p>
                    </>
                  ) : (
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">Save projects as you browse so your best opportunities stay easy to revisit.</p>
                  )}
                </div>
              </div>
            </div>
          </section>
        )}

        {isCustomer && (
          <>
            {visibleProviders.length > 0 ? (
                <section className={customerResultsClassName}>
                  {displayProviders.filter((provider) => visibleProviders.some((visibleProvider) => visibleProvider.id === provider.id)).map((provider) => (
                    <Card
                      key={provider.id}
                      className="result-card-surface cursor-pointer group"
                      onClick={() => navigate(`/providers/${provider.id}`)}
                    >
                      <CardContent className="p-6 sm:p-7">
                        <div className="provider-card-layout" data-layout="list">
                          <div className="provider-card-main">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex min-w-0 items-center gap-3">
                                <Avatar className="h-14 w-14 ring-1 ring-border shadow-sm">
                                  <AvatarImage src={provider.profile_image} />
                                  <AvatarFallback className="text-lg bg-primary/10 text-primary">
                                    {provider.full_name?.charAt(0)}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <h3 className="truncate text-xl font-semibold tracking-[-0.03em] text-foreground transition-colors group-hover:text-primary">
                                      {provider.full_name}
                                    </h3>
                                    {provider.provider_profile?.is_verified && <CheckCircle className="w-4 h-4 text-primary" />}
                                  </div>
                                  {provider.provider_profile?.location && (
                                    <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                                      <MapPin className="w-3 h-3" />
                                      {provider.provider_profile.location}
                                    </p>
                                  )}
                                  {provider.provider_profile?.skills?.length > 0 && (
                                    <div className="mt-2 flex flex-wrap gap-2">
                                      {provider.provider_profile.skills.slice(0, 3).map((skill) => (
                                        <Badge key={skill} className="market-card-chip">
                                          {skill}
                                        </Badge>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                              <button
                                onClick={(e) => { e.stopPropagation(); removeProviderFavorite(provider.id); }}
                                className="favorite-toggle favorite-toggle-active p-2"
                                title="Remove from favorites"
                              >
                                <Heart className="h-4 w-4 fill-pink-500 text-pink-500" />
                              </button>
                            </div>

                            {provider.provider_profile?.bio && (
                              <div className="provider-card-bio">
                                <p className="detail-kicker">Provider overview</p>
                                <p className="mt-2 text-[0.98rem] leading-7 text-muted-foreground line-clamp-4">
                                  {provider.provider_profile.bio}
                                </p>
                              </div>
                            )}

                            <div className="grid gap-3 sm:grid-cols-3">
                              <div className="info-tile">
                                <p className="detail-kicker">Rating</p>
                                <div className="mt-2 flex items-center gap-2 text-base font-semibold text-foreground">
                                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                                  <span>{provider.avg_rating > 0 ? provider.avg_rating.toFixed(1) : "New provider"}</span>
                                </div>
                              </div>
                              <div className="info-tile">
                                <p className="detail-kicker">Rate</p>
                                <div className="mt-2 flex items-center gap-2 text-base font-semibold text-foreground">
                                  <DollarSign className="h-4 w-4 text-primary" />
                                  <span>{provider.provider_profile?.hourly_rate > 0 ? `$${provider.provider_profile.hourly_rate}/hr` : "Request quote"}</span>
                                </div>
                              </div>
                              <div className="info-tile">
                                <p className="detail-kicker">Reviews</p>
                                <div className="mt-2 flex items-center gap-2 text-base font-semibold text-foreground">
                                  <MessageSquare className="h-4 w-4 text-primary" />
                                  <span>{provider.avg_rating > 0 ? `${provider.total_reviews || 0} review${provider.total_reviews === 1 ? "" : "s"}` : "No reviews yet"}</span>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="provider-card-actions" data-layout="list">
                            <div className="w-full">
                              <p className="detail-kicker">Saved profile</p>
                              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                                {provider.provider_profile?.is_verified
                                  ? "Verified profile saved for quick comparison, outreach, and booking review."
                                  : "Saved profile ready to revisit, compare, and message whenever you are ready."}
                              </p>
                            </div>
                            <Button
                              size="sm"
                              className="rounded-lg"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/providers/${provider.id}`);
                              }}
                            >
                              View Profile
                              <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="market-card-ghost-button rounded-lg"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/messages/${provider.id}`);
                              }}
                            >
                              <MessageSquare className="mr-2 h-4 w-4" />
                              Message
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="market-card-ghost-button rounded-lg text-red-600 hover:text-red-700"
                              onClick={(e) => {
                                e.stopPropagation();
                                removeProviderFavorite(provider.id);
                              }}
                            >
                              Remove
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </section>
            ) : (
              <div className="empty-state-panel px-6 py-16">
                <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2 text-foreground">No favorite providers yet</h3>
                <p className="mx-auto mb-6 max-w-xl text-sm leading-6 text-muted-foreground">Browse providers and save the ones you want to compare, message, or book later.</p>
                <Button onClick={() => navigate("/providers")} className="w-full rounded-lg sm:w-auto">
                  <Search className="w-4 h-4 mr-2" />
                  Browse Providers
                </Button>
              </div>
            )}
          </>
        )}

        {isProvider && (
          <>
            {visibleProjects.length > 0 ? (
              <section className="space-y-6 sm:space-y-7">
                {visibleProjects.map((project) => (
                  <Card
                    key={project.id}
                    className="result-card-surface project-card-surface cursor-pointer"
                    onClick={() => navigate(`/projects/${project.id}`)}
                  >
                    <CardContent className="relative p-6 sm:p-7">
                      <div className="project-card-main">
                        <div className="project-card-badges">
                          <Badge className={`rounded-lg ${statusColors[project.status] || "status-badge-neutral"}`}>
                            {project.status?.replace("_", " ")}
                          </Badge>
                          {project.category && (
                            <Badge variant="outline" className="rounded-lg px-3 py-1 text-xs font-semibold">{project.category}</Badge>
                          )}
                          <Badge className="market-card-chip market-card-chip-accent">Saved project</Badge>
                        </div>

                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h3 className="project-card-title break-words hover:text-primary">
                              {project.title}
                            </h3>
                          </div>
                          <button
                            onClick={(e) => { e.stopPropagation(); removeProjectFavorite(project.id); }}
                            className="favorite-toggle favorite-toggle-active p-2"
                            title="Remove from favorites"
                          >
                            <Heart className="w-4 h-4 fill-pink-500 text-pink-500" />
                          </button>
                        </div>

                        <div className="project-card-description-wrap">
                          <p className="project-card-description line-clamp-4">
                            {project.description}
                          </p>
                        </div>

                        <div className="project-card-meta-grid">
                          <div className="project-card-meta">
                            <DollarSign className="mt-1 h-4 w-4 text-primary" />
                            <div>
                              <p className="detail-kicker">Budget</p>
                              <p className="mt-1 text-sm font-semibold text-foreground">${project.budget_min} - ${project.budget_max}</p>
                            </div>
                          </div>
                          <div className="project-card-meta">
                            <Calendar className="mt-1 h-4 w-4 text-primary" />
                            <div>
                              <p className="detail-kicker">Deadline</p>
                              <p className="mt-1 text-sm font-semibold text-foreground">{new Date(project.deadline).toLocaleDateString()}</p>
                            </div>
                          </div>
                          <div className="project-card-meta">
                            <FileText className="mt-1 h-4 w-4 text-primary" />
                            <div>
                              <p className="detail-kicker">Bids</p>
                              <p className="mt-1 text-sm font-semibold text-foreground">{project.bid_count || 0} received</p>
                            </div>
                          </div>
                          <div className="project-card-meta">
                            {project.location ? <MapPin className="mt-1 h-4 w-4 text-primary" /> : <Briefcase className="mt-1 h-4 w-4 text-primary" />}
                            <div>
                              <p className="detail-kicker">{project.location ? "Location" : "Category"}</p>
                              <p className="mt-1 text-sm font-semibold text-foreground line-clamp-2">{project.location || project.category || "General"}</p>
                            </div>
                          </div>
                        </div>

                        <div className="project-card-actions pt-1 sm:flex-row sm:items-center">
                          <Button
                            size="sm"
                            className="min-w-[10.5rem] justify-between rounded-lg"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/projects/${project.id}`);
                            }}
                          >
                            View Project
                            <ArrowRight className="w-4 h-4 ml-2" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </section>
            ) : (
              <div className="empty-state-panel px-6 py-16">
                <Briefcase className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2 text-foreground">No favorite projects yet</h3>
                <p className="mx-auto mb-6 max-w-xl text-sm leading-6 text-muted-foreground">Browse projects and save promising briefs so you can come back when timing, pricing, or scope fits.</p>
                <Button onClick={() => navigate("/projects")} className="w-full rounded-lg sm:w-auto">
                  <Search className="w-4 h-4 mr-2" />
                  Browse Projects
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}
