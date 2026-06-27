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
    <section className={`py-20 md:py-28 ${isDark ? "bg-gradient-to-r from-slate-900 to-slate-800 text-white" : "bg-gradient-to-r from-amber-50 to-slate-50"}`}>
      {/* Decorative elements */}
      {isDark && (
        <>
          <div className="absolute top-0 right-0 w-80 h-80 bg-primary/10 rounded-full blur-3xl opacity-20" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-amber-600/10 rounded-full blur-3xl opacity-20" />
        </>
      )}

      <div className={`relative z-10 max-w-4xl mx-auto px-6 sm:px-10 lg:px-12 text-center`}>
        <h2 
          className={`text-4xl md:text-5xl font-bold mb-6 ${isDark ? "text-white" : "text-slate-900"}`}
          style={{ fontFamily: "'Playfair Display', serif" }}
        >
          {heading}
        </h2>

        {description && (
          <p 
            className={`text-lg md:text-xl mb-10 max-w-2xl mx-auto ${isDark ? "text-slate-200" : "text-slate-600"}`}
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
                ? "bg-white text-slate-900 hover:bg-slate-100"
                : "bg-slate-900 text-white hover:bg-slate-800"
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
                  : "border-slate-300 text-slate-900 hover:bg-slate-100"
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
