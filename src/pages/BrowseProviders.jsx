import { useState, useEffect, useMemo, useRef } from "react";
import { Helmet } from "react-helmet-async";
import logger from "@/utils/logger";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AppShell } from "../components/AppShell";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "../components/ui/accordion";
import { Button } from "../components/ui/button";
import { Checkbox } from "../components/ui/checkbox";
import { Input } from "../components/ui/input";
import { Badge } from "../components/ui/badge";
import { Card, CardContent } from "../components/ui/card";
import { Slider } from "../components/ui/slider";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { useAuth } from "../context/AuthContext";
import { useCategories } from "../hooks/useCategories";
import { usePlatform } from "@/mobile/hooks/usePlatform";
import { toast } from "sonner";
import axios from "axios";
import { 
  Star, MapPin, Heart, Loader2, X,
  Briefcase, CheckCircle, Users, Navigation, ArrowRight, MessageSquare, DollarSign, SlidersHorizontal,
  Search, ShieldCheck, Clock3, FileText
} from "lucide-react";

const API_URL = `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'}/api`;

const DISTANCE_OPTIONS = [
  { value: "5", label: "Within 5 miles" },
  { value: "10", label: "Within 10 miles" },
  { value: "25", label: "Within 25 miles" },
  { value: "50", label: "Within 50 miles" },
  { value: "100", label: "Within 100 miles" }
];

const RATING_OPTIONS = [
  { value: "All", label: "Any rating" },
  { value: "4.5", label: "4.5+" },
  { value: "4.0", label: "4.0+" },
  { value: "3.5", label: "3.5+" },
];

const PRICE_OPTIONS = [
  { value: "All", label: "Any price" },
  { value: "0-75", label: "Up to $75/hr" },
  { value: "75-125", label: "$75-$125/hr" },
  { value: "125-200", label: "$125-$200/hr" },
  { value: "200+", label: "$200+/hr" },
  { value: "custom", label: "Custom quote" },
];

const EXPERIENCE_OPTIONS = [
  { value: "All", label: "Any experience" },
  { value: "0-2", label: "0-2 years" },
  { value: "3-5", label: "3-5 years" },
  { value: "6-10", label: "6-10 years" },
  { value: "10+", label: "10+ years" },
];

const SEARCHABLE_FIELDS = [
  "full_name",
  "business_name",
  "location",
  "bio",
  "skills",
  "service_areas",
];

const formatReviewCount = (count) => {
  const safeCount = Number(count) || 0;
  return `${safeCount} review${safeCount === 1 ? "" : "s"}`;
};

const getHourlyRate = (provider) => Number(provider?.provider_profile?.hourly_rate) || 0;

const getExperienceYears = (provider) => Number(provider?.provider_profile?.experience_years) || 0;

const getProviderCategory = (provider) => {
  const skills = Array.isArray(provider?.provider_profile?.skills) ? provider.provider_profile.skills : [];
  return skills[0] || "Home services";
};

const getProviderLocation = (provider) => {
  const profile = provider?.provider_profile || {};
  return profile.location || profile.service_areas?.[0] || "Location shared on request";
};

const getCompanyName = (provider) => {
  return provider?.provider_profile?.business_name || `${provider?.full_name || "Provider"} Home Services`;
};

const getStartingPriceLabel = (provider) => {
  const hourlyRate = getHourlyRate(provider);
  return hourlyRate > 0 ? `From $${hourlyRate.toLocaleString()}/hr` : "Request quote";
};

const getTypicalPriceLabel = (provider) => {
  const hourlyRate = getHourlyRate(provider);
  return hourlyRate > 0 ? `$${hourlyRate.toLocaleString()}/hr typical` : "Priced after scope review";
};

const formatAverageResponseTime = (minutes) => {
  const safeMinutes = Number(minutes);
  if (!Number.isFinite(safeMinutes) || safeMinutes <= 0) return "Not published";
  if (safeMinutes < 60) return `${safeMinutes} min avg`;

  const hours = Math.round((safeMinutes / 60) * 10) / 10;
  return hours % 1 === 0 ? `${hours.toFixed(0)} hr avg` : `${hours.toFixed(1)} hr avg`;
};

const matchesRatingFilter = (provider, ratingFilter) => {
  if (ratingFilter === "All") return true;
  const minRating = Number(ratingFilter);
  return (Number(provider.avg_rating) || 0) >= minRating;
};

const matchesPriceFilter = (provider, priceFilter) => {
  if (priceFilter === "All") return true;

  const hourlyRate = getHourlyRate(provider);
  if (priceFilter === "custom") return hourlyRate === 0;
  if (!hourlyRate) return false;
  if (priceFilter === "200+") return hourlyRate >= 200;

  const [min, max] = priceFilter.split("-").map(Number);
  return hourlyRate >= min && hourlyRate <= max;
};

const matchesExperienceFilter = (provider, experienceFilter) => {
  if (experienceFilter === "All") return true;

  const years = getExperienceYears(provider);
  if (experienceFilter === "10+") return years >= 10;

  const [min, max] = experienceFilter.split("-").map(Number);
  return years >= min && years <= max;
};

