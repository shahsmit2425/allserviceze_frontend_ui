export function HowItWorks() {
  const steps = [
    {
      number: 1,
      title: 'Post Your Project',
      description: 'Tell us what service you need. Share details about your project timeline, budget, and requirements.',
      icon: '📝',
    },
    {
      number: 2,
      title: 'Get Matched',
      description: 'Our algorithm matches you with verified local professionals who fit your needs perfectly.',
      icon: '🎯',
    },
    {
      number: 3,
      title: 'Compare Quotes',
      description: 'Review quotes, ratings, and reviews from multiple service providers in your area.',
      icon: '📊',
    },
    {
      number: 4,
      title: 'Hire & Save',
      description: 'Choose your professional and save up to 40% compared to traditional hiring methods.',
      icon: '✓',
    },
  ];

  return (
    <section className="py-12 md:py-16 bg-white">
      <div className="mx-auto max-w-[96rem] px-4 sm:px-6 lg:px-10">
        {/* Section Header */}
        <div className="mb-10 text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-center text-balance mb-4" style={{ fontFamily: "'Poppins', sans-serif", color: '#1a1a1a' }}>
            How It Works
          </h2>
          <p className="text-lg text-deep-navy-600 max-w-2xl mx-auto" style={{ fontFamily: "'Poppins', sans-serif" }}>
            Four simple steps to find the perfect professional for your project
          </p>
        </div>

        {/* Steps Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((step) => (
            <div key={step.number} className="relative">
              {/* Step Card */}
              <div className="bg-white border-2 border-deep-navy-100 rounded-2xl p-8 h-full hover:border-copper-500 transition-colors duration-300">
                {/* Step Number Circle */}
                <div className="absolute top-0 left-8 transform -translate-y-1/2">
                  <div className="w-14 h-14 rounded-full bg-gradient-to-r from-copper-500 to-copper-600 flex items-center justify-center shadow-lg">
                    <span className="text-2xl font-bold text-white">{step.number}</span>
                  </div>
                </div>

                {/* Icon */}
                <div className="text-5xl mb-4 mt-6">{step.icon}</div>

                {/* Title */}
                <h3 className="text-xl font-bold text-deep-navy-800 mb-3" style={{ fontFamily: "'Poppins', sans-serif" }}>
                  {step.title}
                </h3>

                {/* Description */}
                <p className="text-deep-navy-600 leading-relaxed" style={{ fontFamily: "'Poppins', sans-serif" }}>
                  {step.description}
                </p>
              </div>

              {/* Connector Line (hidden on last item) */}
              {step.number < 4 && (
                <div className="hidden lg:block absolute top-1/2 -right-8 w-8 h-0.5 bg-gradient-to-r from-copper-300 to-transparent" />
              )}
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
