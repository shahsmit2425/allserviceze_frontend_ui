import { lazy, Suspense, useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import logger from "@/utils/logger";
import { useParams, Link } from "react-router-dom";
import { AppShell } from "../components/AppShell";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter 
} from "../components/ui/dialog";
import { Textarea } from "../components/ui/textarea";
import { Label } from "../components/ui/label";
import { useAuth } from "../context/AuthContext";
import { toast } from "sonner";
import axios from "axios";
import { 
  Star, MapPin, Clock, Briefcase, Calendar, MessageSquare, Loader2, 
  User, Globe, Facebook, Instagram, Twitter, Linkedin, Youtube,
  Award, FileCheck, CheckCircle, Image as ImageIcon, ExternalLink, Video,
  CalendarDays, DollarSign, Share2
} from "lucide-react";
import { usePlatform } from "@/mobile/hooks/usePlatform";
import { haptic } from "@/mobile/utils/haptics";

const API_URL = `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'}/api`;
const LazyBookingModal = lazy(() => import("../components/BookingModal"));
const PROVIDER_CANONICAL_URL = 'https://servicetones.com/providers';

const DAYS_OF_WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const emptyProviderData = {
  reviews: [],
  portfolio: [],
  googleReviews: [],
  availability: [],
  services: [],
};

const normalizeImageUrl = (url, width = 320) => {
  if (!url) {
    return "";
  }

  try {
    const parsedUrl = new URL(url);

    if (parsedUrl.hostname.includes('amazonaws.com') || parsedUrl.hostname.includes('cloudfront.net')) {
      parsedUrl.searchParams.set('w', String(width));
      parsedUrl.searchParams.set('auto', 'format');
    }

    return parsedUrl.toString();
  } catch {
    return url;
  }
};

const getProviderImageSources = (url) => ({
  src: normalizeImageUrl(url, 220),
  srcSet: [220, 440].map((width) => `${normalizeImageUrl(url, width)} ${width}w`).join(', '),
  sizes: '(max-width: 640px) 96px, 112px',
});

const getPortfolioImageSources = (url) => ({
  src: normalizeImageUrl(url, 640),
  srcSet: [480, 640, 960].map((width) => `${normalizeImageUrl(url, width)} ${width}w`).join(', '),
  sizes: '(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw',
});

const getLogoImageSources = () => ({
  src: '/favicon.svg',
  srcSet: '/favicon.svg 1x',
  sizes: '45px',
});

let shareUtilsPromise;
const getShareUtils = async () => {
  if (!shareUtilsPromise) {
    shareUtilsPromise = import("@/mobile/utils/shareUtils").then((module) => module.shareUtils);
  }

  return shareUtilsPromise;
};

