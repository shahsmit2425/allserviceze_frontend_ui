import React from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Heart, MapPin, CheckCircle, Briefcase } from "lucide-react";
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

  return (
    <Card className="border border-deep-navy-100 bg-white rounded-lg hover:shadow-lg hover:border-copper-300 transition-all">
      <CardContent className="p-4 sm:p-5">
        {/* Horizontal Layout: Left | Center Metrics | Right Actions */}
        <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-6">
          
          {/* LEFT SECTION: Icon + Title + Meta */}
          <div className="flex items-start gap-3 flex-shrink-0 md:w-48">
            {/* Icon */}
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-copper-100 to-copper-50 flex items-center justify-center flex-shrink-0">
              <Briefcase className="w-6 h-6 text-copper-600" />
            </div>

            {/* Title + Meta */}
            <div className="flex-1 min-w-0">
              <Link
                to={projectUrl}
                className="group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-copper-500 rounded"
                aria-label={`Open project ${project.title}`}
              >
                <h3 className="text-sm font-bold text-deep-navy-900 group-hover:text-copper-600 line-clamp-2">
                  {project.title}
                </h3>
              </Link>
              <p className="text-xs text-deep-navy-500 mt-1">{project.category}</p>
              <p className="text-xs text-deep-navy-500 flex items-center gap-1 mt-1">
                <MapPin className="h-3 w-3" />
                {project.zip_code || project.location?.split(",")[1]?.trim() || "N/A"}
              </p>
            </div>
          </div>

          {/* CENTER SECTION: 4-Column Metrics Grid */}
          <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 py-3 px-3 md:px-4 md:py-0 md:border-l md:border-r border-deep-navy-50">
            {/* Column 1: Budget */}
            <div className="text-center md:text-left">
              <p className="text-xs font-medium text-deep-navy-500 uppercase tracking-wider">Budget</p>
              <p className="text-sm font-bold text-copper-600 mt-1">{formatBudgetRange(project)}</p>
            </div>

            {/* Column 2: Urgency */}
            <div className="text-center md:text-left">
              <p className="text-xs font-medium text-deep-navy-500 uppercase tracking-wider">Urgency</p>
              <Badge className={cn("mt-1 text-xs", urgencyColors[project.urgency] || "bg-deep-navy-50 text-deep-navy-800")}>
                {project.urgency?.charAt(0).toUpperCase() + project.urgency?.slice(1) || "N/A"}
              </Badge>
            </div>

            {/* Column 3: Property Type */}
            <div className="text-center md:text-left">
              <p className="text-xs font-medium text-deep-navy-500 uppercase tracking-wider">Property</p>
              <p className="text-sm font-semibold text-deep-navy-800 truncate mt-1">
                {project.property_type || project.questionnaire_responses?.property_type || "N/A"}
              </p>
            </div>

            {/* Column 4: Bids */}
            <div className="text-center md:text-left">
              <p className="text-xs font-medium text-deep-navy-500 uppercase tracking-wider">Bids</p>
              <p className="text-sm font-bold text-copper-600 mt-1">{project.bidCountValue}</p>
            </div>
          </div>

          {/* RIGHT SECTION: Status + Actions */}
          <div className="flex flex-col gap-3 flex-shrink-0 md:w-48">
            {/* Status Badge */}
            <Badge
              className={cn(
                "text-xs text-center md:text-left w-full justify-center md:justify-start",
                project.my_bid_status
                  ? "status-badge-info"
                  : project.bidCountValue === 0
                    ? "status-badge-success"
                    : "status-badge-neutral"
              )}
            >
              {project.my_bid_status ? opportunityLabel : project.bidCountValue === 0 ? "First quote" : "Open"}
            </Badge>

            {/* Verification Badge */}
            {project.customerVerified && (
              <Badge variant="outline" className="text-xs text-emerald-700 border-emerald-200 font-medium text-center md:text-left justify-center md:justify-start">
                <CheckCircle className="h-3 w-3 mr-1" />
                Verified
              </Badge>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2 flex-wrap md:flex-col">
              <Button
                asChild
                size="sm"
                className="flex-1 md:flex-none rounded-lg bg-gradient-to-r from-copper-500 to-copper-600 text-white hover:from-copper-600 hover:to-copper-700 font-semibold text-xs"
              >
                <Link to={projectUrl}>{getPrimaryActionLabel(project)}</Link>
              </Button>
              {user?.role === "provider" && (
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    onFavoriteToggle?.(project.id);
                  }}
                  className="p-2 text-xs font-medium transition-colors rounded-lg hover:bg-deep-navy-50 flex items-center justify-center md:justify-start gap-1"
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
                  <span className="hidden md:inline">{project.is_favorited ? "Saved" : "Save"}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
