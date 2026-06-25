import { Helmet } from "react-helmet-async";
import { useNavigate } from "react-router-dom";
import { AppShell } from "../components/AppShell";
import { PremiumHero } from "../components/premium/PremiumHero";
import { PremiumFeatures } from "../components/premium/PremiumFeatures";
import { PremiumCTA } from "../components/premium/PremiumCTA";
import { Button } from "../components/ui/button";
import {
  Wrench, Zap, Sparkles, Paintbrush, Fan, House, Trees, Hammer,
  MapPin, Users, Star, CheckCircle
} from "lucide-react";

export default function ServicesPage() {
  const navigate = useNavigate();

  const services = [
    {
      icon: Wrench,
      title: "Plumbing",
      description: "Leaks, drains, fixtures, water heaters, and emergency repairs.",
      categories: 8,
      providers: 240,
    },
    {
      icon: Zap,
      title: "Electrical",
      description: "Panel upgrades, outlet installation, lighting, and troubleshooting.",
      categories: 6,
      providers: 189,
    },
    {
      icon: Paintbrush,
      title: "Painting",
      description: "Interior painting, exterior work, trim, and specialty finishes.",
      categories: 5,
      providers: 156,
    },
    {
      icon: Fan,
      title: "HVAC",
      description: "Heating, cooling, maintenance, tune-ups, and emergency service.",
      categories: 7,
      providers: 198,
    },
    {
      icon: House,
      title: "Roofing",
      description: "Repairs, inspections, leak detection, and full replacements.",
      categories: 6,
      providers: 124,
    },
    {
      icon: Sparkles,
      title: "Cleaning",
      description: "Residential cleaning, move-outs, deep cleans, and maintenance.",
      categories: 8,
      providers: 267,
    },
    {
      icon: Trees,
      title: "Landscaping",
      description: "Lawn care, planting, tree service, and outdoor design.",
      categories: 7,
      providers: 143,
    },
    {
      icon: Hammer,
      title: "Handyman",
      description: "General repairs, installations, punch lists, and small jobs.",
      categories: 9,
      providers: 312,
    },
  ];

  const whyChoose = [
    {
      icon: CheckCircle,
      title: "Vetted Professionals",
      description: "All service providers are background checked and verified.",
    },
    {
      icon: Star,
      title: "Real Reviews",
      description: "Authentic feedback from verified customers - no fake ratings.",
    },
    {
      icon: Users,
      title: "Community Driven",
      description: "Build trust with providers rated by thousands of homeowners.",
    },
  ];

  return (
    <AppShell theme="customer" navbarVariant="landing" contentClassName="pb-0">
      <Helmet>
        <title>Services | ServiceTones | Find Local Professionals</title>
        <meta name="description" content="Browse verified local professionals across 8+ service categories in New Jersey." />
      </Helmet>

      {/* Hero */}
      <PremiumHero
        heading="Find the Right Professional for Any Job"
        subheading="From plumbing to landscaping, we connect you with verified professionals across New Jersey"
      />

      {/* Services Grid */}
      <section className="py-20 md:py-32 bg-gradient-to-b from-amber-50 via-white to-slate-50">
        <div className="max-w-6xl mx-auto px-6 sm:px-10 lg:px-12">
          <div className="text-center mb-16 max-w-3xl mx-auto">
            <h2 className="text-5xl md:text-6xl font-bold text-slate-900 mb-4" style={{ fontFamily: "'Playfair Display', serif" }}>
              Services We Offer
            </h2>
            <p className="text-lg text-slate-600" style={{ fontFamily: "'Lora', serif" }}>
              Explore our most popular service categories with verified professionals
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {services.map((service) => {
              const Icon = service.icon;
              return (
                <button
                  key={service.title}
                  onClick={() => navigate(`/providers?category=${encodeURIComponent(service.title)}`)}
                  className="group p-6 rounded-2xl border border-slate-200 hover:border-primary hover:shadow-lg transition-all text-left hover:bg-slate-50"
                >
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">{service.title}</h3>
                  <p className="text-sm text-slate-600 mb-4">{service.description}</p>
                  <div className="flex items-center gap-4 text-xs text-slate-500">
                    <span>{service.providers} pros</span>
                    <span>&bull;</span>
                    <span>{service.categories} subcategories</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <PremiumFeatures
        features={whyChoose}
        title="Why Browse Services on ServiceTones"
        description="Quality assurance, transparency, and community trust"
      />

      {/* Stats */}
      <section className="py-20 md:py-28 bg-gradient-to-b from-white to-slate-900">
        <div className="max-w-6xl mx-auto px-6 sm:px-10 lg:px-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 text-center">
            <div>
              <div className="text-5xl font-bold text-amber-400 mb-2">15K+</div>
              <p className="text-white" style={{ fontFamily: "'Lora', serif" }}>Verified Professionals</p>
            </div>
            <div>
              <div className="text-5xl font-bold text-amber-400 mb-2">8</div>
              <p className="text-white" style={{ fontFamily: "'Lora', serif" }}>Major Service Categories</p>
            </div>
            <div>
              <div className="text-5xl font-bold text-amber-400 mb-2">4.8★</div>
              <p className="text-white" style={{ fontFamily: "'Lora', serif" }}>Average Rating</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <PremiumCTA
        heading="Ready to find a professional?"
        description="Post your project and get matched with verified providers instantly"
        ctaText="Post a Project"
        onCta={() => navigate("/projects/post")}
      />
    </AppShell>
  );
}