export default function ProviderProfile() {
  const { providerId } = useParams();
  const { user, getAuthHeader } = useAuth();
  const { isNative, isNativePhone, isNativeTablet } = usePlatform();
  
  const [provider, setProvider] = useState(null);
  const [reviews, setReviews] = useState(emptyProviderData.reviews);
  const [portfolio, setPortfolio] = useState(emptyProviderData.portfolio);
  const [googleReviews, setGoogleReviews] = useState(emptyProviderData.googleReviews);
  const [availability, setAvailability] = useState(emptyProviderData.availability);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [services, setServices] = useState(emptyProviderData.services);
  const [selectedImage, setSelectedImage] = useState(null);
  const [replyText, setReplyText] = useState({});
  const [replyingTo, setReplyingTo] = useState(null);
  const [submittingReply, setSubmittingReply] = useState(false);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [selectedService, setSelectedService] = useState(null);
  const [secondaryLoading, setSecondaryLoading] = useState(true);
  const [portfolioLoading, setPortfolioLoading] = useState(false);
  const [googleReviewsLoading, setGoogleReviewsLoading] = useState(false);
  const [portfolioLoaded, setPortfolioLoaded] = useState(false);
  const [googleReviewsLoaded, setGoogleReviewsLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState("portfolio");

  useEffect(() => {
    fetchProviderData();
  }, [providerId]);

  useEffect(() => {
    setActiveTab("portfolio");
    setPortfolio(emptyProviderData.portfolio);
    setGoogleReviews(emptyProviderData.googleReviews);
    setPortfolioLoaded(false);
    setGoogleReviewsLoaded(false);
  }, [providerId]);

  useEffect(() => {
    if (activeTab === "portfolio" && !portfolioLoaded) {
      fetchPortfolio();
    }

    if (activeTab === "google-reviews" && !googleReviewsLoaded) {
      fetchGoogleReviews();
    }
  }, [activeTab, portfolioLoaded, googleReviewsLoaded, providerId]);


  const fetchProviderData = async () => {
    setLoadError("");
    setSecondaryLoading(true);
    try {
      const providerRes = await axios.get(`${API_URL}/providers/${providerId}`);
      setProvider(providerRes.data);
      setLoading(false);

      const [reviewsRes, availRes, servicesRes] = await Promise.all([
        axios.get(`${API_URL}/reviews/provider/${providerId}`),
        axios.get(`${API_URL}/providers/${providerId}/availability`),
        axios.get(`${API_URL}/providers/${providerId}/services`).catch(() => ({ data: [] }))
      ]);

      setReviews(reviewsRes.data);
      setAvailability(availRes.data.slots || []);
      setServices(servicesRes.data || []);
    } catch (error) {
      const message = error.response?.data?.detail || error.message || "Failed to load provider";
      setLoadError(message);
      logger.error("Error fetching provider:", error);
      toast.error(message);
    } finally {
      setLoading(false);
      setSecondaryLoading(false);
    }
  };

  const fetchPortfolio = async () => {
    setPortfolioLoading(true);
    try {
      const portfolioRes = await axios.get(`${API_URL}/portfolio/${providerId}`);
      setPortfolio(portfolioRes.data || []);
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
    setGoogleReviewsLoading(true);
    try {
      const googleReviewsRes = await axios.get(`${API_URL}/google-reviews/${providerId}`);
      setGoogleReviews(googleReviewsRes.data || []);
      setGoogleReviewsLoaded(true);
    } catch (error) {
      logger.error("Error fetching Google reviews:", error);
      setGoogleReviews([]);
      setGoogleReviewsLoaded(true);
    } finally {
      setGoogleReviewsLoading(false);
    }
  };

  const handleReplySubmit = async (reviewId) => {
    const text = replyText[reviewId]?.trim();
    if (!text) return;
    setSubmittingReply(true);
    try {
      await axios.post(`${API_URL}/reviews/${reviewId}/reply`, { reply: text }, {
        withCredentials: true,
        ...getAuthHeader()
      });
      toast.success("Reply posted successfully");
      setReplyingTo(null);
      setReplyText(prev => ({ ...prev, [reviewId]: "" }));
      // Refresh reviews
      const reviewsRes = await axios.get(`${API_URL}/reviews/provider/${providerId}`);
      setReviews(reviewsRes.data);
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to post reply");
    } finally {
      setSubmittingReply(false);
    }
  };

  const handleShare = async () => {
    try {
      if (isNative) {
        await haptic.light();
      }
      
      const shareUtils = await getShareUtils();
      const result = await shareUtils.shareProvider(provider);
      
      if (result.success) {
        if (!result.cancelled) {
          toast.success('Shared successfully!');
          if (isNative) {
            await haptic.success();
          }
        }
      } else if (result.method === 'clipboard') {
        toast.success('Link copied to clipboard!');
      }
    } catch (error) {
      logger.error('Share failed:', error);
      if (isNative) {
        await haptic.error();
      }
    }
  };

  const isOwnProfile = user?.id === providerId;
  const openPortfolioItem = (item) => {
    setSelectedImage(item);
  };

  const handlePortfolioCardKeyDown = (event, item) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      openPortfolioItem(item);
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

  if (!provider) {
    return (
      <AppShell theme="provider" className="bg-background" contentClassName="pb-12">
        <div className="page-shell py-16 text-center">
          <h2 className="heading-2">Provider Not Found</h2>
          {loadError ? <p className="mt-3 text-sm text-muted-foreground">{loadError}</p> : null}
        </div>
      </AppShell>
    );
  }

  const profile = provider.provider_profile || {};
  const totalReviews = reviews.length + googleReviews.length;
  const avgRating = provider.avg_rating || 0;
  const providerProfileImage = getProviderImageSources(provider.profile_image);
  const providerLogoImage = getLogoImageSources();
  const canonicalUrl = `${PROVIDER_CANONICAL_URL}/${providerId}`;

  // Social media links
  const socialLinks = [
    { url: profile.social_facebook, icon: Facebook, color: "text-blue-600", label: "Facebook" },
    { url: profile.social_instagram, icon: Instagram, color: "text-pink-600", label: "Instagram" },
    { url: profile.social_twitter, icon: Twitter, color: "text-sky-500", label: "Twitter" },
    { url: profile.social_linkedin, icon: Linkedin, color: "text-blue-700", label: "LinkedIn" },
    { url: profile.social_youtube, icon: Youtube, color: "text-red-600", label: "YouTube" },
  ].filter(s => s.url);

  return (
    <AppShell theme="provider" className="bg-background pb-16" contentClassName="pb-16" data-testid="provider-profile-page">
      {provider && (
        <Helmet>
          <title>{(provider.provider_profile?.business_name || provider.full_name)} - Service Provider | ServiceTones</title>
          <meta name="description" content={provider.provider_profile?.business_description || provider.provider_profile?.bio || `View ${provider.full_name}'s profile on ServiceTones. Book home services from a verified professional.`} />
          <meta property="og:title" content={`${provider.provider_profile?.business_name || provider.full_name} | ServiceTones`} />
          <meta property="og:description" content={provider.provider_profile?.business_description || provider.provider_profile?.bio || `Verified home service professional on ServiceTones.`} />
          <meta property="og:url" content={canonicalUrl} />
          <meta name="robots" content="index,follow" />
          <link rel="canonical" href={canonicalUrl} />
          {provider.avg_rating > 0 && reviews.length > 0 && (
            <script type="application/ld+json">{JSON.stringify({
              "@context": "https://schema.org",
              "@type": "LocalBusiness",
              "name": (provider.provider_profile?.business_name || provider.full_name || "").replace(/</g, "&lt;").replace(/>/g, "&gt;"),
              "url": `https://servicetones.com/providers/${providerId}`,
              "aggregateRating": {
                "@type": "AggregateRating",
                "ratingValue": Number(provider.avg_rating).toFixed(1),
                "reviewCount": reviews.length
              }
            })}</script>
          )}
        </Helmet>
      )}

      <div className="page-shell space-y-6 py-6 sm:py-8">
        <section className="page-hero">
          <div className="relative">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
              <Avatar className="h-24 w-24 border-4 border-white shadow-lg sm:h-28 sm:w-28">
                <AvatarImage
                  src={providerProfileImage.src}
                  srcSet={providerProfileImage.srcSet}
                  sizes={providerProfileImage.sizes}
                  alt={`${provider.full_name} profile photo`}
                  loading="eager"
                  fetchPriority="high"
                />
                <AvatarFallback className="bg-primary text-white text-3xl sm:text-4xl">
                  {provider.full_name?.charAt(0)}
                </AvatarFallback>
              </Avatar>

              <div className="min-w-0 flex-1">
                <span className="page-kicker">
                  <User className="h-3.5 w-3.5" /> Provider profile
                </span>
                <div className="mt-3 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0">
                    <h1 className="text-3xl font-semibold tracking-[-0.04em] text-foreground sm:text-4xl">
                      {profile.business_name || provider.full_name}
                    </h1>
                    {profile.business_name && (
                      <p className="mt-1 text-sm text-muted-foreground sm:text-base">{provider.full_name}</p>
                    )}

                    <div className="mt-4 flex flex-wrap gap-2">
                      <div className="info-chip">
                        <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                        <span className="font-semibold">{avgRating > 0 ? avgRating.toFixed(1) : "New"}</span>
                        <span className="text-muted-foreground">{totalReviews > 0 ? `${totalReviews} reviews` : "No reviews yet"}</span>
                      </div>
                      {profile.location && (
                        <div className="info-chip">
                          <MapPin className="w-4 h-4" />
                          <span>{profile.location}</span>
                        </div>
                      )}
                      {profile.experience_years > 0 && (
                        <div className="info-chip">
                          <Briefcase className="w-4 h-4" />
                          <span>{profile.experience_years} years experience</span>
                        </div>
                      )}
                      <div className="info-chip">
                        <DollarSign className="w-4 h-4" />
                        <span>{profile.hourly_rate > 0 ? `$${profile.hourly_rate}/hr` : "Custom quote"}</span>
                      </div>
                      <div className="info-chip">
                        <ImageIcon className="w-4 h-4" />
                        <span>{portfolio.length} portfolio item{portfolio.length === 1 ? "" : "s"}</span>
                      </div>
                      {profile.is_verified && (
                        <Badge className="rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 shadow-sm">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Verified
                        </Badge>
                      )}
                    </div>
                  </div>

                  {user && user.id !== providerId && (
                    <div className="flex flex-wrap items-center gap-2 md:justify-end">
                      <Button
                        variant="outline"
                        size="icon"
                        className="rounded-lg border-border/60 bg-background/85"
                        onClick={handleShare}
                        aria-label={`Share ${profile.business_name || provider.full_name} profile`}
                        title="Share this provider"
                      >
                        <Share2 className="w-4 h-4" />
                      </Button>
                      <Link to={`/messages/${providerId}`}>
                        <Button variant="outline" className="rounded-lg border-border/60 bg-background/85" data-testid="message-btn">
                          <MessageSquare className="w-4 h-4 mr-2" />
                          Message
                        </Button>
                      </Link>
                      {user.role === "customer" && (
                        <Button
                          className="rounded-lg"
                          onClick={() => {
                            if (loading) return;
                            let serviceToBook;
                            if (services.length > 0) {
                              serviceToBook = services[0];
                            } else {
                              const profile = provider.provider_profile || {};
                              const hourlyRate = profile.hourly_rate || 0;
                              serviceToBook = {
                                id: "default",
                                title: profile.specialization || provider.full_name || "Consultation",
                                description: "General service consultation",
                                price: hourlyRate,
                                price_type: "hourly",
                                duration_hours: 1,
                              };
                            }
                            setSelectedService(serviceToBook);
                            setBookingOpen(true);
                          }}
                          data-testid="book-now-btn"
                        >
                          <CalendarDays className="w-4 h-4 mr-2" />
                          Book Now
                        </Button>
                      )}
                    </div>
                  )}
                </div>

                {(profile.business_description || profile.bio) && (
                  <p className="mt-4 max-w-3xl text-sm leading-6 text-muted-foreground break-words overflow-wrap-anywhere sm:text-base">
                    {profile.business_description || profile.bio}
                  </p>
                )}

                {profile.skills?.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {profile.skills.map((skill, idx) => (
                      <Badge key={idx} variant="secondary" className="rounded-lg border border-border/60 bg-white px-2.5 py-1 text-[11px] shadow-sm sm:text-xs">{skill}</Badge>
                    ))}
                  </div>
                )}

                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <img
                    src={providerLogoImage.src}
                    srcSet={providerLogoImage.srcSet}
                    sizes={providerLogoImage.sizes}
                    alt="ServiceTones"
                    width="45"
                    height="45"
                    className="h-[45px] w-[45px] rounded-xl border border-border/60 bg-white p-2 shadow-sm"
                    decoding="async"
                  />
                  {profile.website && (
                    <a
                      href={profile.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 rounded-lg border border-border/60 bg-white px-3 py-1.5 text-sm font-medium text-primary shadow-sm transition-colors hover:bg-white"
                    >
                      <Globe className="w-4 h-4" />
                      Website
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                  {socialLinks.map((social, idx) => (
                    <a
                      key={idx}
                      href={social.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`Open ${social.label} for ${profile.business_name || provider.full_name}`}
                      className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border/60 bg-white shadow-sm transition-opacity hover:bg-white ${social.color}`}
                      title={social.label}
                    >
                      <social.icon className="w-4 h-4" />
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className={isNativeTablet ? "grid gap-4 xl:grid-cols-2" : "grid gap-4 lg:grid-cols-2"}>
          {/* Availability Card */}
          <Card className="result-card-surface border border-border/60 shadow-sm">
            <CardHeader className="border-b border-border/60 pb-5">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-border/60 bg-muted/35 shadow-sm shadow-deep-navy-800/5">
                  <Clock className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <span className="caption">Schedule</span>
                  <CardTitle className="content-card-title mt-3">Availability</CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-3">
                {availability.length > 0 ? (
                  availability.map((slot, idx) => (
                    <div key={idx} className="info-tile flex items-center justify-between gap-4 px-4 py-3">
                      <span className={`text-sm font-semibold ${slot.is_available ? "text-foreground" : "text-muted-foreground"}`}>
                        {DAYS_OF_WEEK[slot.day_of_week]}
                      </span>
                      <span className={`text-sm font-semibold ${slot.is_available ? "text-emerald-600" : "text-muted-foreground"}`}>
                        {slot.is_available ? `${slot.start_time} - ${slot.end_time}` : "Closed"}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="info-tile">
                    <p className="detail-kicker">Availability</p>
                    <p className="mt-2 text-sm font-semibold text-foreground">Contact for availability</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Service Areas and Credentials */}
          <Card className="result-card-surface border border-border/60 shadow-sm">
              <CardHeader className="border-b border-border/60 pb-5">
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-border/60 bg-muted/35 shadow-sm shadow-deep-navy-800/5">
                    <MapPin className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <span className="caption">Coverage</span>
                    <CardTitle className="content-card-title mt-3">Service areas and credentials</CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 pt-6">
                  {profile.service_areas?.length > 0 && (
                    <div className="space-y-3">
                      <p className="detail-kicker">Service areas</p>
                      <div className="flex flex-wrap gap-2.5">
                        {profile.service_areas.map((area, idx) => (
                          <Badge key={idx} variant="outline" className="rounded-lg border-border/60 bg-background/80 px-3 py-1.5 text-xs font-semibold">{area}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {profile.certifications?.map((cert, idx) => (
                    <div key={idx} className="info-tile flex items-center gap-3 px-4 py-3">
                      <Award className="h-4 w-4 shrink-0 text-emerald-600" />
                      <span className="text-sm font-semibold text-foreground">{cert}</span>
                    </div>
                  ))}
                  {profile.licenses?.map((license, idx) => (
                    <div key={idx} className="info-tile flex items-center gap-3 px-4 py-3">
                      <FileCheck className="h-4 w-4 shrink-0 text-blue-600" />
                      <span className="text-sm font-semibold text-foreground">{license}</span>
                    </div>
                  ))}
              </CardContent>
            </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className={isNativePhone ? "mobile-tabs-rail mb-6 flex h-auto w-full flex-nowrap gap-2 overflow-x-auto rounded-xl border border-border/60 bg-white/90 p-1.5 shadow-sm shadow-deep-navy-800/5" : "mb-6 h-auto flex-wrap gap-2 rounded-xl border border-border/60 bg-white/90 p-1.5 shadow-sm shadow-deep-navy-800/5"}>
            {services.length > 0 && (
              <TabsTrigger value="services" data-testid="services-tab">
                <Briefcase className="w-4 h-4 mr-2" />
                Services ({services.length})
              </TabsTrigger>
            )}
            <TabsTrigger value="portfolio" data-testid="portfolio-tab">
              <ImageIcon className="w-4 h-4 mr-2" />
              Portfolio ({portfolio.length})
            </TabsTrigger>
            <TabsTrigger value="reviews" data-testid="reviews-tab">
              <Star className="w-4 h-4 mr-2" />
              ServiceTones Reviews ({reviews.length})
            </TabsTrigger>
            <TabsTrigger value="google-reviews" data-testid="google-reviews-tab">
              <img src="https://www.google.com/favicon.ico" alt="Google" className="w-4 h-4 mr-2" />
              Google Reviews ({googleReviews.length})
            </TabsTrigger>
          </TabsList>

          {/* Services Tab */}
          {services.length > 0 && (
            <TabsContent value="services">
              {secondaryLoading ? (
                <div className="flex items-center justify-center py-14">
                  <Loader2 className="h-7 w-7 animate-spin text-primary" />
                </div>
              ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {services.map((service) => (
                  <Card key={service.id} className="result-card-surface border border-border/60 shadow-sm flex h-full flex-col">
                    <CardHeader className="border-b border-border/60 pb-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-3">
                          <span className="caption">Service offering</span>
                          <CardTitle className="content-card-title">{service.title}</CardTitle>
                        </div>
                        {service.category && (
                          <Badge variant="secondary" className="w-fit rounded-lg border border-border/60 bg-white px-3 py-1 text-xs font-semibold shadow-sm">{service.category}</Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="flex-1 flex flex-col gap-5 pt-6">
                      {service.description && (
                        <p className="content-card-copy line-clamp-3">{service.description}</p>
                      )}
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="info-tile">
                          <p className="detail-kicker">Starting price</p>
                          <div className="mt-2 flex items-center gap-2 text-foreground">
                            <DollarSign className="h-4 w-4 text-primary" />
                            <p className="text-lg font-semibold">
                              {service.price > 0
                                ? `$${service.price}${service.price_type === "hourly" ? "/hr" : service.price_type === "daily" ? "/day" : ""}`
                                : "Custom quote"}
                            </p>
                          </div>
                        </div>
                        <div className="info-tile">
                          <p className="detail-kicker">Typical timing</p>
                          <div className="mt-2 flex items-center gap-2 text-foreground">
                            <Clock className="h-4 w-4 text-primary" />
                            <p className="text-lg font-semibold">
                              {service.duration_hours > 0 ? `${service.duration_hours}h` : "Flexible"}
                            </p>
                          </div>
                        </div>
                      </div>
                      {user && user.role === "customer" && user.id !== providerId && (
                        <Button
                          className="mt-auto w-full rounded-lg justify-between"
                          onClick={() => {
                            setSelectedService(service);
                            setBookingOpen(true);
                          }}
                        >
                          <span className="inline-flex items-center gap-2">
                            <CalendarDays className="w-4 h-4" />
                            Book This Service
                          </span>
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
              )}
            </TabsContent>
          )}

          {/* Portfolio Tab */}
          <TabsContent value="portfolio">
            {portfolioLoading ? (
              <div className="flex items-center justify-center py-14">
                <Loader2 className="h-7 w-7 animate-spin text-primary" />
              </div>
            ) : portfolio.length > 0 ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {portfolio.map((item) => (
                  <Card
                    key={item.id}
                    className="result-card-surface border border-border/60 shadow-sm overflow-hidden group cursor-pointer flex h-full flex-col focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    onClick={() => openPortfolioItem(item)}
                    onKeyDown={(event) => handlePortfolioCardKeyDown(event, item)}
                    role="button"
                    tabIndex={0}
                    aria-label={`Open portfolio item ${item.title}`}
                    style={{ contentVisibility: 'auto', containIntrinsicSize: '360px' }}
                  >
                    {item.images?.[0] && (
                      <div className="aspect-video overflow-hidden">
                        {(() => {
                          const portfolioImage = getPortfolioImageSources(item.images[0]);
                          return (
                        <img 
                          src={portfolioImage.src}
                          srcSet={portfolioImage.srcSet}
                          sizes={portfolioImage.sizes}
                          alt={item.title} 
                          width="640"
                          height="360"
                          loading="lazy"
                          decoding="async"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                        />
                          );
                        })()}
                      </div>
                    )}
                    <CardContent className="flex flex-1 flex-col p-5 sm:p-6">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <span className="caption">Completed work</span>
                          <h3 className="content-card-title mt-3">{item.title}</h3>
                        </div>
                        <Badge variant="secondary" className="rounded-lg border border-border/60 bg-white px-3 py-1 text-xs font-semibold shadow-sm">{item.category}</Badge>
                      </div>
                      <p className="content-card-copy mt-4 line-clamp-3">{item.description}</p>
                      <div className="mt-5 grid gap-3 sm:grid-cols-2">
                        <div className="info-tile">
                          <p className="detail-kicker">Completed</p>
                          <div className="mt-2 flex items-center gap-2 text-foreground">
                            <Calendar className="h-4 w-4 text-primary" />
                            <p className="text-sm font-semibold">{new Date(item.completion_date).toLocaleDateString()}</p>
                          </div>
                        </div>
                        <div className="info-tile">
                          <p className="detail-kicker">Location</p>
                          <div className="mt-2 flex items-center gap-2 text-foreground">
                            <MapPin className="h-4 w-4 text-primary" />
                            <p className="text-sm font-semibold">{item.location || "Not listed"}</p>
                          </div>
                        </div>
                      </div>
                      <div className="mt-auto flex items-center justify-between border-t border-border/60 pt-4 text-sm font-semibold text-foreground/80">
                        <span>View case study</span>
                        <ExternalLink className="h-4 w-4 text-primary transition-transform duration-200 group-hover:translate-x-1" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="empty-state-panel border-0 shadow-none">
                <CardContent className="p-0 text-center">
                  <ImageIcon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Portfolio Items Yet</h3>
                  <p className="text-muted-foreground">This provider hasn't added any past work samples.</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Platform Reviews Tab */}
          <TabsContent value="reviews">
            {secondaryLoading ? (
              <div className="flex items-center justify-center py-14">
                <Loader2 className="h-7 w-7 animate-spin text-primary" />
              </div>
            ) : reviews.length > 0 ? (
              <div className="space-y-4">
                {reviews.map((review) => (
                  <Card key={review.id} className="result-card-surface border border-border/60 shadow-sm">
                    <CardContent className="p-6 sm:p-7">
                      <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
                        <Avatar className="h-12 w-12 border border-white/70 shadow-sm">
                          <AvatarFallback className="bg-muted">
                            {review.reviewer_name?.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                              <span className="caption">ServiceTones review</span>
                              <p className="mt-2 text-lg font-semibold tracking-[-0.03em] text-foreground">{review.reviewer_name}</p>
                              {review.project_title && (
                                <p className="mt-2 text-sm text-muted-foreground">
                                  Project: <span className="font-semibold text-foreground">{review.project_title}</span>
                                  {review.project_id && (
                                    <Link to={`/projects/${review.project_id}`} className="ml-2 text-primary hover:underline text-sm">
                                      View Details
                                    </Link>
                                  )}
                                </p>
                              )}
                            </div>
                            <div className="flex flex-col items-start gap-2 sm:items-end">
                              <span className="text-sm text-muted-foreground">
                                {new Date(review.created_at).toLocaleDateString()}
                              </span>
                              <div className="flex items-center gap-1">
                                {[...Array(5)].map((_, i) => (
                                  <Star
                                    key={i}
                                    className={`w-4 h-4 ${
                                      i < review.rating
                                        ? "fill-yellow-400 text-yellow-400"
                                        : "text-gray-300"
                                    }`}
                                  />
                                ))}
                                <Badge variant="outline" className="ml-2 rounded-lg border-border/60 bg-background/80 text-xs">ServiceTones</Badge>
                              </div>
                            </div>
                          </div>
                          <p className="content-card-copy mt-4">{review.comment}</p>

                          {/* Provider Reply */}
                          {review.provider_reply && (
                            <div className="info-tile mt-4 border-primary/20 bg-primary/5">
                              <div className="flex items-center gap-2 mb-1">
                                <MessageSquare className="w-3.5 h-3.5 text-primary" />
                                <span className="text-sm font-semibold text-primary">Provider Reply</span>
                                {review.provider_reply_at && (
                                  <span className="text-xs text-muted-foreground">
                                    {new Date(review.provider_reply_at).toLocaleDateString()}
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground">{review.provider_reply}</p>
                            </div>
                          )}

                          {/* Reply Form - only for profile owner, only if no reply yet */}
                          {isOwnProfile && !review.provider_reply && (
                            <div className="mt-3">
                              {replyingTo === review.id ? (
                                <div className="space-y-2">
                                  <Textarea
                                    placeholder="Write your reply..."
                                    value={replyText[review.id] || ""}
                                    onChange={(e) => setReplyText(prev => ({ ...prev, [review.id]: e.target.value }))}
                                    className="min-h-[96px] text-sm"
                                    maxLength={2000}
                                  />
                                  <div className="flex gap-2 justify-end">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="rounded-lg border-border/60 bg-background/80"
                                      onClick={() => { setReplyingTo(null); setReplyText(prev => ({ ...prev, [review.id]: "" })); }}
                                      disabled={submittingReply}
                                    >
                                      Cancel
                                    </Button>
                                    <Button
                                      size="sm"
                                      className="rounded-lg"
                                      onClick={() => handleReplySubmit(review.id)}
                                      disabled={submittingReply || !replyText[review.id]?.trim()}
                                    >
                                      {submittingReply ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                                      Post Reply
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="rounded-lg text-xs text-muted-foreground hover:text-primary"
                                  onClick={() => setReplyingTo(review.id)}
                                >
                                  <MessageSquare className="w-3.5 h-3.5 mr-1" />
                                  Reply to this review
                                </Button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="empty-state-panel border-0 shadow-none">
                <CardContent className="p-0 text-center">
                  <Star className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Reviews Yet</h3>
                  <p className="text-muted-foreground">Be the first to leave a review!</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Google Reviews Tab */}
          <TabsContent value="google-reviews">
            {googleReviewsLoading ? (
              <div className="flex items-center justify-center py-14">
                <Loader2 className="h-7 w-7 animate-spin text-primary" />
              </div>
            ) : googleReviews.length > 0 ? (
              <div className="space-y-4">
                {googleReviews.map((review) => (
                  <Card key={review.id} className="result-card-surface border border-border/60 shadow-sm">
                    <CardContent className="p-6 sm:p-7">
                      <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-border/60 bg-blue-100 text-blue-700 font-semibold shadow-sm">
                          {review.reviewer_name.charAt(0)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div>
                              <span className="caption">Google review</span>
                              <p className="mt-2 text-lg font-semibold tracking-[-0.03em] text-foreground">{review.reviewer_name}</p>
                            </div>
                            <div className="flex flex-col items-start gap-2 sm:items-end">
                              <Badge variant="outline" className="rounded-lg border-border/60 bg-background/80 text-xs">
                                <img src="https://www.google.com/favicon.ico" alt="Google" className="w-3 h-3 mr-1" />
                                Google
                              </Badge>
                              <span className="text-sm text-muted-foreground">
                                {review.review_date}
                              </span>
                            </div>
                          </div>
                          <div className="flex gap-1 mt-1">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`w-4 h-4 ${
                                  i < review.rating
                                    ? "fill-yellow-400 text-yellow-400"
                                    : "text-gray-300"
                                }`}
                              />
                            ))}
                          </div>
                          <p className="content-card-copy mt-4">{review.review_text}</p>
                          {review.screenshot_url && (
                            <div className="mt-4 rounded-lg border border-border/60 bg-muted/35 p-3 shadow-sm shadow-deep-navy-800/5">
                              <img 
                                src={review.screenshot_url} 
                                alt="Review screenshot" 
                                width="640"
                                height="360"
                                loading="lazy"
                                decoding="async"
                                className="max-w-sm rounded-xl border border-border/60 cursor-pointer hover:opacity-90"
                                onClick={() => window.open(review.screenshot_url, '_blank', 'noopener,noreferrer')}
                                onKeyDown={(event) => {
                                  if (event.key === 'Enter' || event.key === ' ') {
                                    event.preventDefault();
                                    window.open(review.screenshot_url, '_blank', 'noopener,noreferrer');
                                  }
                                }}
                                role="button"
                                tabIndex={0}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="empty-state-panel border-0 shadow-none">
                <CardContent className="p-0 text-center">
                  <img src="https://www.google.com/favicon.ico" alt="Google" className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-semibold mb-2">No Google Reviews</h3>
                  <p className="text-muted-foreground">This provider hasn't imported any Google reviews yet.</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        {/* Image Lightbox Modal */}
        {selectedImage && (
          <div 
            className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
            onClick={() => setSelectedImage(null)}
          >
            <div className="max-w-4xl w-full overflow-hidden rounded-xl border border-border/60 bg-white" onClick={(e) => e.stopPropagation()}>
              {selectedImage.images?.length > 0 && (
                <img 
                  src={selectedImage.images[0]} 
                  alt={selectedImage.title}
                  width="1280"
                  height="720"
                  decoding="async"
                  className="w-full max-h-[60vh] object-contain bg-black"
                />
              )}
              <div className="p-6">
                <h3 className="text-xl font-bold">{selectedImage.title}</h3>
                <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                  <Badge className="rounded-lg">{selectedImage.category}</Badge>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {new Date(selectedImage.completion_date).toLocaleDateString()}
                  </span>
                  {selectedImage.location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      {selectedImage.location}
                    </span>
                  )}
                </div>
                <p className="mt-4 break-words overflow-wrap-anywhere">{selectedImage.description}</p>
                {selectedImage.images?.length > 1 && (
                  <div className="flex gap-2 mt-4 overflow-x-auto">
                    {selectedImage.images.map((img, idx) => (
                      <img 
                        key={idx}
                        src={img}
                        alt={`${selectedImage.title} ${idx + 1}`}
                        width="80"
                        height="80"
                        loading="lazy"
                        decoding="async"
                        className="w-20 h-20 object-cover rounded-lg cursor-pointer hover:opacity-80"
                      />
                    ))}
                  </div>
                )}
                <Button 
                  className="mt-6 w-full"
                  variant="outline"
                  onClick={() => setSelectedImage(null)}
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Booking Modal */}
      {bookingOpen ? (
        <Suspense fallback={null}>
          <LazyBookingModal
            open={bookingOpen}
            onClose={() => {
              setBookingOpen(false);
              setSelectedService(null);
            }}
            service={selectedService}
            provider={provider}
          />
        </Suspense>
      ) : null}
    </AppShell>
  );
}
