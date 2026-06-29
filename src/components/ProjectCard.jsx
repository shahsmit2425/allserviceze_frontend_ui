import React from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Heart, MapPin, CheckCircle, Zap, Building2, Clock, MessageCircle, Shield, Lock, Headphones } from "lucide-react";
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
    <Card className="border border-deep-navy-200 bg-white rounded-lg hover:shadow-xl transition-all w-full overflow-hidden">
      <CardContent className="p-6">
        {/* Main Content Area */}
        <div className="flex flex-col lg:flex-row gap-6">
          
          {/* LEFT: Icon + Title + Meta (Fixed Width) */}
          <div className="flex gap-4 flex-shrink-0 lg:w-80">
            {/* Icon with background */}
            <div className="w-20 h-20 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
              <Zap className="w-10 h-10 text-amber-600" />
            </div>

            {/* Title and Meta */}
            <div className="flex-1 min-w-0">
              <Link
                to={projectUrl}
                className="group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 rounded inline-block"
                aria-label={`Open project ${project.title}`}
              >
                <h2 className="text-xl font-bold text-deep-navy-900 group-hover:text-cyan-600 line-clamp-2">
                  {project.title}
                </h2>
              </Link>

              {/* Category + Location + Verified */}
              <div className="space-y-2 mt-2">
                <div className="flex items-center gap-2 text-sm text-cyan-700 font-semibold">
                  <Building2 className="h-4 w-4 flex-shrink-0" />
                  <span>{project.category}</span>
                </div>
                
                <div className="flex items-center gap-2 text-sm text-deep-navy-700">
                  <MapPin className="h-4 w-4 text-deep-navy-500 flex-shrink-0" />
                  <span>{project.zip_code || project.location?.split(",")[1]?.trim() || "N/A"}</span>
                </div>

                {project.customerVerified && (
                  <div className="flex items-center gap-2 text-sm text-cyan-600 font-semibold">
                    <CheckCircle className="h-4 w-4 flex-shrink-0" />
                    Verified Customer
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* CENTER: Description + Metrics Grid */}
          <div className="flex-1 border-b lg:border-b-0 lg:border-l lg:border-r border-deep-navy-100 pb-6 lg:pb-0 lg:px-6">
            {/* Description */}
            <p className="text-sm text-deep-navy-700 line-clamp-3 leading-relaxed mb-4">
              {project.questionnaire_responses?.description || "Looking for professional service to complete this project."}
            </p>

            {/* Metrics Grid - 4 Columns */}
            <div className="grid grid-cols-4 gap-3 mb-4">
              {/* Priority */}
              <div className="text-center">
                <div className={cn("flex items-center justify-center gap-1 text-xs font-bold", priorityTextColor)}>
                  <PriorityIcon className="h-4 w-4" />
                  {project.urgency?.charAt(0).toUpperCase() + project.urgency?.slice(1) || "N/A"}
                </div>
                <p className="text-xs text-deep-navy-500 mt-1 font-semibold">Priority</p>
              </div>

              {/* Property Type */}
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 text-deep-navy-900 font-bold text-sm">
                  <Building2 className="h-4 w-4 text-deep-navy-600" />
                  {(project.property_type || project.questionnaire_responses?.property_type || "N/A").substring(0, 8)}
                </div>
                <p className="text-xs text-deep-navy-500 mt-1 font-semibold">Property Type</p>
              </div>

              {/* Status */}
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 text-green-700 font-bold text-sm">
                  <CheckCircle className="h-4 w-4" />
                  Open
                </div>
                <p className="text-xs text-deep-navy-500 mt-1 font-semibold">Status</p>
              </div>

              {/* Bids Received */}
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 text-deep-navy-900 font-bold text-sm">
                  <MessageCircle className="h-4 w-4 text-deep-navy-600" />
                  {project.bidCountValue}
                </div>
                <p className="text-xs text-deep-navy-500 mt-1 font-semibold">Bids Received</p>
              </div>
            </div>

            {/* Trust Badges Row */}
            <div className="grid grid-cols-3 gap-3 text-xs">
              <div className="flex items-center gap-2 p-2 bg-deep-navy-50 rounded-lg">
                <CheckCircle className="h-4 w-4 text-teal-600 flex-shrink-0" />
                <div>
                  <p className="font-bold text-deep-navy-900">Verified Customer</p>
                  <p className="text-deep-navy-600">Identity verified</p>
                </div>
              </div>
              <div className="flex items-center gap-2 p-2 bg-deep-navy-50 rounded-lg">
                <Lock className="h-4 w-4 text-teal-600 flex-shrink-0" />
                <div>
                  <p className="font-bold text-deep-navy-900">Secure Payments</p>
                  <p className="text-deep-navy-600">Payment protection</p>
                </div>
              </div>
              <div className="flex items-center gap-2 p-2 bg-deep-navy-50 rounded-lg">
                <Headphones className="h-4 w-4 text-orange-500 flex-shrink-0" />
                <div>
                  <p className="font-bold text-deep-navy-900">24/7 Support</p>
                  <p className="text-deep-navy-600">We're here to help</p>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT: Budget + CTAs (Fixed Width) */}
          <div className="flex flex-col gap-4 flex-shrink-0 lg:w-64">
            {/* Posted Time + Budget Label */}
            <div className="text-right">
              <p className="text-xs text-deep-navy-600 mb-2">Posted {project.postedDateLabel || "recently"}</p>
              <div className="inline-flex items-center gap-1 text-deep-navy-600 text-xs mb-2">
                <span className="font-semibold">BUDGET</span>
                <span className="text-lg">ℹ️</span>
              </div>
            </div>

            {/* Budget Display */}
            <div className="text-right">
              <p className="text-4xl font-bold text-deep-navy-900">
                {project.budget_range_min && project.budget_range_max 
                  ? `$${project.budget_range_min}-$${project.budget_range_max}`
                  : "Custom Budget"}
              </p>
            </div>

            {/* Budget Flexibility */}
            <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
              <p className="text-sm font-bold text-deep-navy-900">Budget is flexible</p>
              <p className="text-xs text-deep-navy-700">Share your best offer</p>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2">
              {/* Primary CTA - Submit Bid */}
              <Button
                asChild
                className="w-full rounded-full bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white font-bold text-sm py-3"
              >
                <Link to={projectUrl} className="flex items-center justify-center gap-2">
                  Submit Bid
                  <span className="text-lg">→</span>
                </Link>
              </Button>

              {/* Secondary CTA - View Details */}
              <Button
                asChild
                variant="outline"
                className="w-full rounded-full border-2 border-deep-navy-300 text-deep-navy-900 font-bold text-sm py-3"
              >
                <Link to={projectUrl} className="flex items-center justify-center gap-2">
                  <span>👁</span>
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
                className="flex items-center justify-center gap-2 text-deep-navy-800 font-semibold text-sm transition-colors hover:text-red-500 py-2"
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
