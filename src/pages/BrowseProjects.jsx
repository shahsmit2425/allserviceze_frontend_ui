import { useEffect, useMemo, useRef, useState } from "react";
import { Helmet } from "react-helmet-async";
import logger from "@/utils/logger";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { AppShell } from "../components/AppShell";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "../components/ui/accordion";
import { Button } from "../components/ui/button";
import { Checkbox } from "../components/ui/checkbox";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { Card, CardContent } from "../components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { useAuth } from "../context/AuthContext";
import { useCategories } from "../hooks/useCategories";
import { usePlatform } from "@/mobile/hooks/usePlatform";
import { cn } from "@/lib/utils";
import axios from "axios";
import { 
  Briefcase, MapPin,
  Clock, Loader2, CheckCircle, ArrowRight, Gavel, Trophy, Heart, Navigation
} from "lucide-react";

const API_URL = `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'}/api`;
const PROJECTS_CANONICAL_URL = 'https://servicetones.com/projects';
const relativeTimeFormatter = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });
const TWO_DAYS_IN_MS = 1000 * 60 * 60 * 48;

const BUDGET_OPTIONS = [
  { value: "all", label: "All budgets" },
  { value: "under_500", label: "Under $500" },
  { value: "500_2500", label: "$500 - $2,500" },
  { value: "2500_10000", label: "$2,500 - $10,000" },
  { value: "10000_plus", label: "$10,000+" },
  { value: "custom", label: "Custom / not sure" },
];

const TIMELINE_OPTIONS = [
  { value: "all", label: "All timelines" },
  { value: "week", label: "Within 7 days" },
  { value: "month", label: "Within 30 days" },
  { value: "later", label: "More than 30 days" },
  { value: "flexible", label: "Flexible" },
];

const VERIFIED_CUSTOMER_OPTIONS = [
  { value: "all", label: "All customers" },
  { value: "verified", label: "Verified only" },
];

const PROJECT_TYPE_OPTIONS = [
  { value: "all", label: "All project types" },
  { value: "repair", label: "Repair" },
  { value: "replacement", label: "Replacement" },
  { value: "new", label: "New installation / build" },
  { value: "inspection", label: "Inspection first" },
  { value: "custom", label: "Custom / design" },
  { value: "other", label: "Other" },
];

const DISTANCE_OPTIONS = [
  { value: "5", label: "Within 5 miles" },
  { value: "10", label: "Within 10 miles" },
  { value: "25", label: "Within 25 miles" },
  { value: "50", label: "Within 50 miles" },
  { value: "100", label: "Within 100 miles" }
];

const URGENCY_FILTER_OPTIONS = [
  { value: "urgent", label: "Urgent" },
  { value: "high", label: "High" },
  { value: "normal", label: "Normal" },
  { value: "low", label: "Low" },
];

const PROJECT_STATUS_OPTIONS = [
  { value: "not_bidded", label: "Not bidded" },
  { value: "bidded", label: "Bidded" },
  { value: "awarded", label: "Awarded" },
  { value: "completed", label: "Completed" },
  { value: "favorited", label: "Favorited" },
];

const urgencyColors = {
  low: "border border-teal-200 bg-slate-50 text-teal-700",
  normal: "border border-sky-200 bg-sky-50 text-sky-800",
  high: "border border-amber-100 bg-amber-50 text-amber-800",
  urgent: "border border-rose-200 bg-rose-50 text-rose-800"
};

const getInitialVisibleCount = (isPhone) => (isPhone ? 6 : 9);

const formatRelativeTime = (timestamp) => {
  if (!timestamp) {
    return 'Recently posted';
  }

  const diffInSeconds = Math.round((timestamp - Date.now()) / 1000);
  const absoluteSeconds = Math.abs(diffInSeconds);

  if (absoluteSeconds < 60) return relativeTimeFormatter.format(diffInSeconds, 'second');

  const diffInMinutes = Math.round(diffInSeconds / 60);
  if (Math.abs(diffInMinutes) < 60) return relativeTimeFormatter.format(diffInMinutes, 'minute');

  const diffInHours = Math.round(diffInMinutes / 60);
  if (Math.abs(diffInHours) < 24) return relativeTimeFormatter.format(diffInHours, 'hour');

  const diffInDays = Math.round(diffInHours / 24);
  if (Math.abs(diffInDays) < 30) return relativeTimeFormatter.format(diffInDays, 'day');

  const diffInMonths = Math.round(diffInDays / 30);
  if (Math.abs(diffInMonths) < 12) return relativeTimeFormatter.format(diffInMonths, 'month');

  return relativeTimeFormatter.format(Math.round(diffInDays / 365), 'year');
};

const normalizeProject = (project) => {
  const createdAtMs = project.created_at ? new Date(project.created_at).getTime() : 0;
  const deadlineMs = project.deadline ? new Date(project.deadline).getTime() : Number.MAX_SAFE_INTEGER;
  const bidCountValue = Number(project.bid_count) || 0;
  const budgetMaxValue = Number(project.budget_max) || 0;
  const budgetMinValue = Number(project.budget_min) || 0;
  const photoCount = Array.isArray(project.images) ? project.images.length : 0;
  const derivedProjectType = String(
    project.questionnaire_responses?.project_type
      || project.property_type
      || ""
  ).trim();
  const normalizedProjectType = derivedProjectType.toLowerCase();
  const customerVerified = Boolean(project.customer_name && project.customer_name !== "Unknown");

  return {
    ...project,
    bidCountValue,
    budgetMaxValue,
    budgetMinValue,
    createdAtMs,
    deadlineMs,
    photoCount,
    derivedProjectType,
    normalizedProjectType,
    customerVerified,
    deadlineLabel: project.deadline ? new Date(project.deadline).toLocaleDateString() : 'Flexible',
    postedDateLabel: formatRelativeTime(createdAtMs),
    postedLabel: project.location || formatRelativeTime(createdAtMs),
    isNew: createdAtMs > 0 && (Date.now() - createdAtMs) < TWO_DAYS_IN_MS,
  };
};

