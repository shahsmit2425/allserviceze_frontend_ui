import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useNavigate } from "react-router-dom";
import { AppShell } from "../components/AppShell";
import { PremiumHero } from "../components/premium/PremiumHero";
import { PremiumFeatures } from "../components/premium/PremiumFeatures";
import ServiceCategoriesGrid from "../components/premium/ServiceCategoriesGrid";
import { PremiumTestimonials } from "../components/premium/PremiumTestimonials";
import { PremiumCTA } from "../components/premium/PremiumCTA";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Card } from "../components/ui/card";
import axios from "axios";
import {
  Briefcase,
  CheckCircle,
  Fan,
  Hammer,
  House,
  MapPin,
  Paintbrush,
  Shield,
  ShieldCheck,
  Sparkles,
  Star,
  Trees,
  Users,
  Wrench,
  Zap,
} from "lucide-react";

const BACKEND_URL = (import.meta.env.VITE_BACKEND_URL || "http://localhost:5000").trim();
const API_URL = `${BACKEND_URL}/api`;

const MARKETPLACE_CATEGORIES = [
  {
    name: "Plumbing",
    icon: Wrench,
    accent: "bg-sky-100 text-sky-700",
    description: "Leaks, drains, fixtures, and water heater work.",
  },
  {
    name: "Electrical",
    icon: Zap,
    accent: "bg-copper-100 text-amber-700",
    description: "Panels, outlets, lighting, and troubleshooting.",
  },
  {
    name: "Cleaning",
    icon: Sparkles,
    accent: "bg-emerald-100 text-emerald-700",
    description: "Recurring cleanings, move-outs, and deep refreshes.",
  },
  {
    name: "Painting",
    icon: Paintbrush,
    accent: "bg-rose-100 text-rose-700",
    description: "Interior repainting, trim work, and touch-ups.",
  },
  {
    name: "HVAC",
    icon: Fan,
    accent: "bg-cyan-100 text-cyan-700",
    description: "Heating, cooling, tune-ups, and urgent repairs.",
  },
  {
    name: "Roofing",
    icon: House,
    accent: "bg-deep-navy-50 text-deep-navy-600",
    description: "Repairs, leak checks, inspections, and replacements.",
  },
  {
    name: "Landscaping",
    icon: Trees,
    accent: "bg-lime-100 text-lime-700",
    description: "Cleanup, mowing, planting, and outdoor upgrades.",
  },
  {
    name: "Handyman",
    icon: Hammer,
    accent: "bg-orange-100 text-orange-700",
    description: "Punch lists, installs, and small home fixes.",
  },
];

const TRUST_STATS = [
  { label: "Avg rating", value: "4.8/5", icon: Star },
  { label: "Local pros", value: "15,000+", icon: Users },
  { label: "Completed projects", value: "25,000+", icon: Briefcase },
  { label: "NJ counties", value: "21", icon: MapPin },
];

const TRUST_POINTS = [
  "Verified professionals",
  "Review moderation",
  "Secure messaging",
  "Coverage across New Jersey",
];

const WHY_HOMEOWNERS = [
  {
    title: "Tell us a little about the job",
    copy: "Share the service, ZIP code, and timing once so the right local pros can respond.",
  },
  {
    title: "Only see local, trusted pros",
    copy: "Ratings, verification, and response speed stay visible before the first message.",
  },
  {
    title: "Compare quotes in one place",
    copy: "Keep pricing, follow-up, and hiring decisions inside one clearer flow.",
  },
];

const RESOURCE_GUIDES = [
  {
    title: "Cost guides",
    copy: "See typical price ranges before you request quotes.",
  },
  {
    title: "Maintenance tips",
    copy: "Simple guidance to help homeowners plan smarter jobs.",
  },
  {
    title: "Hiring guides",
    copy: "Know what to ask before you choose a local professional.",
  },
];

const FEATURED_COUNTIES = [
  "Bergen",
  "Essex",
  "Hudson",
  "Middlesex",
  "Monmouth",
  "Morris",
  "Ocean",
  "Union",
];

function BrushIcon(props) {
  return <Sparkles {...props} />;
}

const normalizeText = (value) => (typeof value === "string" ? value.trim().toLowerCase() : "");

const isMeaningfulText = (value, minLength = 8) => {
  if (!value || typeof value !== "string") return false;

  const text = value.replace(/\s+/g, " ").trim();
  if (text.length < minLength) return false;

  const letters = (text.match(/[a-z]/gi) || []).length;
  const vowels = (text.match(/[aeiou]/gi) || []).length;
  const uniqueLetters = new Set((text.toLowerCase().match(/[a-z]/g) || [])).size;

  return letters >= Math.max(6, Math.floor(text.length * 0.45)) && vowels >= 2 && uniqueLetters >= 4;
};

