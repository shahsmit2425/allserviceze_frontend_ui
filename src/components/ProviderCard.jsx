import React from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Heart, MapPin, Star, CheckCircle, Shield, MessageSquare, Building2, Briefcase, DollarSign, MessageCircle, Award, FileCheck, User, Clock } from "lucide-react";
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
    <Card className="border border-deep-navy-200 bg-white rounded-xl hover:shadow-2xl transition-all w-full overflow-hidden">
      <CardContent className="p-6">
        <div className="flex flex-col lg:flex-row gap-6">
          
          {/* LEFT: Large Professional Photo */}
          <div className="relative flex-shrink-0 lg:w-72">
            <div className="relative rounded-2xl overflow-hidden aspect-square bg-gray-200">
              <img
                src={avatarUrl}
                alt={provider.name}
                className="w-full h-full object-cover"
              />
              {/* Available Now Badge */}
              <Badge className="absolute bottom-4 left-4 bg-green-50 text-green-700 border border-green-300 rounded-full px-3 py-1.5">
                <span className="w-2 h-2 bg-green-600 rounded-full mr-1.5" />
                Available now
              </Badge>
            </div>
          </div>

          {/* CENTER: Provider Info */}
          <div className="flex-1 border-b lg:border-b-0 lg:border-l lg:border-r border-deep-navy-100 pb-6 lg:pb-0 lg:px-6">
            {/* Name + Verification Badge */}
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-2xl font-bold text-deep-navy-900">{provider.name}</h2>
              <CheckCircle className="h-6 w-6 text-blue-500 fill-blue-100" />
            </div>

            {/* Specialization */}
            <p className="text-lg text-deep-navy-600 font-semibold mb-3">
              {provider.specialization || "Professional Services"}
            </p>

            {/* Service Type + Location */}
            <div className="flex flex-wrap items-center gap-4 mb-4 text-sm text-deep-navy-700">
              <div className="flex items-center gap-1.5">
                <Building2 className="h-4 w-4 text-deep-navy-600" />
                <span className="font-semibold">{provider.service_type || "Service"}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <MapPin className="h-4 w-4 text-deep-navy-600" />
                <span>{provider.location || "Multiple areas"}</span>
              </div>
            </div>

            {/* Verification Badges Row */}
            <div className="flex flex-wrap gap-3 mb-6">
              <Badge className="bg-green-50 text-green-700 border border-green-300 rounded-lg px-3 py-1.5 text-xs font-semibold">
                <CheckCircle className="h-3 w-3 mr-1" />
                Verified
              </Badge>
              <Badge className="bg-blue-50 text-blue-700 border border-blue-300 rounded-lg px-3 py-1.5 text-xs font-semibold">
                <CheckCircle className="h-3 w-3 mr-1" />
                ID checked
              </Badge>
              <Badge className="bg-orange-50 text-orange-700 border border-orange-300 rounded-lg px-3 py-1.5 text-xs font-semibold">
                <Clock className="h-3 w-3 mr-1" />
                Available now
              </Badge>
            </div>

            {/* 4-Column Metrics Grid */}
            <div className="grid grid-cols-4 gap-4 mb-6 py-6 border-y border-deep-navy-100">
              {/* Experience */}
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 mb-2">
                  <Award className="h-5 w-5 text-blue-600" />
                </div>
                <p className="text-xs font-semibold text-deep-navy-600 mb-1">Experience</p>
                <p className="text-sm font-bold text-deep-navy-900">
                  {provider.experience_years ? `${provider.experience_years}+ years` : "Newly listed"}
                </p>
                <p className="text-xs text-deep-navy-500 mt-1">
                  {provider.experience_years ? "" : "Just joined"}
                </p>
              </div>

              {/* Jobs Completed */}
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 mb-2">
                  <Briefcase className="h-5 w-5 text-green-600" />
                </div>
                <p className="text-xs font-semibold text-deep-navy-600 mb-1">Jobs Completed</p>
                <p className="text-sm font-bold text-deep-navy-900">
                  {provider.jobs_completed || 0}
                </p>
                <p className="text-xs text-deep-navy-500 mt-1">
                  {provider.jobs_completed ? `${provider.jobs_completed} jobs` : "No completed jobs yet"}
                </p>
              </div>

              {/* Typical Pricing */}
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 mb-2">
                  <DollarSign className="h-5 w-5 text-orange-600" />
                </div>
                <p className="text-xs font-semibold text-deep-navy-600 mb-1">Typical Pricing</p>
                <p className="text-sm font-bold text-deep-navy-900">
                  ${provider.hourly_rate || 50}/hr
                </p>
                <p className="text-xs text-deep-navy-500 mt-1">Industry standard</p>
              </div>

              {/* Response Time */}
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 mb-2">
                  <MessageCircle className="h-5 w-5 text-purple-600" />
                </div>
                <p className="text-xs font-semibold text-deep-navy-600 mb-1">Response Time</p>
                <p className="text-sm font-bold text-deep-navy-900">
                  {provider.response_time || "Not published"}
                </p>
                <p className="text-xs text-deep-navy-500 mt-1">Typically replies –</p>
              </div>
            </div>

            {/* 3-Column Credentials */}
            <div className="grid grid-cols-3 gap-3">
              {/* Licenses */}
              <div className="flex items-start gap-2 p-3 bg-deep-navy-50 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-deep-navy-900">Licenses</p>
                  <p className="text-xs text-deep-navy-600">Shared on profile</p>
                </div>
              </div>

              {/* Document Check */}
              <div className="flex items-start gap-2 p-3 bg-deep-navy-50 rounded-lg">
                <FileCheck className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-deep-navy-900">Document Check</p>
                  <p className="text-xs text-deep-navy-600">Completed</p>
                </div>
              </div>

              {/* Member Since */}
              <div className="flex items-start gap-2 p-3 bg-deep-navy-50 rounded-lg">
                <User className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-deep-navy-900">Member Since</p>
                  <p className="text-xs text-deep-navy-600">
                    {provider.joined_date || "May 2024"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT: Price + CTAs */}
          <div className="flex flex-col items-start lg:items-end justify-between gap-4 flex-shrink-0 lg:w-56">
            {/* Save Button */}
            {showSaveButton && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  onFavoriteToggle?.(provider.id);
                }}
                className="ml-auto"
                title={isFavorited ? "Remove from saved" : "Save provider"}
              >
                <Heart
                  className={cn(
                    "h-6 w-6",
                    isFavorited
                      ? "fill-red-500 text-red-500"
                      : "text-deep-navy-400 hover:text-red-500"
                  )}
                />
              </button>
            )}

            {/* Starting Price */}
            <div className="text-right w-full lg:w-auto">
              <p className="text-sm text-deep-navy-600 font-medium mb-1">Starting Price</p>
              <p className="text-3xl font-bold text-deep-navy-900 mb-1">
                From ${provider.hourly_rate || 50}/hr
              </p>
              <p className="text-xs text-deep-navy-600">Industry standard</p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-2.5 w-full lg:w-auto">
              {/* Request Quote - Brown/Orange Gradient */}
              <Button
                asChild
                className="w-full lg:w-56 rounded-lg bg-gradient-to-r from-amber-700 to-orange-600 hover:from-amber-800 hover:to-orange-700 text-white font-bold text-base py-3"
              >
                <Link to={profileUrl}>Request Quote</Link>
              </Button>

              {/* View Profile */}
              <Button
                asChild
                variant="outline"
                className="w-full lg:w-56 rounded-lg border-deep-navy-300 text-deep-navy-900 font-semibold text-sm py-2.5"
              >
                <Link to={profileUrl} className="flex items-center justify-center gap-2">
                  <User className="h-4 w-4" />
                  View Profile
                </Link>
              </Button>

              {/* Message */}
              <Button
                asChild
                variant="outline"
                className="w-full lg:w-56 rounded-lg border-deep-navy-300 text-deep-navy-900 font-semibold text-sm py-2.5"
              >
                <Link to={`/messages/${provider.id}`} className="flex items-center justify-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Message
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