const formatBudgetRange = (project) => {
  const min = Number(project?.budget_min);
  const max = Number(project?.budget_max);

  if (min > 0 && max > 0) return `$${min.toLocaleString()} - $${max.toLocaleString()}`;
  if (max > 0) return `Up to $${max.toLocaleString()}`;
  if (min > 0) return `From $${min.toLocaleString()}`;
  return "Custom budget";
};

const getOpportunityReason = (project) => {
  if (project.my_bid_status === "awarded") return "You already won this project";
  if (project.my_bid_status === "completed") return "Completed project";
  if (project.my_bid_status) return "Customer is already reviewing your quote";
  if (project.urgency === "urgent" && project.bidCountValue === 0) return "Urgent scope with no competing bids yet";
  if (project.urgency === "urgent") return "Urgent request that can convert quickly";
  if (project.bidCountValue === 0) return "Be the first provider to quote";
  if (project.bidCountValue <= 2) return "Low competition and still early";
  if (project.customerVerified) return "Verified customer with clear intent";
  return "Open request ready for contractor review";
};

const getPrimaryActionLabel = (project) => {
  if (project.my_bid_status === "awarded") return "Open Project";
  if (project.my_bid_status === "completed") return "View Project";
  if (project.my_bid_status) return "Review Your Bid";
  if (project.bidCountValue === 0) return "Be First To Bid";
  return "Submit Bid";
};

const getTimelineBucket = (project) => {
  if (!project?.deadlineMs || project.deadlineMs === Number.MAX_SAFE_INTEGER) return "flexible";
  const diff = project.deadlineMs - Date.now();
  const diffDays = diff / (1000 * 60 * 60 * 24);
  if (diffDays <= 7) return "week";
  if (diffDays <= 30) return "month";
  return "later";
};

const matchesBudgetFilter = (project, budgetFilter) => {
  if (budgetFilter === "all") return true;
  if (budgetFilter === "custom") return !project.budgetMaxValue && !project.budgetMinValue;
  if (budgetFilter === "under_500") return project.budgetMaxValue > 0 && project.budgetMaxValue < 500;
  if (budgetFilter === "500_2500") return project.budgetMaxValue >= 500 && project.budgetMaxValue <= 2500;
  if (budgetFilter === "2500_10000") return project.budgetMaxValue > 2500 && project.budgetMaxValue <= 10000;
  if (budgetFilter === "10000_plus") return project.budgetMaxValue > 10000;
  return true;
};

const matchesProjectTypeFilter = (project, projectTypeFilter) => {
  if (projectTypeFilter === "all") return true;
  const type = project.normalizedProjectType;
  if (!type) return projectTypeFilter === "other";
  if (projectTypeFilter === "repair") return /repair|fix|damage|troubleshoot/.test(type);
  if (projectTypeFilter === "replacement") return /replace|replacement/.test(type);
  if (projectTypeFilter === "new") return /new|install|build/.test(type);
  if (projectTypeFilter === "inspection") return /inspection|not sure/.test(type);
  if (projectTypeFilter === "custom") return /custom|design|remodel|upgrade/.test(type);
  return !/repair|fix|damage|troubleshoot|replace|replacement|new|install|build|inspection|not sure|custom|design|remodel|upgrade/.test(type);
};