const isPresentableProject = (project) => {
  return isMeaningfulText(project?.title, 8) && isMeaningfulText(project?.description || "", 18);
};

const getProviderDisplayName = (provider) => {
  return provider?.provider_profile?.business_name || provider?.full_name || "Local provider";
};

const getProviderSkills = (provider) => {
  return Array.isArray(provider?.provider_profile?.skills) ? provider.provider_profile.skills : [];
};

const getProviderPrimaryCategory = (provider) => {
  return getProviderSkills(provider)[0] || "Home services";
};

const getProviderLocation = (provider) => {
  return provider?.provider_profile?.location || provider?.provider_profile?.service_areas?.[0] || "New Jersey";
};

const categoryMatches = (categoryName, value) => {
  const normalizedCategory = normalizeText(categoryName);
  const normalizedValue = normalizeText(value);

  return normalizedValue === normalizedCategory || normalizedValue.includes(normalizedCategory) || normalizedCategory.includes(normalizedValue);
};

const getAverageRating = (providers) => {
  const ratings = providers.map((provider) => Number(provider?.avg_rating) || 0).filter((rating) => rating > 0);
  if (!ratings.length) return null;

  return (ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length).toFixed(1);
};

const formatBudget = (project) => {
  const min = Number(project?.budget_min) || 0;
  const max = Number(project?.budget_max) || 0;

  if (min && max) return `$${min.toLocaleString()} - $${max.toLocaleString()}`;
  if (max) return `Up to $${max.toLocaleString()}`;
  if (min) return `From $${min.toLocaleString()}`;
  return "Custom budget";
};

const formatTimeline = (project) => {
  if (!project?.deadline) return "Flexible timeline";
  return new Date(project.deadline).toLocaleDateString();
};

const formatResponseTime = (provider) => {
  const averageResponseMinutes = Number(provider?.avg_response_time_minutes);
  if (Number.isFinite(averageResponseMinutes) && averageResponseMinutes > 0) {
    if (averageResponseMinutes < 60) return `${averageResponseMinutes} min avg`;

    const hours = Math.round((averageResponseMinutes / 60) * 10) / 10;
    return hours % 1 === 0 ? `${hours.toFixed(0)} hr avg` : `${hours.toFixed(1)} hr avg`;
  }

  return provider?.provider_profile?.response_time || provider?.response_time || "Response time on request";
};

