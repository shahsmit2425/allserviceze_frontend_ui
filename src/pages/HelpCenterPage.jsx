import { Helmet } from "react-helmet-async";
import { useState } from "react";
import { AppShell } from "../components/AppShell";
import { PremiumHero } from "../components/premium/PremiumHero";
import { Input } from "../components/ui/input";
import { Card } from "../components/ui/card";
import { Search, ChevronDown, Mail, MessageSquare, BookOpen } from "lucide-react";

export default function HelpCenterPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedFaq, setExpandedFaq] = useState(null);

  const faqCategories = {
    "Getting Started": [
      {
        q: "How do I create an account?",
        a: "Click 'Sign Up' on the landing page, choose your role (Homeowner or Professional), and follow the registration steps. You'll need to verify your email before posting projects or bidding on work.",
      },
      {
        q: "Is ServiceTones really free for homeowners?",
        a: "Yes! Posting projects and browsing professionals is completely free. You only pay if you choose to upgrade to our Pro subscription for additional features.",
      },
      {
        q: "How long does verification take?",
        a: "For homeowners, your account is verified immediately. For professionals, verification takes 3-5 business days and includes background checks and document review.",
      },
    ],
    "For Homeowners": [
      {
        q: "How do I post a project?",
        a: "Log in to your account, click 'Post a Project', describe what you need, set your budget and timeline, then submit. Professionals will start responding within hours.",
      },
      {
        q: "How are professionals vetted?",
        a: "All professionals on ServiceTones undergo background checks, provide proof of licenses/insurance, and must maintain a 4.0+ rating. We also moderate all reviews.",
      },
      {
        q: "What if I'm not satisfied with the professional?",
        a: "You can message the professional to discuss concerns. Our support team is also available to help mediate if needed. We have a dispute resolution process for protected transactions.",
      },
      {
        q: "Is my personal information safe?",
        a: "Yes, we use industry-standard encryption and security measures. Your address is only shared with professionals you hire, and only after you confirm the booking.",
      },
    ],
    "For Professionals": [
      {
        q: "How do I start getting leads?",
        a: "Complete your business profile with photos, certifications, and service areas. Our algorithm will start matching you with projects. You can also search available projects actively.",
      },
      {
        q: "What's the commission on jobs?",
        a: "ServiceTones takes 0% commission. You keep 100% of what you earn. Premium subscription ($29.99/mo) gives you unlimited leads and priority visibility.",
      },
      {
        q: "How do payments work?",
        a: "You agree on pricing with the homeowner, then handle payment directly. We provide messaging tools and project management features, but don't handle payments.",
      },
      {
        q: "Can I control which projects I see?",
        a: "Yes! Set your service areas, skills, availability, and minimum project size. You'll only see projects matching your criteria.",
      },
    ],
    "Safety & Trust": [
      {
        q: "Are all professionals insured?",
        a: "We require professionals to carry liability insurance. Always ask for proof of current insurance before hiring anyone.",
      },
      {
        q: "What if someone cancels at the last minute?",
        a: "Our platform allows you to message and reschedule before work begins. We encourage clear communication through our messaging system.",
      },
      {
        q: "How do I report a problem?",
        a: "Use the report function in the message thread or contact our support team at support@servicetones.com. We take all reports seriously.",
      },
    ],
  };

  const filteredFaqs = searchQuery.trim()
    ? Object.entries(faqCategories).reduce((acc, [category, faqs]) => {
        const filtered = faqs.filter(
          (faq) =>
            faq.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
            faq.a.toLowerCase().includes(searchQuery.toLowerCase())
        );
        if (filtered.length > 0) {
          acc[category] = filtered;
        }
        return acc;
      }, {})
    : faqCategories;

  return (
    <AppShell theme="customer" navbarVariant="landing" contentClassName="pb-0">
      <Helmet>
        <title>Help Center | ServiceTones</title>
        <meta name="description" content="Get help with ServiceTones - FAQs, guides, and support." />
      </Helmet>

      {/* Hero */}
      <PremiumHero
        heading="How Can We Help?"
        subheading="Find answers to common questions or reach out to our support team"
      />

      {/* Search Section */}
      <section className="py-16 md:py-24 bg-gradient-to-b from-white to-amber-50 border-b border-slate-200">
        <div className="max-w-3xl mx-auto px-6 sm:px-10 lg:px-12">
          <div className="relative">
            <Search className="absolute left-4 top-4 h-5 w-5 text-slate-400" />
            <Input
              placeholder="Search help topics..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 h-12 rounded-xl border-slate-300"
            />
          </div>
        </div>
      </section>

      {/* FAQs */}
      <section className="py-20 md:py-32 bg-gradient-to-b from-amber-50 via-white to-slate-50">
        <div className="max-w-3xl mx-auto px-6 sm:px-10 lg:px-12">
          {Object.entries(filteredFaqs).map(([category, faqs]) => (
            <div key={category} className="mb-12">
              <h2 className="text-2xl font-bold text-slate-900 mb-6" style={{ fontFamily: "'Playfair Display', serif" }}>
                {category}
              </h2>
              <div className="space-y-4">
                {faqs.map((faq, idx) => (
                  <Card
                    key={idx}
                    className="p-6 cursor-pointer border-slate-200 hover:border-primary/50 hover:shadow-md transition-all"
                    onClick={() => setExpandedFaq(expandedFaq === `${category}-${idx}` ? null : `${category}-${idx}`)}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <h3 className="text-lg font-semibold text-slate-900 flex-1">
                        {faq.q}
                      </h3>
                      <ChevronDown
                        className={`h-5 w-5 text-slate-400 flex-shrink-0 mt-1 transition-transform ${
                          expandedFaq === `${category}-${idx}` ? "rotate-180" : ""
                        }`}
                      />
                    </div>
                    {expandedFaq === `${category}-${idx}` && (
                      <p className="text-slate-600 mt-4 leading-relaxed">{faq.a}</p>
                    )}
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Contact Section */}
      <section className="py-20 md:py-32 bg-gradient-to-b from-slate-50 via-white to-amber-50">
        <div className="max-w-4xl mx-auto px-6 sm:px-10 lg:px-12">
          <div className="text-center mb-16 max-w-2xl mx-auto">
            <h2 className="text-5xl md:text-6xl font-bold text-slate-900 mb-4" style={{ fontFamily: "'Playfair Display', serif" }}>
              Still need help?
            </h2>
            <p className="text-lg text-slate-600" style={{ fontFamily: "'Lora', serif" }}>
              Our support team is here for you
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="p-8 border-slate-200 hover:border-primary/50 hover:shadow-lg transition-all text-center">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Mail className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Email Support</h3>
              <p className="text-slate-600 mb-4">support@servicetones.com</p>
              <p className="text-sm text-slate-500">Average response time: 2 hours</p>
            </Card>

            <Card className="p-8 border-slate-200 hover:border-primary/50 hover:shadow-lg transition-all text-center">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <MessageSquare className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">In-App Chat</h3>
              <p className="text-slate-600 mb-4">Chat with our team</p>
              <p className="text-sm text-slate-500">Available Mon-Fri, 9am-5pm EST</p>
            </Card>

            <Card className="p-8 border-slate-200 hover:border-primary/50 hover:shadow-lg transition-all text-center">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <BookOpen className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900 mb-2">Guides & Articles</h3>
              <p className="text-slate-600 mb-4">Learn best practices</p>
              <p className="text-sm text-slate-500">Video tutorials and step-by-step guides</p>
            </Card>
          </div>
        </div>
      </section>
    </AppShell>
  );
}
