import React from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Heart, MapPin, Star, CheckCircle } from "lucide-react";
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

  return (
    <Card className="border border-deep-navy-100 bg-white rounded-lg hover:shadow-lg hover:border-copper-300 transition-all">
      <CardContent className="p-4 sm:p-5">
        {/* Horizontal Layout: Left | Center Metrics | Right Actions */}
        <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-6">
          
          {/* LEFT SECTION: Avatar + Name/Rating + Website + Location */}
          <div className="flex gap-3 flex-shrink-0 md:w-56">
            <img
              src={avatarUrl}
              alt={provider.name}
              className="w-14 h-14 md:w-16 md:h-16 rounded-lg object-cover flex-shrink-0 border border-deep-navy-100"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <Link
                  to={profileUrl}
                  className="group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-copper-500 rounded"
                >
                  <h3 className="text-sm font-bold text-deep-navy-900 group-hover:text-copper-600">
                    {provider.name}
                  </h3>
                </Link>
                {provider.verified && (
                  <CheckCircle className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                )}
              </div>
              {provider.website && (
                <p className="text-xs text-deep-navy-500 truncate hover:text-deep-navy-700">
                  <a href={provider.website} target="_blank" rel="noopener noreferrer">
                    {provider.website}
                  </a>
                </p>
              )}
              {provider.location && (
                <div className="flex items-center gap-1 text-xs text-deep-navy-600 mt-1">
                  <MapPin className="h-3 w-3 text-deep-navy-500 flex-shrink-0" />
                  <span>{provider.location}</span>
                </div>
              )}
            </div>
          </div>

          {/* CENTER SECTION: 4-Column Metrics Grid */}
          <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 py-3 px-3 md:px-4 md:py-0 md:border-l md:border-r border-deep-navy-50">
            {/* Column 1: Experience/Rating */}
            <div className="text-center md:text-left">
              <p className="text-xs font-medium text-deep-navy-500 uppercase tracking-wider">Rating</p>
              <div className="flex items-center justify-center md:justify-start gap-1 mt-1">
                {provider.rating ? (
                  <>
                    <Star className="h-4 w-4 fill-copper-500 text-copper-500" />
                    <span className="text-sm font-bold text-deep-navy-800">{provider.rating.toFixed(1)}</span>
                  </>
                ) : (
                  <span className="text-sm text-deep-navy-500">N/A</span>
                )}
              </div>
            </div>

            {/* Column 2: Tasks Completed */}
            <div className="text-center md:text-left">
              <p className="text-xs font-medium text-deep-navy-500 uppercase tracking-wider">Tasks</p>
              <p className="text-sm font-bold text-copper-600 mt-1">{provider.tasks_completed || 0}</p>
            </div>

            {/* Column 3: Status */}
            <div className="text-center md:text-left">
              <p className="text-xs font-medium text-deep-navy-500 uppercase tracking-wider">Status</p>
              <Badge
                className={cn(
                  "mt-1 text-xs",
                  provider.online ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
                )}
              >
                {provider.online ? "Online" : "Offline"}
              </Badge>
            </div>

            {/* Column 4: Hours */}
            <div className="text-center md:text-left">
              <p className="text-xs font-medium text-deep-navy-500 uppercase tracking-wider">Hours</p>
              <p className="text-sm font-bold text-copper-600 mt-1">{provider.hours || 0}</p>
            </div>
          </div>

          {/* RIGHT SECTION: Skills + Actions */}
          <div className="flex flex-col gap-3 flex-shrink-0 md:w-56">
            {/* Skills Section */}
            {provider.skills && provider.skills.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {provider.skills.slice(0, 3).map((skill) => (
                  <Badge key={skill} variant="outline" className="text-xs font-medium">
                    {skill}
                  </Badge>
                ))}
                {provider.skills.length > 3 && (
                  <Badge variant="outline" className="text-xs font-medium text-deep-navy-600">
                    +{provider.skills.length - 3}
                  </Badge>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2 flex-wrap md:flex-col">
              <Button
                asChild
                size="sm"
                className="flex-1 md:flex-none rounded-lg bg-gradient-to-r from-copper-500 to-copper-600 text-white hover:from-copper-600 hover:to-copper-700 font-semibold text-xs"
              >
                <Link to={profileUrl}>View Profile</Link>
              </Button>
              {showSaveButton && (
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    onFavoriteToggle?.(provider.id);
                  }}
                  className="p-2 text-xs font-medium transition-colors rounded-lg hover:bg-deep-navy-50 flex items-center justify-center md:justify-start gap-1"
                  title={isFavorited ? "Remove from saved" : "Save provider"}
                >
                  <Heart
                    className={cn(
                      "h-4 w-4",
                      isFavorited
                        ? "fill-red-500 text-red-500"
                        : "text-deep-navy-300 hover:text-red-400"
                    )}
                  />
                  <span className="hidden md:inline">{isFavorited ? "Saved" : "Save"}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
