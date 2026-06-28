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
    <Card className="border border-deep-navy-100 bg-white rounded-lg hover:shadow-lg hover:border-copper-300 transition-all h-full flex flex-col">
      <CardContent className="p-4 sm:p-5 flex flex-col flex-1">
        {/* Header: Avatar + Name/Rating + Website */}
        <div className="flex gap-3 mb-3">
          <img
            src={avatarUrl}
            alt={provider.name}
            className="w-16 h-16 rounded-lg object-cover flex-shrink-0 border border-deep-navy-100"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <Link
                to={profileUrl}
                className="group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-copper-500 rounded"
              >
                <h3 className="text-base font-semibold text-deep-navy-800 group-hover:text-copper-600 line-clamp-2">
                  {provider.name}
                </h3>
              </Link>
              {provider.rating && (
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Star className="h-4 w-4 fill-copper-500 text-copper-500" />
                  <span className="text-sm font-bold text-deep-navy-800">{provider.rating.toFixed(1)}</span>
                </div>
              )}
            </div>
            {provider.website && (
              <p className="text-xs text-deep-navy-500 truncate hover:text-deep-navy-700">
                <a href={provider.website} target="_blank" rel="noopener noreferrer">
                  {provider.website}
                </a>
              </p>
            )}
          </div>
        </div>

        {/* Location */}
        {provider.location && (
          <div className="flex items-center gap-1 mb-3 text-sm text-deep-navy-600">
            <MapPin className="h-4 w-4 text-deep-navy-500 flex-shrink-0" />
            <span>{provider.location}</span>
          </div>
        )}

        {/* Skills Section */}
        {provider.skills && provider.skills.length > 0 && (
          <div className="mb-3 pb-3 border-b border-deep-navy-50">
            <p className="text-xs font-medium text-deep-navy-500 mb-2">Skills</p>
            <div className="flex flex-wrap gap-2">
              {provider.skills.slice(0, 5).map((skill) => (
                <Badge key={skill} variant="outline" className="text-xs font-medium">
                  {skill}
                </Badge>
              ))}
              {provider.skills.length > 5 && (
                <Badge variant="outline" className="text-xs font-medium text-deep-navy-600">
                  +{provider.skills.length - 5}
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 mb-3 pb-3 border-b border-deep-navy-50">
          {/* Tasks Completed */}
          <div className="space-y-1">
            <p className="text-xs font-medium text-deep-navy-500">Tasks</p>
            <p className="text-sm font-bold text-copper-600">{provider.tasks_completed || 0}</p>
          </div>

          {/* Hours */}
          <div className="space-y-1">
            <p className="text-xs font-medium text-deep-navy-500">Hours</p>
            <p className="text-sm font-bold text-copper-600">{provider.hours || 0}</p>
          </div>

          {/* Status */}
          <div className="space-y-1">
            <p className="text-xs font-medium text-deep-navy-500">Status</p>
            <Badge
              className={cn(
                provider.online ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800",
                "text-xs"
              )}
            >
              {provider.online ? "Online" : "Offline"}
            </Badge>
          </div>

          {/* Daily Update */}
          <div className="space-y-1">
            <p className="text-xs font-medium text-deep-navy-500">Update</p>
            <Badge variant="outline" className="text-xs font-medium">
              {provider.daily_update ? "Yes" : "No"}
            </Badge>
          </div>
        </div>

        {/* Footer: Applied Date + Verification + Actions */}
        <div className="flex items-center justify-between gap-2 mt-auto pt-3 flex-wrap">
          <div className="flex items-center gap-2">
            {provider.applied_date && (
              <span className="text-xs text-deep-navy-500">Applied: {provider.applied_date}</span>
            )}
            {provider.verified && (
              <CheckCircle className="h-4 w-4 text-emerald-600" />
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 ml-auto">
            <Button
              asChild
              size="sm"
              className="rounded-lg bg-gradient-to-r from-copper-500 to-copper-600 text-white hover:from-copper-600 hover:to-copper-700 font-semibold"
            >
              <Link to={profileUrl}>View profile</Link>
            </Button>
            {showSaveButton && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  onFavoriteToggle?.(provider.id);
                }}
                className="p-2 text-xs font-medium transition-colors rounded-lg hover:bg-deep-navy-50"
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
              </button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
