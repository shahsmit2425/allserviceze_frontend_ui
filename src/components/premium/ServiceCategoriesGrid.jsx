import { Link } from 'react-router-dom';

const ServiceCategoriesGrid = () => {
  const categories = [
    {
      id: 1,
      name: 'House Cleaning',
      bgColor: 'bg-gradient-to-br from-blue-400 to-blue-600',
      icon: '🧹',
    },
    {
      id: 2,
      name: 'Carpet Cleaning',
      bgColor: 'bg-gradient-to-br from-gray-700 to-gray-900',
      icon: '🧼',
    },
    {
      id: 3,
      name: 'Junk Removal',
      bgColor: 'bg-gradient-to-br from-amber-600 to-amber-800',
      icon: '♻️',
    },
    {
      id: 4,
      name: 'Pressure Washing',
      bgColor: 'bg-gradient-to-br from-green-500 to-green-700',
      icon: '💧',
    },
  ];

  return (
    <section className="py-12 md:py-16 bg-white">
      <div className="mx-auto max-w-[96rem] px-4 sm:px-6 lg:px-10">
        {/* Section Header */}
        <div className="mb-8 text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-center text-balance mb-4" style={{ fontFamily: "'Poppins', sans-serif", color: '#1a1a1a' }}>
            Popular Services
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto" style={{ fontFamily: "'Poppins', sans-serif" }}>
            Browse our most requested services from verified local professionals
          </p>
        </div>

        {/* Categories Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {categories.map((category) => (
            <Link
              key={category.id}
              to={`/browse/projects?service=${category.name.toLowerCase().replace(/\s+/g, '-')}`}
              className="group relative overflow-hidden rounded-2xl h-64 shadow-md hover:shadow-xl transition-all duration-300 hover:scale-105"
            >
              {/* Background Gradient */}
              <div className={`absolute inset-0 ${category.bgColor} opacity-90 group-hover:opacity-100 transition-opacity duration-300`}></div>

              {/* Content */}
              <div className="relative h-full flex flex-col justify-end p-6">
                {/* Icon */}
                <div className="text-5xl mb-4 group-hover:scale-110 transition-transform duration-300">
                  {category.icon}
                </div>

                {/* Category Name */}
                <h3 className="text-2xl md:text-3xl font-bold text-white" style={{ fontFamily: "'Poppins', sans-serif" }}>
                  {category.name}
                </h3>

                {/* Hover Arrow */}
                <div className="mt-4 flex items-center gap-2 text-white font-semibold opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <span>Explore</span>
                  <span className="text-2xl group-hover:translate-x-2 transition-transform duration-300">→</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ServiceCategoriesGrid;
