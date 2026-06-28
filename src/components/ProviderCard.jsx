import React from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Heart, MapPin, Star, CheckCircle, Shield, MessageSquare } from "lucide-react";
import { cn } from "../lib/utils";

export function ProviderCard({
  provider,
  onFavoriteToggle,
  user,
  showSaveButton = true,
}) {
  const profileUrl = `/profile/${provider.id}`;
  const avatarUrl = provider.avatar_url || "https://via.placeholder.com/80";
  const isFavorited = provider.is_favorited || false;

  // Mock testimonial data (would come from provider data in production)
  const testimonial = {
    author: "Customer",
    text: "Excellent service and professional work. Highly recommended.",
  };

  return (
    <Card className="border border-deep-navy-200 bg-white rounded-lg hover:shadow-xl transition-all w-full">
      <CardContent className="p-5 sm:p-6">
        {/* Full-width Thumbtack-style layout */}
        <div className="flex flex-col md:flex-row md:items-stretch gap-6 md:gap-8">
          
          {/* LEFT: Logo/Branding Area */}
          <div className="flex items-start gap-3 flex-shrink-0">
            <img
              src={avatarUrl}
              alt={provider.name}
              className="w-20 h-20 rounded-lg object-cover flex-shrink-0 border border-deep-navy-100"
            />
            <div className="min-w-0">
              <Link
                to={profileUrl}
                className="group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 rounded inline-block"
              >
                <h2 className="text-lg font-bold text-deep-navy-900 group-hover:text-cyan-600 line-clamp-2">
                  {provider.name}
                </h2>
              </Link>
              {provider.website && (
                <p className="text-sm text-deep-navy-600 truncate hover:text-deep-navy-800 mt-1">
                  {provider.website}
                </p>
              )}
            </div>
          </div>

          {/* CENTER: Main Info */}
          <div className="flex-1 border-b md:border-b-0 md:border-l md:border-r border-deep-navy-100 pb-6 md:pb-0 md:px-6">
            {/* Rating Row */}
            <div className="flex items-center gap-4 mb-4">
              <div className="flex items-center gap-2">
                {provider.rating ? (
                  <>
                    <div className="flex gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={cn(
                            "h-4 w-4",
                            i < Math.floor(provider.rating)
                              ? "fill-cyan-500 text-cyan-500"
                              : "fill-gray-200 text-gray-200"
                          )}
                        />
                      ))}
                    </div>
                    <span className="text-lg font-bold text-cyan-600">
                      Exceptional {provider.rating.toFixed(1)}
                    </span>
                    <span className="text-sm text-deep-navy-600 ml-1">
                      ({provider.review_count || 0})
                    </span>
                  </>
                ) : (
                  <span className="text-sm text-deep-navy-500">No reviews yet</span>
                )}
              </div>
              {provider.verified && (
                <Badge className="bg-cyan-50 text-cyan-700 border border-cyan-200">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Great value
                </Badge>
              )}
            </div>

            {/* Key Info Row: Hires + Location + Response */}
            <div className="space-y-2 text-sm text-deep-navy-700 mb-4">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-deep-navy-500 flex-shrink-0" />
                <span>{provider.hires_count || 0} hires on AllServices</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-deep-navy-500 flex-shrink-0" />
                <span>Serves {provider.location || "Multiple areas"}</span>
              </div>
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-deep-navy-500 flex-shrink-0" />
                <span>Responds in about {provider.response_time || "2-4 hours"}</span>
              </div>
            </div>

            {/* Testimonial */}
            <div className="bg-deep-navy-50 rounded-lg p-4 mt-4">
              <p className="text-sm text-deep-navy-700 italic mb-2">
                "{testimonial.text}"
              </p>
              <p className="text-xs font-semibold text-deep-navy-600">
                — {testimonial.author}
              </p>
              <Link
                to={profileUrl}
                className="text-xs font-semibold text-cyan-600 hover:text-cyan-700 mt-2 inline-block"
              >
                See more
              </Link>
            </div>
          </div>

          {/* RIGHT: Price + CTA */}
          <div className="flex flex-col items-end justify-between flex-shrink-0 md:w-48">
            {/* Price */}
            <div className="text-right mb-4 md:mb-0">
              <p className="text-sm text-deep-navy-600">Starting price</p>
              <p className="text-3xl font-bold text-deep-navy-900">
                ${provider.starting_price || "—"}
              </p>
            </div>

            {/* Action Buttons - Vertical Stack */}
            <div className="flex flex-col gap-2 w-full md:w-auto">
              <Button
                asChild
                className="rounded-lg bg-cyan-500 hover:bg-cyan-600 text-white font-semibold text-sm px-6 py-2.5 w-full md:w-48"
              >
                <Link to={profileUrl}>View profile</Link>
              </Button>
              {showSaveButton && (
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    onFavoriteToggle?.(provider.id);
                  }}
                  className="p-2 text-sm font-medium transition-colors rounded-lg hover:bg-deep-navy-50 flex items-center justify-center gap-1.5"
                  title={isFavorited ? "Remove from saved" : "Save provider"}
                >
                  <Heart
                    className={cn(
                      "h-5 w-5",
                      isFavorited
                        ? "fill-red-500 text-red-500"
                        : "text-deep-navy-400 hover:text-red-500"
                    )}
                  />
                </button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
