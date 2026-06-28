import { Star } from "lucide-react";

export function PremiumTestimonials({ testimonials, title }) {
  return (
    <section className="py-20 md:py-28 bg-white">
      <div className="max-w-6xl mx-auto px-6 sm:px-10 lg:px-12">
        {/* Section Header */}
        <div className="text-center mb-16 max-w-2xl mx-auto">
          <h2 
            className="text-4xl md:text-5xl font-bold text-deep-navy-800 mb-4"
            style={{ fontFamily: "'Playfair Display', serif" }}
          >
            {title || "Loved by our community"}
          </h2>
          <p className="text-lg text-deep-navy-500" style={{ fontFamily: "'Lora', serif" }}>
            See what verified professionals and customers say about us
          </p>
        </div>

        {/* Testimonials Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {testimonials.map((testimonial, idx) => (
            <div 
              key={idx} 
              className="p-8 rounded-2xl border border-deep-navy-100 bg-white hover:shadow-lg transition-all duration-300 hover:border-primary/50"
            >
              {/* Rating */}
              <div className="flex gap-1 mb-4">
                {[...Array(testimonial.rating || 5)].map((_, i) => (
                  <Star key={i} className="h-5 w-5 fill-primary text-primary" />
                ))}
              </div>

              {/* Quote */}
              <p 
                className="text-deep-navy-600 mb-6 leading-relaxed"
                style={{ fontFamily: "'Lora', serif" }}
              >
                "{testimonial.quote}"
              </p>

              {/* Author */}
              <div className="flex items-center gap-4">
                {testimonial.avatar && (
                  <img 
                    src={testimonial.avatar} 
                    alt={testimonial.author}
                    className="h-12 w-12 rounded-full object-cover"
                  />
                )}
                <div>
                  <p className="font-semibold text-deep-navy-800">{testimonial.author}</p>
                  <p className="text-sm text-deep-navy-500">{testimonial.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