export default function LandingPage() {
  const navigate = useNavigate();
  const [featuredProviders, setFeaturedProviders] = useState([]);
  const [featuredProjects, setFeaturedProjects] = useState([]);
  const [serviceNeeded, setServiceNeeded] = useState("");
  const [locationQuery, setLocationQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [providersRes, projectsRes] = await Promise.all([
          axios.get(`${API_URL}/providers/featured?limit=8&scope=project_posting`, {
            withCredentials: false,
            headers: { Accept: "application/json" },
          }),
          axios.get(`${API_URL}/projects/live?limit=6&scope=project_posting`, {
            withCredentials: false,
            headers: { Accept: "application/json" },
          }),
        ]);

        const providers = Array.isArray(providersRes.data) ? providersRes.data : [];
        const enrichedProviders = await Promise.all(
          providers.map(async (provider) => {
            try {
              const portfolioRes = await axios.get(`${API_URL}/portfolio/${provider.id}`, {
                withCredentials: false,
                headers: { Accept: "application/json" },
              });

              return {
                ...provider,
                portfolioPreview: Array.isArray(portfolioRes.data) ? portfolioRes.data.slice(0, 2) : [],
              };
            } catch {
              return {
                ...provider,
                portfolioPreview: [],
              };
            }
          })
        );

        const projects = Array.isArray(projectsRes.data)
          ? projectsRes.data
          : Array.isArray(projectsRes.data?.projects)
            ? projectsRes.data.projects
            : [];

        setFeaturedProviders(enrichedProviders);
        setFeaturedProjects(projects.slice(0, 6));
      } catch {
        setFeaturedProviders([]);
        setFeaturedProjects([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const sectionShell = "mx-auto w-full max-w-[96rem] px-4 sm:px-6 lg:px-10";

  const curatedProviders = useMemo(() => {
    return featuredProviders.filter((provider) => isMeaningfulText(getProviderDisplayName(provider), 5));
  }, [featuredProviders]);

  const curatedProjects = useMemo(() => {
    return featuredProjects.filter(isPresentableProject);
  }, [featuredProjects]);

  const heroMediaItems = useMemo(() => {
    const portfolioItems = curatedProviders.flatMap((provider) =>
      (provider.portfolioPreview || []).flatMap((item) =>
        (item.images || []).slice(0, 1).map((imageUrl) => ({
          src: imageUrl,
          alt: item.title || getProviderDisplayName(provider),
        }))
      )
    );

    const profileItems = curatedProviders
      .filter((provider) => Boolean(provider.profile_image))
      .map((provider) => ({
        src: provider.profile_image,
        alt: getProviderDisplayName(provider),
      }));

    return [...portfolioItems, ...profileItems].slice(0, 6);
  }, [curatedProviders]);

  const categoryInsights = useMemo(() => {
    return MARKETPLACE_CATEGORIES.map((category) => {
      const matchingProviders = curatedProviders.filter((provider) =>
        getProviderSkills(provider).some((skill) => categoryMatches(category.name, skill))
      );
      const matchingProjects = curatedProjects.filter((project) => categoryMatches(category.name, project?.category || ""));
      const previewImage = matchingProviders
        .flatMap((provider) => (provider.portfolioPreview || []).flatMap((item) => item.images || []))
        .find(Boolean);

      return {
        ...category,
        providerCount: matchingProviders.length,
        projectCount: matchingProjects.length,
        averageRating: getAverageRating(matchingProviders),
        previewImage,
      };
    });
  }, [curatedProjects, curatedProviders]);

  const featuredCategoryCards = useMemo(() => {
    return [...categoryInsights]
      .sort((left, right) => (right.providerCount + right.projectCount) - (left.providerCount + left.projectCount))
      .slice(0, 4);
  }, [categoryInsights]);

  const leadProject = curatedProjects[0] || null;

  const leadProjectImage = useMemo(() => {
    if (!leadProject) {
      return heroMediaItems[0]?.src || "/hero-home.jpg";
    }

    const matchingCategory = categoryInsights.find((category) => categoryMatches(category.name, leadProject.category || ""));
    return matchingCategory?.previewImage || heroMediaItems[0]?.src || "/hero-home.jpg";
  }, [categoryInsights, heroMediaItems, leadProject]);

  const spotlightProviders = useMemo(() => {
    return curatedProviders.slice(0, 3);
  }, [curatedProviders]);

  const resourceCards = useMemo(() => {
    const fallbackImages = [
      featuredCategoryCards[0]?.previewImage || heroMediaItems[1]?.src || "/hero-home.jpg",
      featuredCategoryCards[1]?.previewImage || heroMediaItems[2]?.src || "/hero-home.jpg",
      featuredCategoryCards[2]?.previewImage || heroMediaItems[3]?.src || "/hero-home.jpg",
    ];

    return RESOURCE_GUIDES.map((guide, index) => ({
      ...guide,
      image: fallbackImages[index],
    }));
  }, [featuredCategoryCards, heroMediaItems]);

  const handleHeroSearch = (event) => {
    event.preventDefault();

    const params = new URLSearchParams();
    if (serviceNeeded.trim()) params.set("category", serviceNeeded.trim());
    if (locationQuery.trim()) params.set("zipcode", locationQuery.trim());

    navigate(`/projects/post${params.toString() ? `?${params.toString()}` : ""}`);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (serviceNeeded.trim()) params.set("category", serviceNeeded.trim());
    if (locationQuery.trim()) params.set("zipcode", locationQuery.trim());
    navigate(`/projects/post${params.toString() ? `?${params.toString()}` : ""}`);
  };

  const features = [
    {
      title: "Verified Professionals",
      description: "All providers are background checked with verified ratings from real customers.",
      icon: ShieldCheck,
    },
    {
      title: "Compare Quotes",
      description: "Get multiple quotes side-by-side to compare pricing, availability, and credentials.",
      icon: Briefcase,
    },
    {
      title: "Secure Messaging",
      description: "Communicate directly with pros in a secure, organized messaging system.",
      icon: Shield,
    },
  ];

  const testimonials = [
    {
      quote: "Found a reliable electrician within hours. The platform makes everything transparent and easy.",
      author: "Sarah M.",
      role: "Homeowner, Bergen County",
      rating: 5,
    },
    {
      quote: "As a contractor, this platform lets me focus on growing my business instead of hunting for leads.",
      author: "John D.",
      role: "Plumbing Professional, Essex County",
      rating: 5,
    },
    {
      quote: "The quote comparison saved me hundreds. Highly recommend ServiceTones to anyone.",
      author: "Michelle R.",
      role: "Homeowner, Hudson County",
      rating: 5,
    },
  ];

  return (
    <AppShell theme="customer" navbarVariant="landing" contentClassName="pb-0">
      <Helmet>
        <title>ServiceTones | Find Verified New Jersey Pros In Minutes</title>
        <meta name="description" content="Find verified New Jersey professionals, compare reviews and pricing, and request quotes without endless calls." />
        <meta property="og:title" content="ServiceTones | Find Verified New Jersey Pros In Minutes" />
        <meta property="og:description" content="Browse local pros, compare quotes, and keep your home project in one clear marketplace flow." />
        <meta property="og:url" content="https://servicetones.com/" />
        <link rel="canonical" href="https://servicetones.com/" />
        <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700;800&family=Lora:wght@400;500;600&display=swap" rel="stylesheet" />
      </Helmet>

      {/* Hero Section */}
      <PremiumHero
        heading="Find Verified Local Professionals Instantly"
        subheading="Post your project, get matched with trusted providers, and compare quotes in one place. No endless phone calls needed."
        searchPlaceholder="What service do you need? (e.g., Plumbing, Electrical)"
        ctaText="Search"
        onSearch={handleSearch}
      />

      {/* Features Section */}
      <PremiumFeatures
        features={features}
        title="Why Choose ServiceTones"
        description="A marketplace built for trust, transparency, and convenience"
      />

      {/* Service Categories Section */}
      <ServiceCategoriesGrid />

      {/* How It Works Section */}
      <section className="py-20 md:py-28 bg-gradient-to-b from-white to-slate-50">
        <div className="max-w-6xl mx-auto px-6 sm:px-10 lg:px-12">
          <div className="text-center mb-16 max-w-3xl mx-auto">
            <h2 className="text-4xl md:text-5xl font-bold text-deep-navy-800 mb-4" style={{ fontFamily: "'Playfair Display', serif" }}>
              Three Simple Steps
            </h2>
            <p className="text-lg text-deep-navy-500" style={{ fontFamily: "'Lora', serif" }}>
              Get matched with the right professional in minutes
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { num: "1", title: "Post Your Project", desc: "Tell us what you need and when. Just a few minutes." },
              { num: "2", title: "Get Instant Quotes", desc: "Verified pros respond with pricing within hours." },
              { num: "3", title: "Hire & Collaborate", desc: "Review profiles, compare quotes, and hire with confidence." },
            ].map((step) => (
              <div key={step.num} className="text-center">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-copper-500 to-copper-600 text-white font-bold text-xl flex items-center justify-center mx-auto mb-6">
                  {step.num}
                </div>
                <h3 className="text-2xl font-bold text-deep-navy-800 mb-3" style={{ fontFamily: "'Playfair Display', serif" }}>
                  {step.title}
                </h3>
                <p className="text-deep-navy-500" style={{ fontFamily: "'Lora', serif" }}>
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 md:py-28 bg-deep-navy-800 text-white">
        <div className="max-w-6xl mx-auto px-6 sm:px-10 lg:px-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {TRUST_STATS.map((stat) => (
              <div key={stat.label}>
                <div className="text-4xl font-bold text-primary mb-2">{stat.value}</div>
                <p className="text-deep-navy-200" style={{ fontFamily: "'Lora', serif" }}>{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <PremiumTestimonials
        testimonials={testimonials}
        title="Trusted by Our Community"
      />

      {/* Final CTA */}
      <PremiumCTA
        heading="Ready to get started?"
        description="Join thousands of homeowners and professionals building trust on ServiceTones"
        ctaText="Post a Project"
        secondaryText="Browse Professionals"
        onCta={() => navigate("/projects/post")}
        onSecondary={() => navigate("/providers")}
      />

      {/* Footer */}
      <footer className="bg-deep-navy-800 text-white py-16">
        <div className="max-w-6xl mx-auto px-6 sm:px-10 lg:px-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
            <div>
              <h3 className="font-bold text-lg mb-4" style={{ fontFamily: "'Playfair Display', serif" }}>ServiceTones</h3>
              <p className="text-slate-400 text-sm" style={{ fontFamily: "'Lora', serif" }}>
                Connecting New Jersey homeowners with verified local professionals.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">For Homeowners</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li><Link to="/projects/post" className="hover:text-white transition">Post a Project</Link></li>
                <li><Link to="/providers" className="hover:text-white transition">Browse Pros</Link></li>
                <li><a href="#" className="hover:text-white transition">How It Works</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">For Professionals</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li><Link to="/auth?mode=register" className="hover:text-white transition">Become a Pro</Link></li>
                <li><Link to="/subscription" className="hover:text-white transition">Pricing</Link></li>
                <li><a href="#" className="hover:text-white transition">Resources</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li><Link to="/privacy" className="hover:text-white transition">Privacy</Link></li>
                <li><Link to="/terms" className="hover:text-white transition">Terms</Link></li>
                <li><a href="mailto:support@servicetones.com" className="hover:text-white transition">Contact</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-deep-navy-600 pt-8 text-center text-sm text-slate-400">
            <p>&copy; 2024 ServiceTones. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </AppShell>
  );
}
