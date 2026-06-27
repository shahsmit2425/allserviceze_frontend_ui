import { lazy, Suspense, useEffect, useState } from "react";
import logger from "@/utils/logger";
import { useNavigate } from "react-router-dom";
import { AppShell } from "../components/AppShell";
import { AddressAutocomplete } from "../components/AddressAutocomplete";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { Label } from "../components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Badge } from "../components/ui/badge";
import { useAuth } from "../context/AuthContext";
import { toast } from "sonner";
import axios from "axios";
import { LIMITS } from "../lib/validation";
import { 
  Building2, Globe, Facebook, Instagram, Twitter, Linkedin, Youtube,
  MapPin, Clock, Award, FileCheck, Plus, Loader2, Save,
  Camera, Image as ImageIcon, Star, X, CheckCircle2, TrendingUp, ShieldCheck, ChevronRight
} from "lucide-react";

const API_URL = `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'}/api`;
const LazyProviderBusinessProfileSecondaryTabs = lazy(() => import("./ProviderBusinessProfileSecondaryTabs"));

const DAYS_OF_WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const getDefaultAvailability = () => DAYS_OF_WEEK.map((_, idx) => ({
  day_of_week: idx,
  start_time: "09:00",
  end_time: "17:00",
  is_available: idx < 5,
}));

const DeferredTabFallback = ({ label }) => (
  <Card className="form-shell border-0">
    <CardContent className="flex items-center justify-center py-12 text-sm text-muted-foreground">
      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading {label}...
    </CardContent>
  </Card>
);

const mapProviderProfileToState = (profile = {}) => ({
  business_name: profile.business_name || "",
  business_description: profile.business_description || "",
  website: profile.website || "",
  social_facebook: profile.social_facebook || "",
  social_instagram: profile.social_instagram || "",
  social_twitter: profile.social_twitter || "",
  social_linkedin: profile.social_linkedin || "",
  social_youtube: profile.social_youtube || "",
  business_address: profile.business_address || "",
  business_zip_code: profile.business_zip_code || "",
  service_areas: profile.service_areas || [],
  certifications: profile.certifications || [],
  licenses: profile.licenses || [],
});

