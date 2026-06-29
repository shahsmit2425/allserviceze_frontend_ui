import { useEffect, useMemo, useRef, useState } from "react";
import logger from "@/utils/logger";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { AppShell } from "../components/AppShell";
import { AddressAutocomplete } from "../components/AddressAutocomplete";
import { Button } from "../components/ui/button";
import { FormField } from "../components/ui/form-field";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Checkbox } from "../components/ui/checkbox";
import { Badge } from "../components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { useAuth } from "../context/AuthContext";
import { useCategories } from "../hooks/useCategories";
import { LIMITS } from "../lib/validation";
import {
  ArrowRight,
  Briefcase,
  Calendar,
  CheckCircle,
  DollarSign,
  Headphones,
  Loader2,
  Lock,
  Send,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Upload,
  Wand2,
  X,
  Zap,
} from "lucide-react";

const API_URL = `${import.meta.env.VITE_BACKEND_URL || "http://localhost:5000"}/api`;
const MAX_IMAGES = 5;

const TIMELINE_PRESETS = [
  { label: "ASAP", days: 3 },
  { label: "This week", days: 7 },
  { label: "This month", days: 30 },
  { label: "Flexible", days: 60 },
];

const URGENCY_OPTIONS = [
  { value: "low", label: "Low", helper: "Just researching options" },
  { value: "normal", label: "Normal", helper: "Ready to compare quotes" },
  { value: "high", label: "High", helper: "Need to move soon" },
  { value: "urgent", label: "Urgent", helper: "Need a provider immediately" },
];

const PROPERTY_TYPE_OPTIONS = ["House", "Apartment / Condo", "Townhouse", "Commercial", "Office", "Other"];
const PROPERTY_OWNERSHIP_OPTIONS = ["Owner", "Tenant", "Property manager", "Family member", "Business owner", "Other"];

const getFutureDateValue = (days) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().split("T")[0];
};

const formatBudgetSummary = (formData) => {
  if (formData.budget_not_sure) return "Budget flexible";
  if (formData.budget_min && formData.budget_max) return `$${formData.budget_min} - $${formData.budget_max}`;
  if (formData.budget_min) return `From $${formData.budget_min}`;
  return "Budget pending";
};

