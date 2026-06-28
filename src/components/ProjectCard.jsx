import React from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Heart, MapPin, CheckCircle } from "lucide-react";
import { cn } from "../lib/utils";

const urgencyColors = {
  urgent: "bg-red-100 text-red-800 border-red-200",
  high: "bg-orange-100 text-orange-800 border-orange-200",
  medium: "bg-yellow-100 text-yellow-800 border-yellow-200",
  low: "bg-green-100 text-green-800 border-green-200",
};

export function ProjectCard({
  project,
  onFavoriteToggle,
  onViewProfile,
  user,
  formatBudgetRange,
  getPrimaryActionLabel,
  opportunityLabel,
}) {
  const projectUrl = `/projects/${project.id}`;
  const statusColors = {
    draft: "bg-blue-50 text-blue-800",
    approved: "bg-purple-50 text-purple-800",
    live: "bg-green-50 text-green-800",
    paused: "bg-yellow-50 text-yellow-800",
    rejected: "bg-red-50 text-red-800",
    completed: "bg-gray-50 text-gray-800",
    awarded: "bg-indigo-50 text-indigo-800",
    in_progress: "bg-cyan-50 text-cyan-800",
  };

  return (
    <Card className="border border-deep-navy-100 bg-white rounded-lg hover:shadow-lg hover:border-copper-300 transition-all h-full flex flex-col">
      <CardContent className="p-4 sm:p-5 flex flex-col flex-1">
        {/* Header: Title + Status Badge */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <Link
            to={projectUrl}
            className="group flex-1 min-w-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-copper-500 rounded"
            aria-label={`Open project ${project.title}`}
          >
            <h3 className="text-base font-semibold text-deep-navy-800 group-hover:text-copper-600 line-clamp-2">
              {project.title}
            </h3>
          </Link>
          <Badge
            className={cn(
              "flex-shrink-0",
              project.my_bid_status
                ? "status-badge-info"
                : project.bidCountValue === 0
                  ? "status-badge-success"
                  : "status-badge-neutral"
            )}
          >
            {project.my_bid_status ? opportunityLabel : project.bidCountValue === 0 ? "First quote" : "Open"}
          </Badge>
        </div>

        {/* Posted Date */}
        <div className="text-xs text-deep-navy-500 mb-4">{project.postedDateLabel}</div>

        {/* Data Grid - Full Width */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-4 pb-4 border-b border-deep-navy-50">
          {/* Category */}
          <div className="space-y-1">
            <p className="text-xs font-medium text-deep-navy-500">Category</p>
            <Badge variant="outline" className="text-xs font-medium justify-start">
              {project.category}
            </Badge>
          </div>

          {/* Zip Code */}
          <div className="space-y-1">
            <p className="text-xs font-medium text-deep-navy-500 flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              Zip
            </p>
            <p className="text-sm font-semibold text-deep-navy-800">
              {project.zip_code || project.location?.split(",")[1]?.trim() || "N/A"}
            </p>
          </div>

          {/* Urgency Level */}
          <div className="space-y-1">
            <p className="text-xs font-medium text-deep-navy-500">Urgency</p>
            <Badge
              className={cn(
                urgencyColors[project.urgency] || "bg-deep-navy-50 text-deep-navy-800",
                "text-xs"
              )}
            >
              {project.urgency?.charAt(0).toUpperCase() + project.urgency?.slice(1) || "N/A"}
            </Badge>
          </div>

          {/* Project Status */}
          <div className="space-y-1">
            <p className="text-xs font-medium text-deep-navy-500">Status</p>
            <Badge className={cn(statusColors[project.status] || "bg-deep-navy-50 text-deep-navy-800", "text-xs")}>
              {project.status?.replace(/_/g, " ") || "Pending"}
            </Badge>
          </div>

          {/* Property Type */}
          <div className="space-y-1">
            <p className="text-xs font-medium text-deep-navy-500">Property</p>
            <p className="text-sm font-semibold text-deep-navy-800 truncate">
              {project.property_type || project.questionnaire_responses?.property_type || "N/A"}
            </p>
          </div>

          {/* Ownership */}
          <div className="space-y-1">
            <p className="text-xs font-medium text-deep-navy-500">Ownership</p>
            <p className="text-sm font-semibold text-deep-navy-800 truncate">
              {project.questionnaire_responses?.ownership || "N/A"}
            </p>
          </div>

          {/* Budget */}
          <div className="space-y-1">
            <p className="text-xs font-medium text-deep-navy-500">Budget</p>
            <p className="text-sm font-bold text-copper-600">{formatBudgetRange(project)}</p>
          </div>

          {/* Bids */}
          <div className="space-y-1">
            <p className="text-xs font-medium text-deep-navy-500">Bids</p>
            <p className="text-sm font-bold text-copper-600">{project.bidCountValue}</p>
          </div>
        </div>

        {/* Footer: Verification Badge + Actions */}
        <div className="flex items-center justify-between gap-3 mt-auto pt-3">
          <div className="flex items-center gap-2">
            {project.customerVerified && (
              <Badge variant="outline" className="text-xs text-emerald-700 border-emerald-200 font-medium">
                <CheckCircle className="h-3 w-3 mr-1" />
                Verified
              </Badge>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <Button
              asChild
              size="sm"
              className="rounded-lg bg-gradient-to-r from-copper-500 to-copper-600 text-white hover:from-copper-600 hover:to-copper-700 font-semibold"
            >
              <Link to={projectUrl}>{getPrimaryActionLabel(project)}</Link>
            </Button>
            {user?.role === "provider" && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  onFavoriteToggle?.(project.id);
                }}
                className="p-2 text-xs font-medium transition-colors rounded-lg hover:bg-deep-navy-50"
                title={project.is_favorited ? "Remove from favorites" : "Add to favorites"}
              >
                <Heart
                  className={cn(
                    "h-4 w-4",
                    project.is_favorited
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
