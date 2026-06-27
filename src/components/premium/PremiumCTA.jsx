import { Button } from "@/components/ui/button";

export function PremiumCTA({ 
  heading, 
  description, 
  ctaText, 
  secondaryText,
  onCta,
  onSecondary,
  variant = "dark"
}) {
  const isDark = variant === "dark";

  return (
    <section className={`py-20 md:py-28 ${isDark ? "bg-gradient-to-r from-copper-500 to-copper-600 text-white" : "bg-gradient-to-r from-copper-50 to-slate-50"}`}>
      {/* Decorative elements */}
      {isDark && (
        <>
          <div className="absolute top-0 right-0 w-80 h-80 bg-primary/10 rounded-full blur-3xl opacity-20" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-copper-600/10 rounded-full blur-3xl opacity-20" />
        </>
      )}

      <div className={`relative z-10 max-w-4xl mx-auto px-6 sm:px-10 lg:px-12 text-center`}>
        <h2 
          className={`text-4xl md:text-5xl font-bold mb-6 ${isDark ? "text-white" : "text-deep-navy-800"}`}
          style={{ fontFamily: "'Playfair Display', serif" }}
        >
          {heading}
        </h2>

        {description && (
          <p 
            className={`text-lg md:text-xl mb-10 max-w-2xl mx-auto ${isDark ? "text-deep-navy-100" : "text-deep-navy-500"}`}
            style={{ fontFamily: "'Lora', serif" }}
          >
            {description}
          </p>
        )}

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button 
            onClick={onCta}
            className={`h-14 px-8 rounded-xl font-semibold transition-all ${
              isDark
                ? "bg-white text-deep-navy-800 hover:bg-deep-navy-50"
                : "bg-deep-navy-800 text-white hover:bg-deep-navy-700"
            }`}
          >
            {ctaText || "Get started"}
          </Button>
          
          {secondaryText && (
            <Button 
              onClick={onSecondary}
              variant="outline"
              className={`h-14 px-8 rounded-xl font-semibold ${
                isDark
                  ? "border-white text-white hover:bg-white/10"
                  : "border-deep-navy-200 text-deep-navy-800 hover:bg-deep-navy-50"
              }`}
            >
              {secondaryText}
            </Button>
          )}
        </div>
      </div>
    </section>
  );
}