const formatTimelineSummary = (deadline) => {
  if (!deadline) return "Timeline pending";
  return new Date(deadline).toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

const hasQuestionnaireAnswer = (answer) => {
  if (answer === undefined || answer === null) return false;
  if (Array.isArray(answer)) return answer.length > 0;
  if (typeof answer === "string") return answer.trim() !== "";
  return true;
};

const formatQuestionAnswer = (value) => {
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return value;
};

const getAiSuggestions = (category) => {
  const normalized = (category || "").toLowerCase();
  if (normalized.includes("plumb")) {
    return [
      "Describe what is leaking, clogged, or being installed.",
      "Mention whether the issue is causing water damage.",
      "Add whether fixtures or materials are already purchased.",
    ];
  }
  if (normalized.includes("electric")) {
    return [
      "Call out the rooms, outlets, fixtures, or panels involved.",
      "Mention if power loss, flickering, or breaker trips are happening.",
      "Note whether permits or inspection may be required.",
    ];
  }
  if (normalized.includes("paint")) {
    return [
      "List the rooms or surfaces that need paint.",
      "Mention prep work like patching, sanding, or wallpaper removal.",
      "Say if paint colors are already selected.",
    ];
  }
  if (normalized.includes("clean")) {
    return [
      "Share home size, room count, and current condition.",
      "Call out kitchens, bathrooms, or priority spaces.",
      "Mention if you want recurring service or a one-time job.",
    ];
  }
  return [
    "Describe the outcome you want, not just the task.",
    "Add measurements, room count, or approximate scope if you know them.",
    "Mention timing, access, or materials that providers should know before quoting.",
  ];
};

export default function PostProject() {
  const navigate = useNavigate();
  const { projectId } = useParams();
  const { user, getAuthHeader } = useAuth();
  const categories = useCategories({ scope: "project_posting" });
  const fileInputRef = useRef(null);
  const prevCategoryRef = useRef("");
  const isEditMode = !!projectId;

  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [loadingProject, setLoadingProject] = useState(!!projectId);
  const [questionnaire, setQuestionnaire] = useState(null);
  const [questionnaireAnswers, setQuestionnaireAnswers] = useState({});
  const [questionnaireLoading, setQuestionnaireLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState("Ready to post");

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "",
    budget_min: "",
    budget_max: "",
    budget_not_sure: false,
    deadline: "",
    required_skills: [],
    location: "",
    zipCode: "",
    property_type: "",
    property_ownership: "",
    urgency: "normal",
    attachments: [],
    images: [],
  });

  const patchFormData = (patch) => {
    setFormData((previous) => ({ ...previous, ...patch }));
    setSaveStatus("Draft has unsaved changes");
  };

  const patchQuestionnaireAnswers = (patch) => {
    setQuestionnaireAnswers((previous) => ({ ...previous, ...patch }));
    setSaveStatus("Draft has unsaved changes");
  };

  useEffect(() => {
    if (!projectId) return;

    const loadProject = async () => {
      try {
        const response = await axios.get(`${API_URL}/projects/${projectId}`, {
          headers: getAuthHeader(),
        });
        const project = response.data;

        if (project.customer_id !== user.id) {
          toast.error("You don't have permission to edit this project");
          navigate("/dashboard");
          return;
        }

        if (!["draft", "approved", "rejected"].includes(project.status)) {
          toast.error("This project cannot be edited in its current status");
          navigate("/dashboard");
          return;
        }

        const zipMatch = project.location ? project.location.match(/\b\d{5}\b/) : null;

        setFormData({
          title: project.title || "",
          description: project.description || "",
          category: project.category || "",
          budget_min: project.budget_min || "",
          budget_max: project.budget_max || "",
          budget_not_sure: !project.budget_min && !project.budget_max,
          deadline: project.deadline ? project.deadline.split("T")[0] : "",
          required_skills: project.required_skills || [],
          location: project.location || "",
          zipCode: zipMatch ? zipMatch[0] : "",
          property_type: project.property_type || "",
          property_ownership: project.property_ownership || "",
          urgency: project.urgency || "normal",
          attachments: project.attachments || [],
          images: project.images || [],
        });
        setQuestionnaireAnswers(project.questionnaire_responses || {});
        setSaveStatus("All changes saved");
      } catch (error) {
        logger.error("Failed to load project:", error);
        toast.error("Failed to load project data");
        navigate("/dashboard");
      } finally {
        setLoadingProject(false);
      }
    };

    loadProject();
  }, [getAuthHeader, navigate, projectId, user]);

  useEffect(() => {
    if (!formData.category) {
      setQuestionnaire(null);
      setQuestionnaireAnswers({});
      prevCategoryRef.current = "";
      return;
    }

    const categoryChanged = prevCategoryRef.current !== "" && prevCategoryRef.current !== formData.category;
    prevCategoryRef.current = formData.category;

    if (categoryChanged) {
      setQuestionnaireAnswers({});
      setSaveStatus("Draft has unsaved changes");
    }

    const controller = new AbortController();
    setQuestionnaireLoading(true);

    axios
      .get(`${API_URL}/questionnaires/${encodeURIComponent(formData.category)}`, {
        signal: controller.signal,
      })
      .then((response) => setQuestionnaire(response.data.questionnaire))
      .catch((error) => {
        if (!axios.isCancel(error)) setQuestionnaire(null);
      })
      .finally(() => {
        if (!controller.signal.aborted) setQuestionnaireLoading(false);
      });

    return () => {
      controller.abort();
      setQuestionnaireLoading(false);
    };
  }, [formData.category]);

  const categoryOptions = formData.category && !categories.includes(formData.category)
    ? [formData.category, ...categories]
    : categories;

  const aiSuggestions = useMemo(() => getAiSuggestions(formData.category), [formData.category]);

  const validation = useMemo(() => {
    const requiredQuestionsAnswered = !questionnaire || questionnaire.questions
      .filter((question) => question.required)
      .every((question) => hasQuestionnaireAnswer(questionnaireAnswers[question.id]));

    const sectionChecks = {
      title: formData.title.trim().length >= 10,
      category: Boolean(formData.category),
      description: formData.description.trim().length >= 10 && requiredQuestionsAnswered,
      budget: formData.budget_not_sure || (Boolean(formData.budget_min) && Boolean(formData.budget_max)),
      timeline: Boolean(formData.deadline),
      photos: true,
      location: formData.zipCode.length === 5 && Boolean(formData.property_type) && Boolean(formData.property_ownership),
    };

    const sectionsComplete = Object.values(sectionChecks).filter(Boolean).length;
    const sectionsTotal = Object.keys(sectionChecks).length;

    return {
      ...sectionChecks,
      requiredQuestionsAnswered,
      sectionsComplete,
      sectionsTotal,
      completion: Math.round((sectionsComplete / sectionsTotal) * 100),
      readyToSubmit: Object.values(sectionChecks).every(Boolean),
    };
  }, [formData, questionnaire, questionnaireAnswers]);

  const handleSkillToggle = (skill) => {
    patchFormData({
      required_skills: formData.required_skills.includes(skill)
        ? formData.required_skills.filter((item) => item !== skill)
        : [...formData.required_skills, skill],
    });
  };

  const handleImageUpload = async (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;

    if (formData.images.length + files.length > MAX_IMAGES) {
      toast.error(`Maximum ${MAX_IMAGES} images allowed`);
      return;
    }

    setUploadingImage(true);
    const nextImages = [...formData.images];

    for (const file of files) {
      if (!file.type.startsWith("image/")) continue;
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image must be less than 5MB");
        continue;
      }

      const uploadFormData = new FormData();
      uploadFormData.append("file", file);

      try {
        const response = await axios.post(`${API_URL}/upload/image`, uploadFormData, {
          headers: {
            ...getAuthHeader(),
            "Content-Type": "multipart/form-data",
          },
        });
        nextImages.push(response.data.url);
      } catch (error) {
        logger.error("Upload error:", error);
        toast.error(error.response?.data?.detail || "Failed to upload image");
      }
    }

    setFormData((previous) => ({ ...previous, images: nextImages }));
    setSaveStatus("Draft has unsaved changes");
    setUploadingImage(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeImage = (index) => {
    patchFormData({
      images: formData.images.filter((_, imageIndex) => imageIndex !== index),
    });
  };

  const handleSubmit = async (saveAsDraft = false) => {
    setLoading(true);
    try {
      let budgetMin = null;
      let budgetMax = null;

      if (!formData.budget_not_sure) {
        budgetMin = parseFloat(formData.budget_min);
        budgetMax = parseFloat(formData.budget_max);

        if (Number.isNaN(budgetMin) || Number.isNaN(budgetMax)) {
          toast.error("Please enter valid budget amounts");
          setLoading(false);
          return;
        }

        if (budgetMin <= 0 || budgetMax <= 0) {
          toast.error("Budget amounts must be greater than zero");
          setLoading(false);
          return;
        }

        if (budgetMin > budgetMax) {
          toast.error("Minimum budget cannot be greater than maximum budget");
          setLoading(false);
          return;
        }
      }

      const projectData = {
        title: formData.title,
        description: formData.description,
        category: formData.category,
        budget_min: budgetMin,
        budget_max: budgetMax,
        deadline: formData.deadline,
        required_skills: formData.required_skills || [],
        location: formData.location || formData.zipCode,
        zip_code: formData.zipCode,
        urgency: formData.urgency || "normal",
        attachments: formData.attachments || [],
        images: formData.images || [],
        questionnaire_responses: questionnaireAnswers,
        property_type: formData.property_type || null,
        property_ownership: formData.property_ownership || null,
      };

      let response;
      if (isEditMode) {
        response = await axios.put(`${API_URL}/projects/${projectId}`, projectData, {
          headers: getAuthHeader(),
        });

        if (!saveAsDraft) {
          await axios.post(`${API_URL}/projects/${projectId}/submit`, {}, {
            headers: getAuthHeader(),
          });
          toast.success("Project updated and resubmitted for approval!");
        } else {
          toast.success("Project updated!");
        }
      } else {
        response = await axios.post(`${API_URL}/projects`, projectData, {
          headers: getAuthHeader(),
        });

        if (!saveAsDraft) {
          await axios.post(`${API_URL}/projects/${response.data.id}/submit`, {}, {
            headers: getAuthHeader(),
          });
          toast.success("Project submitted for approval!");
        } else {
          toast.success("Project saved as draft!");
        }
      }

      setSaveStatus("All changes saved");
      navigate("/dashboard");
    } catch (error) {
      logger.error("Project submission error:", error);
      logger.error("Error response:", error.response?.data);
      toast.error(error.response?.data?.detail || (isEditMode ? "Failed to update project" : "Failed to create project"));
    } finally {
      setLoading(false);
    }
  };

  if (!user || user.role !== "customer") {
    return (
      <AppShell theme="customer">
        <div className="page-shell py-16">
          <div className="empty-state-panel mx-auto max-w-3xl">
            <h2 className="heading-2 mb-4">Customers Only</h2>
            <p className="mx-auto mb-6 max-w-xl text-muted-foreground">
              Only customers can post projects. Providers can browse and bid on projects.
            </p>
            <Button onClick={() => navigate("/projects")} className="rounded-lg">Browse Projects</Button>
          </div>
        </div>
      </AppShell>
    );
  }

  if (loadingProject) {
    return (
      <AppShell theme="customer">
        <div className="page-shell py-16">
          <div className="empty-state-panel mx-auto max-w-3xl">
            <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin" />
            <p className="text-muted-foreground">Loading project...</p>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell theme="customer" data-testid="post-project">
      <div className="page-shell safe-bottom-shell py-6 sm:py-8">
        {/* Hero Section with Feature Cards */}
        <section className="mb-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-br from-background to-background/80 shadow-[0_24px_72px_-52px_rgba(15,23,42,0.14)]">
          <div className="px-5 py-6 sm:px-7 sm:py-7">
            <span className="page-kicker">
              <Sparkles className="h-3.5 w-3.5" />
              {isEditMode ? "Edit listing" : "Create new listing"}
            </span>
            <h1 className="mt-4 font-heading text-[clamp(2.25rem,4.2vw,4.1rem)] font-extrabold leading-[0.95] tracking-[-0.06em] text-foreground">
              {isEditMode ? "Refine your project." : "Post a project."}
              {!isEditMode && <span className="text-amber-600"> Get it done.</span>}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
              Tell us what you need done and connect with trusted professionals in minutes.
            </p>

            {/* Feature Cards */}
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <div className="flex items-start gap-3 rounded-lg bg-white/50 p-4 backdrop-blur-sm">
                <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 flex-shrink-0">
                  <Sparkles className="h-4 w-4 text-amber-700" />
                </div>
                <div>
                  <p className="text-xs font-bold text-foreground uppercase">Smart Matching</p>
                  <p className="text-xs text-muted-foreground mt-1">We connect you with the best pros for your job.</p>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-lg bg-white/50 p-4 backdrop-blur-sm">
                <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 flex-shrink-0">
                  <DollarSign className="h-4 w-4 text-blue-700" />
                </div>
                <div>
                  <p className="text-xs font-bold text-foreground uppercase">Accurate Quotes</p>
                  <p className="text-xs text-muted-foreground mt-1">Receive competitive quotes from verified providers.</p>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-lg bg-white/50 p-4 backdrop-blur-sm">
                <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg bg-green-100 flex-shrink-0">
                  <Calendar className="h-4 w-4 text-green-700" />
                </div>
                <div>
                  <p className="text-xs font-bold text-foreground uppercase">Save Time</p>
                  <p className="text-xs text-muted-foreground mt-1">Manage everything in one place, easily.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Background Image Placeholder */}
          <div className="hidden lg:block w-96 h-80 flex-shrink-0 bg-cover bg-center rounded-r-2xl"
            style={{
              backgroundImage: `url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 320"><defs><linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:rgb(217,119,6);stop-opacity:0.1" /><stop offset="100%" style="stop-color:rgb(59,130,246);stop-opacity:0.1" /></linearGradient></defs><rect width="384" height="320" fill="url(%23grad)"/><circle cx="100" cy="80" r="60" fill="rgb(217,119,6)" opacity="0.08"/><circle cx="300" cy="280" r="90" fill="rgb(59,130,246)" opacity="0.08"/><path d="M20,160 Q100,100 200,140 T380,180" stroke="rgb(217,119,6)" stroke-width="2" fill="none" opacity="0.1"/></svg>')`,
            }}
          />
        </section>

        {/* Step Indicators */}
        <div className="mb-6 flex flex-wrap gap-3 px-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-amber-600 font-bold text-white text-sm">1</span>
            <span className="text-sm font-semibold text-foreground">Project Details</span>
          </div>
          <div className="text-muted-foreground">•</div>
          <div className="flex items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-deep-navy-200 font-semibold text-deep-navy-600 text-sm">2</span>
            <span className="text-sm text-muted-foreground">Location & Property</span>
          </div>
          <div className="text-muted-foreground">•</div>
          <div className="flex items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-deep-navy-200 font-semibold text-deep-navy-600 text-sm">3</span>
            <span className="text-sm text-muted-foreground">Photos & Extras</span>
          </div>
          <div className="text-muted-foreground">•</div>
          <div className="flex items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-deep-navy-200 font-semibold text-deep-navy-600 text-sm">4</span>
            <span className="text-sm text-muted-foreground">Review & Publish</span>
          </div>
        </div>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_22rem] xl:items-start">
          <main className="min-w-0 rounded-2xl border border-border/60 bg-white shadow-[0_24px_72px_-52px_rgba(15,23,42,0.14)]">
            <section className="border-b border-border/60 bg-background px-5 py-6 sm:px-7 sm:py-7">
              <div className="flex flex-col gap-2">
                <span className="page-kicker">What are you looking to get done?</span>
              </div>
            </section>

            <div className="px-5 sm:px-7">
              <section className="border-b border-border/60 py-6 sm:py-7">
                <p className="detail-kicker">1. Project Title</p>
                <h2 className="mt-2 text-xl font-semibold tracking-[-0.04em] text-foreground">Start with the one-line version of the job.</h2>
                <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-start">
                  <div>
                    <FormField
                      id="project-title-input"
                      label="Project title"
                      icon={Briefcase}
                      placeholder="Need a bathroom plumber for a leaking shower and vanity install"
                      value={formData.title}
                      onChange={(event) => patchFormData({ title: event.target.value.slice(0, LIMITS.projectTitle) })}
                      maxLength={LIMITS.projectTitle}
                      data-testid="project-title-input"
                      hint="Clear, specific titles improve quote relevance."
                    />
                  </div>
                  <div className="rounded-xl border border-border/60 bg-white px-4 py-4 text-sm text-muted-foreground">
                    <p className="detail-kicker">Quality signal</p>
                    <p className="mt-2 leading-6">Mention the trade, the problem, and the intended result in one line.</p>
                    <p className={`mt-3 text-xs ${formData.title.length >= LIMITS.projectTitle ? "text-emerald-600" : "text-muted-foreground"}`}>
                      {formData.title.length}/{LIMITS.projectTitle} characters
                    </p>
                  </div>
                </div>
              </section>

              <section className="border-b border-border/60 py-6 sm:py-7">
                <p className="detail-kicker">2. Category</p>
                <h2 className="mt-2 text-xl font-semibold tracking-[-0.04em] text-foreground">Route the listing to the right type of provider.</h2>
                <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-start">
                  <div>
                    <FormField label="Category" id="category-select" hint="This unlocks more tailored prompts and better matching.">
                      <Select value={formData.category} onValueChange={(value) => patchFormData({ category: value })}>
                        <SelectTrigger id="category-select" data-testid="category-select">
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                        <SelectContent>
                          {categoryOptions.map((category) => (
                            <SelectItem key={category} value={category}>{category}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormField>
                  </div>
                  <div className="rounded-xl border border-border/60 bg-white px-4 py-4 text-sm text-muted-foreground">
                    <p className="detail-kicker">Why this matters</p>
                    <p className="mt-2 leading-6">The selected category shapes follow-up questions so providers waste less time clarifying basics.</p>
                  </div>
                </div>
              </section>

              <section className="border-b border-border/60 py-6 sm:py-7">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="detail-kicker">3. Description</p>
                    <h2 className="mt-2 text-xl font-semibold tracking-[-0.04em] text-foreground">Describe the work like you’re briefing a great host or contractor.</h2>
                  </div>
                  <div className="rounded-xl border border-primary/10 bg-primary/5 px-4 py-4 text-sm text-foreground/80 lg:max-w-[20rem]">
                    <div className="flex items-start gap-3">
                      <Wand2 className="mt-0.5 h-4 w-4 text-primary" />
                      <div>
                        <p className="font-semibold text-foreground">AI-assisted prompts</p>
                        <ul className="mt-2 space-y-2 leading-6 text-muted-foreground">
                          {aiSuggestions.map((suggestion) => (
                            <li key={suggestion}>{suggestion}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4">
                  <FormField
                    id="project-description-input"
                    label="Project description"
                    icon={Sparkles}
                    iconPosition="top"
                    hint="Explain the problem, the space, and the finished outcome you want."
                  >
                    <Textarea
                      placeholder="The upstairs shower is leaking behind the wall. I want the leak fixed, damaged drywall checked, and a new vanity installed if the plumbing layout allows it."
                      value={formData.description}
                      onChange={(event) => patchFormData({ description: event.target.value.slice(0, LIMITS.projectDescription) })}
                      maxLength={LIMITS.projectDescription}
                      rows={7}
                      className="min-h-[180px] pl-11 pt-4"
                      data-testid="project-description-input"
                    />
                  </FormField>
                </div>

                <div className="mt-3 flex justify-end text-xs text-muted-foreground">
                  <span>{formData.description.length}/{LIMITS.projectDescription}</span>
                </div>

                {questionnaireLoading && (
                  <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading service-specific questions...
                  </div>
                )}

                {questionnaire && !questionnaireLoading && (
                  <div className="mt-5 border-t border-border/60 pt-5">
                    <p className="detail-kicker">Progressive disclosure</p>
                    <h3 className="mt-2 text-base font-semibold text-foreground">{questionnaire.name}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">These answers help providers quote with less back-and-forth.</p>

                    <div className="mt-4 space-y-4">
                      {questionnaire.questions.map((question) => (
                        <div key={question.id} className="space-y-2.5 border-b border-border/60 pb-4 last:border-b-0 last:pb-0">
                          <Label className="text-sm font-medium text-foreground">
                            {question.question}
                            {question.required && <span className="ml-1 text-red-500">*</span>}
                          </Label>

                          {question.type === "select" && (
                            <Select
                              value={questionnaireAnswers[question.id] || ""}
                              onValueChange={(value) => patchQuestionnaireAnswers({ [question.id]: value })}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select an option" />
                              </SelectTrigger>
                              <SelectContent>
                                {question.options.map((option) => (
                                  <SelectItem key={option} value={option}>{option}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}

                          {question.type === "multiselect" && (
                            <div className="flex flex-wrap gap-2">
                              {question.options.map((option) => {
                                const current = questionnaireAnswers[question.id] || [];
                                const isSelected = current.includes(option);
                                return (
                                  <button
                                    key={option}
                                    type="button"
                                    onClick={() => patchQuestionnaireAnswers({
                                      [question.id]: isSelected
                                        ? current.filter((item) => item !== option)
                                        : [...current, option],
                                    })}
                                    className={`rounded-lg px-3 py-2 text-sm transition ${isSelected ? "bg-primary text-primary-foreground" : "bg-deep-navy-50 text-foreground hover:bg-deep-navy-100"}`}
                                  >
                                    {option}
                                  </button>
                                );
                              })}
                            </div>
                          )}

                          {question.type === "boolean" && (
                            <div className="flex flex-wrap gap-2">
                              {["Yes", "No"].map((label) => {
                                const value = label === "Yes";
                                const isSelected = questionnaireAnswers[question.id] === value;
                                return (
                                  <button
                                    key={label}
                                    type="button"
                                    onClick={() => patchQuestionnaireAnswers({ [question.id]: value })}
                                    className={`rounded-lg px-3 py-2 text-sm transition ${isSelected ? "bg-primary text-primary-foreground" : "bg-deep-navy-50 text-foreground hover:bg-deep-navy-100"}`}
                                  >
                                    {label}
                                  </button>
                                );
                              })}
                            </div>
                          )}

                          {question.type === "textarea" && (
                            <Textarea
                              rows={4}
                              value={questionnaireAnswers[question.id] || ""}
                              onChange={(event) => patchQuestionnaireAnswers({ [question.id]: event.target.value })}
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </section>

              <section className="border-b border-border/60 py-6 sm:py-7">
                <p className="detail-kicker">4. Budget</p>
                <h2 className="mt-2 text-xl font-semibold tracking-[-0.04em] text-foreground">Set a realistic range or keep it flexible and keep moving.</h2>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <FormField
                    id="project-budget-min"
                    type="number"
                    label="Minimum budget"
                    icon={DollarSign}
                    placeholder="500"
                    value={formData.budget_min}
                    onChange={(event) => patchFormData({ budget_min: event.target.value.replace(/^0+(\d)/, "$1"), budget_not_sure: false })}
                    disabled={formData.budget_not_sure}
                  />
                  <FormField
                    id="project-budget-max"
                    type="number"
                    label="Maximum budget"
                    icon={DollarSign}
                    placeholder="3000"
                    value={formData.budget_max}
                    onChange={(event) => patchFormData({ budget_max: event.target.value.replace(/^0+(\d)/, "$1"), budget_not_sure: false })}
                    disabled={formData.budget_not_sure}
                  />
                </div>

                <label className="mt-4 flex items-start gap-3 rounded-xl border border-border/60 bg-white px-4 py-3.5 text-sm text-foreground/88">
                  <Checkbox
                    id="budget-not-sure"
                    checked={formData.budget_not_sure}
                    onCheckedChange={(checked) => patchFormData({
                      budget_not_sure: checked,
                      budget_min: checked ? "" : formData.budget_min,
                      budget_max: checked ? "" : formData.budget_max,
                    })}
                  />
                  <span>I’m not sure about the budget yet, but I still want providers to quote.</span>
                </label>
              </section>

              <section className="border-b border-border/60 py-6 sm:py-7">
                <p className="detail-kicker">5. Timeline</p>
                <h2 className="mt-2 text-xl font-semibold tracking-[-0.04em] text-foreground">Choose when you want this moving.</h2>
                <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  {TIMELINE_PRESETS.map((preset) => {
                    const nextDate = getFutureDateValue(preset.days);
                    const isSelected = formData.deadline === nextDate;
                    return (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => patchFormData({ deadline: nextDate })}
                        className={`rounded-xl border px-4 py-4 text-left transition ${isSelected ? "border-primary/20 bg-primary/8 text-primary" : "border-border/60 bg-white text-foreground hover:bg-deep-navy-50"}`}
                      >
                        <p className="text-sm font-semibold">{preset.label}</p>
                        <p className="mt-1 text-sm text-muted-foreground">{formatTimelineSummary(nextDate)}</p>
                      </button>
                    );
                  })}
                </div>

                <div className="mt-4 grid gap-4 lg:grid-cols-2">
                  <FormField
                    id="project-deadline"
                    type="date"
                    label="Target completion date"
                    icon={Calendar}
                    value={formData.deadline}
                    onChange={(event) => patchFormData({ deadline: event.target.value })}
                    min={new Date().toISOString().split("T")[0]}
                  />

                  <FormField label="Urgency" id="project-urgency" hint="This helps providers prioritize the listing correctly.">
                    <Select value={formData.urgency} onValueChange={(value) => patchFormData({ urgency: value })}>
                      <SelectTrigger id="project-urgency">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {URGENCY_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>{option.label} - {option.helper}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormField>
                </div>
              </section>

              <section className="border-b border-border/60 py-6 sm:py-7">
                <p className="detail-kicker">6. Photos</p>
                <h2 className="mt-2 text-xl font-semibold tracking-[-0.04em] text-foreground">Add photos if they help reduce ambiguity.</h2>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImageUpload}
                  accept="image/*"
                  multiple
                  className="hidden"
                />

                <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
                  {formData.images.map((image, index) => (
                    <div key={image} className="group relative aspect-video overflow-hidden rounded-xl bg-deep-navy-50">
                      <img src={image} alt={`Project ${index + 1}`} className="h-full w-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        aria-label={`Remove image ${index + 1}`}
                        className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-lg bg-white/92 text-foreground shadow opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}

                  {formData.images.length < MAX_IMAGES && (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingImage}
                      className="flex aspect-video flex-col items-center justify-center rounded-xl border border-dashed border-border/60 bg-white text-center transition hover:border-primary/30 hover:bg-primary/5"
                    >
                      {uploadingImage ? (
                        <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
                      ) : (
                        <>
                          <Upload className="h-6 w-6 text-primary" />
                          <span className="mt-2 text-sm font-medium text-foreground">Upload photo</span>
                          <span className="mt-1 text-xs text-muted-foreground">Up to {MAX_IMAGES} images</span>
                        </>
                      )}
                    </button>
                  )}
                </div>

                <p className="mt-3 text-xs text-muted-foreground">Supported formats: JPG, PNG, GIF. Maximum 5MB per image.</p>
              </section>

              <section className="py-6 sm:py-7">
                <p className="detail-kicker">7. Location</p>
                <h2 className="mt-2 text-xl font-semibold tracking-[-0.04em] text-foreground">Tell providers where the work is happening and what kind of property it is.</h2>

                <div className="mt-4 space-y-4">
                  <FormField label="Project location" hint="Select a suggested address for better matching, or type Remote if the work is not on-site.">
                    <AddressAutocomplete
                      placeholder="123 Main St, Boston, MA"
                      value={formData.location}
                      onChange={(location) => patchFormData({ location })}
                      onZipCodeChange={(zipCode) => patchFormData({ zipCode })}
                      testId="project-location-input"
                    />
                  </FormField>

                  <div className="grid gap-4 lg:grid-cols-2">
                    <FormField
                      id="project-zipcode"
                      label="Zip code"
                      placeholder="02118"
                      value={formData.zipCode}
                      onChange={(event) => patchFormData({ zipCode: event.target.value.replace(/\D/g, "").slice(0, 5) })}
                      maxLength={5}
                      hint="Required so nearby providers can find the project."
                    />

                    <FormField label="Property type" id="project-property-type">
                      <Select value={formData.property_type} onValueChange={(value) => patchFormData({ property_type: value })}>
                        <SelectTrigger id="project-property-type">
                          <SelectValue placeholder="Select property type" />
                        </SelectTrigger>
                        <SelectContent>
                          {PROPERTY_TYPE_OPTIONS.map((option) => (
                            <SelectItem key={option} value={option}>{option}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormField>

                    <FormField label="Relationship to property" id="project-property-ownership">
                      <Select value={formData.property_ownership} onValueChange={(value) => patchFormData({ property_ownership: value })}>
                        <SelectTrigger id="project-property-ownership">
                          <SelectValue placeholder="Select relationship" />
                        </SelectTrigger>
                        <SelectContent>
                          {PROPERTY_OWNERSHIP_OPTIONS.map((option) => (
                            <SelectItem key={option} value={option}>{option}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormField>
                  </div>

                  <div>
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-foreground">Helpful skills</p>
                        <p className="text-sm text-muted-foreground">Optional tags that help the right providers self-qualify faster.</p>
                      </div>
                      {formData.required_skills.length > 0 && <Badge variant="outline">{formData.required_skills.length} selected</Badge>}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {categories.map((skill) => {
                        const isSelected = formData.required_skills.includes(skill);
                        return (
                          <button
                            key={skill}
                            type="button"
                            onClick={() => handleSkillToggle(skill)}
                            className={`rounded-lg px-3 py-2 text-sm transition ${isSelected ? "bg-primary text-primary-foreground" : "bg-deep-navy-50 text-foreground hover:bg-deep-navy-100"}`}
                          >
                            {skill}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </section>
            </div>
          </main>

          <aside className="space-y-4 xl:sticky xl:top-[6rem]">
            {/* Project Summary Card */}
            <div className="rounded-xl border border-border/60 bg-white p-5 shadow-sm backdrop-blur-sm">
              <p className="detail-kicker">Project Summary</p>
              <p className="mt-1 text-sm text-muted-foreground">See how your listing will appear to providers.</p>

              <div className="mt-4 space-y-3 text-sm">
                <div className="flex items-center justify-between gap-2 pb-3 border-b border-border/40">
                  <span className="text-muted-foreground">Title</span>
                  <span className={`font-medium ${formData.title ? "text-foreground" : "text-muted-foreground"}`}>
                    {formData.title || "Not added yet"}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-2 pb-3 border-b border-border/40">
                  <span className="text-muted-foreground">Category</span>
                  <span className={`font-medium ${formData.category ? "text-foreground" : "text-muted-foreground"}`}>
                    {formData.category || "Not selected"}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-2 pb-3 border-b border-border/40">
                  <span className="text-muted-foreground">Description</span>
                  <span className={`font-medium ${formData.description ? "text-foreground" : "text-muted-foreground"}`}>
                    {formData.description ? "Added" : "Not added yet"}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-2 pb-3 border-b border-border/40">
                  <span className="text-muted-foreground">Budget</span>
                  <span className={`font-medium ${formData.budget_min || formData.budget_max ? "text-foreground" : "text-muted-foreground"}`}>
                    {formatBudgetSummary(formData) !== "Budget pending" ? formatBudgetSummary(formData) : "Not set"}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-2 pb-3 border-b border-border/40">
                  <span className="text-muted-foreground">Timeline</span>
                  <span className={`font-medium ${formData.deadline ? "text-foreground" : "text-muted-foreground"}`}>
                    {formData.deadline ? formatTimelineSummary(formData.deadline) : "Not set"}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-2 pb-3 border-b border-border/40">
                  <span className="text-muted-foreground">Location</span>
                  <span className={`font-medium ${formData.address || formData.zipCode ? "text-foreground" : "text-muted-foreground"}`}>
                    {formData.address || formData.zipCode ? "Added" : "Not added yet"}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground">Photos</span>
                  <span className={`font-medium ${formData.images.length > 0 ? "text-foreground" : "text-muted-foreground"}`}>
                    {formData.images.length}/{MAX_IMAGES} photos
                  </span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mt-4 pt-4 border-t border-border/40">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-xs font-semibold text-foreground uppercase">Completion</span>
                  <span className="text-xs font-bold text-primary">{validation.completion}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-deep-navy-100/80">
                  <div className="h-full rounded-full bg-primary transition-all duration-300" style={{ width: `${validation.completion}%` }} />
                </div>
              </div>
            </div>

            {/* Why Details Matter Card */}
            <div className="rounded-xl border border-border/60 bg-white p-5 shadow-sm">
              <p className="detail-kicker">Why details matter</p>
              <div className="mt-3 space-y-2 text-sm">
                <div className="flex gap-2 items-start">
                  <CheckCircle className="h-4 w-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <span className="text-muted-foreground">Clear details = better quotes</span>
                </div>
                <div className="flex gap-2 items-start">
                  <CheckCircle className="h-4 w-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <span className="text-muted-foreground">Photos help save time</span>
                </div>
                <div className="flex gap-2 items-start">
                  <CheckCircle className="h-4 w-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <span className="text-muted-foreground">Accurate budget gets accurate quotes</span>
                </div>
                <div className="flex gap-2 items-start">
                  <CheckCircle className="h-4 w-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <span className="text-muted-foreground">Timeline helps pros plan better</span>
                </div>
              </div>
            </div>

            {/* Support Card */}
            <div className="rounded-xl border border-border/60 bg-gradient-to-br from-deep-navy-50 to-deep-navy-25 p-5 shadow-sm">
              <p className="text-sm font-bold text-foreground">Need help?</p>
              <p className="text-sm text-muted-foreground mt-1">Our support team is here to help it easy.</p>
              <Button variant="outline" className="w-full mt-3 rounded-lg border-amber-300 text-amber-700 hover:bg-amber-50 font-semibold">
                <Headphones className="w-4 h-4 mr-2" />
                Contact Support
              </Button>
            </div>

            <div className="rounded-xl border border-border/60 bg-white p-5">
              <p className="detail-kicker">Listing preview</p>
              <h3 className="mt-2 text-lg font-semibold tracking-[-0.03em] text-foreground">How providers will read this</h3>
              <div className="mt-4 space-y-4 text-sm">
                <div>
                  <p className="font-semibold text-foreground">{formData.title || "Your project title will appear here"}</p>
                  <p className="mt-1 text-muted-foreground">{formData.category || "Category pending"}</p>
                </div>

                <p className="leading-6 text-muted-foreground">
                  {formData.description || "Your description preview updates as you type so you can keep the listing concise and strong."}
                </p>

                <div className="flex flex-wrap gap-2">
                  <span className="market-card-chip">{formatBudgetSummary(formData)}</span>
                  <span className="market-card-chip">{formatTimelineSummary(formData.deadline)}</span>
                  <span className="market-card-chip">{formData.zipCode || "Zip pending"}</span>
                </div>

                {questionnaire && Object.keys(questionnaireAnswers).some((key) => hasQuestionnaireAnswer(questionnaireAnswers[key])) && (
                  <div className="space-y-2 border-t border-border/60 pt-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Key answers</p>
                    {questionnaire.questions
                      .filter((question) => hasQuestionnaireAnswer(questionnaireAnswers[question.id]))
                      .slice(0, 3)
                      .map((question) => (
                        <div key={question.id} className="flex items-start justify-between gap-3 text-sm">
                          <span className="text-muted-foreground">{question.question}</span>
                          <span className="text-right font-medium text-foreground">{formatQuestionAnswer(questionnaireAnswers[question.id])}</span>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>
          </aside>
        </div>

        <div className="mobile-form-tray sticky bottom-3 z-20 mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Sparkles className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">{validation.readyToSubmit ? "Ready to submit" : "Keep going"}</p>
              <p className="text-sm text-muted-foreground">
                {validation.readyToSubmit
                  ? "Your listing has enough detail to start collecting serious quotes."
                  : `${validation.sectionsComplete}/${validation.sectionsTotal} sections complete`}
              </p>
            </div>
          </div>

          <div className="flex flex-col-reverse gap-3 sm:flex-row">
            <Button variant="outline" className="rounded-lg border-border/60 bg-white" onClick={() => handleSubmit(true)} disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save Draft
            </Button>
            <Button className="rounded-lg" onClick={() => handleSubmit(false)} disabled={!validation.readyToSubmit || loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              {isEditMode ? "Update and Submit" : "Submit for Approval"}
              {!loading && <ArrowRight className="ml-2 h-4 w-4" />}
            </Button>
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-copper-100/80 bg-copper-50/80 px-4 py-4">
          <div className="flex items-start gap-3">
            <Zap className="mt-0.5 h-5 w-5 text-amber-700" />
            <div>
              <p className="text-sm font-semibold text-amber-900">Admin approval required before the listing goes live</p>
              <p className="mt-1 text-sm leading-6 text-amber-800">Clear details, realistic timing, and helpful photos usually reduce approval friction and improve quote quality.</p>
            </div>
          </div>
        </div>

        {/* Trust Badges Footer */}
        <div className="mt-8 border-t border-deep-navy-100 pt-8">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6">
            <div className="text-center">
              <div className="flex justify-center mb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100">
                  <CheckCircle className="h-6 w-6 text-emerald-700" />
                </div>
              </div>
              <p className="text-xs font-bold text-deep-navy-900 uppercase tracking-wide">Verified Professionals</p>
              <p className="text-xs text-deep-navy-600 mt-2">Background checked</p>
            </div>
            <div className="text-center">
              <div className="flex justify-center mb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                  <Lock className="h-6 w-6 text-blue-700" />
                </div>
              </div>
              <p className="text-xs font-bold text-deep-navy-900 uppercase tracking-wide">Secure Payments</p>
              <p className="text-xs text-deep-navy-600 mt-2">Safe and protected</p>
            </div>
            <div className="text-center">
              <div className="flex justify-center mb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100">
                  <Headphones className="h-6 w-6 text-amber-700" />
                </div>
              </div>
              <p className="text-xs font-bold text-deep-navy-900 uppercase tracking-wide">24/7 Support</p>
              <p className="text-xs text-deep-navy-600 mt-2">We're here to help</p>
            </div>
            <div className="text-center">
              <div className="flex justify-center mb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100">
                  <TrendingUp className="h-6 w-6 text-purple-700" />
                </div>
              </div>
              <p className="text-xs font-bold text-deep-navy-900 uppercase tracking-wide">Satisfaction Guaranteed</p>
              <p className="text-xs text-deep-navy-600 mt-2">Quality work, every time</p>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