const matchesSearchFilter = (provider, searchTerm) => {
  if (!searchTerm.trim()) return true;
  const normalizedQuery = searchTerm.trim().toLowerCase();
  const profile = provider?.provider_profile || {};

  return SEARCHABLE_FIELDS.some((field) => {
    const source = field === "business_name"
      ? profile.business_name
      : field === "location"
        ? profile.location
        : field === "bio"
          ? profile.bio
          : profile[field] ?? provider?.[field];

    if (Array.isArray(source)) {
      return source.some((item) => String(item).toLowerCase().includes(normalizedQuery));
    }

    return String(source || "").toLowerCase().includes(normalizedQuery);
  });
};

const getFeaturedReviewPreview = (review) => {
  if (!review?.comment) return "No public review yet. View the profile to request a quote and start the conversation.";
  return review.comment;
};

const DEFAULT_PROVIDER_RATE_CAP = 300;

const mapLegacyPriceToMaxRate = (priceFilter) => {
  switch (priceFilter) {
    case "0-75":
      return 75;
    case "75-125":
      return 125;
    case "125-200":
      return 200;
    case "200+":
      return DEFAULT_PROVIDER_RATE_CAP;
    default:
      return DEFAULT_PROVIDER_RATE_CAP;
  }
};

const formatRateCapLabel = (maxRate) => {
  if (maxRate >= DEFAULT_PROVIDER_RATE_CAP) {
    return `$${DEFAULT_PROVIDER_RATE_CAP}+`;
  }

  return `Up to $${maxRate}`;
};

