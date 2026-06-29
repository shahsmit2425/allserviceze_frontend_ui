import React from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Heart, MapPin, CheckCircle, Zap, Building2, MessageCircle, Lock, Headphones, ArrowRight } from "lucide-react";
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

  // Get priority icon color
  const priorityData = {
    urgent: { color: "bg-red-100", textColor: "text-red-700", icon: Zap },
    high: { color: "bg-orange-100", textColor: "text-orange-700", icon: Zap },
    medium: { color: "bg-yellow-100", textColor: "text-yellow-700", icon: Zap },
    low: { color: "bg-green-100", textColor: "text-green-700", icon: Zap },
  };

  const PriorityIcon = priorityData[project.urgency]?.icon || Zap;
  const priorityColor = priorityData[project.urgency]?.color || "bg-gray-100";
  const priorityTextColor = priorityData[project.urgency]?.textColor || "text-gray-700";

  return (
    <Card className="border border-border/40 bg-white rounded-xl hover:shadow-lg transition-all w-full overflow-hidden">
      <CardContent className="p-0">
        <div className="grid grid-cols-1 lg:grid-cols-[auto_1fr_auto] gap-0">
          
          {/* LEFT: Icon + Basic Info */}
          <div className="bg-gradient-to-br from-amber-50 to-amber-100/50 p-5 flex flex-col items-center justify-start gap-3 min-h-full lg:w-32">
            <div className="w-16 h-16 rounded-lg bg-amber-200 flex items-center justify-center shadow-sm">
              <Zap className="w-8 h-8 text-amber-700" />
            </div>
            <div className="text-center space-y-1">
              <p className="text-xs font-bold text-amber-900 uppercase tracking-wide">{project.category}</p>
              <div className="flex items-center gap-1 text-xs text-deep-navy-600">
                <MapPin className="h-3 w-3 flex-shrink-0" />
                <span>{project.zip_code || "N/A"}</span>
              </div>
              {project.customerVerified && (
                <div className="flex items-center gap-1 text-xs text-emerald-600 font-semibold pt-1 justify-center">
                  <CheckCircle className="h-3 w-3 flex-shrink-0" />
                  Verified
                </div>
              )}
            </div>
          </div>

          {/* MIDDLE: Description + Metrics */}
          <div className="p-5 border-l border-r border-border/20 flex flex-col gap-4">
            {/* Title + Description */}
            <div>
              <Link
                to={projectUrl}
                className="group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 rounded inline-block"
                aria-label={`Open project ${project.title}`}
              >
                <h2 className="text-lg font-bold text-deep-navy-900 group-hover:text-amber-700 line-clamp-2 transition-colors">
                  {project.title}
                </h2>
              </Link>
              <p className="text-sm text-deep-navy-600 line-clamp-2 mt-2 leading-relaxed">
                {project.questionnaire_responses?.description || "Looking for professional service to complete this project."}
              </p>
            </div>

            {/* Metrics Grid - 4 Columns */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* Priority */}
              <div className="bg-deep-navy-50 rounded-lg p-3 text-center">
                <div className={cn("flex items-center justify-center gap-1 text-xs font-bold mb-1", priorityTextColor)}>
                  <PriorityIcon className="h-3.5 w-3.5" />
                  {project.urgency?.charAt(0).toUpperCase() + project.urgency?.slice(1) || "N/A"}
                </div>
                <p className="text-xs text-deep-navy-500 font-semibold">Priority</p>
              </div>

              {/* Property Type */}
              <div className="bg-deep-navy-50 rounded-lg p-3 text-center">
                <div className="flex items-center justify-center gap-1 text-deep-navy-900 font-bold text-xs mb-1">
                  <Building2 className="h-3.5 w-3.5 text-deep-navy-600" />
                  {(project.property_type || project.questionnaire_responses?.property_type || "N/A").substring(0, 8)}
                </div>
                <p className="text-xs text-deep-navy-500 font-semibold">Property Type</p>
              </div>

              {/* Status */}
              <div className="bg-deep-navy-50 rounded-lg p-3 text-center">
                <div className="flex items-center justify-center gap-1 text-emerald-700 font-bold text-xs mb-1">
                  <CheckCircle className="h-3.5 w-3.5" />
                  Open
                </div>
                <p className="text-xs text-deep-navy-500 font-semibold">Status</p>
              </div>

              {/* Bids Received */}
              <div className="bg-deep-navy-50 rounded-lg p-3 text-center">
                <div className="flex items-center justify-center gap-1 text-deep-navy-900 font-bold text-xs mb-1">
                  <MessageCircle className="h-3.5 w-3.5 text-deep-navy-600" />
                  {project.bidCountValue}
                </div>
                <p className="text-xs text-deep-navy-500 font-semibold">Bids Received</p>
              </div>
            </div>

            {/* Trust Badges Row */}
            <div className="grid grid-cols-3 gap-2 pt-2">
              <div className="flex items-center gap-2 p-2 bg-emerald-50 rounded-lg border border-emerald-100">
                <CheckCircle className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="font-bold text-xs text-deep-navy-900">Verified</p>
                  <p className="text-xs text-deep-navy-600">Identity verified</p>
                </div>
              </div>
              <div className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg border border-blue-100">
                <Lock className="h-4 w-4 text-blue-600 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="font-bold text-xs text-deep-navy-900">Secure</p>
                  <p className="text-xs text-deep-navy-600">Protected</p>
                </div>
              </div>
              <div className="flex items-center gap-2 p-2 bg-amber-50 rounded-lg border border-amber-100">
                <Headphones className="h-4 w-4 text-amber-600 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="font-bold text-xs text-deep-navy-900">Support</p>
                  <p className="text-xs text-deep-navy-600">24/7 Help</p>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT: Budget + CTAs */}
          <div className="p-5 flex flex-col gap-3 lg:w-56 bg-gradient-to-br from-deep-navy-50 to-deep-navy-25">
            {/* Posted Time */}
            <p className="text-xs text-deep-navy-600 font-medium">Posted {project.postedDateLabel || "recently"}</p>

            {/* Budget Card */}
            <div className="bg-white rounded-lg p-4 border border-border/30 shadow-sm">
              <p className="text-xs text-deep-navy-500 uppercase font-bold tracking-wide mb-1">Budget</p>
              <p className="text-2xl font-bold text-deep-navy-900 line-clamp-1">
                {project.budget_range_min && project.budget_range_max 
                  ? `$${project.budget_range_min}-$${project.budget_range_max}`
                  : "Custom"}
              </p>
              <p className="text-xs text-deep-navy-600 mt-2">Budget is flexible</p>
              <p className="text-xs text-deep-navy-500">Share your best offer</p>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 pt-1">
              {/* Primary CTA - Submit Bid */}
              <Button
                asChild
                className="w-full rounded-lg bg-amber-700 hover:bg-amber-800 text-white font-bold text-sm py-2.5"
              >
                <Link to={projectUrl} className="flex items-center justify-center gap-2">
                  Submit Bid
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>

              {/* Secondary CTA - View Details */}
              <Button
                asChild
                variant="outline"
                className="w-full rounded-lg border border-deep-navy-200 text-deep-navy-900 hover:bg-deep-navy-50 font-semibold text-sm py-2.5"
              >
                <Link to={projectUrl} className="flex items-center justify-center gap-2">
                  View Details
                </Link>
              </Button>
            </div>

            {/* Save Job Button */}
            {user?.role === "provider" && (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  onFavoriteToggle?.(project.id);
                }}
                className="flex items-center justify-center gap-2 text-deep-navy-700 font-semibold text-sm transition-colors hover:text-red-600 py-2 hover:bg-red-50 rounded-lg"
                title={project.is_favorited ? "Remove from saved" : "Save job"}
              >
                <Heart
                  className={cn(
                    "h-5 w-5",
                    project.is_favorited
                      ? "fill-red-500 text-red-500"
                      : "text-deep-navy-400"
                  )}
                />
                Save Job
              </button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
