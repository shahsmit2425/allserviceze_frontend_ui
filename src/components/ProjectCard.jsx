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

  return (
    <Card className="border border-deep-navy-200 bg-white rounded-lg hover:shadow-xl transition-all w-full">
      <CardContent className="p-5 sm:p-6">
        {/* Full-width Thumbtack-style horizontal layout */}
        <div className="flex flex-col md:flex-row md:items-center gap-6 md:gap-8">
          
          {/* LEFT: Project Title + Meta */}
          <div className="flex-1 min-w-0">
            <Link
              to={projectUrl}
              className="group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 rounded inline-block"
              aria-label={`Open project ${project.title}`}
            >
              <h2 className="text-lg font-bold text-deep-navy-900 group-hover:text-cyan-600 line-clamp-2">
                {project.title}
              </h2>
            </Link>

            {/* Category + Location + Key Info */}
            <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-deep-navy-700">
              <Badge variant="outline" className="text-xs font-semibold">
                {project.category}
              </Badge>
              
              <div className="flex items-center gap-1.5">
                <MapPin className="h-4 w-4 text-deep-navy-500 flex-shrink-0" />
                <span>{project.zip_code || project.location?.split(",")[1]?.trim() || "N/A"}</span>
              </div>

              {project.customerVerified && (
                <div className="flex items-center gap-1.5 text-cyan-600 font-semibold">
                  <CheckCircle className="h-4 w-4 flex-shrink-0" />
                  Verified Customer
                </div>
              )}
            </div>

            {/* Key Details Row */}
            <div className="flex flex-wrap gap-6 mt-4 text-sm">
              <div>
                <p className="text-xs text-deep-navy-500 font-semibold uppercase">Urgency</p>
                <Badge className={cn("mt-1 text-xs", urgencyColors[project.urgency] || "bg-deep-navy-50 text-deep-navy-800")}>
                  {project.urgency?.charAt(0).toUpperCase() + project.urgency?.slice(1) || "N/A"}
                </Badge>
              </div>
              
              <div>
                <p className="text-xs text-deep-navy-500 font-semibold uppercase">Property Type</p>
                <p className="mt-1 font-semibold text-deep-navy-800">
                  {project.property_type || project.questionnaire_responses?.property_type || "N/A"}
                </p>
              </div>

              <div>
                <p className="text-xs text-deep-navy-500 font-semibold uppercase">Status</p>
                <p className="mt-1 font-semibold text-deep-navy-800 capitalize">
                  {project.status?.replace(/_/g, ' ') || 'Pending'}
                </p>
              </div>

              <div>
                <p className="text-xs text-deep-navy-500 font-semibold uppercase">Bids Received</p>
                <p className="mt-1 font-bold text-cyan-600">{project.bidCountValue}</p>
              </div>
            </div>
          </div>

          {/* RIGHT: Budget + CTA */}
          <div className="flex flex-col md:flex-col items-start md:items-end justify-between gap-4 flex-shrink-0 md:w-48">
            {/* Budget Section */}
            <div className="w-full md:w-auto md:text-right">
              <p className="text-sm text-deep-navy-600 font-medium">Budget</p>
              <p className="text-3xl font-bold text-deep-navy-900 mt-1">
                {formatBudgetRange(project)}
              </p>
            </div>

            {/* Status and Action Buttons */}
            <div className="flex flex-col gap-2 w-full md:w-auto">
              {/* Status Badge */}
              <Badge
                className={cn(
                  "text-xs text-center md:text-right font-semibold w-full md:w-auto justify-center md:justify-end",
                  project.my_bid_status
                    ? "bg-blue-100 text-blue-800"
                    : project.bidCountValue === 0
                      ? "bg-green-100 text-green-800"
                      : "bg-deep-navy-100 text-deep-navy-800"
                )}
              >
                {project.my_bid_status ? opportunityLabel : project.bidCountValue === 0 ? "First Quote Available" : "Open for Bids"}
              </Badge>

              {/* Action Button */}
              <Button
                asChild
                className="rounded-lg bg-cyan-500 hover:bg-cyan-600 text-white font-semibold text-sm px-6 py-2.5 w-full md:w-48"
              >
                <Link to={projectUrl}>{getPrimaryActionLabel(project)}</Link>
              </Button>

              {/* Save Button */}
              {user?.role === "provider" && (
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    onFavoriteToggle?.(project.id);
                  }}
                  className="p-2 text-sm font-medium transition-colors rounded-lg hover:bg-deep-navy-50 flex items-center justify-center gap-1.5"
                  title={project.is_favorited ? "Remove from saved" : "Save project"}
                >
                  <Heart
                    className={cn(
                      "h-5 w-5",
                      project.is_favorited
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
