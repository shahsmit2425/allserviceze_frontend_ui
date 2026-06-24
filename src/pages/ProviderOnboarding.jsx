import { useState, useEffect } from "react";
import logger from "@/utils/logger";
import { useNavigate } from "react-router-dom";
import { AppShell } from "../components/AppShell";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { FormCallout, FormField } from "../components/ui/form-field";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Card, CardContent } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Checkbox } from "../components/ui/checkbox";
import { ImageUpload } from "../components/ImageUpload";
import { useAuth } from "../context/AuthContext";
import { useCategories } from "../hooks/useCategories";
import { toast } from "sonner";
import axios from "axios";
import { 
  ArrowRight, ArrowLeft, CheckCircle, User, Briefcase, 
  MapPin, DollarSign, Clock, Camera, Loader2, Plus, X
} from "lucide-react";

const API_URL = `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'}/api`;

const STEPS = [
  { id: 1, title: "Profile Photo", icon: Camera },
  { id: 2, title: "About You", icon: User },
  { id: 3, title: "Skills", icon: Briefcase },
  { id: 4, title: "Pricing", icon: DollarSign },
];

export default function ProviderOnboarding() {
  const navigate = useNavigate();
  const { user, getAuthHeader } = useAuth();
  const CATEGORIES = useCategories();
  
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [profileImage, setProfileImage] = useState(user?.profile_image || "");
  
  const [formData, setFormData] = useState({
    bio: user?.provider_profile?.bio || "",
    location: user?.provider_profile?.location || "",
    experience_years: user?.provider_profile?.experience_years || 0,
    hourly_rate: user?.provider_profile?.hourly_rate || 0,
    skills: user?.provider_profile?.skills || [],
    service_areas: user?.provider_profile?.service_areas || []
  });

  const [newServiceArea, setNewServiceArea] = useState("");
  const currentStepMeta = STEPS[currentStep - 1];
  const progressPercent = Math.round((currentStep / STEPS.length) * 100);

  useEffect(() => {
    if (!user || user.role !== "provider") {
      navigate("/");
    }
  }, [user]);

  const handleSkillToggle = (skill) => {
    setFormData(prev => ({
      ...prev,
      skills: prev.skills.includes(skill)
        ? prev.skills.filter(s => s !== skill)
        : [...prev.skills, skill]
    }));
  };

  const handleAddServiceArea = () => {
    const area = newServiceArea.trim();
    if (!area) return;
    if (formData.service_areas.includes(area)) {
      toast.error("This service area already exists");
      return;
    }
    setFormData(prev => ({ ...prev, service_areas: [...prev.service_areas, area] }));
    setNewServiceArea("");
  };

  const handleRemoveServiceArea = (area) => {
    setFormData(prev => ({
      ...prev,
      service_areas: prev.service_areas.filter(a => a !== area)
    }));
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await axios.patch(`${API_URL}/providers/profile`, formData, {
        headers: getAuthHeader()
      });
      toast.success("Profile completed! You can now create services.");
      navigate("/dashboard");
    } catch (error) {
      toast.error("Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return true; // Profile image is optional
      case 2:
        return formData.bio.length >= 20 && formData.location;
      case 3:
        return formData.skills.length > 0;
      case 4:
        return true; // Hourly rate is optional
      default:
        return false;
    }
  };

  const nextStep = () => {
    if (canProceed() && currentStep < 4) {
      setCurrentStep(currentStep + 1);
    } else if (currentStep === 4) {
      handleSubmit();
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <AppShell theme="provider">
      <div className="page-shell safe-bottom-shell py-6 sm:py-8">
        <section className="page-hero mb-5 sm:mb-6">
          <div className="relative grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div>
              <span className="page-kicker">
                <Briefcase className="h-3.5 w-3.5" /> Provider onboarding
              </span>
              <h1 className="heading-2 mt-4 text-foreground">Set up your provider profile with a cleaner mobile flow</h1>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
                Build trust faster with a shorter, easier setup that keeps the actual form in view on iPhone instead of burying it under extra chrome.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <span className="info-chip">Step {currentStep} of {STEPS.length}</span>
                <span className="info-chip">{progressPercent}% complete</span>
                <span className="info-chip">{currentStepMeta.title}</span>
              </div>
            </div>

            <div className="hidden lg:block glass-panel p-5">
              <div className="rounded-lg border border-white/70 bg-white/75 p-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Current focus</p>
                <p className="mt-2 text-xl font-semibold tracking-[-0.03em] text-foreground">{currentStepMeta.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{currentStep === 1 ? "Optional photo, stronger first impression." : currentStep === 2 ? "Explain your background and service area." : currentStep === 3 ? "Pick the work you actually do." : "Set a baseline rate and review everything."}</p>
              </div>
            </div>
          </div>
        </section>

        <div className="glass-panel mb-5 overflow-x-auto p-3 sm:mb-6 sm:p-5">
          <div className="flex min-w-max items-center gap-2 sm:gap-3">
            {STEPS.map((step, index) => (
              <div key={step.id} className="flex items-center gap-2 sm:gap-3">
                <div className="flex min-w-[7.25rem] items-center gap-2 sm:min-w-[9rem]">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-colors ${
                    currentStep >= step.id 
                      ? "bg-primary text-white" 
                      : "bg-muted text-muted-foreground"
                  }`}>
                    {currentStep > step.id ? (
                      <CheckCircle className="w-5 h-5" />
                    ) : (
                      <step.icon className="w-5 h-5" />
                    )}
                  </div>
                  <p className={`text-sm font-semibold ${currentStep >= step.id ? "text-foreground" : "text-muted-foreground"}`}>{step.title}</p>
                </div>
                {index !== STEPS.length - 1 && (
                  <div className={`h-0.5 w-5 shrink-0 sm:w-8 ${currentStep > step.id ? "bg-primary" : "bg-muted"}`} />
                )}
              </div>
            ))}
          </div>
        </div>

        <Card className="form-shell border-0">
          <CardContent className="space-y-6 p-6 sm:p-8">
            {/* Step 1: Profile Photo */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <FormCallout icon={Camera} title="A clear photo builds trust faster.">
                  You can skip this for now, but profiles with a real photo usually feel more credible to customers at first glance.
                </FormCallout>

                <div className="form-section text-center">
                  <h2 className="heading-3 mb-2">Add a Profile Photo</h2>
                  <p className="text-muted-foreground mb-8">
                    Customers are more likely to book providers with a photo
                  </p>
                  
                  <div className="flex justify-center mb-8">
                    <ImageUpload
                      currentImage={profileImage}
                      onUpload={setProfileImage}
                      type="profile"
                    />
                  </div>
                  
                  <p className="text-sm text-muted-foreground">
                    You can skip this step and add a photo later
                  </p>
                </div>
              </div>
            )}

            {/* Step 2: About You */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <FormCallout icon={Briefcase} title="Keep this short, specific, and local.">
                  Customers decide quickly based on whether your profile sounds experienced, nearby, and relevant to the work they need.
                </FormCallout>

                <div>
                  <h2 className="heading-3 mb-2">Tell us about yourself</h2>
                  <p className="text-muted-foreground mb-6">
                    Help customers get to know you better
                  </p>
                </div>

                <div className="form-section space-y-6">
                  <FormField
                    id="provider-bio"
                    label="Bio *"
                    icon={Briefcase}
                    iconPosition="top"
                    hint="Describe your experience, specialties, and how you typically help customers."
                  >
                    <Textarea
                      id="provider-bio"
                      placeholder="Describe your experience, certifications, and what makes you stand out..."
                      value={formData.bio}
                      onChange={(e) => setFormData({...formData, bio: e.target.value})}
                      rows={4}
                      className="min-h-[160px] pl-11 pt-4"
                    />
                  </FormField>
                  <p className="-mt-2 text-xs text-muted-foreground">
                    {formData.bio.length}/500 characters (minimum 20)
                  </p>
                  
                  <FormField
                    id="provider-location"
                    label="Location *"
                    icon={MapPin}
                    placeholder="City, State"
                    value={formData.location}
                    onChange={(e) => setFormData({...formData, location: e.target.value})}
                    hint="This is the primary area customers will see on your profile."
                  />
                  
                  <FormField
                    id="provider-experience-years"
                    type="number"
                    min="0"
                    label="Years of Experience"
                    icon={Clock}
                    value={formData.experience_years}
                    onChange={(e) => setFormData({...formData, experience_years: parseInt(e.target.value.replace(/^0+(\d)/, '$1')) || 0})}
                  />
                </div>

                <div className="form-section">
                  <FormField label="Service Areas" hint="Add the cities or regions where you regularly accept work.">
                    <div className="space-y-3">
                      <div className="flex flex-col gap-2 sm:flex-row">
                      <Input
                        placeholder="e.g., Los Angeles, CA"
                        value={newServiceArea}
                        onChange={(e) => setNewServiceArea(e.target.value)}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddServiceArea();
                          }
                        }}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleAddServiceArea}
                        disabled={!newServiceArea.trim()}
                        className="rounded-lg bg-white/80"
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Add
                      </Button>
                    </div>
                    {formData.service_areas.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {formData.service_areas.map((area, index) => (
                          <Badge key={index} variant="secondary" className="pl-3 pr-1 py-1">
                            <span className="mr-1">{area}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveServiceArea(area)}
                              className="ml-1 rounded-lg p-0.5 hover:bg-muted"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    )}
                    </div>
                  </FormField>
                </div>
              </div>
            )}

            {/* Step 3: Skills */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <FormCallout icon={Briefcase} title="Choose only the work you actually want.">
                  These skills power customer trust and project matching, so it is better to be precise than broad.
                </FormCallout>

                <div>
                  <h2 className="heading-3 mb-2">Select your skills</h2>
                  <p className="text-muted-foreground mb-6">
                    Choose the services you're qualified to provide
                  </p>
                  
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {CATEGORIES.map((skill) => (
                      <div
                        key={skill}
                        onClick={() => handleSkillToggle(skill)}
                        className={`rounded-lg border cursor-pointer p-4 transition-all ${
                          formData.skills.includes(skill)
                            ? "border-primary bg-primary/5 shadow-sm"
                            : "border-white/80 bg-white/75 hover:border-primary/20"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <Checkbox
                            checked={formData.skills.includes(skill)}
                            onCheckedChange={() => handleSkillToggle(skill)}
                          />
                          <span className={formData.skills.includes(skill) ? "font-medium" : ""}>
                            {skill}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <p className="text-sm text-muted-foreground mt-4">
                    Selected: {formData.skills.length} skill{formData.skills.length !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>
            )}

            {/* Step 4: Pricing */}
            {currentStep === 4 && (
              <div className="space-y-6">
                <FormCallout icon={DollarSign} title="Set a baseline rate, not a perfect quote.">
                  You can always adjust pricing later by service or by project, so choose a starting point you can defend comfortably.
                </FormCallout>

                <h2 className="heading-3 mb-2">Set your hourly rate</h2>
                <p className="text-muted-foreground mb-6">
                  This will be your default rate. You can customize pricing per service.
                </p>
                
                <FormField
                  id="provider-hourly-rate"
                  type="number"
                  min="0"
                  label="Hourly Rate (USD)"
                  icon={DollarSign}
                  placeholder="50"
                  value={formData.hourly_rate || ""}
                  onChange={(e) => setFormData({...formData, hourly_rate: parseFloat(e.target.value.replace(/^0+(\d)/, '$1')) || 0})}
                  inputClassName="text-lg"
                  className="max-w-sm"
                  hint="Leave it at zero if you prefer to quote case by case later."
                />
                
                <div className="form-section">
                  <h4 className="font-medium mb-2">Profile Summary</h4>
                  <div className="space-y-2 text-sm">
                    <p><span className="text-muted-foreground">Location:</span> {formData.location || "Not set"}</p>
                    <p><span className="text-muted-foreground">Experience:</span> {formData.experience_years} years</p>
                    <p><span className="text-muted-foreground">Skills:</span> {formData.skills.join(", ") || "None selected"}</p>
                    <p><span className="text-muted-foreground">Service Areas:</span> {formData.service_areas.join(", ") || "None added"}</p>
                    <p><span className="text-muted-foreground">Hourly Rate:</span> {formData.hourly_rate ? `$${formData.hourly_rate}/hr` : "Not set (optional)"}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="mobile-form-tray sticky bottom-3 z-20 flex flex-col gap-3 sm:static sm:flex-row sm:items-center sm:justify-between">
              <Button
                variant="outline"
                onClick={prevStep}
                disabled={currentStep === 1}
                className="rounded-lg bg-white/80"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              
              <Button
                onClick={nextStep}
                disabled={!canProceed() || loading}
                className="rounded-lg"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : currentStep === 4 ? (
                  <CheckCircle className="w-4 h-4 mr-2" />
                ) : (
                  <ArrowRight className="w-4 h-4 mr-2" />
                )}
                {currentStep === 4 ? "Complete Setup" : "Continue"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          <button onClick={() => navigate("/dashboard")} className="underline underline-offset-4">
            Skip for now
          </button>
          {" - "}You can complete your profile later
        </p>
      </div>
    </AppShell>
  );
}
