import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import logger from "@/utils/logger";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { AppShell } from "../components/AppShell";
import ResponsiveFilterModal from "../components/ResponsiveFilterModal";
import { SearchBar } from "../components/SearchBar";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Card, CardContent } from "../components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { useAuth } from "../context/AuthContext";
import { useCategories } from "../hooks/useCategories";
import { toast } from "sonner";
import axios from "axios";
import { 
  Search, Briefcase, User, MapPin, Star, Clock, 
  DollarSign, Calendar, Loader2, CheckCircle, Heart, 
  TrendingUp, AlertCircle, Building2, Award, ArrowRight, SlidersHorizontal
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const API_URL = `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'}/api`;

const urgencyColors = {
  low: "status-badge-neutral",
  normal: "status-badge-info",
  high: "status-badge-warning",
  urgent: "status-badge-danger"
};

export default function SearchResults() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, getAuthHeader } = useAuth();
  const categories = useCategories({ includeAll: true, scope: "project_posting" });
  const pageTheme = user?.role === "provider" ? "provider" : "customer";
  
  const [results, setResults] = useState({ providers: [], projects: [], total: 0 });
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const [filtersOpen, setFiltersOpen] = useState(false);
  
  // Filters
  const [category, setCategory] = useState("All");
  const [sortBy, setSortBy] = useState("relevance");
  const [draftCategory, setDraftCategory] = useState("All");
  const [draftSortBy, setDraftSortBy] = useState("relevance");
  
  const query = searchParams.get("q") || "";
  const hasQuery = Boolean(query.trim());

  useEffect(() => {
    setDraftCategory(category);
    setDraftSortBy(sortBy);
  }, [category, sortBy]);

  useEffect(() => {
    if (category === "All" || categories.includes(category)) return;

    setCategory("All");
    setDraftCategory("All");
  }, [categories, category]);

  useEffect(() => {
    if (query) {
      performSearch();
    }
  }, [query, category, sortBy, activeTab]);

  const performSearch = async () => {
    if (!query.trim()) return;
    
    setLoading(true);
    try {
      const params = {
        q: query,
        limit: 20,
        scope: "project_posting",
      };
      
      // Add filters
      if (category !== "All") params.category = category;
      if (sortBy !== "relevance") params.sort_by = sortBy;
      
      // Add type filter based on active tab
      if (activeTab === "providers") params.type = "provider";
      if (activeTab === "projects") params.type = "project";

      const response = await axios.get(`${API_URL}/search`, { 
        params,
        withCredentials: true,
        headers: user ? getAuthHeader() : {}
      });
      
      setResults(response.data);
    } catch (error) {
      logger.error("Search error:", error);
      toast.error("Search failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSearchUpdate = (newQuery) => {
    setSearchParams({ q: newQuery });
  };

  const applyFilters = () => {
    setCategory(draftCategory);
    setSortBy(draftSortBy);
    setFiltersOpen(false);
  };

  const clearFilters = () => {
    setDraftCategory("All");
    setDraftSortBy("relevance");
    setCategory("All");
    setSortBy("relevance");
    setFiltersOpen(false);
  };

  const hasActiveFilters = category !== "All" || sortBy !== "relevance";
  const activeFilterCount = [category !== "All", sortBy !== "relevance"].filter(Boolean).length;
  const hasDraftChanges = draftCategory !== category || draftSortBy !== sortBy;

  const handleToggleFavorite = async (e, projectId, isFavorited) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      toast.error("Please login to save favorites");
      return;
    }
    
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
      
      // Update local state
      setResults(prev => ({
        ...prev,
        projects: prev.projects.map(p => 
          String(p.id) === String(projectId) ? { ...p, is_favorited: !isFavorited } : p
        )
      }));
    } catch (error) {
      logger.error("Failed to toggle favorite", error);
      toast.error("Failed to update favorites");
    }
  };

  const ProjectCard = ({ project }) => (
    <Card 
      className="result-card-surface project-card-surface cursor-pointer group border border-border/60 shadow-[0_24px_60px_-48px_rgba(15,23,42,0.24)] transition-all duration-200 hover:-translate-y-0.5"
      onClick={() => navigate(`/projects/${project.id}`)}
    >
      <CardContent className="p-6 sm:p-7">
        <div className="project-card-grid">
          <div className="project-card-main min-w-0">
            <div className="project-card-badges">
              {project.urgency && (
                <Badge className={urgencyColors[project.urgency]}>
                  {project.urgency.toUpperCase()}
                </Badge>
              )}
              {project.category && (
                <Badge variant="secondary" className="gap-1 rounded-lg border border-border/60 bg-white px-3 py-1 text-xs font-semibold shadow-sm">
                  {project.category}
                </Badge>
              )}
            </div>

            <div className="flex items-start gap-4">
              <Briefcase className="mt-1 h-5 w-5 shrink-0 text-primary" />
              <div className="min-w-0">
                <h3 className="project-card-title break-words">{project.title}</h3>
              </div>
            </div>

            <div className="project-card-description-wrap">
              <p className="project-card-description">{project.description}</p>
            </div>
            
            <div className="project-card-meta-grid">
              {project.budget_min && project.budget_max && (
                <div className="project-card-meta">
                  <DollarSign className="mt-0.5 h-4 w-4 text-primary" />
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Budget</p>
                    <p className="mt-1 text-sm font-semibold text-foreground">${project.budget_min} - ${project.budget_max}</p>
                  </div>
                </div>
              )}
              
              {project.location && (
                <div className="project-card-meta">
                  <MapPin className="mt-0.5 h-4 w-4 text-primary" />
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Location</p>
                    <p className="mt-1 text-sm font-semibold text-foreground">{project.location}</p>
                  </div>
                </div>
              )}
              
              {project.deadline && (
                <div className="project-card-meta">
                  <Calendar className="mt-0.5 h-4 w-4 text-primary" />
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Deadline</p>
                    <p className="mt-1 text-sm font-semibold text-foreground">{new Date(project.deadline).toLocaleDateString()}</p>
                  </div>
                </div>
              )}
              <div className="project-card-meta">
                <Clock className="mt-0.5 h-4 w-4 text-primary" />
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Posted</p>
                  <p className="mt-1 text-sm font-semibold text-foreground">{formatDistanceToNow(new Date(project.created_at), { addSuffix: true })}</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="project-card-side">
            <div className="flex items-start justify-between gap-3">
              <Badge className={project.my_bid_status ? "market-card-chip" : "market-card-chip market-card-chip-accent"}>
                {project.my_bid_status === "accepted"
                  ? "Bid accepted"
                  : project.my_bid_status === "rejected"
                    ? "Bid rejected"
                    : project.my_bid_status
                      ? "Bid submitted"
                      : "Open for review"}
              </Badge>
              {user?.role === "provider" && (
                <button
                  onClick={(e) => handleToggleFavorite(e, project.id, project.is_favorited)}
                  className={`favorite-toggle p-2.5 ${project.is_favorited ? "favorite-toggle-active" : "favorite-toggle-idle"}`}
                >
                  <Heart className={`w-5 h-5 ${project.is_favorited ? "fill-current" : ""}`} />
                </button>
              )}
            </div>

            <div className="project-card-stats-grid">
              <div className="project-card-stat">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Bids</p>
                <p className="mt-1 text-lg font-semibold text-foreground">{project.bid_count || 0}</p>
              </div>
              <div className="project-card-stat">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Urgency</p>
                <p className="mt-1 text-sm font-semibold text-foreground">{project.urgency ? project.urgency.toUpperCase() : "OPEN"}</p>
              </div>
            </div>

            <div className="project-card-actions">
              <Button size="sm" className="w-full rounded-lg justify-between">
                Open project
                <ArrowRight className="h-4 w-4 text-primary transition-transform duration-200 group-hover:translate-x-1" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const ProviderCard = ({ provider }) => (
    <Card 
      className="result-card-surface cursor-pointer group border border-border/60 shadow-[0_24px_60px_-48px_rgba(15,23,42,0.24)] transition-all duration-200 hover:-translate-y-0.5"
      onClick={() => navigate(`/providers/${provider.id}`)}
    >
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <Avatar className="w-16 h-16 rounded-lg border border-primary/20 shadow-sm">
            <AvatarImage src={provider.profile_image} alt={provider.full_name} />
            <AvatarFallback className="bg-primary/10 text-primary text-lg font-semibold">
              {provider.full_name?.split(" ").map(n => n[0]).join("").toUpperCase()}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="truncate text-xl font-semibold text-foreground">{provider.full_name}</h3>
              {provider.verified && (
                <CheckCircle className="w-5 h-5 text-primary flex-shrink-0" />
              )}
            </div>
            
            {provider.business_name && (
              <div className="mb-2 inline-flex items-center gap-1 rounded-lg bg-muted px-2.5 py-1 text-sm text-muted-foreground">
                <Building2 className="w-4 h-4" />
                {provider.business_name}
              </div>
            )}
            
            <div className="flex items-center gap-3 mb-3">
              {provider.rating > 0 && (
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  <span className="font-medium">{provider.rating.toFixed(1)}</span>
                  <span className="text-sm text-muted-foreground">
                    ({provider.review_count})
                  </span>
                </div>
              )}
              
              {provider.completed_projects > 0 && (
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Award className="w-4 h-4" />
                  {provider.completed_projects} completed
                </div>
              )}
            </div>
            
            {provider.specializations && provider.specializations.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-2">
                {provider.specializations.slice(0, 3).map((spec, idx) => (
                  <Badge key={idx} className="market-card-chip rounded-lg">
                    {spec}
                  </Badge>
                ))}
                {provider.specializations.length > 3 && (
                  <Badge className="market-card-chip rounded-lg">
                    +{provider.specializations.length - 3}
                  </Badge>
                )}
              </div>
            )}
            
            {provider.location && (
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <MapPin className="w-4 h-4" />
                {provider.location}
              </div>
            )}
          </div>
        </div>

        <div className="market-card-section-divider mt-4 flex items-center justify-end pt-4">
          <span className="inline-flex items-center gap-2 text-sm font-medium text-foreground">
            View profile
            <ArrowRight className="h-4 w-4 text-primary transition-transform duration-200 group-hover:translate-x-1" />
          </span>
        </div>
      </CardContent>
    </Card>
  );

  const EmptyState = () => (
    <div className="empty-state-panel py-16">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-lg bg-muted mb-4">
        <Search className="w-8 h-8 text-muted-foreground" />
      </div>
      <h3 className="text-xl font-semibold mb-2">No results found</h3>
      <p className="text-muted-foreground mb-4">
        Try adjusting your search or filters to find what you're looking for
      </p>
      <Button variant="outline" onClick={() => navigate("/")}>
        Back to Home
      </Button>
    </div>
  );

  const allResults = [...results.projects, ...results.providers];
  const hasResults = allResults.length > 0;

  return (
    <AppShell theme={pageTheme}>
      <Helmet>
        <title>{query ? `"${query}" Search Results` : "Search"} | ServiceTones</title>
        <meta name="description" content={query ? `Search results for "${query}" on ServiceTones. Find home service professionals and projects.` : "Search for home service professionals and projects on ServiceTones."} />
        <meta name="robots" content="noindex, follow" />
      </Helmet>

      <div className="page-shell py-8">
        <section className="mb-6">
          <div className="max-w-3xl">
            <h1 className="text-3xl font-bold tracking-[-0.04em] text-foreground sm:text-4xl">
              {query ? `Search results for "${query}"` : "Search projects and providers"}
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
              One search, cleaner results, and less noise around the content.
            </p>
          </div>
        </section>

        <div className="space-y-5">
          <section className="sticky-filter-shell space-y-3">
            <div className="toolbar-surface flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
              <div className="min-w-0 flex-1">
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Search</p>
                <SearchBar 
                  value={query}
                  onValueChange={(newQuery) => {
                    if (!newQuery) {
                      setSearchParams({});
                    }
                  }}
                  onSearch={handleSearchUpdate}
                  autoFocus={!hasQuery}
                  size="large"
                  className="w-full"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2 xl:justify-end">
                <Button variant="outline" className="rounded-lg border-border/60 bg-background px-4" onClick={() => setFiltersOpen(true)}>
                  <SlidersHorizontal className="mr-2 h-4 w-4" />
                  Filters
                  {activeFilterCount > 0 && (
                    <span className="ml-2 inline-flex min-w-6 items-center justify-center rounded-lg bg-primary/12 px-2 py-0.5 text-xs font-semibold text-primary">
                      {activeFilterCount}
                    </span>
                  )}
                </Button>
                {hasActiveFilters ? (
                  <Button variant="ghost" className="rounded-lg px-4" onClick={clearFilters}>
                    Clear filters
                  </Button>
                ) : (
                  <span className="info-chip">Default search ranking</span>
                )}
              </div>
            </div>

            {hasActiveFilters && (
              <div className="flex flex-wrap gap-2">
                {category !== "All" && <Badge variant="secondary" className="rounded-lg border border-border/60 bg-white px-3 py-1.5 shadow-sm">{category}</Badge>}
                {sortBy !== "relevance" && <Badge variant="secondary" className="rounded-lg border border-border/60 bg-white px-3 py-1.5 shadow-sm">{sortBy === "date" ? "Most recent" : "Highest rated"}</Badge>}
              </div>
            )}

            <ResponsiveFilterModal
              open={filtersOpen}
              onOpenChange={setFiltersOpen}
              title="Search filters"
              description="Adjust category and sorting, then apply to refresh the current search results."
              footer={(
                <>
                  <Button variant="outline" className="rounded-lg border-border/60 bg-background px-5" onClick={clearFilters}>
                    Reset
                  </Button>
                  <Button className="rounded-lg px-5" onClick={applyFilters} disabled={!hasDraftChanges}>
                    Apply Filters
                  </Button>
                </>
              )}
            >
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <p className="detail-kicker">Category</p>
                  <Select value={draftCategory} onValueChange={setDraftCategory}>
                    <SelectTrigger className="h-11 rounded-lg border-border/60 bg-background">
                      <SelectValue placeholder="Category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <p className="detail-kicker">Sort by</p>
                  <Select value={draftSortBy} onValueChange={setDraftSortBy}>
                    <SelectTrigger className="h-11 rounded-lg border-border/60 bg-background">
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="relevance">Relevance</SelectItem>
                      <SelectItem value="date">Most Recent</SelectItem>
                      <SelectItem value="rating">Highest Rated</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </ResponsiveFilterModal>
          </section>

          <section className="discovery-main">
            <div className="glass-panel flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="caption">Search results</p>
                <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-foreground">
                  {!hasQuery ? "Start a search" : loading ? "Searching" : `${results.total} results`}
                </h2>
              </div>
              {hasQuery && (
                <div className="text-sm text-muted-foreground">
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Searching...
                    </span>
                  ) : (
                    <span>{results.projects.length} projects • {results.providers.length} providers</span>
                  )}
                </div>
              )}
            </div>

            {!hasQuery ? (
              <div className="empty-state-panel py-20">
                <Search className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">Search projects and providers</h3>
                <p className="text-muted-foreground">Enter a name, skill, category, or location to begin.</p>
              </div>
            ) : (
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="mb-6 w-full justify-start overflow-x-auto">
                  <TabsTrigger value="all" className="gap-2">
                    <TrendingUp className="w-4 h-4" />
                    All ({results.total})
                  </TabsTrigger>
                  <TabsTrigger value="projects" className="gap-2">
                    <Briefcase className="w-4 h-4" />
                    Projects ({results.projects.length})
                  </TabsTrigger>
                  <TabsTrigger value="providers" className="gap-2">
                    <User className="w-4 h-4" />
                    Providers ({results.providers.length})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="all">
                  {loading ? (
                    <div className="flex items-center justify-center py-16">
                      <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                  ) : hasResults ? (
                    <div className="grid gap-5">
                      {results.projects.length > 0 && (
                        <div>
                          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                            <Briefcase className="w-5 h-5 text-primary" />
                            Projects
                          </h2>
                          <div className="grid gap-5 mb-8">
                            {results.projects.map(project => (
                              <ProjectCard key={project.id} project={project} />
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {results.providers.length > 0 && (
                        <div>
                          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                            <User className="w-5 h-5 text-primary" />
                            Service Providers
                          </h2>
                          <div className="grid gap-5 md:grid-cols-2">
                            {results.providers.map(provider => (
                              <ProviderCard key={provider.id} provider={provider} />
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <EmptyState />
                  )}
                </TabsContent>

                <TabsContent value="projects">
                  {loading ? (
                    <div className="flex items-center justify-center py-16">
                      <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                  ) : results.projects.length > 0 ? (
                    <div className="grid gap-5">
                      {results.projects.map(project => (
                        <ProjectCard key={project.id} project={project} />
                      ))}
                    </div>
                  ) : (
                    <EmptyState />
                  )}
                </TabsContent>

                <TabsContent value="providers">
                  {loading ? (
                    <div className="flex items-center justify-center py-16">
                      <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                  ) : results.providers.length > 0 ? (
                    <div className="grid gap-5 md:grid-cols-2">
                      {results.providers.map(provider => (
                        <ProviderCard key={provider.id} provider={provider} />
                      ))}
                    </div>
                  ) : (
                    <EmptyState />
                  )}
                </TabsContent>
              </Tabs>
            )}
          </section>
        </div>
      </div>
    </AppShell>
  );
}
