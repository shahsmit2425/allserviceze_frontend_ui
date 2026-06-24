import { useState } from "react";
import logger from "@/utils/logger";
import { LIMITS } from "../lib/validation";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { useAuth } from "../context/AuthContext";
import { useCategories } from "../hooks/useCategories";
import { toast } from "sonner";
import axios from "axios";
import { AddressAutocomplete } from "../components/AddressAutocomplete";
import { 
  ArrowRight, ArrowLeft, CheckCircle, Briefcase, MapPin, 
  DollarSign, Building2, Loader2, Shield, Camera, Upload, X, Plus
} from "lucide-react";

const API_URL = `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'}/api`;

const STEPS = [
  { id: 1, title: "Business Info", icon: Building2 },
  { id: 2, title: "About You", icon: Briefcase },
  { id: 3, title: "Skills & Pricing", icon: DollarSign },
  { id: 4, title: "Review", icon: CheckCircle },
];

export default function ProviderBusinessSetup() {
  const navigate = useNavigate();
  const { user, getAuthHeader, refreshUser } = useAuth();
  const categories = useCategories();
  
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    business_name: "",
    business_description: "",
    business_address: "",
    phone: user?.phone || "",
    bio: "",
    location: "",
    experience_years: 0,
    hourly_rate: 0,
    skills: [],
    service_areas: []
  });

  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(user?.avatar || "");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [newServiceArea, setNewServiceArea] = useState("");
  const currentStepMeta = STEPS[currentStep - 1];
  const progressPercent = Math.round((currentStep / STEPS.length) * 100);

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB');
      return;
    }

    // Show preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatarPreview(reader.result);
    };
    reader.readAsDataURL(file);
    setAvatarFile(file);

    // Upload immediately
    setUploadingAvatar(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post(
        `${API_URL}/upload/profile-image`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            ...getAuthHeader()
          },
          withCredentials: true
        }
      );

      if (response.data.url) {
        setAvatarPreview(response.data.url);
        toast.success('Profile photo uploaded successfully');
        await refreshUser(); // Refresh user to get updated avatar
      }
    } catch (error) {
      logger.error('Avatar upload error:', error);
      toast.error(error.response?.data?.detail || 'Failed to upload profile photo');
      setAvatarPreview(user?.avatar || "");
      setAvatarFile(null);
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSkillToggle = (skill) => {
    setFormData(prev => ({
      ...prev,
      skills: prev.skills.includes(skill)
        ? prev.skills.filter(s => s !== skill)
        : [...prev.skills, skill]
    }));
  };

  const handleAddServiceArea = () => {
    if (!newServiceArea.trim()) return;
    
    if (formData.service_areas.includes(newServiceArea.trim())) {
      toast.error("This service area already exists");
      return;
    }

    setFormData(prev => ({
      ...prev,
      service_areas: [...prev.service_areas, newServiceArea.trim()]
    }));
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
      await axios.post(`${API_URL}/providers/business-profile/complete`, formData, {
        headers: getAuthHeader()
      });
      
      // Refresh user data to get updated verification status
      await refreshUser();
      
      toast.success("Business profile completed! Now let's verify your identity.");
      navigate("/provider-verification");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to save business profile");
    } finally {
      setLoading(false);
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return formData.business_name && formData.business_description && formData.business_address && formData.phone;
      case 2:
        return formData.bio.length >= 10 && formData.location;
      case 3:
        return formData.skills.length > 0;
      case 4:
        return true;
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

  return (
    <div className="min-h-screen bg-transparent" data-theme="provider">
      <div className="page-shell safe-top-shell safe-bottom-shell py-6 sm:py-8">
        <section className="page-hero mb-5 sm:mb-6">
          <div className="relative grid gap-5 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
            <div>
              <span className="page-kicker">
                <Shield className="h-3.5 w-3.5" /> Business setup
              </span>
              <h1 className="heading-2 mt-4 text-foreground">Complete your business profile with a tighter mobile form flow</h1>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
                Finish your company details and service setup without the old tall layout getting in the way on iPhone.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <span className="info-chip">Step {currentStep} of {STEPS.length}</span>
                <span className="info-chip">{progressPercent}% complete</span>
                <span className="info-chip">{currentStepMeta.title}</span>
              </div>
            </div>

            <div className="glass-panel p-4 sm:p-5">
              <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
                <div className="rounded-lg border border-white/70 bg-white/75 p-4 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Current focus</p>
                  <p className="mt-2 text-lg font-semibold tracking-[-0.03em] text-foreground">{currentStepMeta.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">The form section you should complete next.</p>
                </div>
                <div className="rounded-lg border border-white/70 bg-white/75 p-4 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Progress</p>
                  <p className="mt-2 text-lg font-semibold tracking-[-0.03em] text-foreground">{progressPercent}%</p>
                  <p className="mt-1 text-sm text-muted-foreground">Completion before identity verification.</p>
                </div>
                <div className="rounded-lg border border-white/70 bg-white/75 p-4 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Steps left</p>
                  <p className="mt-2 text-lg font-semibold tracking-[-0.03em] text-foreground">{Math.max(STEPS.length - currentStep, 0)}</p>
                  <p className="mt-1 text-sm text-muted-foreground">Remaining screens after this one.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="glass-panel mb-5 p-3 sm:mb-6 sm:p-4">
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            {STEPS.map((step, index) => (
              <div key={step.id} className="flex items-center gap-2 rounded-lg border border-white/70 bg-white/75 px-3 py-3 shadow-sm">
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
                <div className="min-w-0">
                  <p className={`text-sm font-semibold ${currentStep >= step.id ? "text-foreground" : "text-muted-foreground"}`}>{step.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {currentStep > step.id ? "Completed" : currentStep === step.id ? "Current step" : `Step ${index + 1}`}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1fr_18rem]">
          <div className="space-y-6">
            <Card className="form-shell border-0">
              <CardHeader className="border-b border-white/70 pb-6">
                <CardTitle>{STEPS[currentStep - 1].title}</CardTitle>
                <CardDescription>
                  {currentStep === 1 && "Tell us about your business"}
                  {currentStep === 2 && "Share your experience and expertise"}
                  {currentStep === 3 && "Set your skills and pricing"}
                  {currentStep === 4 && "Review your information"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 pt-6 sm:pt-8">
                {/* Step 1: Business Information */}
                {currentStep === 1 && (
                  <div className="space-y-6">
                    <div className="form-section space-y-6">
                      <div>
                        <Label>Business Name *</Label>
                        <Input
                          placeholder="e.g., ABC Plumbing Services"
                          value={formData.business_name}
                          maxLength={255}
                          onChange={(e) => setFormData({...formData, business_name: e.target.value.slice(0, 255)})}
                          className="mt-2"
                        />
                      </div>

                      <div>
                        <Label>Profile Photo</Label>
                        <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-center">
                          <div className="relative">
                            {avatarPreview ? (
                              <img
                                src={avatarPreview}
                                alt="Profile"
                                className="h-24 w-24 rounded-full object-cover border-2 border-muted"
                              />
                            ) : (
                              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-muted">
                                <Building2 className="w-10 h-10 text-muted-foreground" />
                              </div>
                            )}
                            {uploadingAvatar && (
                              <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50">
                                <Loader2 className="w-6 h-6 animate-spin text-white" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1">
                            <input
                              type="file"
                              id="avatar-upload"
                              accept="image/*"
                              onChange={handleAvatarUpload}
                              className="hidden"
                              disabled={uploadingAvatar}
                            />
                            <label htmlFor="avatar-upload">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={uploadingAvatar}
                                onClick={() => document.getElementById('avatar-upload').click()}
                                className="cursor-pointer rounded-lg bg-white/80"
                              >
                                {uploadingAvatar ? (
                                  <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Uploading...
                                  </>
                                ) : (
                                  <>
                                    <Camera className="w-4 h-4 mr-2" />
                                    Upload Photo
                                  </>
                                )}
                              </Button>
                            </label>
                            <p className="mt-2 text-xs text-muted-foreground">
                              JPG, PNG or GIF. Max 5MB.
                            </p>
                          </div>
                        </div>
                      </div>

                      <div>
                        <Label>Business Description *</Label>
                        <Textarea
                          placeholder="Describe your business and what makes you unique..."
                          value={formData.business_description}
                          maxLength={LIMITS.bio}
                          onChange={(e) => setFormData({...formData, business_description: e.target.value.slice(0, LIMITS.bio)})}
                          className="mt-2 min-h-[100px]"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          {formData.business_description.length}/{LIMITS.bio} characters
                        </p>
                      </div>
                    </div>

                    <div className="form-section space-y-6">
                      <div>
                        <Label>Business Address *</Label>
                        <AddressAutocomplete
                          placeholder="Start typing your business address..."
                          value={formData.business_address}
                          onChange={(business_address) => setFormData({...formData, business_address})}
                          className="mt-2"
                          testId="provider-business-address"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Suggestions come from the backend after you type a few characters.
                        </p>
                      </div>

                      <div>
                        <Label>Phone Number *</Label>
                        <Input
                          placeholder="+1 (555) 000-0000"
                          value={formData.phone}
                          maxLength={LIMITS.providerPhone}
                          onChange={(e) => setFormData({...formData, phone: e.target.value.slice(0, LIMITS.providerPhone)})}
                          className="mt-2"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 2: About You */}
                {currentStep === 2 && (
                  <div className="space-y-6">
                    <div className="form-section space-y-6">
                      <div>
                        <Label>Professional Bio *</Label>
                        <Textarea
                          placeholder="Tell customers about your experience, expertise, and why they should hire you..."
                          value={formData.bio}
                          maxLength={LIMITS.bio}
                          onChange={(e) => setFormData({...formData, bio: e.target.value.slice(0, LIMITS.bio)})}
                          className="mt-2 min-h-[150px]"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          {formData.bio.length}/{LIMITS.bio} characters (minimum 10)
                        </p>
                      </div>

                      <div>
                        <Label>Service Location *</Label>
                        <AddressAutocomplete
                          placeholder="City, State (e.g., Los Angeles, CA)"
                          value={formData.location}
                          onChange={(location) => setFormData({...formData, location: location.slice(0, LIMITS.providerLocation)})}
                          suggestionType="city"
                          className="mt-2"
                          testId="provider-service-location"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          City suggestions are fetched through the backend Google integration.
                        </p>
                      </div>

                      <div>
                        <Label>Years of Experience *</Label>
                        <Input
                          type="number"
                          min="0"
                          max="50"
                          value={formData.experience_years}
                          onChange={(e) => setFormData({...formData, experience_years: parseInt(e.target.value.replace(/^0+(\d)/, '$1')) || 0})}
                          className="mt-2"
                        />
                      </div>
                    </div>

                    <div className="form-section">
                      <Label>Service Areas</Label>
                      <p className="text-sm text-muted-foreground mb-2">
                        Add cities or regions where you provide services
                      </p>
                      <div className="flex flex-col gap-2 sm:flex-row mb-3">
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
                            <Badge
                              key={index}
                              variant="secondary"
                              className="pl-3 pr-1 py-1"
                            >
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
                  </div>
                )}

                {/* Step 3: Skills & Pricing */}
                {currentStep === 3 && (
                  <div className="space-y-6">
                    <div className="form-section">
                      <Label>Skills & Services *</Label>
                      <p className="text-sm text-muted-foreground mb-3">Select all that apply</p>
                      <div className="flex flex-wrap gap-2">
                        {categories.map((skill) => (
                          <Badge
                            key={skill}
                            variant={formData.skills.includes(skill) ? "default" : "outline"}
                            className="cursor-pointer rounded-lg px-3 py-2"
                            onClick={() => handleSkillToggle(skill)}
                          >
                            {formData.skills.includes(skill) && "✓ "}
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="form-section max-w-sm">
                      <Label>Hourly Rate (USD)</Label>
                      <Input
                        type="number"
                        min="0"
                        step="5"
                        placeholder="50"
                        value={formData.hourly_rate}
                        onChange={(e) => setFormData({...formData, hourly_rate: parseFloat(e.target.value.replace(/^0+(\d)/, '$1')) || 0})}
                        className="mt-2"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Your base hourly rate for services
                      </p>
                    </div>
                  </div>
                )}

                {/* Step 4: Review */}
                {currentStep === 4 && (
                  <div className="space-y-4">
                    <div className="form-section">
                      <h3 className="font-semibold mb-2">Business Information</h3>
                      <p className="text-sm"><strong>Name:</strong> {formData.business_name}</p>
                      <p className="text-sm"><strong>Address:</strong> {formData.business_address}</p>
                      <p className="text-sm"><strong>Phone:</strong> {formData.phone}</p>
                    </div>

                    <div className="form-section">
                      <h3 className="font-semibold mb-2">Professional Details</h3>
                      <p className="text-sm"><strong>Location:</strong> {formData.location}</p>
                      <p className="text-sm"><strong>Experience:</strong> {formData.experience_years} years</p>
                      <p className="text-sm"><strong>Hourly Rate:</strong> ${formData.hourly_rate}/hr</p>
                      <p className="text-sm"><strong>Skills:</strong> {formData.skills.join(", ") || "None selected"}</p>
                      <p className="text-sm"><strong>Service Areas:</strong> {formData.service_areas.join(", ") || "None added"}</p>
                    </div>

                    <div className="form-section border-primary/20 bg-primary/10">
                      <h3 className="font-semibold mb-2 text-primary">Next Step: Document Verification</h3>
                      <p className="text-sm text-muted-foreground">
                        After submitting your business profile, you'll need to verify your identity using a government-issued ID (Driver's License, Passport, or State ID). This is required to access the platform.
                      </p>
                    </div>
                  </div>
                )}

                {/* Navigation Buttons */}
                <div className="mobile-form-tray sticky bottom-3 z-20 flex flex-col gap-3 sm:static sm:flex-row sm:items-center sm:justify-between">
                  <Button
                    variant="outline"
                    onClick={() => setCurrentStep(currentStep - 1)}
                    disabled={currentStep === 1}
                    className="rounded-lg bg-white/80"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Previous
                  </Button>

                  <Button
                    onClick={nextStep}
                    disabled={!canProceed() || loading}
                    className="rounded-lg"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        {currentStep === 4 ? "Complete & Verify Identity" : "Next"}
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          <aside className="space-y-4 xl:sticky xl:top-6 xl:self-start">
            <Card className="border-white/70 bg-white/80 shadow-sm">
              <CardContent className="space-y-3 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Setup summary</p>
                <div className="rounded-lg border border-white/70 bg-muted/40 px-4 py-3">
                  <p className="text-sm font-medium text-foreground">{currentStepMeta.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{currentStep === 1 ? "Business identity and address." : currentStep === 2 ? "Professional background and service area." : currentStep === 3 ? "Skills and pricing that customers see." : "Final review before verification."}</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg border border-white/70 bg-white/75 px-3 py-3 shadow-sm">
                    <p className="text-xs text-muted-foreground">Step</p>
                    <p className="mt-1 text-base font-semibold text-foreground">{currentStep}/{STEPS.length}</p>
                  </div>
                  <div className="rounded-lg border border-white/70 bg-white/75 px-3 py-3 shadow-sm">
                    <p className="text-xs text-muted-foreground">Progress</p>
                    <p className="mt-1 text-base font-semibold text-foreground">{progressPercent}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="alert-warning shadow-sm">
              <CardContent className="p-5">
                <div className="flex gap-3">
                  <Shield className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-amber-900 mb-1">Why do we need this?</h4>
                    <p className="text-sm text-amber-800">
                      We require business profile completion and identity verification to ensure the safety and trust of our platform.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-white/70 bg-white/80 shadow-sm">
              <CardContent className="p-5">
                <button onClick={() => navigate("/dashboard")} className="text-sm font-medium text-primary underline underline-offset-4">
                  Skip for now
                </button>
                <p className="mt-2 text-sm text-muted-foreground">You can complete your profile later from the provider workspace.</p>
              </CardContent>
            </Card>
          </aside>
        </div>
      </div>
    </div>
  );
}