export default function ProviderBusinessProfile() {
  const navigate = useNavigate();
  const { user, getAuthHeader } = useAuth();
  const pageTheme = "provider";
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveState, setSaveState] = useState("idle");
  const [lastSavedSnapshot, setLastSavedSnapshot] = useState("");
  const [activeTab, setActiveTab] = useState("business");
  const [providerStats, setProviderStats] = useState(null);
  
  // Business Profile State
  const [businessProfile, setBusinessProfile] = useState({
    business_name: "",
    business_description: "",
    website: "",
    social_facebook: "",
    social_instagram: "",
    social_twitter: "",
    social_linkedin: "",
    social_youtube: "",
    business_address: "",
    business_zip_code: "",
    service_areas: [],
    certifications: [],
    licenses: []
  });
  
  // Availability State
  const [availability, setAvailability] = useState(getDefaultAvailability);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [availabilityLoaded, setAvailabilityLoaded] = useState(false);
  
  // Portfolio State
  const [portfolio, setPortfolio] = useState([]);
  const [newPortfolioItem, setNewPortfolioItem] = useState({
    title: "",
    description: "",
    category: "",
    images: [],
    completion_date: "",
    location: ""
  });
  const [showPortfolioForm, setShowPortfolioForm] = useState(false);
  const [editingPortfolioId, setEditingPortfolioId] = useState(null);
  const [portfolioLoading, setPortfolioLoading] = useState(false);
  const [portfolioLoaded, setPortfolioLoaded] = useState(false);
  
  // Google Reviews State
  const [googleReviews, setGoogleReviews] = useState([]);
  const [newGoogleReview, setNewGoogleReview] = useState({
    reviewer_name: "",
    rating: 5,
    review_text: "",
    review_date: "",
    screenshot_url: ""
  });
  const [showGoogleReviewForm, setShowGoogleReviewForm] = useState(false);
  const [googleReviewsLoading, setGoogleReviewsLoading] = useState(false);
  const [googleReviewsLoaded, setGoogleReviewsLoaded] = useState(false);
  
  // New service area / certification input
  const [newServiceArea, setNewServiceArea] = useState("");
  const [newCertification, setNewCertification] = useState("");
  const [newLicense, setNewLicense] = useState("");

  // Avatar upload state
  const [avatarPreview, setAvatarPreview] = useState("");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  useEffect(() => {
    if (user?.role !== "provider") {
      navigate("/dashboard");
      return;
    }

    setAvatarPreview(user?.avatar || "");
    setAvailability(getDefaultAvailability());
    setAvailabilityLoaded(false);
    setPortfolio([]);
    setPortfolioLoaded(false);
    setGoogleReviews([]);
    setGoogleReviewsLoaded(false);
    fetchBusinessProfile();
    fetchProviderStats();
    fetchPortfolio();
    fetchGoogleReviews();
  }, [navigate, user]);

  useEffect(() => {
    if (!user || activeTab === "business") {
      return;
    }

    if (activeTab === "availability" && !availabilityLoaded && !availabilityLoading) {
      fetchAvailability();
    }

    if (activeTab === "portfolio" && !portfolioLoaded && !portfolioLoading) {
      fetchPortfolio();
    }

    if (activeTab === "google-reviews" && !googleReviewsLoaded && !googleReviewsLoading) {
      fetchGoogleReviews();
    }
  }, [
    activeTab,
    availabilityLoaded,
    availabilityLoading,
    googleReviewsLoaded,
    googleReviewsLoading,
    portfolioLoaded,
    portfolioLoading,
    user,
  ]);

  const fetchBusinessProfile = async () => {
    const storedProviderProfile = user?.provider_profile;

    if (storedProviderProfile) {
      const mappedProfile = mapProviderProfileToState(storedProviderProfile);
      setBusinessProfile(mappedProfile);
      setLastSavedSnapshot(JSON.stringify(mappedProfile));
      setLoading(false);
      return;
    }

    try {
      const profileRes = await axios.get(`${API_URL}/auth/me`, { headers: getAuthHeader() });
      const profile = (profileRes.data.user ?? profileRes.data).provider_profile || {};
      const mappedProfile = mapProviderProfileToState(profile);
      setBusinessProfile(mappedProfile);
      setLastSavedSnapshot(JSON.stringify(mappedProfile));
    } catch (error) {
      logger.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProviderStats = async () => {
    try {
      const response = await axios.get(`${API_URL}/stats/provider`, { headers: getAuthHeader() });
      setProviderStats(response.data || null);
    } catch (error) {
      logger.error("Error fetching provider stats:", error);
      setProviderStats(null);
    }
  };

  const fetchAvailability = async () => {
    if (!user) {
      return;
    }

    setAvailabilityLoading(true);
    try {
      const response = await axios.get(`${API_URL}/providers/${user.id}/availability`);
      if (response.data.slots?.length > 0) {
        setAvailability(response.data.slots);
      }
      setAvailabilityLoaded(true);
    } catch (error) {
      logger.error("Error fetching availability:", error);
      setAvailabilityLoaded(true);
    } finally {
      setAvailabilityLoading(false);
    }
  };

  const fetchPortfolio = async () => {
    if (!user) {
      return;
    }

    setPortfolioLoading(true);
    try {
      const response = await axios.get(`${API_URL}/portfolio/${user.id}`);
      setPortfolio(response.data || []);
      setPortfolioLoaded(true);
    } catch (error) {
      logger.error("Error fetching portfolio:", error);
      setPortfolio([]);
      setPortfolioLoaded(true);
    } finally {
      setPortfolioLoading(false);
    }
  };

  const fetchGoogleReviews = async () => {
    if (!user) {
      return;
    }

    setGoogleReviewsLoading(true);
    try {
      const response = await axios.get(`${API_URL}/google-reviews/${user.id}`);
      setGoogleReviews(response.data || []);
      setGoogleReviewsLoaded(true);
    } catch (error) {
      logger.error("Error fetching Google reviews:", error);
      setGoogleReviews([]);
      setGoogleReviewsLoaded(true);
    } finally {
      setGoogleReviewsLoading(false);
    }
  };

  const handleSaveBusinessProfile = async () => {
    setSaving(true);
    try {
      const params = new URLSearchParams();
      Object.entries(businessProfile).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          value.forEach(v => params.append(key, v));
        } else if (value) {
          params.append(key, value);
        }
      });
      
      await axios.patch(`${API_URL}/providers/business-profile?${params.toString()}`, {}, { headers: getAuthHeader() });
      const snapshot = JSON.stringify(businessProfile);
      setLastSavedSnapshot(snapshot);
      setSaveState("saved");
      toast.success("Business profile updated!");
    } catch (error) {
      setSaveState("error");
      toast.error("Failed to update business profile");
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB');
      return;
    }

    // Show preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatarPreview(reader.result);
    };
    reader.readAsDataURL(file);

    // Upload immediately
    setUploadingAvatar(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post(
        `${API_URL}/upload/profile-image`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            ...getAuthHeader()
          },
          withCredentials: true
        }
      );

      if (response.data.url) {
        setAvatarPreview(response.data.url);
        toast.success('Profile photo updated successfully');
      }
    } catch (error) {
      logger.error('Avatar upload error:', error);
      toast.error(error.response?.data?.detail || 'Failed to upload profile photo');
      setAvatarPreview(user?.avatar || "");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSaveAvailability = async () => {
    setSaving(true);
    try {
      await axios.post(`${API_URL}/providers/availability`, availability, { headers: getAuthHeader() });
      toast.success("Availability updated!");
    } catch (error) {
      toast.error("Failed to update availability");
    } finally {
      setSaving(false);
    }
  };

  const handleAddPortfolioItem = async () => {
    if (!newPortfolioItem.title || !newPortfolioItem.description) {
      toast.error("Please fill in title and description");
      return;
    }
    
    setSaving(true);
    try {
      if (editingPortfolioId) {
        // Update existing portfolio item
        const response = await axios.put(`${API_URL}/portfolio/${editingPortfolioId}`, newPortfolioItem, { headers: getAuthHeader() });
        setPortfolio(portfolio.map(p => p.id === editingPortfolioId ? response.data : p));
        toast.success("Portfolio item updated!");
      } else {
        // Add new portfolio item
        const response = await axios.post(`${API_URL}/portfolio`, newPortfolioItem, { headers: getAuthHeader() });
        setPortfolio([response.data, ...portfolio]);
        toast.success("Portfolio item added!");
      }
      setNewPortfolioItem({ title: "", description: "", category: "", images: [], completion_date: "", location: "" });
      setShowPortfolioForm(false);
      setEditingPortfolioId(null);
    } catch (error) {
      toast.error(editingPortfolioId ? "Failed to update portfolio item" : "Failed to add portfolio item");
    } finally {
      setSaving(false);
    }
  };

  const handleEditPortfolioItem = (item) => {
    setNewPortfolioItem({
      title: item.title,
      description: item.description,
      category: item.category,
      images: item.images || [],
      completion_date: item.completion_date,
      location: item.location || ""
    });
    setEditingPortfolioId(item.id);
    setShowPortfolioForm(true);
    // Scroll to form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setNewPortfolioItem({ title: "", description: "", category: "", images: [], completion_date: "", location: "" });
    setShowPortfolioForm(false);
    setEditingPortfolioId(null);
  };

  const handleDeletePortfolioItem = async (itemId) => {
    try {
      await axios.delete(`${API_URL}/portfolio/${itemId}`, { headers: getAuthHeader() });
      setPortfolio(portfolio.filter(p => p.id !== itemId));
      toast.success("Portfolio item deleted");
    } catch (error) {
      toast.error("Failed to delete portfolio item");
    }
  };

  const handleAddGoogleReview = async () => {
    if (!newGoogleReview.reviewer_name || !newGoogleReview.review_text) {
      toast.error("Please fill in reviewer name and review text");
      return;
    }
    
    setSaving(true);
    try {
      const response = await axios.post(`${API_URL}/google-reviews`, newGoogleReview, { headers: getAuthHeader() });
      setGoogleReviews([response.data, ...googleReviews]);
      setNewGoogleReview({ reviewer_name: "", rating: 5, review_text: "", review_date: "", screenshot_url: "" });
      setShowGoogleReviewForm(false);
      toast.success("Google review added!");
    } catch (error) {
      toast.error("Failed to add Google review");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteGoogleReview = async (reviewId) => {
    try {
      await axios.delete(`${API_URL}/google-reviews/${reviewId}`, { headers: getAuthHeader() });
      setGoogleReviews(googleReviews.filter(r => r.id !== reviewId));
      toast.success("Google review deleted");
    } catch (error) {
      toast.error("Failed to delete Google review");
    }
  };

  const handleImageUpload = async (e, type) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const formData = new FormData();
    formData.append("file", file);
    
    try {
      const response = await axios.post(`${API_URL}/upload/image`, formData, {
        headers: { ...getAuthHeader(), "Content-Type": "multipart/form-data" }
      });
      
      if (type === "portfolio") {
        setNewPortfolioItem(prev => ({
          ...prev,
          images: [...prev.images, response.data.url]
        }));
      } else if (type === "google_review") {
        setNewGoogleReview(prev => ({
          ...prev,
          screenshot_url: response.data.url
        }));
      }
      toast.success("Image uploaded!");
    } catch (error) {
      toast.error("Failed to upload image");
    }
  };

  const addToList = (field, value, setValue) => {
    if (!value.trim()) return;
    setBusinessProfile(prev => ({
      ...prev,
      [field]: [...prev[field], value.trim()]
    }));
    setValue("");
  };

  const removeFromList = (field, index) => {
    setBusinessProfile(prev => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index)
    }));
  };

  const proofItemCount = (portfolioLoaded ? portfolio.length : 0) + (googleReviewsLoaded ? googleReviews.length : 0);
  const proofSummary = (portfolioLoaded || googleReviewsLoaded) ? `${proofItemCount} items` : "Load on demand";
  const businessInfoComplete = Boolean(
    businessProfile.business_name?.trim()
    && businessProfile.business_description?.trim()
    && businessProfile.business_address?.trim()
  );
  const serviceAreasComplete = businessProfile.service_areas.length > 0;
  const portfolioComplete = portfolio.length > 0;
  const reviewsComplete = Number(providerStats?.total_reviews || 0) > 0 || googleReviews.length > 0;
  const verificationComplete = Boolean(user?.document_verified);
  const profileChecklist = [
    { key: "business", label: "Business Information", complete: businessInfoComplete },
    { key: "verification", label: "Verification", complete: verificationComplete },
    { key: "service_areas", label: "Service Areas", complete: serviceAreasComplete },
    { key: "portfolio", label: "Portfolio Photos", complete: portfolioComplete },
    { key: "reviews", label: "Reviews", complete: reviewsComplete },
  ];
  const completedChecklistCount = profileChecklist.filter((item) => item.complete).length;
  const incompleteChecklistCount = profileChecklist.length - completedChecklistCount;
  const profileStrength = Math.round((completedChecklistCount / profileChecklist.length) * 100);
  const trustChecks = [
    { label: "Identity Verified", complete: Boolean(user?.document_verified) },
    { label: "Documents Verified", complete: user?.stripe_verification_status === "verified" || Boolean(user?.verification_completed_at) },
    { label: "Business Information", complete: businessInfoComplete },
    { label: "Admin Review", complete: Boolean(user?.approved_by_admin) },
  ];
  const trustScore = Math.round((trustChecks.filter((item) => item.complete).length / trustChecks.length) * 100);
  const visibilityImpact = incompleteChecklistCount * 6;
  const totalBids = Number(providerStats?.total_bids) || 0;
  const awardedBids = Number(providerStats?.awarded_bids) || 0;
  const winRate = totalBids > 0 ? `${((awardedBids / totalBids) * 100).toFixed(1)}%` : "0%";
  const reviewProofCount = Number(providerStats?.total_reviews || 0) + googleReviews.length;
  const performanceMetrics = [
    { label: "Bids Submitted", value: totalBids, detail: "Real marketplace proposals sent" },
    { label: "Projects Won", value: Number(providerStats?.projects_won) || 0, detail: "Customers who hired you" },
    { label: "Win Rate", value: winRate, detail: "Awarded bids vs submitted bids" },
    { label: "Coverage Reach", value: businessProfile.service_areas.length || 0, detail: "Service areas listed publicly" },
  ];
  const isBusinessProfileDirty = activeTab === "business" && JSON.stringify(businessProfile) !== lastSavedSnapshot;
  const saveIndicatorLabel = saving ? "Saving..." : isBusinessProfileDirty ? "Save Changes" : "Changes Saved";
  const primaryPortfolioImages = portfolio.flatMap((item) => item.images || []).slice(0, 12);

  useEffect(() => {
    if (isBusinessProfileDirty) {
      setSaveState("dirty");
    } else if (lastSavedSnapshot) {
      setSaveState("saved");
    }
  }, [isBusinessProfileDirty, lastSavedSnapshot]);

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
    <AppShell theme={pageTheme} className="bg-background" contentClassName="pb-12" data-testid="provider-business-profile">
      <div className="page-shell safe-bottom-shell py-6 sm:py-8">
        <section className="page-hero mb-5 sm:mb-6">
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_22rem] xl:items-start">
            <div>
              <span className="page-kicker">
                <Building2 className="h-3.5 w-3.5" /> Business Profile
              </span>
              <h1 className="heading-2 mt-4 text-foreground">Turn your profile into a hiring and trust surface.</h1>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
                Visibility, proof, coverage, and trust signals should help homeowners decide faster and help your business win more work.
              </p>
            </div>

            <div className="form-shell border-0 p-4 sm:p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="detail-kicker">Profile Strength</p>
                  <p className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-foreground">{profileStrength}%</p>
                </div>
                <p className="text-sm text-muted-foreground">Complete {incompleteChecklistCount} item{incompleteChecklistCount === 1 ? "" : "s"} to increase visibility</p>
              </div>
              <div className="mt-4 h-2.5 overflow-hidden rounded-lg bg-deep-navy-50">
                <div className="h-full rounded-lg bg-[linear-gradient(90deg,hsl(var(--primary))_0%,hsl(var(--secondary))_100%)]" style={{ width: `${profileStrength}%` }} />
              </div>
              <div className="mt-4 space-y-2">
                {profileChecklist.map((item) => (
                  <div key={item.key} className="flex items-center gap-3 text-sm">
                    <span className={`flex h-5 w-5 items-center justify-center rounded-lg ${item.complete ? "bg-emerald-100 text-emerald-700" : "bg-deep-navy-50 text-muted-foreground"}`}>
                      {item.complete ? <CheckCircle2 className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
                    </span>
                    <span className={item.complete ? "text-foreground" : "text-muted-foreground"}>{item.label}</span>
                  </div>
                ))}
              </div>
              <Button onClick={() => setActiveTab("business")} className="mt-5 w-full rounded-lg">Complete Profile</Button>
            </div>
          </div>
        </section>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6 grid w-full grid-cols-2 gap-2 rounded-xl border border-white/70 bg-white/80 p-1 shadow-sm sm:grid-cols-4">
            <TabsTrigger value="business" className="flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              Business Info
            </TabsTrigger>
            <TabsTrigger value="availability" className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Availability
            </TabsTrigger>
            <TabsTrigger value="portfolio" className="flex items-center gap-2">
              <ImageIcon className="w-4 h-4" />
              Portfolio
            </TabsTrigger>
            <TabsTrigger value="google-reviews" className="flex items-center gap-2">
              <Star className="w-4 h-4" />
              Google Reviews
            </TabsTrigger>
          </TabsList>

          {/* Business Info Tab */}
          <TabsContent value="business">
            <div className="space-y-6">
              <div className="grid gap-6 xl:grid-cols-[18rem_minmax(0,1fr)_20rem]">
                <div className="space-y-6">
                  <Card className="form-shell border-0">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-primary" />
                        Profile Performance
                      </CardTitle>
                      <CardDescription>Marketplace metrics available on your account today.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {performanceMetrics.map((metric) => (
                        <div key={metric.label} className="info-tile">
                          <p className="detail-kicker">{metric.label}</p>
                          <p className="mt-2 text-xl font-semibold tracking-[-0.04em] text-foreground">{metric.value}</p>
                          <p className="mt-1 text-xs text-muted-foreground">{metric.detail}</p>
                        </div>
                      ))}
                    </CardContent>
                  </Card>

                  <Card className="form-shell border-0">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <ShieldCheck className="w-5 h-5 text-primary" />
                        Trust Score
                      </CardTitle>
                      <CardDescription>Signals homeowners rely on before reaching out or accepting a quote.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-end justify-between gap-3">
                        <div>
                          <p className="text-3xl font-semibold tracking-[-0.05em] text-foreground">{trustScore}%</p>
                          <p className="mt-1 text-sm text-muted-foreground">Visibility impact: +{visibilityImpact}% when all missing trust items are complete.</p>
                        </div>
                        <Badge className={trustScore >= 75 ? "status-badge-success" : "status-badge-warning"}>{trustScore >= 75 ? "Strong" : "Growing"}</Badge>
                      </div>
                      <div className="space-y-2">
                        {trustChecks.map((item) => (
                          <div key={item.label} className="flex items-center justify-between gap-3 rounded-lg border border-border/70 bg-white px-3 py-2.5 text-sm">
                            <span className="text-foreground">{item.label}</span>
                            <span className={item.complete ? "text-emerald-700" : "text-amber-700"}>{item.complete ? "Complete" : "Pending"}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="space-y-6">
                  <Card className="form-shell border-0">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Building2 className="w-5 h-5" />
                        Business Information
                      </CardTitle>
                      <CardDescription>The main details customers use to evaluate and contact your business.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex flex-col gap-4 rounded-xl border border-white/70 bg-white/75 p-4 shadow-sm sm:flex-row sm:items-center">
                        <div className="relative">
                          {avatarPreview ? (
                            <img
                              src={avatarPreview}
                              alt="Profile"
                              className="w-24 h-24 rounded-lg object-cover border-2 border-muted"
                            />
                          ) : (
                            <div className="w-24 h-24 rounded-lg bg-muted flex items-center justify-center">
                              <Building2 className="w-10 h-10 text-muted-foreground" />
                            </div>
                          )}
                          {uploadingAvatar && (
                            <div className="absolute inset-0 bg-copper-600/50 rounded-lg flex items-center justify-center">
                              <Loader2 className="w-6 h-6 text-white animate-spin" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 space-y-2">
                          <div>
                            <Label>Profile Photo</Label>
                            <p className="mt-1 text-xs text-muted-foreground">JPG, PNG or GIF. Max 5MB.</p>
                          </div>
                          <input
                            type="file"
                            id="avatar-upload-profile"
                            accept="image/*"
                            onChange={handleAvatarUpload}
                            className="hidden"
                            disabled={uploadingAvatar}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={uploadingAvatar}
                            onClick={() => document.getElementById('avatar-upload-profile').click()}
                            className="rounded-lg bg-white/80"
                          >
                            {uploadingAvatar ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Uploading...
                              </>
                            ) : (
                              <>
                                <Camera className="w-4 h-4 mr-2" />
                                Change Photo
                              </>
                            )}
                          </Button>
                        </div>
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label>Business Name</Label>
                          <Input
                            placeholder="Your Business Name"
                            value={businessProfile.business_name}
                            onChange={(e) => setBusinessProfile(prev => ({ ...prev, business_name: e.target.value }))}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Website</Label>
                          <div className="relative">
                            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                              placeholder="https://yourwebsite.com"
                              className="pl-10"
                              value={businessProfile.website}
                              onChange={(e) => setBusinessProfile(prev => ({ ...prev, website: e.target.value }))}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Business Description</Label>
                        <Textarea
                          placeholder="Describe your business, services, and what makes you unique..."
                          rows={4}
                          value={businessProfile.business_description}
                          maxLength={LIMITS.bio}
                          onChange={(e) => setBusinessProfile(prev => ({ ...prev, business_description: e.target.value.slice(0, LIMITS.bio) }))}
                        />
                        <p className={`text-xs text-right ${businessProfile.business_description?.length >= LIMITS.bio ? 'text-red-500' : 'text-muted-foreground'}`}>
                          {businessProfile.business_description?.length || 0}/{LIMITS.bio}
                        </p>
                      </div>

                      <div className="grid gap-4 md:grid-cols-3">
                        <div className="md:col-span-2 space-y-2">
                          <Label>Business Address</Label>
                          <AddressAutocomplete
                            value={businessProfile.business_address}
                            onChange={(value) => setBusinessProfile(prev => ({ ...prev, business_address: value }))}
                            onZipCodeChange={(zipCode) => setBusinessProfile(prev => ({ ...prev, business_zip_code: zipCode }))}
                            placeholder="123 Main St, City, State 12345"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Zip Code</Label>
                          <Input
                            placeholder="e.g., 02101"
                            value={businessProfile.business_zip_code}
                            onChange={(e) => {
                              const value = e.target.value.replace(/\D/g, '').slice(0, 5);
                              setBusinessProfile(prev => ({ ...prev, business_zip_code: value }));
                            }}
                            maxLength={5}
                          />
                          <p className="text-xs text-muted-foreground mt-1">Auto-fills when you select an address</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="form-shell border-0">
                    <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <ImageIcon className="w-5 h-5" />
                          Portfolio
                        </CardTitle>
                        <CardDescription>{primaryPortfolioImages.length} photo{primaryPortfolioImages.length === 1 ? "" : "s"} surfaced directly on your public proof layer.</CardDescription>
                      </div>
                      <Button variant="outline" className="rounded-lg bg-white/80" onClick={() => setActiveTab("portfolio")}>
                        {portfolio.length > 0 ? "Manage Portfolio" : "Upload Portfolio"}
                      </Button>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {primaryPortfolioImages.length > 0 ? (
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
                          {primaryPortfolioImages.slice(0, 12).map((image, index) => (
                            <img key={`${image}-${index}`} src={image} alt={`Portfolio ${index + 1}`} className="aspect-square w-full rounded-lg object-cover" />
                          ))}
                        </div>
                      ) : (
                        <div className="rounded-lg border border-dashed border-border/70 bg-white/80 p-5 text-sm text-muted-foreground">
                          Portfolio photos are one of the strongest conversion drivers on a marketplace profile. Add completed work to increase trust.
                        </div>
                      )}
                      <div className="flex items-center justify-between gap-3 rounded-lg border border-border/70 bg-white/70 px-4 py-3 text-sm">
                        <span className="text-muted-foreground">Portfolio projects</span>
                        <span className="font-semibold text-foreground">{portfolio.length}</span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="form-shell border-0">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <MapPin className="w-5 h-5" />
                        Coverage
                      </CardTitle>
                      <CardDescription>List the counties, towns, or regions where you actively quote and deliver work.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex flex-col gap-2 sm:flex-row">
                        <Input
                          placeholder="Add county or service area"
                          value={newServiceArea}
                          onChange={(e) => setNewServiceArea(e.target.value)}
                          onKeyPress={(e) => e.key === "Enter" && addToList("service_areas", newServiceArea, setNewServiceArea)}
                        />
                        <Button onClick={() => addToList("service_areas", newServiceArea, setNewServiceArea)} className="rounded-lg">
                          <Plus className="w-4 h-4 mr-2" />
                          Add County
                        </Button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {businessProfile.service_areas.length > 0 ? businessProfile.service_areas.map((area, idx) => (
                          <Badge key={idx} variant="secondary" className="flex items-center gap-1 rounded-lg px-3 py-1.5">
                            {area}
                            <button onClick={() => removeFromList("service_areas", idx)} className="ml-1 hover:text-destructive">
                              <X className="w-3 h-3" />
                            </button>
                          </Badge>
                        )) : (
                          <p className="text-sm text-muted-foreground">No coverage areas listed yet.</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="form-shell border-0">
                    <CardHeader>
                      <CardTitle>Social Media Links</CardTitle>
                      <CardDescription>Connect public channels that reinforce trust and social proof.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="relative">
                          <Facebook className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-600" />
                          <Input
                            placeholder="Facebook URL"
                            className="pl-10"
                            value={businessProfile.social_facebook}
                            onChange={(e) => setBusinessProfile(prev => ({ ...prev, social_facebook: e.target.value }))}
                          />
                        </div>
                        <div className="relative">
                          <Instagram className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-pink-600" />
                          <Input
                            placeholder="Instagram URL"
                            className="pl-10"
                            value={businessProfile.social_instagram}
                            onChange={(e) => setBusinessProfile(prev => ({ ...prev, social_instagram: e.target.value }))}
                          />
                        </div>
                        <div className="relative">
                          <Twitter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sky-500" />
                          <Input
                            placeholder="Twitter/X URL"
                            className="pl-10"
                            value={businessProfile.social_twitter}
                            onChange={(e) => setBusinessProfile(prev => ({ ...prev, social_twitter: e.target.value }))}
                          />
                        </div>
                        <div className="relative">
                          <Linkedin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-700" />
                          <Input
                            placeholder="LinkedIn URL"
                            className="pl-10"
                            value={businessProfile.social_linkedin}
                            onChange={(e) => setBusinessProfile(prev => ({ ...prev, social_linkedin: e.target.value }))}
                          />
                        </div>
                        <div className="relative md:col-span-2">
                          <Youtube className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-red-600" />
                          <Input
                            placeholder="YouTube Channel URL"
                            className="pl-10"
                            value={businessProfile.social_youtube}
                            onChange={(e) => setBusinessProfile(prev => ({ ...prev, social_youtube: e.target.value }))}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="space-y-6">
                  <Card className="glass-panel border-primary/20 bg-primary/5 shadow-none">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <FileCheck className="w-5 h-5 text-primary" />
                        Verification
                      </CardTitle>
                      <CardDescription>Track the approval signals customers notice before they book.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        {trustChecks.map((item) => (
                          <div key={item.label} className="flex items-center justify-between gap-3 rounded-lg border border-white/70 bg-white/80 px-4 py-3 text-sm shadow-sm">
                            <span className="text-foreground">{item.label}</span>
                            <span className={item.complete ? "text-emerald-700" : "text-amber-700"}>{item.complete ? "Verified" : item.label === "Admin Review" ? "In review" : "Pending"}</span>
                          </div>
                        ))}
                      </div>
                      <div className="info-tile">
                        <p className="detail-kicker">Visibility impact</p>
                        <p className="mt-2 text-lg font-semibold text-foreground">+{visibilityImpact}%</p>
                        <p className="mt-1 text-sm text-muted-foreground">Estimated lift available from unfinished trust and proof items.</p>
                      </div>
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate("/provider-verification")}
                          className="rounded-lg bg-white/80"
                        >
                          <FileCheck className="w-4 h-4 mr-2" />
                          {user?.document_verified ? "View Verification Status" : "Complete Verification"}
                        </Button>
                        <p className="text-xs text-muted-foreground">
                          {user?.document_verified
                            ? "Your verification is on file. Revisit this flow only if details change."
                            : "Complete identity verification to unlock the full provider workflow."}
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="form-shell border-0">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Award className="w-5 h-5" />
                        Licenses & Credentials
                      </CardTitle>
                      <CardDescription>Add the credentials that strengthen your public profile.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-4">
                        <Label>Certifications</Label>
                        <div className="flex flex-col gap-2 sm:flex-row">
                          <Input
                            placeholder="Add certification (e.g., EPA Certified)"
                            value={newCertification}
                            onChange={(e) => setNewCertification(e.target.value)}
                            onKeyPress={(e) => e.key === "Enter" && addToList("certifications", newCertification, setNewCertification)}
                          />
                          <Button onClick={() => addToList("certifications", newCertification, setNewCertification)} className="rounded-lg">
                            <Plus className="w-4 h-4" />
                          </Button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {businessProfile.certifications.map((cert, idx) => (
                            <Badge key={idx} className="flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700">
                              <Award className="w-3 h-3" />
                              {cert}
                              <button onClick={() => removeFromList("certifications", idx)} className="ml-1 hover:text-destructive">
                                <X className="w-3 h-3" />
                              </button>
                            </Badge>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-4">
                        <Label>Licenses</Label>
                        <div className="flex flex-col gap-2 sm:flex-row">
                          <Input
                            placeholder="Add license (e.g., State Contractor License #12345)"
                            value={newLicense}
                            onChange={(e) => setNewLicense(e.target.value)}
                            onKeyPress={(e) => e.key === "Enter" && addToList("licenses", newLicense, setNewLicense)}
                          />
                          <Button onClick={() => addToList("licenses", newLicense, setNewLicense)} className="rounded-lg">
                            <Plus className="w-4 h-4" />
                          </Button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {businessProfile.licenses.map((license, idx) => (
                            <Badge key={idx} className="flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-700">
                              <FileCheck className="w-3 h-3" />
                              {license}
                              <button onClick={() => removeFromList("licenses", idx)} className="ml-1 hover:text-destructive">
                                <X className="w-3 h-3" />
                              </button>
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="form-shell border-0">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Star className="w-5 h-5 text-yellow-500" />
                        Reviews & Recommendations
                      </CardTitle>
                      <CardDescription>Public proof that helps homeowners compare you with competing providers.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                        <div className="info-tile">
                          <p className="detail-kicker">Platform Reviews</p>
                          <p className="mt-2 text-xl font-semibold text-foreground">{providerStats?.total_reviews || 0}</p>
                        </div>
                        <div className="info-tile">
                          <p className="detail-kicker">Imported Google Proof</p>
                          <p className="mt-2 text-xl font-semibold text-foreground">{googleReviews.length}</p>
                        </div>
                      </div>
                      <div className="rounded-lg border border-border/70 bg-white/80 px-4 py-3 text-sm text-muted-foreground">
                        Total review proof: <span className="font-semibold text-foreground">{reviewProofCount}</span>
                      </div>
                      <Button variant="outline" className="w-full rounded-lg bg-white/80" onClick={() => setActiveTab("google-reviews")}>
                        Manage Review Proof
                        <ChevronRight className="ml-2 h-4 w-4" />
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              </div>

              <div className="rounded-lg border border-border/70 bg-white/70 px-4 py-3 text-sm text-muted-foreground">
                Social links are optional supporting proof. For ServiceTones, trust, portfolio, reviews, and coverage do the heavier lifting.
              </div>
            </div>
          </TabsContent>

          {activeTab !== "business" ? (
            <Suspense fallback={<DeferredTabFallback label={activeTab.replace("-", " ")} />}>
              <LazyProviderBusinessProfileSecondaryTabs
                activeTab={activeTab}
                availability={availability}
                setAvailability={setAvailability}
                availabilityLoaded={availabilityLoaded}
                availabilityLoading={availabilityLoading}
                daysOfWeek={DAYS_OF_WEEK}
                saving={saving}
                handleSaveAvailability={handleSaveAvailability}
                portfolio={portfolio}
                portfolioLoaded={portfolioLoaded}
                portfolioLoading={portfolioLoading}
                newPortfolioItem={newPortfolioItem}
                setNewPortfolioItem={setNewPortfolioItem}
                showPortfolioForm={showPortfolioForm}
                setShowPortfolioForm={setShowPortfolioForm}
                editingPortfolioId={editingPortfolioId}
                handleAddPortfolioItem={handleAddPortfolioItem}
                handleCancelEdit={handleCancelEdit}
                handleEditPortfolioItem={handleEditPortfolioItem}
                handleDeletePortfolioItem={handleDeletePortfolioItem}
                handleImageUpload={handleImageUpload}
                googleReviews={googleReviews}
                googleReviewsLoaded={googleReviewsLoaded}
                googleReviewsLoading={googleReviewsLoading}
                newGoogleReview={newGoogleReview}
                setNewGoogleReview={setNewGoogleReview}
                showGoogleReviewForm={showGoogleReviewForm}
                setShowGoogleReviewForm={setShowGoogleReviewForm}
                handleAddGoogleReview={handleAddGoogleReview}
                handleDeleteGoogleReview={handleDeleteGoogleReview}
              />
            </Suspense>
          ) : null}
        </Tabs>

        {activeTab === "business" ? (
          <div className="fixed inset-x-4 bottom-4 z-30 sm:inset-x-auto sm:right-5">
            <div className="toolbar-surface flex items-center justify-between gap-3 px-4 py-3 sm:min-w-[18rem]">
              <div className="text-sm">
                <p className="font-semibold text-foreground">{saveIndicatorLabel}</p>
                <p className="text-xs text-muted-foreground">
                  {saveState === "saved" && !isBusinessProfileDirty ? "Business profile is up to date." : "Update trust and visibility signals when ready."}
                </p>
              </div>
              <Button onClick={handleSaveBusinessProfile} disabled={saving || !isBusinessProfileDirty} className="rounded-lg">
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                {isBusinessProfileDirty ? "Save Changes" : "Saved"}
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </AppShell>
  );
}
