import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useNavigate } from "react-router-dom";
import { AppShell } from "../components/AppShell";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar";
import { Badge } from "../components/ui/badge";
import { Card, CardContent } from "../components/ui/card";
import axios from "axios";
import {
  Briefcase,
  CheckCircle,
  Fan,
  Hammer,
  House,
  MapPin,
  Paintbrush,
  Search,
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
    accent: "bg-amber-100 text-amber-700",
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
    accent: "bg-slate-100 text-slate-700",
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

  return (
    <AppShell theme="customer" navbarVariant="landing" contentClassName="pb-0">
      <Helmet>
        <title>ServiceTones | Find Verified New Jersey Pros In Minutes</title>
        <meta name="description" content="Find verified New Jersey professionals, compare reviews and pricing, and request quotes without endless calls." />
        <meta property="og:title" content="ServiceTones | Find Verified New Jersey Pros In Minutes" />
        <meta property="og:description" content="Browse local pros, compare quotes, and keep your home project in one clear marketplace flow." />
        <meta property="og:url" content="https://servicetones.com/" />
        <link rel="canonical" href="https://servicetones.com/" />
      </Helmet>

      <section className="relative overflow-hidden bg-slate-950 text-white">
        <img
          src={heroMediaItems[0]?.src || "/hero-home.jpg"}
          alt={heroMediaItems[0]?.alt || "Local home service work in New Jersey"}
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(15,23,42,0.88)_0%,rgba(15,23,42,0.66)_46%,rgba(15,23,42,0.24)_100%)]" />

        <div className="relative">
          <div className={`${sectionShell} grid gap-8 py-10 sm:py-12 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-end lg:py-16`}>
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/14 bg-white/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/88 backdrop-blur-sm">
                <ShieldCheck className="h-3.5 w-3.5" />
                Verified New Jersey marketplace
              </div>
              <h1 className="mt-5 font-heading text-[clamp(2.8rem,5.4vw,4.9rem)] font-extrabold leading-[0.92] tracking-[-0.06em] text-white">
                Find Verified New Jersey Pros In Minutes.
              </h1>
              <p className="mt-4 max-w-2xl text-lg leading-8 text-white/76 sm:text-xl">
                Compare trusted local professionals, review pricing and ratings, and request quotes without the usual phone-tag.
              </p>

              <form onSubmit={handleHeroSearch} className="mt-8 grid gap-3 rounded-[1.3rem] bg-white p-3 shadow-[0_28px_64px_-38px_rgba(15,23,42,0.42)] lg:grid-cols-[minmax(0,1fr)_10rem_14rem]">
                <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-background px-4 py-3.5">
                  <Search className="h-4 w-4 text-muted-foreground" />
                  <Input
                    list="landing-service-options"
                    value={serviceNeeded}
                    onChange={(event) => setServiceNeeded(event.target.value)}
                    placeholder="What service do you need?"
                    className="h-auto border-0 bg-transparent px-0 py-0 text-base text-foreground shadow-none focus-visible:ring-0"
                  />
                </div>
                <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-background px-4 py-3.5">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <Input
                    value={locationQuery}
                    onChange={(event) => setLocationQuery(event.target.value)}
                    placeholder="ZIP code"
                    className="h-auto border-0 bg-transparent px-0 py-0 text-base text-foreground shadow-none focus-visible:ring-0"
                  />
                </div>
                <Button type="submit" size="lg" className="min-h-14 rounded-xl bg-[linear-gradient(90deg,#ff5a1f_0%,#ff8a00_100%)] text-base font-semibold text-white shadow-[0_20px_40px_-24px_rgba(255,120,31,0.54)] hover:opacity-95">
                  Get Free Quotes
                </Button>
                <datalist id="landing-service-options">
                  {MARKETPLACE_CATEGORIES.map((category) => (
                    <option key={category.name} value={category.name} />
                  ))}
                </datalist>
              </form>

              <div className="mt-4 flex flex-wrap gap-2.5 text-sm text-white/72">
                {TRUST_POINTS.map((point) => (
                  <span key={point} className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/10 px-3.5 py-2 backdrop-blur-sm">
                    <CheckCircle className="h-4 w-4 text-white" />
                    {point}
                  </span>
                ))}
              </div>

              <div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {TRUST_STATS.map((stat) => (
                  <div key={stat.label} className="rounded-[1.1rem] border border-white/12 bg-white/10 px-4 py-4 backdrop-blur-sm">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-2xl font-bold tracking-[-0.05em] text-white">{stat.value}</p>
                        <p className="mt-1 text-sm text-white/72">{stat.label}</p>
                      </div>
                      <stat.icon className="h-5 w-5 text-white/86" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="hidden lg:block">
              <div className="rounded-[1.7rem] border border-white/12 bg-white/10 p-5 backdrop-blur-md">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/62">How ServiceTones works</p>
                <div className="mt-4 space-y-3 rounded-[1.3rem] bg-white/96 p-4 text-slate-900">
                  {WHY_HOMEOWNERS.map((item) => (
                    <div key={item.title} className="rounded-xl border border-border/60 px-4 py-3">
                      <p className="text-sm font-semibold">{item.title}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{item.copy}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-12 sm:py-14" id="popular-categories">
        <div className={sectionShell}>
          <div className="text-center">
            <h2 className="text-3xl font-semibold tracking-[-0.05em] text-foreground sm:text-4xl">
              Popular services
            </h2>
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {MARKETPLACE_CATEGORIES.slice(0, 6).map((category) => (
              <button
                key={category.name}
                type="button"
                onClick={() => navigate(`/providers?category=${encodeURIComponent(category.name)}`)}
                className="flex items-center gap-3 rounded-lg border border-border/60 bg-white p-4 transition hover:border-primary/30 hover:bg-primary/5"
              >
                <span className={`inline-flex h-10 w-10 items-center justify-center rounded-lg ${category.accent}`}>
                  <category.icon className="h-5 w-5" />
                </span>
                <span className="text-left">
                  <p className="font-medium text-foreground">{category.name}</p>
                  <p className="text-xs text-muted-foreground">Verified pros</p>
                </span>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="py-12 sm:py-14 bg-muted/35" id="how-it-works">
        <div className={sectionShell}>
          <div className="text-center">
            <h2 className="text-3xl font-semibold tracking-[-0.05em] text-foreground sm:text-4xl">
              How it works
            </h2>
          </div>

          <div className="mt-10 grid gap-8 sm:grid-cols-3">
            {[
              {
                step: "1",
                title: "Post your job",
                description: "Tell us what you need in just a few details."
              },
              {
                step: "2", 
                title: "Get matched",
                description: "Local professionals respond with quotes within hours."
              },
              {
                step: "3",
                title: "Hire with confidence",
                description: "Review ratings and hire verified pros. Enjoy secure messaging."
              }
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary text-white font-semibold">
                  {item.step}
                </div>
                <h3 className="mt-4 font-semibold text-foreground">{item.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>



      <section className="py-12 sm:py-14" id="final-cta">
        <div className={sectionShell}>
          <div className="rounded-lg border border-primary bg-primary/5 px-6 py-8 text-center sm:px-8 sm:py-10">
            <h2 className="text-2xl font-semibold tracking-[-0.05em] text-foreground sm:text-3xl">Ready to get started?</h2>
            <p className="mt-3 text-base text-muted-foreground">Post your project or browse verified professionals today.</p>
            <div className="mt-6 flex flex-col gap-3 justify-center sm:flex-row">
              <Button size="lg" className="rounded-lg" onClick={() => navigate("/projects/post")}>
                Post a project
              </Button>
              <Button size="lg" variant="outline" className="rounded-lg" onClick={() => navigate("/providers")}>
                Browse providers
              </Button>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-border/60 bg-white py-12 text-foreground/70">
        <div className={sectionShell}>
          <div className="grid gap-10 lg:grid-cols-[minmax(0,1.3fr)_repeat(3,minmax(0,1fr))]">
            <div>
              <div className="mb-4 flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white shadow-[0_16px_30px_-20px_hsl(var(--primary)/0.72)]">
                  <span className="text-sm font-bold">S</span>
                </div>
                <span className="font-heading font-bold text-foreground">ServiceTones</span>
              </div>
              <p className="max-w-md text-sm leading-6">A New Jersey marketplace for posting home projects, comparing quotes, and hiring verified local professionals.</p>
            </div>

            <div>
              <h4 className="mb-4 font-semibold text-foreground">Homeowners</h4>
              <ul className="space-y-2 text-sm">
                <li><Link to="/projects/post" className="transition-colors hover:text-foreground">Post a project</Link></li>
                <li><Link to="/providers" className="transition-colors hover:text-foreground">Browse providers</Link></li>
                <li><a href="/#popular-categories" className="transition-colors hover:text-foreground">Categories</a></li>
                <li><a href="/#resources" className="transition-colors hover:text-foreground">Resources</a></li>
              </ul>
            </div>

            <div>
              <h4 className="mb-4 font-semibold text-foreground">Professionals</h4>
              <ul className="space-y-2 text-sm">
                <li><Link to="/projects" className="transition-colors hover:text-foreground">Find projects</Link></li>
                <li><Link to="/auth?mode=register" className="transition-colors hover:text-foreground">Become a pro</Link></li>
                <li><Link to="/subscription" className="transition-colors hover:text-foreground">Pricing</Link></li>
                <li><a href="/#coverage" className="transition-colors hover:text-foreground">County coverage</a></li>
              </ul>
            </div>

            <div>
              <h4 className="mb-4 font-semibold text-foreground">Support</h4>
              <ul className="space-y-2 text-sm">
                <li><Link to="/terms" className="transition-colors hover:text-foreground">Terms of Service</Link></li>
                <li><Link to="/privacy" className="transition-colors hover:text-foreground">Privacy Policy</Link></li>
                <li><a href="mailto:support@servicetones.com" className="transition-colors hover:text-foreground">Contact us</a></li>
                <li><a href="/#explore" className="transition-colors hover:text-foreground">Explore projects</a></li>
              </ul>
            </div>
          </div>

          <div className="mt-12 border-t border-border/60 pt-4 text-center text-sm text-muted-foreground">
            <p>&copy; 2024 ServiceTones. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </AppShell>
  );
}
