import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { Label } from "../components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { TabsContent } from "../components/ui/tabs";
import { Badge } from "../components/ui/badge";
import { Switch } from "../components/ui/switch";
import { LIMITS } from "../lib/validation";
import {
  Clock,
  Plus,
  Trash2,
  Loader2,
  Save,
  Camera,
  Calendar,
  Image as ImageIcon,
  Star,
  Upload,
  X,
  Edit,
  MapPin,
} from "lucide-react";

const normalizeImageUrl = (url, width = 640) => {
  if (!url) {
    return "";
  }

  try {
    const parsedUrl = new URL(url);

    if (parsedUrl.hostname.includes("amazonaws.com") || parsedUrl.hostname.includes("cloudfront.net")) {
      parsedUrl.searchParams.set("w", String(width));
      parsedUrl.searchParams.set("auto", "format");
    }

    return parsedUrl.toString();
  } catch {
    return url;
  }
};

const getPortfolioImageSources = (url) => ({
  src: normalizeImageUrl(url, 640),
  srcSet: [480, 640, 960].map((width) => `${normalizeImageUrl(url, width)} ${width}w`).join(", "),
  sizes: "(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 33vw",
});

const getReviewImageSources = (url) => ({
  src: normalizeImageUrl(url, 480),
  srcSet: [320, 480, 640].map((width) => `${normalizeImageUrl(url, width)} ${width}w`).join(", "),
  sizes: "(max-width: 768px) 256px, 320px",
});

