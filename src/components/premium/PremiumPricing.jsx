import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

export function PremiumPricing({ plans, title, description }) {
  return (
    <section className="py-20 md:py-28 bg-white">
      <div className="max-w-6xl mx-auto px-6 sm:px-10 lg:px-12">
        {/* Section Header */}
        <div className="text-center mb-16 max-w-2xl mx-auto">
          <h2 
            className="text-4xl md:text-5xl font-bold text-slate-900 mb-4"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            {title || "Simple, transparent pricing"}
          </h2>
          {description && (
            <p className="text-lg text-slate-600" style={{ fontFamily: "'Lora', serif" }}>
              {description}
            </p>
          )}
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {plans.map((plan, idx) => (
            <div 
              key={idx}
              className={`rounded-2xl p-8 border transition-all duration-300 ${
                plan.featured
                  ? "border-primary bg-gradient-to-br from-slate-900 to-slate-800 text-white shadow-2xl transform md:scale-105"
                  : "border-slate-200 bg-white hover:border-primary/50"
              }`}
            >
              {plan.featured && (
                <div className="inline-block px-3 py-1 bg-primary text-white text-xs font-semibold rounded-full mb-4">
                  Most popular
                </div>
              )}

              {/* Plan Name */}
              <h3 
                className={`text-2xl font-semibold mb-2 ${plan.featured ? "text-white" : "text-slate-900"}`}
                style={{ fontFamily: "'Playfair Display', serif" }}
              >
                {plan.name}
              </h3>

              {/* Price */}
              <div className="mb-6">
                <div className={`text-4xl font-bold ${plan.featured ? "text-white" : "text-slate-900"}`}>
                  {plan.price}
                  <span className={`text-lg font-normal ${plan.featured ? "text-slate-300" : "text-slate-500"}`}>
                    {plan.period}
                  </span>
                </div>
                {plan.description && (
                  <p className={`text-sm mt-2 ${plan.featured ? "text-slate-300" : "text-slate-600"}`}>
                    {plan.description}
                  </p>
                )}
              </div>

              {/* CTA Button */}
              <Button 
                className={`w-full h-12 rounded-xl mb-8 font-semibold transition-all ${
                  plan.featured
                    ? "bg-white text-slate-900 hover:bg-slate-100"
                    : "bg-slate-900 text-white hover:bg-slate-800"
                }`}
              >
                {plan.cta || "Get started"}
              </Button>

              {/* Features */}
              <div className="space-y-4">
                {plan.features.map((feature, fidx) => (
                  <div key={fidx} className="flex items-start gap-3">
                    <Check className={`h-5 w-5 flex-shrink-0 mt-0.5 ${plan.featured ? "text-amber-400" : "text-primary"}`} />
                    <span className={`text-sm ${plan.featured ? "text-slate-200" : "text-slate-600"}`}>
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
  );
}
