import { Button } from "@/components/ui/button";

export function PremiumHero({ 
  heading, 
  subheading, 
  cta,
  ctaText,
  secondaryCtaText
}) {
  return (
    <section className="relative overflow-hidden py-20 md:py-32 bg-white">
      {/* Decorative elements */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-copper-100/5 rounded-full blur-3xl" />
      
      <div className="relative z-10 max-w-4xl mx-auto px-6 sm:px-10 lg:px-12 text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 rounded-full border border-deep-navy-200/40 bg-white px-4 py-2 mb-8 shadow-sm">
          <span className="h-2 w-2 rounded-full bg-primary" />
          <span className="text-sm font-semibold text-deep-navy-600" style={{ fontFamily: "'Lora', serif" }}>
            Trusted by 15,000+ professionals
          </span>
        </div>

        {/* Main Heading */}
        <h1 
          className="text-5xl md:text-6xl lg:text-7xl font-bold text-deep-navy-800 mb-6 leading-tight"
          style={{ fontFamily: "'Playfair Display', serif" }}
        >
          {heading}
        </h1>

        {/* Subheading */}
        <p 
          className="text-xl md:text-2xl text-deep-navy-500 mb-10 max-w-3xl mx-auto leading-relaxed"
          style={{ fontFamily: "'Lora', serif" }}
        >
          {subheading}
        </p>

        {/* CTA Section */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
          <Button 
            onClick={cta}
            className="h-14 px-8 rounded-xl bg-gradient-to-r from-copper-500 to-copper-600 hover:from-copper-600 hover:to-copper-700 text-white font-semibold"
          >
            {ctaText || "Get Started"}
          </Button>
          {secondaryCtaText && (
            <Button 
              variant="outline"
              className="h-14 px-8 rounded-xl border-deep-navy-200 text-deep-navy-800 font-semibold hover:bg-white"
            >
              {secondaryCtaText}
            </Button>
          )}
        </div>
      </div>
    </section>
  );
}