export default function ProviderBusinessProfileSecondaryTabs({
  activeTab,
  availability,
  setAvailability,
  availabilityLoaded,
  availabilityLoading,
  daysOfWeek,
  saving,
  handleSaveAvailability,
  portfolio,
  portfolioLoaded,
  portfolioLoading,
  newPortfolioItem,
  setNewPortfolioItem,
  showPortfolioForm,
  setShowPortfolioForm,
  editingPortfolioId,
  handleAddPortfolioItem,
  handleCancelEdit,
  handleEditPortfolioItem,
  handleDeletePortfolioItem,
  handleImageUpload,
  googleReviews,
  googleReviewsLoaded,
  googleReviewsLoading,
  newGoogleReview,
  setNewGoogleReview,
  showGoogleReviewForm,
  setShowGoogleReviewForm,
  handleAddGoogleReview,
  handleDeleteGoogleReview,
}) {
  return (
    <>
      {activeTab === "availability" ? (
        <TabsContent value="availability">
          <Card className="form-shell border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Working Hours
              </CardTitle>
              <CardDescription>Set your availability for each day of the week</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {availabilityLoading && !availabilityLoaded ? (
                <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading availability...
                </div>
              ) : (
                <>
                  {availability.map((slot, idx) => (
                    <div key={idx} className="form-section flex flex-col gap-4 sm:flex-row sm:items-center">
                      <div className="font-medium sm:w-28">{daysOfWeek[slot.day_of_week]}</div>
                      <Switch
                        checked={slot.is_available}
                        onCheckedChange={(checked) => {
                          const nextAvailability = [...availability];
                          nextAvailability[idx].is_available = checked;
                          setAvailability(nextAvailability);
                        }}
                      />
                      {slot.is_available ? (
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                          <Input
                            type="time"
                            value={slot.start_time}
                            onChange={(e) => {
                              const nextAvailability = [...availability];
                              nextAvailability[idx].start_time = e.target.value;
                              setAvailability(nextAvailability);
                            }}
                            className="w-32"
                          />
                          <span className="text-sm text-muted-foreground">to</span>
                          <Input
                            type="time"
                            value={slot.end_time}
                            onChange={(e) => {
                              const nextAvailability = [...availability];
                              nextAvailability[idx].end_time = e.target.value;
                              setAvailability(nextAvailability);
                            }}
                            className="w-32"
                          />
                        </div>
                      ) : (
                        <span className="text-muted-foreground">Closed</span>
                      )}
                    </div>
                  ))}
                  <div className="mobile-form-tray sticky bottom-3 z-20 sm:static sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none">
                    <Button onClick={handleSaveAvailability} disabled={saving} className="mt-4 w-full rounded-lg sm:mt-0">
                      {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                      Save Availability
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      ) : null}

      {activeTab === "portfolio" ? (
        <TabsContent value="portfolio">
          <Card className="form-shell border-0">
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <ImageIcon className="w-5 h-5" />
                  Portfolio - Past Works
                </CardTitle>
                <CardDescription>Showcase your best completed projects</CardDescription>
              </div>
              <Button
                onClick={() => {
                  setShowPortfolioForm(!showPortfolioForm);
                  if (showPortfolioForm) {
                    handleCancelEdit();
                  }
                }}
                className="rounded-lg"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Project
              </Button>
            </CardHeader>
            <CardContent>
              {portfolioLoading && !portfolioLoaded ? (
                <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading portfolio...
                </div>
              ) : (
                <>
                  {showPortfolioForm && (
                    <div className="form-section mb-6 space-y-4">
                      <h3 className="text-lg font-semibold">
                        {editingPortfolioId ? "Edit Portfolio Item" : "Add New Portfolio Item"}
                      </h3>
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label>Project Title</Label>
                          <Input
                            placeholder="e.g., Kitchen Renovation"
                            value={newPortfolioItem.title}
                            maxLength={LIMITS.portfolioTitle}
                            onChange={(e) => setNewPortfolioItem((prev) => ({ ...prev, title: e.target.value.slice(0, LIMITS.portfolioTitle) }))}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Category</Label>
                          <Input
                            placeholder="e.g., Plumbing, Electrical"
                            value={newPortfolioItem.category}
                            maxLength={LIMITS.portfolioCategory}
                            onChange={(e) => setNewPortfolioItem((prev) => ({ ...prev, category: e.target.value.slice(0, LIMITS.portfolioCategory) }))}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Description</Label>
                        <Textarea
                          placeholder="Describe the project, challenges, and outcomes..."
                          value={newPortfolioItem.description}
                          maxLength={LIMITS.portfolioDescription}
                          onChange={(e) => setNewPortfolioItem((prev) => ({ ...prev, description: e.target.value.slice(0, LIMITS.portfolioDescription) }))}
                        />
                        <p className={`text-right text-xs ${newPortfolioItem.description?.length >= LIMITS.portfolioDescription ? "text-red-500" : "text-muted-foreground"}`}>
                          {newPortfolioItem.description?.length || 0}/{LIMITS.portfolioDescription}
                        </p>
                      </div>
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label>Completion Date</Label>
                          <Input
                            type="date"
                            value={newPortfolioItem.completion_date}
                            onChange={(e) => setNewPortfolioItem((prev) => ({ ...prev, completion_date: e.target.value }))}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Location</Label>
                          <Input
                            placeholder="City, State"
                            value={newPortfolioItem.location}
                            maxLength={LIMITS.portfolioLocation}
                            onChange={(e) => setNewPortfolioItem((prev) => ({ ...prev, location: e.target.value.slice(0, LIMITS.portfolioLocation) }))}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Project Images</Label>
                        <div className="flex flex-wrap gap-2">
                          {newPortfolioItem.images.map((img, idx) => (
                            <div key={idx} className="relative h-20 w-20">
                              <img
                                src={img}
                                alt=""
                                className="h-full w-full rounded-lg object-cover"
                                loading="lazy"
                                decoding="async"
                                width="80"
                                height="80"
                              />
                              <button
                                onClick={() => setNewPortfolioItem((prev) => ({
                                  ...prev,
                                  images: prev.images.filter((_, imageIndex) => imageIndex !== idx),
                                }))}
                                className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-lg bg-red-500 text-white"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          ))}
                          <label className="flex h-20 w-20 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed hover:border-primary">
                            <Camera className="h-6 w-6 text-muted-foreground" />
                            <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, "portfolio")} />
                          </label>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 sm:flex-row">
                        <Button onClick={handleAddPortfolioItem} disabled={saving} className="rounded-lg">
                          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                          {editingPortfolioId ? "Update Portfolio Item" : "Add to Portfolio"}
                        </Button>
                        <Button variant="outline" onClick={handleCancelEdit} className="rounded-lg bg-white/80">Cancel</Button>
                      </div>
                    </div>
                  )}

                  <div className="grid gap-4 md:grid-cols-2">
                    {portfolio.map((item) => {
                      const imageSources = item.images?.[0] ? getPortfolioImageSources(item.images[0]) : null;

                      return (
                        <Card key={item.id} className="overflow-hidden" style={{ contentVisibility: "auto", containIntrinsicSize: "360px" }}>
                          {imageSources ? (
                            <img
                              src={imageSources.src}
                              srcSet={imageSources.srcSet}
                              sizes={imageSources.sizes}
                              alt={item.title}
                              className="h-48 w-full object-cover"
                              loading="lazy"
                              decoding="async"
                              width="640"
                              height="384"
                            />
                          ) : null}
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                              <div>
                                <h3 className="font-semibold">{item.title}</h3>
                                <p className="text-sm text-muted-foreground">{item.category}</p>
                              </div>
                              <div className="flex gap-1">
                                <Button variant="ghost" size="icon" onClick={() => handleEditPortfolioItem(item)} aria-label={`Edit ${item.title}`}>
                                  <Edit className="h-4 w-4 text-primary" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => handleDeletePortfolioItem(item.id)} aria-label={`Delete ${item.title}`}>
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                            </div>
                            <p className="mt-2 line-clamp-2 text-sm">{item.description}</p>
                            <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {item.completion_date}
                              </span>
                              {item.location ? (
                                <span className="flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  {item.location}
                                </span>
                              ) : null}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>

                  {portfolio.length === 0 && !showPortfolioForm ? (
                    <div className="empty-state-panel py-12">
                      <ImageIcon className="mx-auto mb-3 h-12 w-12 text-muted-foreground" />
                      <p className="text-muted-foreground">No portfolio items yet</p>
                      <p className="text-sm text-muted-foreground">Add your best work to attract more customers</p>
                    </div>
                  ) : null}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      ) : null}

      {activeTab === "google-reviews" ? (
        <TabsContent value="google-reviews">
          <Card className="form-shell border-0">
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Star className="h-5 w-5 text-yellow-500" />
                  Google Reviews
                </CardTitle>
                <CardDescription>Import your Google reviews to build credibility</CardDescription>
              </div>
              <Button onClick={() => setShowGoogleReviewForm(!showGoogleReviewForm)} className="rounded-lg">
                <Plus className="mr-2 h-4 w-4" />
                Add Review
              </Button>
            </CardHeader>
            <CardContent>
              {googleReviewsLoading && !googleReviewsLoaded ? (
                <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading Google reviews...
                </div>
              ) : (
                <>
                  {showGoogleReviewForm ? (
                    <div className="form-section mb-6 space-y-4">
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label>Reviewer Name</Label>
                          <Input
                            placeholder="John Smith"
                            value={newGoogleReview.reviewer_name}
                            onChange={(e) => setNewGoogleReview((prev) => ({ ...prev, reviewer_name: e.target.value }))}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Rating (1-5)</Label>
                          <div className="flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <button
                                key={star}
                                onClick={() => setNewGoogleReview((prev) => ({ ...prev, rating: star }))}
                                className="p-1"
                                aria-label={`Set rating to ${star}`}
                              >
                                <Star className={`h-6 w-6 ${star <= newGoogleReview.rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`} />
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Review Text</Label>
                        <Textarea
                          placeholder="Copy the review text from Google..."
                          value={newGoogleReview.review_text}
                          onChange={(e) => setNewGoogleReview((prev) => ({ ...prev, review_text: e.target.value }))}
                        />
                      </div>
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label>Review Date</Label>
                          <Input
                            type="date"
                            value={newGoogleReview.review_date}
                            onChange={(e) => setNewGoogleReview((prev) => ({ ...prev, review_date: e.target.value }))}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Screenshot (Optional)</Label>
                          <div className="flex items-center gap-2">
                            {newGoogleReview.screenshot_url ? (
                              <div className="relative h-20 w-20">
                                <img
                                  src={newGoogleReview.screenshot_url}
                                  alt=""
                                  className="h-full w-full rounded-lg object-cover"
                                  loading="lazy"
                                  decoding="async"
                                  width="80"
                                  height="80"
                                />
                                <button
                                  onClick={() => setNewGoogleReview((prev) => ({ ...prev, screenshot_url: "" }))}
                                  className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-lg bg-red-500 text-white"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </div>
                            ) : (
                              <label className="flex cursor-pointer items-center gap-2 rounded-lg border px-4 py-2 hover:border-primary">
                                <Upload className="h-4 w-4" />
                                Upload Screenshot
                                <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, "google_review")} />
                              </label>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 sm:flex-row">
                        <Button onClick={handleAddGoogleReview} disabled={saving} className="rounded-lg">
                          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                          Add Google Review
                        </Button>
                        <Button variant="outline" onClick={() => setShowGoogleReviewForm(false)} className="rounded-lg bg-white/80">Cancel</Button>
                      </div>
                    </div>
                  ) : null}

                  <div className="space-y-4">
                    {googleReviews.map((review) => {
                      const screenshotSources = review.screenshot_url ? getReviewImageSources(review.screenshot_url) : null;

                      return (
                        <div key={review.id} className="rounded-lg border p-4" style={{ contentVisibility: "auto", containIntrinsicSize: "220px" }}>
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 font-semibold text-primary">
                                {review.reviewer_name.charAt(0)}
                              </div>
                              <div>
                                <p className="font-medium">{review.reviewer_name}</p>
                                <div className="flex items-center gap-1">
                                  {[...Array(5)].map((_, i) => (
                                    <Star key={i} className={`h-4 w-4 ${i < review.rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"}`} />
                                  ))}
                                  <span className="ml-2 text-xs text-muted-foreground">
                                    {review.review_date}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">
                                <img src="https://www.google.com/favicon.ico" alt="Google" className="mr-1 h-3 w-3" loading="lazy" decoding="async" width="12" height="12" />
                                Google
                              </Badge>
                              <Button variant="ghost" size="icon" onClick={() => handleDeleteGoogleReview(review.id)} aria-label={`Delete review from ${review.reviewer_name}`}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </div>
                          <p className="mt-3 text-sm">{review.review_text}</p>
                          {screenshotSources ? (
                            <img
                              src={screenshotSources.src}
                              srcSet={screenshotSources.srcSet}
                              sizes={screenshotSources.sizes}
                              alt="Review screenshot"
                              className="mt-3 max-w-xs rounded-lg border"
                              loading="lazy"
                              decoding="async"
                              width="320"
                              height="240"
                            />
                          ) : null}
                        </div>
                      );
                    })}
                  </div>

                  {googleReviews.length === 0 && !showGoogleReviewForm ? (
                    <div className="empty-state-panel py-12">
                      <Star className="mx-auto mb-3 h-12 w-12 text-muted-foreground" />
                      <p className="text-muted-foreground">No Google reviews imported yet</p>
                      <p className="text-sm text-muted-foreground">Import your Google reviews to build trust with customers</p>
                    </div>
                  ) : null}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      ) : null}
    </>
  );
}