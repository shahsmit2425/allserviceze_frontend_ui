export function PremiumFeatures({ features, title, description }) {
  return (
    <section className="py-12 md:py-16 bg-white">
      <div className="max-w-6xl mx-auto px-6 sm:px-10 lg:px-12">
        {/* Section Header */}
        {title && (
          <div className="text-center mb-10 max-w-3xl mx-auto">
            <h2 
              className="text-4xl md:text-5xl font-bold text-deep-navy-800 mb-4"
              style={{ fontFamily: "'Playfair Display', serif" }}
            >
              {title}
            </h2>
            {description && (
              <p 
                className="text-lg text-deep-navy-500"
                style={{ fontFamily: "'Lora', serif" }}
              >
                {description}
              </p>
            )}
          </div>
        )}

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((feature, idx) => {
            const Icon = feature.icon;
            return (
              <div key={idx} className="group p-6 rounded-2xl border border-deep-navy-100 hover:border-primary hover:shadow-lg transition-all duration-300 bg-white hover:bg-white">
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  <Icon className="h-6 w-6 text-primary" />
                </div>
                <h3 
                  className="text-xl font-semibold text-deep-navy-800 mb-3"
                  style={{ fontFamily: "'Playfair Display', serif" }}
                >
                  {feature.title}
                </h3>
                <p className="text-deep-navy-500" style={{ fontFamily: "'Lora', serif" }}>
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