export default function BrowseProjects() {
  const navigate = useNavigate();
  const { user, getAuthHeader, loading: authLoading } = useAuth();
  const { isNative, isNativePhone, isNativeTablet } = usePlatform();
  const [searchParams, setSearchParams] = useSearchParams();
  const categories = useCategories({ includeAll: true, scope: "project_posting" });

  // On native: hold the fetch until stale URL params are cleared (same pattern as BrowseProviders)
  const [fetchReady, setFetchReady] = useState(() => !isNative);
  const nativeInitDone = useRef(false);

  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rawProjectCount, setRawProjectCount] = useState(0);
  const [fetchError, setFetchError] = useState("");
  const [sortBy, setSortBy] = useState("best_match");
  const [visibleCount, setVisibleCount] = useState(() => getInitialVisibleCount(isNativePhone));

  // Read all filters from URL (source of truth)
  const category = searchParams.get('category') || "All";
  const urgency = searchParams.get('urgency') || "all";
  const actionFilter = searchParams.get('status') || "all";
  const zipCode = searchParams.get('zipcode') || "";
  const distance = searchParams.get('radius') || "25";
  const searchQuery = searchParams.get('search') || "";
  const budgetFilter = searchParams.get('budget') || "all";
  const timelineFilter = searchParams.get('timeline') || "all";
  const verifiedCustomerFilter = searchParams.get('verifiedCustomer') || "all";
  const projectTypeFilter = searchParams.get('projectType') || "all";
  const hasDeprecatedFilters = searchParams.has('q') || searchParams.has('featured');
  const searchParamsString = searchParams.toString();
  const [draftFilters, setDraftFilters] = useState(() => ({
    category,
    urgency,
    status: actionFilter,
    zipcode: zipCode,
    radius: distance,
    search: searchQuery,
    budget: budgetFilter,
    timeline: timelineFilter,
    verifiedCustomer: verifiedCustomerFilter,
    projectType: projectTypeFilter,
  }));

  useEffect(() => {
    if (!hasDeprecatedFilters) return;

    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete("q");
    nextParams.delete("featured");
    setSearchParams(nextParams, { replace: true });
  }, [hasDeprecatedFilters, searchParams, setSearchParams]);

  // One-time native init: clear stale URL params, then open the fetch gate.
  useEffect(() => {
    if (!isNative || nativeInitDone.current) return;
    nativeInitDone.current = true;

    if (searchParamsString) {
      setSearchParams({}, { replace: true });
    } else {
      setFetchReady(true);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps — intentionally runs once

  // After stale params are wiped, flip the gate.
  useEffect(() => {
    if (isNative && !fetchReady && !searchParamsString) {
      setFetchReady(true);
    }
  }, [isNative, fetchReady, searchParamsString]);

  useEffect(() => {
    if (authLoading || !fetchReady || hasDeprecatedFilters) return;

    fetchProjects();
  }, [authLoading, fetchReady, hasDeprecatedFilters, searchParamsString, user]); // Re-fetch whenever URL or auth state changes

  useEffect(() => {
    setVisibleCount(getInitialVisibleCount(isNativePhone));
  }, [isNativePhone, searchParamsString, sortBy]);

  useEffect(() => {
    setDraftFilters({
      category,
      urgency,
      status: actionFilter,
      zipcode: zipCode,
      radius: distance,
      search: searchQuery,
      budget: budgetFilter,
      timeline: timelineFilter,
      verifiedCustomer: verifiedCustomerFilter,
      projectType: projectTypeFilter,
    });
  }, [category, urgency, actionFilter, zipCode, distance, searchQuery, budgetFilter, timelineFilter, verifiedCustomerFilter, projectTypeFilter]);

  useEffect(() => {
    if (category === "All" || categories.includes(category)) return;

    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete("category");
    setSearchParams(nextParams, { replace: true });
  }, [categories, category, searchParams, setSearchParams]);

  const fetchProjects = async () => {
    setLoading(true);
    setFetchError("");
    try {
      const params = new URLSearchParams();
      params.append("scope", "project_posting");
      if (category && category !== "All") params.append("category", category);
      if (urgency && urgency !== "all") params.append("urgency", urgency);
      if (searchQuery.trim()) params.append("search", searchQuery.trim());
      if (zipCode) {
        params.append("location", zipCode);
        // Add radius parameter for distance filtering
        if (distance) params.append("radius", distance);
      }
      
      const config = {
        withCredentials: Boolean(user)
      };
      if (user) {
        config.headers = getAuthHeader();
      }
      const response = await axios.get(`${API_URL}/projects/live?${params.toString()}`, config);
      const fetchedProjects = Array.isArray(response.data)
        ? response.data
        : Array.isArray(response.data?.projects)
          ? response.data.projects
          : [];
      const normalizedProjects = fetchedProjects.map(normalizeProject);

      setRawProjectCount(normalizedProjects.length);
      
      // Log location filtering for debugging
      if (zipCode && normalizedProjects.length === 0) {
        logger.warn(`No projects found for zip code: ${zipCode}. Projects may not have location data in this area.`);
      }
      
      setProjects(normalizedProjects);
    } catch (error) {
      const message = error.response?.data?.detail || error.message || "Failed to load projects";
      setFetchError(message);
      logger.error("Error fetching projects:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredProjects = useMemo(() => {
    return projects.filter((project) => {
      const matchesAction = actionFilter === "all"
        ? true
        : actionFilter === "not_bidded"
          ? !project.my_bid_status
          : actionFilter === "favorited"
            ? project.is_favorited
            : project.my_bid_status === actionFilter;

      const matchesSearch = !searchQuery.trim()
        || `${project.title} ${project.description} ${project.location} ${project.customer_name}`.toLowerCase().includes(searchQuery.trim().toLowerCase());

      const matchesTimeline = timelineFilter === "all" || getTimelineBucket(project) === timelineFilter;
      const matchesVerifiedCustomer = verifiedCustomerFilter === "all" || project.customerVerified;

      return matchesAction
        && matchesSearch
        && matchesBudgetFilter(project, budgetFilter)
        && matchesTimeline
        && matchesVerifiedCustomer
        && matchesProjectTypeFilter(project, projectTypeFilter);
    });
  }, [projects, actionFilter, searchQuery, budgetFilter, timelineFilter, verifiedCustomerFilter, projectTypeFilter]);

  const sortedProjects = [...filteredProjects].sort((left, right) => {
    const leftBudget = left.budgetMaxValue;
    const rightBudget = right.budgetMaxValue;
    const leftDeadline = left.deadlineMs;
    const rightDeadline = right.deadlineMs;
    const leftCreated = left.createdAtMs;
    const rightCreated = right.createdAtMs;
    const leftBids = left.bidCountValue;
    const rightBids = right.bidCountValue;

    if (sortBy === "newest") return rightCreated - leftCreated;
    if (sortBy === "highest_budget") return rightBudget - leftBudget;
    if (sortBy === "fewest_bids") return leftBids - rightBids || rightCreated - leftCreated;
    if (sortBy === "deadline_soon") return leftDeadline - rightDeadline;

    const score = (project) => {
      let value = 0;
      if (project.is_featured) value += 5;
      if (!project.my_bid_status) value += 3;
      if (project.urgency === "urgent") value += 2;
      value += Math.max(0, 4 - project.bidCountValue);
      value += project.budgetMaxValue / 1000;
      return value;
    };

    return score(right) - score(left) || rightCreated - leftCreated;
  });

  const handleToggleFavorite = async (e, projectId, isFavorited) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      if (isFavorited) {
        await axios.delete(`${API_URL}/projects/${projectId}/favorite`, { 
          withCredentials: true,
          headers: getAuthHeader() 
        });
      } else {
        await axios.post(`${API_URL}/projects/${projectId}/favorite`, {}, { 
          withCredentials: true,
          headers: getAuthHeader() 
        });
      }
      // Update local state
      setProjects(prev => prev.map(p => 
        String(p.id) === String(projectId) ? { ...p, is_favorited: !isFavorited } : p
      ));
    } catch (error) {
      logger.error("Failed to toggle favorite", error);
    }
  };

  const applyFilters = () => {
    const nextParams = new URLSearchParams();

    if (draftFilters.category !== "All") nextParams.set("category", draftFilters.category);
    if (draftFilters.urgency !== "all") nextParams.set("urgency", draftFilters.urgency);
    if (draftFilters.status !== "all") nextParams.set("status", draftFilters.status);
    if (draftFilters.search.trim()) nextParams.set("search", draftFilters.search.trim());
    if (draftFilters.budget !== "all") nextParams.set("budget", draftFilters.budget);
    if (draftFilters.timeline !== "all") nextParams.set("timeline", draftFilters.timeline);
    if (draftFilters.verifiedCustomer !== "all") nextParams.set("verifiedCustomer", draftFilters.verifiedCustomer);
    if (draftFilters.projectType !== "all") nextParams.set("projectType", draftFilters.projectType);
    if (draftFilters.zipcode.trim()) {
      nextParams.set("zipcode", draftFilters.zipcode.trim());
      nextParams.set("radius", draftFilters.radius);
    }

    setSearchParams(nextParams);
  };

  const clearFilters = () => {
    setDraftFilters({
      category: "All",
      urgency: "all",
      status: "all",
      zipcode: "",
      radius: "25",
      search: "",
      budget: "all",
      timeline: "all",
      verifiedCustomer: "all",
      projectType: "all",
    });
    setSearchParams({});
  };

  const visibleProjects = sortedProjects.slice(0, visibleCount);
  const untouchedProjects = sortedProjects.filter((project) => !project.my_bid_status);
  const urgentProjects = untouchedProjects.filter((project) => project.urgency === "urgent");
  const lowCompetitionProjects = untouchedProjects.filter((project) => project.bidCountValue <= 2);
  const savedProjects = sortedProjects.filter((project) => project.is_favorited);
  const awardedProjects = sortedProjects.filter((project) => project.my_bid_status === "awarded");
  const projectCategoryCounts = useMemo(() => {
    const counts = new Map();

    projects.forEach((project) => {
      const categoryName = project.category || "General";
      counts.set(categoryName, (counts.get(categoryName) || 0) + 1);
    });

    return Array.from(counts.entries())
      .sort((left, right) => right[1] - left[1])
      .slice(0, 6);
  }, [projects]);

  const verifiedCustomerCountTotal = projects.filter((project) => project.customerVerified).length;
  const hasActiveFilters = category !== "All"
    || urgency !== "all"
    || actionFilter !== "all"
    || Boolean(zipCode)
    || Boolean(searchQuery)
    || budgetFilter !== "all"
    || timelineFilter !== "all"
    || verifiedCustomerFilter !== "all"
    || projectTypeFilter !== "all";
  const activeFilterCount = [
    category !== "All",
    urgency !== "all",
    actionFilter !== "all",
    Boolean(zipCode),
    Boolean(searchQuery),
    budgetFilter !== "all",
    timelineFilter !== "all",
    verifiedCustomerFilter !== "all",
    projectTypeFilter !== "all",
  ].filter(Boolean).length;
  const hasDraftChanges = draftFilters.category !== category
    || draftFilters.urgency !== urgency
    || draftFilters.status !== actionFilter
    || draftFilters.zipcode !== zipCode
    || draftFilters.radius !== distance
    || draftFilters.search !== searchQuery
    || draftFilters.budget !== budgetFilter
    || draftFilters.timeline !== timelineFilter
    || draftFilters.verifiedCustomer !== verifiedCustomerFilter
    || draftFilters.projectType !== projectTypeFilter;
  const canonicalUrl = `${PROJECTS_CANONICAL_URL}${category !== "All" ? `?category=${encodeURIComponent(category)}` : ""}`;

  return (
    <AppShell theme="provider" data-testid="browse-projects">
      <Helmet>
        <title>{category !== "All" ? `${category} Projects` : "Browse Projects"} | ServiceTones</title>
        <meta name="description" content={category !== "All" ? `Find ${category} service projects near you on ServiceTones. Compare active requests and submit quotes from verified professionals.` : "Browse active cleaning, lawn care, handyman, junk removal, gutter cleaning, window cleaning, pressure washing, carpet cleaning, and painting projects on ServiceTones."} />
        <meta property="og:title" content={`${category !== "All" ? `${category} Projects` : "Browse Projects"} | ServiceTones`} />
        <meta property="og:description" content={category !== "All" ? `Find ${category} service projects near you on ServiceTones. Compare active requests and submit quotes from verified professionals.` : "Browse active cleaning, lawn care, handyman, junk removal, gutter cleaning, window cleaning, pressure washing, carpet cleaning, and painting projects on ServiceTones."} />
        <meta name="robots" content="index,follow" />
        <meta property="og:url" content={canonicalUrl} />
        <link rel="canonical" href={canonicalUrl} />
      </Helmet>

      <div className="page-shell space-y-6 py-20 sm:py-32 bg-gradient-to-b from-amber-50 via-white to-slate-50 sm:space-y-7">
        <section className="overflow-hidden">
          <div className="px-5 py-0 sm:px-7">
            <div className="mx-auto max-w-4xl text-center">
              <div className="inline-flex items-center gap-2 rounded-full border border-teal-300/40 bg-white px-4 py-2 text-sm font-semibold text-teal-700 shadow-sm mb-6">
                <Briefcase className="h-4 w-4" />
                <span>Browse Projects</span>
              </div>
              <h1 className="text-5xl sm:text-6xl font-bold text-teal-900 leading-tight mb-4" style={{ fontFamily: "'Playfair Display', serif" }}>
                Find Projects Worth Bidding On
              </h1>
              <p className="text-lg text-teal-600 max-w-2xl mx-auto" style={{ fontFamily: "'Lora', serif" }}>
                Browse active projects, filter by budget and timeline, and submit competitive quotes to grow your business.
              </p>
            </div>

            <form
              onSubmit={(event) => {
                event.preventDefault();
                applyFilters();
              }}
              className="mx-auto mt-8 grid max-w-5xl gap-3 rounded-2xl border border-teal-300 bg-white p-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.78fr)_12rem]"
            >
              <div className="relative">
                <Briefcase className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={draftFilters.search}
                  onChange={(event) => setDraftFilters((prev) => ({ ...prev, search: event.target.value }))}
                  placeholder="What project are you looking for?"
                  className="h-12 rounded-xl border-border/60 bg-background pl-11 pr-4"
                />
              </div>
              <div className="relative">
                <Navigation className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={draftFilters.zipcode}
                  onChange={(event) => setDraftFilters((prev) => ({ ...prev, zipcode: event.target.value.replace(/\D/g, "").slice(0, 5) }))}
                  placeholder="Location"
                  className="h-12 rounded-xl border-border/60 bg-background pl-11 pr-4"
                  maxLength={5}
                />
              </div>
              <Button type="submit" className="h-12 rounded-xl bg-gradient-to-r from-teal-900 to-teal-800 text-white hover:from-teal-800 hover:to-teal-700 font-semibold shadow-md hover:shadow-lg transition-all">
                Search
              </Button>
            </form>

            <div className="mt-4 flex flex-wrap justify-center gap-2.5">
              <span className="browse-hero-chip">
                <Gavel className="h-3.5 w-3.5 text-primary" />
                {untouchedProjects.length} open to bid
              </span>
              <span className="browse-hero-chip">
                <Trophy className="h-3.5 w-3.5 text-primary" />
                {lowCompetitionProjects.length} low competition
              </span>
              <span className="browse-hero-chip">
                <Clock className="h-3.5 w-3.5 text-primary" />
                {urgentProjects.length} urgent
              </span>
            </div>
          </div>
        </section>

        <div className="grid gap-5 xl:grid-cols-[18.5rem_minmax(0,1fr)] xl:items-start">
          <aside className="hidden xl:block">
            <Card className="sticky top-[6.5rem] overflow-hidden border border-border/60 bg-[linear-gradient(180deg,#ffffff_0%,#f9fbff_100%)] shadow-[0_24px_48px_-38px_rgba(15,23,42,0.2)]">
              <CardContent className="p-0">
                <div className="flex items-center justify-between border-b border-border/60 px-5 py-4">
                  <div>
                    <p className="text-xl font-semibold tracking-[-0.03em] text-foreground">Filters</p>
                    <p className="mt-1 text-sm text-muted-foreground">{activeFilterCount > 0 ? `${activeFilterCount} active filters` : "Narrow the opportunity list"}</p>
                  </div>
                  {hasActiveFilters ? (
                    <Button variant="ghost" className="rounded-lg px-3 text-sm" onClick={clearFilters}>
                      Reset
                    </Button>
                  ) : null}
                </div>

                <Accordion type="multiple" defaultValue={["category", "budget", "timeline"]} className="w-full">
                  <AccordionItem value="category" className="px-5">
                    <AccordionTrigger className="py-5 text-[0.95rem] font-semibold hover:no-underline">Category</AccordionTrigger>
                    <AccordionContent className="space-y-3">
                      {projectCategoryCounts.map(([categoryName, count]) => (
                        <label key={categoryName} className="flex cursor-pointer items-center gap-3 text-sm text-foreground/88">
                          <Checkbox
                            checked={draftFilters.category === categoryName}
                            onCheckedChange={(checked) => setDraftFilters((prev) => ({ ...prev, category: checked ? categoryName : "All" }))}
                          />
                          <span className="flex-1">{categoryName}</span>
                          <span className="text-xs font-medium text-muted-foreground">{count}</span>
                        </label>
                      ))}
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="budget" className="px-5">
                    <AccordionTrigger className="py-5 text-[0.95rem] font-semibold hover:no-underline">Budget</AccordionTrigger>
                    <AccordionContent className="space-y-3">
                      {BUDGET_OPTIONS.filter((option) => option.value !== "all").slice(0, 4).map((option) => (
                        <label key={option.value} className="flex cursor-pointer items-center gap-3 text-sm text-foreground/88">
                          <Checkbox
                            checked={draftFilters.budget === option.value}
                            onCheckedChange={(checked) => setDraftFilters((prev) => ({ ...prev, budget: checked ? option.value : "all" }))}
                          />
                          <span>{option.label}</span>
                        </label>
                      ))}
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="timeline" className="border-b-0 px-5">
                    <AccordionTrigger className="py-5 text-[0.95rem] font-semibold hover:no-underline">Timeline</AccordionTrigger>
                    <AccordionContent className="space-y-3">
                      {TIMELINE_OPTIONS.filter((option) => option.value !== "all").map((option) => (
                        <label key={option.value} className="flex cursor-pointer items-center gap-3 text-sm text-foreground/88">
                          <Checkbox
                            checked={draftFilters.timeline === option.value}
                            onCheckedChange={(checked) => setDraftFilters((prev) => ({ ...prev, timeline: checked ? option.value : "all" }))}
                          />
                          <span>{option.label}</span>
                        </label>
                      ))}
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>

                <div className="border-t border-border/60 px-5 py-4">
                  <Button className="w-full rounded-xl bg-gradient-to-r from-teal-900 to-teal-800 text-white hover:from-teal-800 hover:to-teal-700 font-semibold shadow-md hover:shadow-lg transition-all disabled:opacity-50" onClick={applyFilters} disabled={!hasDraftChanges}>
                    Apply Filters
                  </Button>
                  <p className="mt-3 text-xs leading-5 text-muted-foreground">Filters stay draft-based until you apply them.</p>
                </div>
              </CardContent>
            </Card>
          </aside>

          <div className="space-y-5">
            <section className="xl:hidden rounded-2xl border border-border/60 bg-white p-4 shadow-sm sm:p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold tracking-[-0.03em] text-foreground">Refine projects</h2>
                  <p className="mt-1 text-sm text-muted-foreground">Keep key filters visible on smaller screens.</p>
                </div>
                {hasActiveFilters ? <span className="info-chip">{activeFilterCount} active</span> : null}
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <Select value={draftFilters.category} onValueChange={(value) => setDraftFilters((prev) => ({ ...prev, category: value }))}>
                  <SelectTrigger className="h-11 rounded-lg border-border/60 bg-background">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={draftFilters.budget} onValueChange={(value) => setDraftFilters((prev) => ({ ...prev, budget: value }))}>
                  <SelectTrigger className="h-11 rounded-lg border-border/60 bg-background">
                    <SelectValue placeholder="Budget" />
                  </SelectTrigger>
                  <SelectContent>
                    {BUDGET_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={draftFilters.timeline} onValueChange={(value) => setDraftFilters((prev) => ({ ...prev, timeline: value }))}>
                  <SelectTrigger className="h-11 rounded-lg border-border/60 bg-background">
                    <SelectValue placeholder="Timeline" />
                  </SelectTrigger>
                  <SelectContent>
                    {TIMELINE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={draftFilters.urgency} onValueChange={(value) => setDraftFilters((prev) => ({ ...prev, urgency: value }))}>
                  <SelectTrigger className="h-11 rounded-lg border-border/60 bg-background">
                    <SelectValue placeholder="Urgency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All urgency</SelectItem>
                    {URGENCY_FILTER_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <Button type="button" variant={draftFilters.verifiedCustomer === "verified" ? "default" : "outline"} className="rounded-lg" onClick={() => setDraftFilters((prev) => ({ ...prev, verifiedCustomer: prev.verifiedCustomer === "verified" ? "all" : "verified" }))}>
                  Verified customers
                </Button>
                {user?.role === "provider" ? (
                  <Button type="button" variant={draftFilters.status === "favorited" ? "default" : "outline"} className="rounded-lg" onClick={() => setDraftFilters((prev) => ({ ...prev, status: prev.status === "favorited" ? "all" : "favorited" }))}>
                    Saved only
                  </Button>
                ) : null}
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <Button className="rounded-lg px-5" onClick={applyFilters} disabled={!hasDraftChanges}>Apply filters</Button>
                <Button variant="outline" className="rounded-lg border-border/60 px-5" onClick={clearFilters}>Reset</Button>
              </div>
            </section>

            {zipCode && sortedProjects.length === 0 && !loading ? (
              <p className="px-1 text-xs text-amber-700">No projects found in this area yet. Try expanding the radius or removing location.</p>
            ) : null}

            {fetchError ? (
              <div className="rounded-xl border border-rose-200/80 bg-rose-50/90 px-4 py-3 text-sm text-rose-700">
                {fetchError}
              </div>
            ) : null}

            <section className="space-y-4">
              <div className="browse-summary-card">
                <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                  <div>
                    <h2 className="text-[1.8rem] font-semibold tracking-[-0.05em] text-foreground">All Projects</h2>
                    <p className="mt-1 text-sm text-muted-foreground">{sortedProjects.length} projects found</p>
                    <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">Keep budgets, urgency, and competition visible while you scan which jobs deserve a proposal first.</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <span className="browse-hero-chip">{untouchedProjects.length} open to bid</span>
                      <span className="browse-hero-chip">{lowCompetitionProjects.length} low competition</span>
                      <span className="browse-hero-chip">{urgentProjects.length} urgent</span>
                      {user?.role === "provider" ? <span className="browse-hero-chip">{savedProjects.length} saved</span> : null}
                      {user?.role === "provider" ? <span className="browse-hero-chip">{awardedProjects.length} awarded</span> : null}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {user?.role === "customer" ? (
                      <Button onClick={() => navigate("/projects/post")} className="hidden h-11 rounded-lg px-4 lg:inline-flex">
                        <Briefcase className="mr-2 h-4 w-4" />
                        Post a Project
                      </Button>
                    ) : null}
                    <Select value={sortBy} onValueChange={setSortBy}>
                      <SelectTrigger className="h-11 w-[12.5rem] rounded-lg border-border/60 bg-background">
                        <SelectValue placeholder="Sort projects" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="best_match">Best match</SelectItem>
                        <SelectItem value="newest">Newest</SelectItem>
                        <SelectItem value="highest_budget">Highest budget</SelectItem>
                        <SelectItem value="fewest_bids">Fewest bids</SelectItem>
                        <SelectItem value="deadline_soon">Deadline soon</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {hasActiveFilters ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {searchQuery && <Badge variant="outline" className="browse-active-chip">Search: {searchQuery}</Badge>}
                    {category !== "All" && <Badge variant="outline" className="browse-active-chip">{category}</Badge>}
                    {urgency !== "all" && <Badge variant="outline" className="browse-active-chip">{urgency}</Badge>}
                    {budgetFilter !== "all" && <Badge variant="outline" className="browse-active-chip">{BUDGET_OPTIONS.find((item) => item.value === budgetFilter)?.label}</Badge>}
                    {timelineFilter !== "all" && <Badge variant="outline" className="browse-active-chip">{TIMELINE_OPTIONS.find((item) => item.value === timelineFilter)?.label}</Badge>}
                    {verifiedCustomerFilter !== "all" && <Badge variant="outline" className="browse-active-chip">Verified customers</Badge>}
                    {projectTypeFilter !== "all" && <Badge variant="outline" className="browse-active-chip">{PROJECT_TYPE_OPTIONS.find((item) => item.value === projectTypeFilter)?.label}</Badge>}
                    {actionFilter !== "all" && <Badge variant="outline" className="browse-active-chip">{actionFilter.replace(/_/g, " ")}</Badge>}
                    {zipCode && <Badge variant="outline" className="browse-active-chip">{zipCode} ({distance} mi)</Badge>}
                  </div>
                ) : null}
              </div>

              <section className="space-y-4">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : sortedProjects.length > 0 ? (
              <div className={cn("grid gap-4", isNativeTablet ? "xl:grid-cols-2" : "lg:grid-cols-2")}>
                {visibleProjects.map((project) => {
                  const opportunityLabel = project.my_bid_status
                    ? project.my_bid_status === "awarded"
                      ? "Awarded to you"
                      : project.my_bid_status === "completed"
                        ? "Completed"
                        : "Already bid"
                    : project.urgency === "urgent"
                      ? "Urgent"
                      : "Open for quotes";
                  const projectUrl = `/projects/${project.id}`;
                  return (
                    <Card
                      key={project.id}
                      className="result-card-surface border border-teal-300 bg-white rounded-2xl hover:shadow-lg hover:border-slate-400 transition-all"
                      data-testid={`project-card-${project.id}`}
                      style={{ contentVisibility: 'auto', containIntrinsicSize: '360px' }}
                    >
                      <CardContent className="p-5 sm:p-5.5">
                        <div className="space-y-4">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge className={project.my_bid_status ? "status-badge-info" : project.bidCountValue === 0 ? "status-badge-success" : project.bidCountValue <= 2 ? "status-badge-warning" : "status-badge-neutral"}>
                              {project.my_bid_status ? opportunityLabel : project.bidCountValue === 0 ? "First quote advantage" : project.bidCountValue <= 2 ? "Low competition" : "Open marketplace"}
                            </Badge>
                            {project.isNew ? <Badge className="status-badge-info">New</Badge> : null}
                            {project.is_featured ? <Badge className="status-badge-warning">Featured</Badge> : null}
                          </div>

                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                {project.location ? (
                                  <span className="inline-flex items-center gap-1.5">
                                    <MapPin className="h-3.5 w-3.5" />
                                    {project.location}
                                  </span>
                                ) : null}
                                <span className="inline-flex items-center gap-1.5">
                                  <Clock className="h-3.5 w-3.5" />
                                  {project.postedDateLabel}
                                </span>
                              </div>
                              <Link
                                to={projectUrl}
                                className="group inline-block rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                aria-label={`Open project ${project.title}`}
                              >
                                <h3 className="text-[1.15rem] font-semibold leading-6 tracking-[-0.04em] text-foreground transition-colors group-hover:text-primary">
                                  {project.title}
                                </h3>
                              </Link>
                            </div>
                            {user?.role === "provider" && (
                              <button
                                onClick={(e) => handleToggleFavorite(e, project.id, project.is_favorited)}
                                aria-label={project.is_favorited ? `Remove ${project.title} from favorites` : `Save ${project.title} to favorites`}
                                className="favorite-toggle p-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                title={project.is_favorited ? "Remove from favorites" : "Add to favorites"}
                              >
                                <Heart className={cn("h-4 w-4 transition-colors", project.is_favorited ? "favorite-toggle-active fill-current" : "favorite-toggle-idle hover:text-pink-400")} />
                              </button>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-2">
                            <Badge className="bg-amber-50 text-amber-700 border border-amber-100 rounded-full px-3 py-1 text-xs font-semibold">{project.urgency}</Badge>
                            <Badge className="bg-teal-100 text-teal-700 border border-teal-200 rounded-full px-3 py-1 text-xs font-semibold">{project.category}</Badge>
                            {project.customerVerified ? (
                              <Badge className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-emerald-700">
                                <CheckCircle className="mr-1 h-3 w-3" />
                                Verified customer
                              </Badge>
                            ) : null}
                            {project.derivedProjectType ? (
                              <Badge className="bg-teal-100 text-teal-700 border border-teal-200 rounded-full px-3 py-1 text-xs font-semibold">{project.derivedProjectType}</Badge>
                            ) : null}
                          </div>

                          <div className="rounded-xl border border-border/60 bg-background px-4 py-3.5">
                            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">Why bid now</p>
                            <p className="mb-3 text-sm font-medium text-foreground">{getOpportunityReason(project)}</p>
                            <p className="line-clamp-3 text-sm leading-6 text-muted-foreground">
                              {project.description}
                            </p>
                            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-medium text-muted-foreground">
                              {project.photoCount > 0 ? (
                                <span className="market-card-chip">
                                  {project.photoCount} photo{project.photoCount === 1 ? "" : "s"}
                                </span>
                              ) : null}
                              {project.required_skills?.slice(0, 2).map((skill) => (
                                <span key={skill} className="market-card-chip">{skill}</span>
                              ))}
                            </div>
                          </div>

                          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                            <div className="rounded-lg border border-border/60 bg-muted/35 px-3.5 py-3">
                              <p className="detail-kicker">Budget</p>
                              <p className="mt-1.5 text-sm font-semibold text-foreground">{formatBudgetRange(project)}</p>
                            </div>
                            <div className="rounded-lg border border-border/60 bg-muted/35 px-3.5 py-3">
                              <p className="detail-kicker">Timeline</p>
                              <p className="mt-1.5 text-sm font-semibold text-foreground">{project.deadlineLabel}</p>
                            </div>
                            <div className="rounded-lg border border-border/60 bg-muted/35 px-3.5 py-3">
                              <p className="detail-kicker">Bid count</p>
                              <p className="mt-1.5 text-sm font-semibold text-foreground">{project.bidCountValue} bids</p>
                            </div>
                            <div className="rounded-lg border border-border/60 bg-muted/35 px-3.5 py-3">
                              <p className="detail-kicker">Competition</p>
                              <p className="mt-1.5 text-sm font-semibold text-foreground">{project.bidCountValue === 0 ? "Be first" : project.bidCountValue <= 2 ? "Still early" : `${project.bidCountValue}+ active`}</p>
                            </div>
                            <div className="rounded-lg border border-border/60 bg-muted/35 px-3.5 py-3">
                              <p className="detail-kicker">Customer</p>
                              <p className="mt-1.5 text-sm font-semibold text-foreground line-clamp-1">{project.customerVerified ? "Verified homeowner" : project.customer_name || "Marketplace customer"}</p>
                            </div>
                          </div>

                          <div className="flex flex-col gap-3 pt-0.5 sm:flex-row sm:items-center sm:justify-between">
                            <div className="text-sm text-muted-foreground">
                              <span className="font-medium text-foreground">{opportunityLabel}</span>
                            </div>
                            <div className="flex flex-col gap-2 sm:flex-row">
                              <Button asChild size="sm" className="min-w-[9.5rem] justify-center rounded-xl border border-teal-300 text-teal-900 hover:bg-slate-50 font-semibold">
                                <Link to={projectUrl} aria-label={`View details for ${project.title}`}>
                                  View Project
                                </Link>
                              </Button>
                              <Button asChild size="sm" className="min-w-[9.5rem] justify-center rounded-xl bg-gradient-to-r from-teal-900 to-teal-800 text-white hover:from-teal-800 hover:to-teal-700 font-semibold">
                                <Link to={projectUrl} aria-label={`Submit bid for ${project.title}`}>
                                  {getPrimaryActionLabel(project)}
                                  <ArrowRight className="ml-2 h-4 w-4" />
                                </Link>
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )})}
                {sortedProjects.length > visibleCount && (
                  <div className="flex justify-center pt-2">
                    <Button variant="outline" className="w-full rounded-lg border-border/60 bg-background sm:w-auto" onClick={() => setVisibleCount((count) => count + 12)}>
                      Load More Projects
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="browse-empty-state">
                <div className="browse-empty-state-icon">
                  <Briefcase className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-semibold tracking-[-0.03em] text-foreground">No projects found</h3>
                <p className="mx-auto mt-3 mb-6 max-w-xl text-sm leading-6 text-muted-foreground">
                  {zipCode
                    ? "No projects found in this location. Try expanding the search radius or searching without location."
                    : hasActiveFilters 
                      ? "Try adjusting your search or filters" 
                      : user?.role === "customer" 
                        ? "Be the first to post a project!" 
                        : "Check back later for new opportunities"}
                </p>
                <div className="flex flex-wrap justify-center gap-3">
                  {hasActiveFilters && (
                    <Button onClick={clearFilters} variant="outline" className="rounded-lg border-border/60">
                      Clear All Filters
                    </Button>
                  )}
                  {zipCode ? (
                    <Button
                      onClick={() => {
                        const nextParams = new URLSearchParams(searchParams);
                        nextParams.delete("zipcode");
                        nextParams.delete("radius");
                        setDraftFilters((prev) => ({ ...prev, zipcode: "", radius: "25" }));
                        setSearchParams(nextParams);
                      }}
                      variant="ghost"
                      className="rounded-lg"
                    >
                      Search Without Location
                    </Button>
                  ) : null}
                  {user?.role === "customer" && (
                    <Button onClick={() => navigate("/projects/post")} className="rounded-lg">
                      Post a Project
                    </Button>
                  )}
                </div>
                <p className="mt-4 text-xs uppercase tracking-[0.18em] text-muted-foreground">Try widening the area, relaxing the budget band, or switching urgency.</p>
              </div>
            )}
          </section>
          </section>
        </div>
      </div>
      </div>
    </AppShell>
  );
}