export default function BrowseProviders() {
  const navigate = useNavigate();
  const { user, getAuthHeader, loading: authLoading } = useAuth();
  const CATEGORIES = useCategories({ includeAll: true, scope: "project_posting" });
  const { isNative, isNativePhone, isNativeTablet } = usePlatform();
  const [searchParams, setSearchParams] = useSearchParams();

  // On native: start "not ready" so the fetch is held until stale URL params
  // (carried over from previous navigation) are cleared. On web: start "ready".
  const [fetchReady, setFetchReady] = useState(() => !isNative);
  const nativeInitDone = useRef(false);

  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [favoriteIds, setFavoriteIds] = useState(new Set());
  const [rawProviderCount, setRawProviderCount] = useState(0);
  const [fetchError, setFetchError] = useState("");

  // Read all filters from URL (source of truth)
  const selectedCategory = searchParams.get('category') || "All";
  const searchTerm = searchParams.get('search') || "";
  const zipCode = searchParams.get('zipcode') || "";
  const distance = searchParams.get('radius') || "25";
  const rating = searchParams.get('rating') || "All";
  const legacyPrice = searchParams.get('price') || "All";
  const maxRate = Number(searchParams.get('maxRate')) || mapLegacyPriceToMaxRate(legacyPrice);
  const availability = searchParams.get('availability') || "all";
  const verifiedOnly = searchParams.get('verifiedOnly') || "false";
  const experience = searchParams.get('experience') || "All";
  const hasDeprecatedFilters = searchParams.has('q') || searchParams.has('verified');
  const searchParamsString = searchParams.toString();
  const [providerSort, setProviderSort] = useState("best_match");
  const [draftFilters, setDraftFilters] = useState(() => ({
    search: searchTerm,
    category: selectedCategory,
    zipcode: zipCode,
    radius: distance,
    rating,
    maxRate,
    availability,
    verifiedOnly,
    experience,
  }));

  // One-time native init: clear any stale URL params left from previous navigation,
  // then mark fetchReady so the fetch effect can proceed.
  useEffect(() => {
    if (!isNative || nativeInitDone.current) return;
    nativeInitDone.current = true;

    if (searchParamsString) {
      // Clear stale params; fetchReady is set to true in the next effect
      // once the URL settles to an empty string.
      setSearchParams({}, { replace: true });
    } else {
      setFetchReady(true);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps — intentionally runs once

  // After stale params are wiped, flip the gate so the fetch can start.
  useEffect(() => {
    if (isNative && !fetchReady && !searchParamsString) {
      setFetchReady(true);
    }
  }, [isNative, fetchReady, searchParamsString]);

  useEffect(() => {
    if (!hasDeprecatedFilters) return;

    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete("q");
    nextParams.delete("verified");
    setSearchParams(nextParams, { replace: true });
  }, [hasDeprecatedFilters, searchParams, setSearchParams]);

  // Fetch providers when URL params change (or auth state changes)
  useEffect(() => {
    if (authLoading || !fetchReady || hasDeprecatedFilters) return;

    fetchProviders();
    if (user) fetchFavoriteIds();
  }, [authLoading, fetchReady, hasDeprecatedFilters, searchParamsString, user]); // Re-fetch whenever URL or auth changes

  useEffect(() => {
    setDraftFilters({
      search: searchTerm,
      category: selectedCategory,
      zipcode: zipCode,
      radius: distance,
      rating,
      maxRate,
      availability,
      verifiedOnly,
      experience,
    });
  }, [selectedCategory, searchTerm, zipCode, distance, rating, maxRate, availability, verifiedOnly, experience]);

  useEffect(() => {
    if (selectedCategory === "All" || CATEGORIES.includes(selectedCategory)) return;

    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete("category");
    setSearchParams(nextParams, { replace: true });
  }, [CATEGORIES, searchParams, selectedCategory, setSearchParams]);

  const fetchProviders = async () => {
    setLoading(true);
    setFetchError("");
    try {
      const params = {};
      params.scope = "project_posting";
      
      // Only add params if they have values
      if (selectedCategory !== "All") params.category = selectedCategory;
      if (zipCode) params.location = zipCode;
      if (zipCode && distance) params.radius = distance;
      
      const response = await axios.get(`${API_URL}/providers`, { 
        params,
        withCredentials: false
      });
      
      const rawProviders = Array.isArray(response.data)
        ? response.data
        : Array.isArray(response.data?.providers)
          ? response.data.providers
          : [];

      setRawProviderCount(rawProviders.length);

      const fetchedProviders = await Promise.all(
        rawProviders.map(async (provider) => {
          const [portfolioResult, reviewsResult] = await Promise.allSettled([
            axios.get(`${API_URL}/portfolio/${provider.id}`, {
              withCredentials: false,
              headers: { Accept: "application/json" },
            }),
            axios.get(`${API_URL}/reviews/provider/${provider.id}?limit=1`, {
              withCredentials: false,
              headers: { Accept: "application/json" },
            }),
          ]);

          const portfolioPreview = portfolioResult.status === "fulfilled" && Array.isArray(portfolioResult.value.data)
            ? portfolioResult.value.data.slice(0, 6)
            : [];

          const reviews = reviewsResult.status === "fulfilled" && Array.isArray(reviewsResult.value.data)
            ? reviewsResult.value.data
            : [];

          return {
            ...provider,
            portfolioPreview,
            featuredReview: reviews[0] || null,
          };
        })
      );
      
      // Log location filtering for debugging
      if (zipCode && fetchedProviders.length === 0) {
        logger.warn(`No providers found for zip code: ${zipCode}. Providers may not have location data.`);
      }
      
      setProviders(fetchedProviders);
    } catch (error) {
      const message = error.response?.data?.detail || error.message || "Failed to load providers";
      setFetchError(message);
      logger.error("Error fetching providers:", error);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const fetchFavoriteIds = async () => {
    try {
      const response = await axios.get(`${API_URL}/favorite-providers`, {
        headers: getAuthHeader()
      });
      setFavoriteIds(new Set(response.data.map(p => p.id)));
    } catch {
      // Not logged in or error - that's fine
    }
  };

  const toggleFavorite = async (providerId, e) => {
    e.stopPropagation();
    if (!user) {
      toast.error("Please log in to save favorites");
      navigate("/auth");
      return;
    }
    
    try {
      if (favoriteIds.has(providerId)) {
        await axios.delete(`${API_URL}/favorite-providers/${providerId}`, {
          headers: getAuthHeader()
        });
        setFavoriteIds(prev => {
          const next = new Set(prev);
          next.delete(providerId);
          return next;
        });
        toast.success("Removed from favorites");
      } else {
        await axios.post(`${API_URL}/favorite-providers/${providerId}`, {}, {
          headers: getAuthHeader()
        });
        setFavoriteIds(prev => new Set([...prev, providerId]));
        toast.success("Added to favorites");
      }
    } catch (error) {
      toast.error("Failed to update favorites");
    }
  };

  // Update URL params (triggers re-fetch via useEffect)
  const updateSearchParams = (updates) => {
    const newParams = new URLSearchParams(searchParams);
    
    Object.entries(updates).forEach(([key, value]) => {
      if (value && value !== "All" && value !== "false") {
        newParams.set(key, value);
      } else {
        newParams.delete(key);
      }
    });
    
    setSearchParams(newParams);
  };

  const applyFilters = () => {
    const nextParams = new URLSearchParams();

    if (draftFilters.search.trim()) nextParams.set("search", draftFilters.search.trim());
    if (draftFilters.category !== "All") nextParams.set("category", draftFilters.category);
    if (draftFilters.zipcode.trim()) {
      nextParams.set("zipcode", draftFilters.zipcode.trim());
      nextParams.set("radius", draftFilters.radius);
    }
    if (draftFilters.rating !== "All") nextParams.set("rating", draftFilters.rating);
    if (draftFilters.maxRate < DEFAULT_PROVIDER_RATE_CAP) nextParams.set("maxRate", String(draftFilters.maxRate));
    if (draftFilters.availability !== "all") nextParams.set("availability", draftFilters.availability);
    if (draftFilters.verifiedOnly === "true") nextParams.set("verifiedOnly", "true");
    if (draftFilters.experience !== "All") nextParams.set("experience", draftFilters.experience);

    setSearchParams(nextParams);
  };

  const clearFilters = () => {
    setDraftFilters({
      search: "",
      category: "All",
      zipcode: "",
      radius: "25",
      rating: "All",
      maxRate: DEFAULT_PROVIDER_RATE_CAP,
      availability: "all",
      verifiedOnly: "false",
      experience: "All",
    });
    setSearchParams({});
  };

  const filteredProviders = useMemo(() => {
    return providers
      .filter((provider) => matchesSearchFilter(provider, searchTerm))
      .filter((provider) => matchesRatingFilter(provider, rating))
      .filter((provider) => maxRate >= DEFAULT_PROVIDER_RATE_CAP || (getHourlyRate(provider) > 0 && getHourlyRate(provider) <= maxRate))
      .filter((provider) => matchesExperienceFilter(provider, experience))
      .filter((provider) => availability !== "available" || provider.provider_profile?.available)
      .filter((provider) => verifiedOnly !== "true" || provider.provider_profile?.is_verified || provider.document_verified);
  }, [providers, searchTerm, rating, maxRate, experience, availability, verifiedOnly]);

  const sortedProviders = useMemo(() => {
    const next = [...filteredProviders];

    if (providerSort === "rating") {
      return next.sort((left, right) => (Number(right.avg_rating) || 0) - (Number(left.avg_rating) || 0) || (Number(right.total_reviews) || 0) - (Number(left.total_reviews) || 0));
    }

    if (providerSort === "reviews") {
      return next.sort((left, right) => (Number(right.total_reviews) || 0) - (Number(left.total_reviews) || 0) || (Number(right.avg_rating) || 0) - (Number(left.avg_rating) || 0));
    }

    if (providerSort === "experience") {
      return next.sort((left, right) => getExperienceYears(right) - getExperienceYears(left) || (Number(right.avg_rating) || 0) - (Number(left.avg_rating) || 0));
    }

    return next.sort((left, right) => {
      const leftScore = [
        left.provider_profile?.is_verified ? 1 : 0,
        left.document_verified ? 1 : 0,
        Number(left.avg_rating) || 0,
        Number(left.total_reviews) || 0,
        getExperienceYears(left),
      ];
      const rightScore = [
        right.provider_profile?.is_verified ? 1 : 0,
        right.document_verified ? 1 : 0,
        Number(right.avg_rating) || 0,
        Number(right.total_reviews) || 0,
        getExperienceYears(right),
      ];

      for (let index = 0; index < leftScore.length; index += 1) {
        if (rightScore[index] !== leftScore[index]) {
          return rightScore[index] - leftScore[index];
        }
      }

      return left.full_name.localeCompare(right.full_name);
    });
  }, [filteredProviders, providerSort]);

  const providerCategoryCounts = useMemo(() => {
    const counts = new Map();

    providers.forEach((provider) => {
      const categoryName = getProviderCategory(provider);
      counts.set(categoryName, (counts.get(categoryName) || 0) + 1);
    });

    return Array.from(counts.entries())
      .sort((left, right) => right[1] - left[1])
      .slice(0, 6);
  }, [providers]);

  const availableNowCount = providers.filter((provider) => provider.provider_profile?.available).length;
  const totalVerifiedProviderCount = providers.filter((provider) => provider.provider_profile?.is_verified || provider.document_verified).length;
  const hasActiveFilters = Boolean(searchTerm) || selectedCategory !== "All" || zipCode || rating !== "All" || maxRate < DEFAULT_PROVIDER_RATE_CAP || availability !== "all" || verifiedOnly === "true" || experience !== "All";
  const activeFilterCount = [Boolean(searchTerm), selectedCategory !== "All", Boolean(zipCode), rating !== "All", maxRate < DEFAULT_PROVIDER_RATE_CAP, availability !== "all", verifiedOnly === "true", experience !== "All"].filter(Boolean).length;
  const hasDraftChanges = draftFilters.search !== searchTerm
    || draftFilters.category !== selectedCategory
    || draftFilters.zipcode !== zipCode
    || draftFilters.radius !== distance
    || draftFilters.rating !== rating
    || draftFilters.maxRate !== maxRate
    || draftFilters.availability !== availability
    || draftFilters.verifiedOnly !== verifiedOnly
    || draftFilters.experience !== experience;

  const verifiedProviderCount = sortedProviders.filter((provider) => provider.provider_profile?.is_verified || provider.document_verified).length;
  const licensedProviderCount = sortedProviders.filter((provider) => (provider.provider_profile?.licenses || []).length > 0).length;
  const averageVisibleRating = sortedProviders.length
    ? (sortedProviders.reduce((sum, provider) => sum + (Number(provider.avg_rating) || 0), 0) / sortedProviders.length).toFixed(1)
    : "0.0";
  const resultsContainerClassName = isNativeTablet
    ? "space-y-4"
    : "space-y-4 sm:space-y-5";

  return (
    <AppShell theme="customer">
      <Helmet>
        <title>Browse Service Providers | ServiceTones</title>
        <meta name="description" content="Find verified home service professionals near you. Compare ratings for cleaning, lawn care, handyman, junk removal, painting, and related services." />
        <meta property="og:title" content="Browse Service Providers | ServiceTones" />
        <meta property="og:description" content="Find verified home service professionals near you. Compare ratings for cleaning, lawn care, handyman, junk removal, painting, and related services." />
        <meta property="og:url" content="https://servicetones.com/providers" />
        <link rel="canonical" href="https://servicetones.com/providers" />
      </Helmet>

      <div className="page-shell space-y-6 py-7 sm:space-y-7 sm:py-8">
        <section className="overflow-hidden rounded-[2rem] border border-border/60 bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_62%,#f7faf8_100%)] shadow-[0_28px_80px_-48px_rgba(15,23,42,0.22)]">
          <div className="px-5 py-8 sm:px-7 sm:py-10">
            <div className="mx-auto max-w-4xl text-center">
              <div className="inline-flex items-center gap-2 rounded-lg border border-primary/10 bg-white px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-primary shadow-sm">
                <ShieldCheck className="h-3.5 w-3.5" />
                Verified service marketplace
              </div>
              <h1 className="mt-5 font-heading text-[clamp(2.6rem,5vw,4.5rem)] font-extrabold leading-[0.94] tracking-[-0.06em] text-foreground">
                Find Your Perfect Provider
              </h1>
              <p className="mt-3 text-base leading-7 text-muted-foreground sm:text-xl">
                Connect with verified service professionals near you and keep every filter visible while you compare.
              </p>
            </div>

            <form
              onSubmit={(event) => {
                event.preventDefault();
                applyFilters();
              }}
              className="mx-auto mt-8 grid max-w-5xl gap-3 rounded-2xl border border-white/70 bg-white/92 p-3 shadow-[0_28px_50px_-38px_rgba(15,23,42,0.18)] lg:grid-cols-[minmax(0,1fr)_minmax(0,0.78fr)_12rem]"
            >
              <div className="relative">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={draftFilters.search}
                  onChange={(event) => setDraftFilters((prev) => ({ ...prev, search: event.target.value }))}
                  placeholder="What service do you need?"
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
              <Button type="submit" className="h-12 rounded-xl bg-[linear-gradient(90deg,#ff3b30_0%,#ff8a00_100%)] text-white shadow-[0_18px_40px_-22px_rgba(255,89,51,0.55)] hover:opacity-95">
                Search
              </Button>
            </form>

            <div className="mt-4 flex flex-wrap justify-center gap-2.5">
              <span className="browse-hero-chip">
                <Users className="h-3.5 w-3.5 text-primary" />
                {rawProviderCount} public profiles
              </span>
              <span className="browse-hero-chip">
                <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                {totalVerifiedProviderCount} verified
              </span>
              <span className="browse-hero-chip">
                <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                {averageVisibleRating} avg rating
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
                    <p className="mt-1 text-sm text-muted-foreground">{activeFilterCount > 0 ? `${activeFilterCount} active filters` : "Refine the shortlist"}</p>
                  </div>
                  {hasActiveFilters ? (
                    <Button variant="ghost" className="rounded-lg px-3 text-sm" onClick={clearFilters}>
                      Reset
                    </Button>
                  ) : null}
                </div>

                <Accordion type="multiple" defaultValue={["rating", "rate", "availability", "verification", "skills"]} className="w-full">
                  <AccordionItem value="rating" className="px-5">
                    <AccordionTrigger className="py-5 text-[0.95rem] font-semibold hover:no-underline">Rating & Reviews</AccordionTrigger>
                    <AccordionContent className="space-y-3">
                      {RATING_OPTIONS.filter((option) => option.value !== "All").map((option) => (
                        <label key={option.value} className="flex cursor-pointer items-center gap-3 text-sm text-foreground/88">
                          <Checkbox
                            checked={draftFilters.rating === option.value}
                            onCheckedChange={(checked) => setDraftFilters((prev) => ({ ...prev, rating: checked ? option.value : "All" }))}
                          />
                          <span>{option.label}</span>
                        </label>
                      ))}
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="rate" className="px-5">
                    <AccordionTrigger className="py-5 text-[0.95rem] font-semibold hover:no-underline">Hourly Rate</AccordionTrigger>
                    <AccordionContent className="space-y-4">
                      <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
                        <Slider
                          value={[draftFilters.maxRate]}
                          min={75}
                          max={DEFAULT_PROVIDER_RATE_CAP}
                          step={25}
                          onValueChange={([value]) => setDraftFilters((prev) => ({ ...prev, maxRate: value }))}
                        />
                        <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
                          <span>$75</span>
                          <span className="font-semibold text-foreground">{formatRateCapLabel(draftFilters.maxRate)}</span>
                        </div>
                      </div>
                      <button type="button" className="text-xs font-semibold uppercase tracking-[0.14em] text-primary" onClick={() => setDraftFilters((prev) => ({ ...prev, maxRate: DEFAULT_PROVIDER_RATE_CAP }))}>
                        Any hourly rate
                      </button>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="availability" className="px-5">
                    <AccordionTrigger className="py-5 text-[0.95rem] font-semibold hover:no-underline">Availability</AccordionTrigger>
                    <AccordionContent className="space-y-3">
                      <label className="flex cursor-pointer items-center gap-3 text-sm text-foreground/88">
                        <Checkbox
                          checked={draftFilters.availability === "available"}
                          onCheckedChange={(checked) => setDraftFilters((prev) => ({ ...prev, availability: checked ? "available" : "all" }))}
                        />
                        <span className="flex-1">Available now</span>
                        <span className="text-xs font-medium text-muted-foreground">{availableNowCount}</span>
                      </label>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="verification" className="px-5">
                    <AccordionTrigger className="py-5 text-[0.95rem] font-semibold hover:no-underline">Verification</AccordionTrigger>
                    <AccordionContent className="space-y-3">
                      <label className="flex cursor-pointer items-center gap-3 text-sm text-foreground/88">
                        <Checkbox
                          checked={draftFilters.verifiedOnly === "true"}
                          onCheckedChange={(checked) => setDraftFilters((prev) => ({ ...prev, verifiedOnly: checked ? "true" : "false" }))}
                        />
                        <span className="flex-1">Verified providers only</span>
                        <span className="text-xs font-medium text-muted-foreground">{totalVerifiedProviderCount}</span>
                      </label>
                    </AccordionContent>
                  </AccordionItem>

                  <AccordionItem value="skills" className="border-b-0 px-5">
                    <AccordionTrigger className="py-5 text-[0.95rem] font-semibold hover:no-underline">Skills</AccordionTrigger>
                    <AccordionContent className="space-y-3">
                      {providerCategoryCounts.map(([categoryName, count]) => (
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
                </Accordion>

                <div className="border-t border-border/60 px-5 py-4">
                  <Button className="w-full rounded-xl bg-[linear-gradient(90deg,#ff3b30_0%,#ff8a00_100%)] text-white hover:opacity-95" onClick={applyFilters} disabled={!hasDraftChanges}>
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
                  <h2 className="text-lg font-semibold tracking-[-0.03em] text-foreground">Refine providers</h2>
                  <p className="mt-1 text-sm text-muted-foreground">Keep the shortlist clear on smaller screens.</p>
                </div>
                {hasActiveFilters ? <span className="info-chip">{activeFilterCount} active</span> : null}
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <Select value={draftFilters.category} onValueChange={(value) => setDraftFilters((prev) => ({ ...prev, category: value }))}>
                  <SelectTrigger className="h-11 rounded-lg border-border/60 bg-background">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={draftFilters.rating} onValueChange={(value) => setDraftFilters((prev) => ({ ...prev, rating: value }))}>
                  <SelectTrigger className="h-11 rounded-lg border-border/60 bg-background">
                    <SelectValue placeholder="Minimum rating" />
                  </SelectTrigger>
                  <SelectContent>
                    {RATING_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={draftFilters.experience} onValueChange={(value) => setDraftFilters((prev) => ({ ...prev, experience: value }))}>
                  <SelectTrigger className="h-11 rounded-lg border-border/60 bg-background">
                    <SelectValue placeholder="Experience level" />
                  </SelectTrigger>
                  <SelectContent>
                    {EXPERIENCE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={draftFilters.radius} onValueChange={(value) => setDraftFilters((prev) => ({ ...prev, radius: value }))} disabled={!draftFilters.zipcode}>
                  <SelectTrigger className="h-11 rounded-lg border-border/60 bg-background">
                    <SelectValue placeholder="Distance" />
                  </SelectTrigger>
                  <SelectContent>
                    {DISTANCE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-foreground">Hourly rate</span>
                  <span className="text-muted-foreground">{formatRateCapLabel(draftFilters.maxRate)}</span>
                </div>
                <Slider
                  value={[draftFilters.maxRate]}
                  min={75}
                  max={DEFAULT_PROVIDER_RATE_CAP}
                  step={25}
                  onValueChange={([value]) => setDraftFilters((prev) => ({ ...prev, maxRate: value }))}
                />
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <Button type="button" variant={draftFilters.verifiedOnly === "true" ? "default" : "outline"} className="rounded-lg" onClick={() => setDraftFilters((prev) => ({ ...prev, verifiedOnly: prev.verifiedOnly === "true" ? "false" : "true" }))}>
                  Verified only
                </Button>
                <Button type="button" variant={draftFilters.availability === "available" ? "default" : "outline"} className="rounded-lg" onClick={() => setDraftFilters((prev) => ({ ...prev, availability: prev.availability === "available" ? "all" : "available" }))}>
                  Available now
                </Button>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <Button className="rounded-lg px-5" onClick={applyFilters} disabled={!hasDraftChanges}>Apply filters</Button>
                <Button variant="outline" className="rounded-lg border-border/60 px-5" onClick={clearFilters}>Reset</Button>
              </div>
            </section>

            {zipCode && sortedProviders.length === 0 && !loading && (
              <p className="px-1 text-xs text-amber-700">No providers found in this area yet. Try expanding the radius or removing location.</p>
            )}

            {fetchError && (
              <div className="rounded-xl border border-rose-200/80 bg-rose-50/90 px-4 py-3 text-sm text-rose-700">
                {fetchError}
              </div>
            )}

            <section className="space-y-4">
              <div className="browse-summary-card">
                <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                  <div>
                    <h2 className="text-[1.8rem] font-semibold tracking-[-0.05em] text-foreground">All Providers</h2>
                    <p className="mt-1 text-sm text-muted-foreground">{sortedProviders.length} providers found</p>
                    <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">Compare response time, hourly rate, recent reviews, and verification without losing your filter context.</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="browse-hero-chip hidden sm:inline-flex">{verifiedProviderCount} verified</span>
                    <span className="browse-hero-chip hidden lg:inline-flex">{availableNowCount} available now</span>
                    <Select value={providerSort} onValueChange={setProviderSort}>
                      <SelectTrigger className="h-11 w-[12.5rem] rounded-lg border-border/60 bg-background">
                        <SelectValue placeholder="Sort providers" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="best_match">Best match</SelectItem>
                        <SelectItem value="rating">Highest rated</SelectItem>
                        <SelectItem value="reviews">Most reviewed</SelectItem>
                        <SelectItem value="experience">Most experienced</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {hasActiveFilters ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {searchTerm ? <Badge variant="outline" className="browse-active-chip">Search: {searchTerm}</Badge> : null}
                    {selectedCategory !== "All" ? <Badge variant="outline" className="browse-active-chip">{selectedCategory}</Badge> : null}
                    {zipCode ? <Badge variant="outline" className="browse-active-chip">{zipCode} ({distance} mi)</Badge> : null}
                    {rating !== "All" ? <Badge variant="outline" className="browse-active-chip">Rating {rating}+</Badge> : null}
                    {maxRate < DEFAULT_PROVIDER_RATE_CAP ? <Badge variant="outline" className="browse-active-chip">{formatRateCapLabel(maxRate)}/hr</Badge> : null}
                    {availability === "available" ? <Badge variant="outline" className="browse-active-chip">Available now</Badge> : null}
                    {verifiedOnly === "true" ? <Badge variant="outline" className="browse-active-chip">Verified only</Badge> : null}
                    {experience !== "All" ? <Badge variant="outline" className="browse-active-chip">{EXPERIENCE_OPTIONS.find((option) => option.value === experience)?.label || experience}</Badge> : null}
                  </div>
                ) : null}
              </div>

              <section className="space-y-5">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : sortedProviders.length === 0 ? (
              <div className="browse-empty-state">
                <div className="browse-empty-state-icon">
                  <Users className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-semibold tracking-[-0.03em] text-foreground">No providers found</h3>
                <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
                  {zipCode 
                    ? "No providers found in this location. Try expanding the search radius or searching without location."
                    : "Try adjusting your search or filters"}
                </p>
                <div className="mt-6 flex flex-wrap justify-center gap-3">
                  {hasActiveFilters ? (
                    <Button onClick={clearFilters} variant="outline" className="rounded-lg">
                      Clear All Filters
                    </Button>
                  ) : null}
                  {zipCode ? (
                    <Button onClick={() => updateSearchParams({ zipcode: "", radius: "25" })} variant="ghost" className="rounded-lg">
                      Search Without Location
                    </Button>
                  ) : null}
                </div>
                <p className="mt-4 text-xs uppercase tracking-[0.18em] text-muted-foreground">Try widening the area, raising the rate cap, or removing verification-only.</p>
              </div>
            ) : (
              <div className={resultsContainerClassName}>
                {sortedProviders.map((provider) => (
                  <Card 
                    key={provider.id} 
                    className="result-card-surface cursor-pointer group overflow-hidden border border-border/60 shadow-[0_24px_60px_-48px_rgba(15,23,42,0.24)] transition-all duration-200 hover:-translate-y-0.5"
                    onClick={() => navigate(`/providers/${provider.id}`)}
                  >
                    <CardContent className="p-4 sm:p-5 lg:p-6">
                      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,0.9fr)]">
                        <div className="space-y-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex min-w-0 items-start gap-4">
                              <Avatar className="h-20 w-20 rounded-xl ring-1 ring-border/70 shadow-sm sm:h-24 sm:w-24">
                                <AvatarImage src={provider.profile_image} />
                                <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                                  {provider.full_name?.charAt(0)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <h3 className="truncate text-xl font-semibold tracking-[-0.04em] text-foreground transition-colors group-hover:text-primary sm:text-[1.4rem]">
                                    {provider.full_name}
                                  </h3>
                                  {provider.provider_profile?.is_verified && (
                                    <CheckCircle className="w-4 h-4 text-primary" />
                                  )}
                                </div>
                                <p className="mt-1 truncate text-sm font-medium text-foreground/80">{getCompanyName(provider)}</p>
                                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-muted-foreground">
                                  <span className="inline-flex items-center gap-1 rounded-lg bg-muted px-2.5 py-1 font-medium text-foreground/80">
                                    <Briefcase className="h-3.5 w-3.5" />
                                    {getProviderCategory(provider)}
                                  </span>
                                  <span className="inline-flex items-center gap-1">
                                    <MapPin className="h-3.5 w-3.5" />
                                    {getProviderLocation(provider)}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 self-start">
                              {user && (
                                <button
                                  onClick={(e) => toggleFavorite(provider.id, e)}
                                  className="rounded-lg border border-border/60 bg-background/90 p-2 shadow-sm transition-colors hover:border-primary/20 hover:bg-primary/5"
                                >
                                  <Heart 
                                    className={`w-4 h-4 ${favoriteIds.has(provider.id) ? 'fill-red-500 text-red-500' : 'text-muted-foreground'}`} 
                                  />
                                </button>
                              )}
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <Badge className="market-card-chip market-card-chip-accent">
                              <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                              {provider.avg_rating > 0 ? provider.avg_rating.toFixed(1) : "New"}
                              <span className="text-muted-foreground">{formatReviewCount(provider.total_reviews)}</span>
                            </Badge>
                            {(provider.provider_profile?.is_verified || provider.document_verified) && (
                              <Badge className="market-card-chip">
                                <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                                Verified
                              </Badge>
                            )}
                            {provider.document_verified && (
                              <Badge className="market-card-chip">
                                <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
                                ID checked
                              </Badge>
                            )}
                            {(provider.provider_profile?.licenses || []).length > 0 && (
                              <Badge className="market-card-chip">
                                <FileText className="h-3.5 w-3.5 text-primary" />
                                Licensed
                              </Badge>
                            )}
                            <Badge className="market-card-chip">
                              <Clock3 className="h-3.5 w-3.5 text-primary" />
                              {provider.provider_profile?.available ? "Available now" : "Schedule check needed"}
                            </Badge>
                          </div>

                          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                            <div className="info-tile">
                              <p className="detail-kicker">Experience</p>
                              <p className="mt-2 text-sm font-semibold text-foreground">
                                {getExperienceYears(provider) > 0 ? `${getExperienceYears(provider)} years` : "Newly listed"}
                              </p>
                            </div>
                            <div className="info-tile">
                              <p className="detail-kicker">Completed jobs</p>
                              <p className="mt-2 text-sm font-semibold text-foreground">{provider.completed_projects || 0} finished</p>
                            </div>
                            <div className="info-tile">
                              <p className="detail-kicker">Typical pricing</p>
                              <p className="mt-2 text-sm font-semibold text-foreground">{getTypicalPriceLabel(provider)}</p>
                            </div>
                            <div className="info-tile">
                              <p className="detail-kicker">Starting price</p>
                              <p className="mt-2 text-sm font-semibold text-foreground">{getStartingPriceLabel(provider)}</p>
                            </div>
                          </div>

                          <div className="grid gap-3 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
                            <div className="rounded-xl border border-border/60 bg-muted/35 p-4">
                              <div className="flex items-center justify-between gap-3">
                                <p className="detail-kicker">Featured review</p>
                                {provider.featuredReview?.rating ? (
                                  <span className="inline-flex items-center gap-1 text-sm font-semibold text-foreground">
                                    {provider.featuredReview.rating.toFixed(1)}
                                    <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                                  </span>
                                ) : null}
                              </div>
                              <p className="mt-3 text-sm leading-6 text-muted-foreground line-clamp-4">
                                {getFeaturedReviewPreview(provider.featuredReview)}
                              </p>
                              {provider.featuredReview?.reviewer_name && (
                                <p className="mt-3 text-xs font-semibold uppercase tracking-[0.16em] text-foreground/75">
                                  {provider.featuredReview.reviewer_name}
                                  {provider.featuredReview.project_title ? ` • ${provider.featuredReview.project_title}` : ""}
                                </p>
                              )}
                            </div>

                            <div className="rounded-xl border border-border/60 bg-white p-4">
                              <p className="detail-kicker">Provider overview</p>
                              <p className="mt-3 text-sm leading-6 text-muted-foreground line-clamp-5">
                                {provider.provider_profile?.bio || `${provider.full_name} is ready to review your project scope and share a custom quote.`}
                              </p>
                              <div className="mt-4 flex flex-wrap gap-2">
                                {(provider.provider_profile?.skills || []).slice(0, 4).map((skill) => (
                                  <Badge key={`${provider.id}-${skill}`} className="market-card-chip">
                                    {skill}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <div className="rounded-xl border border-border/60 bg-muted/35 p-4">
                            <div className="flex items-center justify-between gap-3">
                              <p className="detail-kicker">Portfolio preview</p>
                              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                                {(provider.portfolioPreview || []).length} items
                              </span>
                            </div>
                            <div className="mt-3 grid grid-cols-3 gap-2">
                              {(provider.portfolioPreview || []).slice(0, 6).map((item) => (
                                <div key={item.id} className="overflow-hidden rounded-xl border border-border/60 bg-slate-100">
                                  {item.images?.[0] ? (
                                    <img src={item.images[0]} alt={item.title} className="h-20 w-full object-cover sm:h-24" />
                                  ) : (
                                    <div className="flex h-20 items-center justify-center bg-slate-100 px-2 text-center text-[11px] font-semibold text-muted-foreground sm:h-24">
                                      {item.title}
                                    </div>
                                  )}
                                </div>
                              ))}
                              {!(provider.portfolioPreview || []).length && (
                                <div className="col-span-3 rounded-xl border border-dashed border-border/60 bg-white px-4 py-8 text-center text-sm text-muted-foreground">
                                  Portfolio images appear on the full profile.
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="rounded-xl border border-border/60 bg-white p-4">
                            <div className="grid gap-2 text-sm">
                              <div className="flex items-center justify-between gap-3">
                                <span className="text-muted-foreground">Licenses</span>
                                <span className="font-medium text-foreground text-right">
                                  {(provider.provider_profile?.licenses || []).length > 0 ? provider.provider_profile.licenses[0] : "Shared on profile"}
                                </span>
                              </div>
                              <div className="flex items-center justify-between gap-3">
                                <span className="text-muted-foreground">Document check</span>
                                <span className="font-medium text-foreground">{provider.document_verified ? "Completed" : "Not published"}</span>
                              </div>
                              <div className="flex items-center justify-between gap-3">
                                <span className="text-muted-foreground">Response time</span>
                                <span className="font-medium text-foreground">{formatAverageResponseTime(provider.avg_response_time_minutes)}</span>
                              </div>
                            </div>

                            <div className="mt-4 grid gap-2 sm:grid-cols-3">
                              <Button size="sm" className="rounded-lg" onClick={(e) => { e.stopPropagation(); navigate(`/providers/${provider.id}`); }}>
                                View Profile
                                <ArrowRight className="ml-2 h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="rounded-lg"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/providers/${provider.id}`);
                                }}
                              >
                                <DollarSign className="mr-2 h-4 w-4" />
                                Request Quote
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="market-card-ghost-button rounded-lg"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(user ? `/messages/${provider.id}` : "/auth");
                                }}
                              >
                                <MessageSquare className="mr-2 h-4 w-4" />
                                Message Provider
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
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
