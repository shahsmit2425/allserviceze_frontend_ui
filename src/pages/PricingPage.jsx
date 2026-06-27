import { Helmet } from "react-helmet-async";
import { useNavigate } from "react-router-dom";
import { AppShell } from "../components/AppShell";
import { PremiumHero } from "../components/premium/PremiumHero";
import { PremiumPricing } from "../components/premium/PremiumPricing";
import { PremiumCTA } from "../components/premium/PremiumCTA";
import { Card } from "../components/ui/card";
import { Check } from "lucide-react";

export default function PricingPage() {
  const navigate = useNavigate();

  const homeownerPlans = [
    {
      name: "Starter",
      price: "Free",
      period: "forever",
      description: "For occasional projects",
      cta: "Get Started",
      features: [
        "Post up to 3 projects",
        "Browse professionals",
        "Message matched pros",
        "View reviews & ratings",
        "Compare quotes",
      ],
    },
    {
      name: "Pro",
      price: "$9.99",
      period: "/month",
      description: "For multiple projects",
      cta: "Start Free Trial",
      featured: true,
      features: [
        "Unlimited project posts",
        "Priority pro matching",
        "Dedicated support",
        "Project history & archives",
        "Premium pro access",
        "Custom budget matching",
      ],
    },
    {
      name: "Premium",
      price: "$19.99",
      period: "/month",
      description: "For property managers",
      cta: "Contact Sales",
      features: [
        "Everything in Pro",
        "API access",
        "Custom integrations",
        "Team management",
        "Bulk project posting",
        "Priority support",
      ],
    },
  ];

  const providerPlans = [
    {
      name: "Starter",
      price: "Free",
      period: "forever",
      description: "Get started on the platform",
      cta: "Get Started",
      features: [
        "Profile setup",
        "Browse projects",
        "Send 5 quotes/month",
        "Verified badge",
        "Messaging",
      ],
    },
    {
      name: "Professional",
      price: "$29.99",
      period: "/month",
      featured: true,
      description: "Grow your business",
      cta: "Start 7-Day Trial",
      features: [
        "Unlimited quotes",
        "Lead generation",
        "Premium profile",
        "Priority visibility",
        "Mobile app access",
        "Advanced analytics",
      ],
    },
    {
      name: "Business",
      price: "$79.99",
      period: "/month",
      description: "Scale your operations",
      cta: "Contact Sales",
      features: [
        "Everything in Professional",
        "Team management",
        "Staff profiles",
        "Custom branding",
        "API access",
        "Dedicated account manager",
      ],
    },
  ];

  return (
    <AppShell theme="customer" navbarVariant="landing" contentClassName="pb-0">
      <Helmet>
        <title>Pricing | ServiceTones</title>
        <meta name="description" content="Simple, transparent pricing for homeowners and professionals." />
      </Helmet>

      {/* Hero */}
      <PremiumHero
        heading="Simple, Transparent Pricing"
        subheading="Choose the plan that works for you. No hidden fees, cancel anytime."
      />

      {/* Homeowner Plans */}
      <section className="py-20 md:py-32 bg-white">
        <div className="max-w-6xl mx-auto px-6 sm:px-10 lg:px-12 mb-20">
          <div className="text-center mb-16 max-w-3xl mx-auto">
            <h2 className="text-5xl md:text-6xl font-bold text-deep-navy-800 mb-4" style={{ fontFamily: "'Playfair Display', serif" }}>
              For Homeowners
            </h2>
            <p className="text-lg text-deep-navy-500" style={{ fontFamily: "'Lora', serif" }}>
              Post projects, find professionals, compare quotes
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {homeownerPlans.map((plan, idx) => (
              <div
                key={idx}
                className={`rounded-2xl p-8 border transition-all duration-300 ${
                  plan.featured
                    ? "border-primary bg-gradient-to-br from-copper-500 to-copper-600 text-white shadow-2xl transform md:scale-105"
                    : "border-deep-navy-100 bg-white hover:border-primary/50"
                }`}
              >
                {plan.featured && (
                  <div className="inline-block px-3 py-1 bg-primary text-white text-xs font-semibold rounded-full mb-4">
                    Most popular
                  </div>
                )}

                <h3 className={`text-2xl font-semibold mb-2 ${plan.featured ? "text-white" : "text-deep-navy-800"}`} style={{ fontFamily: "'Playfair Display', serif" }}>
                  {plan.name}
                </h3>

                <div className="mb-6">
                  <div className={`text-4xl font-bold ${plan.featured ? "text-white" : "text-deep-navy-800"}`}>
                    {plan.price}
                    <span className={`text-lg font-normal ${plan.featured ? "text-deep-navy-200" : "text-slate-500"}`}>
                      {plan.period}
                    </span>
                  </div>
                  <p className={`text-sm mt-2 ${plan.featured ? "text-deep-navy-200" : "text-deep-navy-500"}`}>
                    {plan.description}
                  </p>
                </div>

                <button
                  onClick={() => navigate("/auth?mode=register&role=customer")}
                  className={`w-full h-12 rounded-xl mb-8 font-semibold transition-all ${
                    plan.featured
                      ? "bg-white text-deep-navy-800 hover:bg-deep-navy-50"
                      : "bg-deep-navy-800 text-white hover:bg-deep-navy-700"
                  }`}
                >
                  {plan.cta}
                </button>

                <div className="space-y-4">
                  {plan.features.map((feature, fidx) => (
                    <div key={fidx} className="flex items-start gap-3">
                      <Check className={`h-5 w-5 flex-shrink-0 mt-0.5 ${plan.featured ? "text-copper-400" : "text-primary"}`} />
                      <span className={`text-sm ${plan.featured ? "text-deep-navy-100" : "text-deep-navy-500"}`}>
                        {feature}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Provider Plans */}
        <div className="max-w-6xl mx-auto px-6 sm:px-10 lg:px-12 border-t pt-20">
          <div className="text-center mb-16 max-w-3xl mx-auto">
            <h2 className="text-5xl md:text-6xl font-bold text-deep-navy-800 mb-4" style={{ fontFamily: "'Playfair Display', serif" }}>
              For Professionals
            </h2>
            <p className="text-lg text-deep-navy-500" style={{ fontFamily: "'Lora', serif" }}>
              Get leads, grow your business, manage operations
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {providerPlans.map((plan, idx) => (
              <div
                key={idx}
                className={`rounded-2xl p-8 border transition-all duration-300 ${
                  plan.featured
                    ? "border-primary bg-gradient-to-br from-copper-500 to-copper-600 text-white shadow-2xl transform md:scale-105"
                    : "border-deep-navy-100 bg-white hover:border-primary/50"
                }`}
              >
                {plan.featured && (
                  <div className="inline-block px-3 py-1 bg-primary text-white text-xs font-semibold rounded-full mb-4">
                    Most popular
                  </div>
                )}

                <h3 className={`text-2xl font-semibold mb-2 ${plan.featured ? "text-white" : "text-deep-navy-800"}`} style={{ fontFamily: "'Playfair Display', serif" }}>
                  {plan.name}
                </h3>

                <div className="mb-6">
                  <div className={`text-4xl font-bold ${plan.featured ? "text-white" : "text-deep-navy-800"}`}>
                    {plan.price}
                    <span className={`text-lg font-normal ${plan.featured ? "text-deep-navy-200" : "text-slate-500"}`}>
                      {plan.period}
                    </span>
                  </div>
                  <p className={`text-sm mt-2 ${plan.featured ? "text-deep-navy-200" : "text-deep-navy-500"}`}>
                    {plan.description}
                  </p>
                </div>

                <button
                  onClick={() => navigate("/auth?mode=register&role=provider")}
                  className={`w-full h-12 rounded-xl mb-8 font-semibold transition-all ${
                    plan.featured
                      ? "bg-white text-deep-navy-800 hover:bg-deep-navy-50"
                      : "bg-deep-navy-800 text-white hover:bg-deep-navy-700"
                  }`}
                >
                  {plan.cta}
                </button>

                <div className="space-y-4">
                  {plan.features.map((feature, fidx) => (
                    <div key={fidx} className="flex items-start gap-3">
                      <Check className={`h-5 w-5 flex-shrink-0 mt-0.5 ${plan.featured ? "text-copper-400" : "text-primary"}`} />
                      <span className={`text-sm ${plan.featured ? "text-deep-navy-100" : "text-deep-navy-500"}`}>
                        {feature}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 md:py-32 bg-white">
        <div className="max-w-3xl mx-auto px-6 sm:px-10 lg:px-12">
          <div className="text-center mb-16">
            <h2 className="text-5xl md:text-6xl font-bold text-deep-navy-800 mb-4" style={{ fontFamily: "'Playfair Display', serif" }}>
              Frequently Asked Questions
            </h2>
          </div>

          <div className="space-y-6">
            {[
              {
                q: "Can I cancel anytime?",
                a: "Yes, all subscriptions can be canceled at any time with no penalties or hidden fees.",
              },
              {
                q: "Is there a free trial?",
                a: "Homeowners get unlimited free posts on the Starter plan. Professionals get a 7-day free trial of Professional tier.",
              },
              {
                q: "What payment methods do you accept?",
                a: "We accept all major credit cards, debit cards, and digital payment methods.",
              },
              {
                q: "Can I switch plans anytime?",
                a: "Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately.",
              },
            ].map((item, idx) => (
              <Card key={idx} className="p-6 border-deep-navy-100 hover:border-primary/50 transition-all">
                <h3 className="text-lg font-semibold text-deep-navy-800 mb-2">{item.q}</h3>
                <p className="text-deep-navy-500">{item.a}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <PremiumCTA
        heading="Choose your plan and get started"
        description="Join thousands of homeowners and professionals on ServiceTones"
        ctaText="Post a Project"
        secondaryText="Become a Professional"
        onCta={() => navigate("/projects/post")}
        onSecondary={() => navigate("/auth?mode=register&role=provider")}
      />
    </AppShell>
  );
}
