import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import FirebaseAuthService from "../services/firebaseAuthService";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Button } from "../components/ui/button";
import { RadioGroup, RadioGroupItem } from "../components/ui/radio-group";
import { toast } from "sonner";
import axios from "axios";

const API_URL = `${import.meta.env.VITE_BACKEND_URL || "http://localhost:5000"}/api`;
const GOOGLE_REDIRECT_PENDING_KEY = "servicetones_google_redirect_pending";
const PENDING_SOCIAL_SETUP_KEY = "servicetones_pending_social_setup";

const readPendingSocialSetup = () => {
  const raw = sessionStorage.getItem(PENDING_SOCIAL_SETUP_KEY);

  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw);
    return parsed?.token ? parsed : null;
  } catch {
    sessionStorage.removeItem(PENDING_SOCIAL_SETUP_KEY);
    return null;
  }
};

const savePendingSocialSetup = (data) => {
  const pendingSetup = {
    token: data?.token || '',
    name: data?.name || '',
    email: data?.email || '',
  };

  if (!pendingSetup.token) {
    return null;
  }

  sessionStorage.setItem(PENDING_SOCIAL_SETUP_KEY, JSON.stringify(pendingSetup));
  return pendingSetup;
};

const clearPendingSocialSetup = () => {
  sessionStorage.removeItem(PENDING_SOCIAL_SETUP_KEY);
};

export default function SocialSetupPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { refreshUser, user, logout } = useAuth();
  const pendingSetup = readPendingSocialSetup();
  const hasAuthenticatedSetup = Boolean(user && user.account_setup_completed === false);

  const setupToken = hasAuthenticatedSetup ? "" : (searchParams.get("token") || pendingSetup?.token || "");
  const email = user?.email || searchParams.get("email") || pendingSetup?.email || "";

  const [fullName, setFullName] = useState(user?.full_name || searchParams.get("name") || pendingSetup?.name || "");
  const [role, setRole]         = useState("customer");
  const [phone, setPhone]       = useState("");
  const [loading, setLoading]   = useState(false);

  useEffect(() => {
    if (!hasAuthenticatedSetup && setupToken) {
      savePendingSocialSetup({ token: setupToken, name: fullName, email });
    }
  }, [email, fullName, hasAuthenticatedSetup, setupToken]);

  useEffect(() => {
    if (user?.account_setup_completed === true) {
      clearPendingSocialSetup();
      navigate("/dashboard", { replace: true });
    }
  }, [navigate, user]);

  // Guard: prefer the authenticated account-setup flow, with token fallback for legacy sessions.
  useEffect(() => {
    if (!hasAuthenticatedSetup && !setupToken) {
      navigate("/auth", { replace: true });
    }
  }, [hasAuthenticatedSetup, setupToken, navigate]);

  useEffect(() => {
    if (user?.full_name && !fullName) {
      setFullName(user.full_name);
    }
  }, [fullName, user]);

  useEffect(() => {
    if (user?.phone && !phone) {
      setPhone(user.phone);
    }
  }, [phone, user]);

  useEffect(() => {
    if (user?.role === "provider") {
      setRole("provider");
    }
  }, [user]);

  const handleCancel = async () => {
    setLoading(true);

    try {
      if (hasAuthenticatedSetup) {
        clearPendingSocialSetup();
        await logout();
        return;
      }

      sessionStorage.removeItem(GOOGLE_REDIRECT_PENDING_KEY);
      clearPendingSocialSetup();

      if (FirebaseAuthService.getCurrentUser()) {
        await FirebaseAuthService.signOut();
      }

      toast.success("Google sign-in setup was cleared.");
      navigate("/auth", { replace: true });
    } catch {
      toast.error("We could not fully clear Google sign-in. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!fullName.trim()) {
      toast.error("Please enter your full name");
      return;
    }

    setLoading(true);
    try {
      const { data } = await axios.post(
        `${API_URL}/auth/social/complete`,
        { setup_token: setupToken || undefined, full_name: fullName.trim(), role, phone: phone.trim() || null },
        { withCredentials: true }
      );

      // Seed the CSRF token into storage so the axios interceptor can attach it
      // to the upcoming /auth/me request inside refreshUser(). refreshUser() will
      // then overwrite it with the freshest value and save to SecureStorage on native.
      if (data.csrf) {
        const isNative = window.Capacitor?.isNativePlatform?.() ?? false;
        (isNative ? localStorage : sessionStorage).setItem("servicetones_csrf", data.csrf);
      }

      clearPendingSocialSetup();
      await refreshUser(); // ← saves to SecureStorage on native automatically
      toast.success("Welcome to ServiceTones!");
      navigate("/dashboard", { replace: true });
    } catch (err) {
      const msg = err.response?.data?.detail || "Setup failed. Please try again.";
      toast.error(msg);
      // Token expired or already used — restart auth
      if (!hasAuthenticatedSetup && err.response?.status === 400 && (msg.toLowerCase().includes("expired") || msg.toLowerCase().includes("already exists"))) {
        clearPendingSocialSetup();
        navigate("/auth", { replace: true });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-transparent px-4 py-8" data-theme="customer">
      <div className="page-shell py-8">
        <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <section className="page-hero h-full">
            <div className="max-w-xl">
              <span className="page-kicker">Account setup</span>
              <h1 className="heading-2 mt-4 text-foreground">Complete your profile</h1>
              <p className="body-lg mt-3 text-muted-foreground">
                Add the last few details so we can create your ServiceTones account and send you to the right workspace.
              </p>

              {email && (
                <div className="mt-6 rounded-lg border border-white/70 bg-white/70 px-4 py-3 text-sm font-medium text-foreground shadow-sm shadow-deep-navy-800/5">
                  {email}
                </div>
              )}
            </div>
          </section>

          <Card className="w-full overflow-hidden rounded-xl border border-white/70 bg-white/88 shadow-xl shadow-deep-navy-800/5 backdrop-blur-sm">
            <CardHeader className="pb-4">
              <CardTitle className="text-2xl font-semibold tracking-[-0.04em]">Almost there</CardTitle>
              <CardDescription className="mt-1 text-sm leading-6">
                Pick your role, confirm your name, and add a phone number if you want faster follow-up.
              </CardDescription>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="full_name">Full name</Label>
                  <Input
                    id="full_name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Your full name"
                    autoComplete="name"
                    required
                  />
                </div>

                <div className="space-y-3">
                  <Label>I am a</Label>
                  <RadioGroup value={role} onValueChange={setRole} className="grid gap-3 sm:grid-cols-2">
                    <label htmlFor="role_customer" className="flex cursor-pointer items-center gap-3 rounded-lg border border-deep-navy-100/80 bg-slate-50/80 px-4 py-4">
                      <RadioGroupItem value="customer" id="role_customer" />
                      <span className="text-sm font-medium text-foreground">Customer</span>
                    </label>
                    <label htmlFor="role_provider" className="flex cursor-pointer items-center gap-3 rounded-lg border border-deep-navy-100/80 bg-slate-50/80 px-4 py-4">
                      <RadioGroupItem value="provider" id="role_provider" />
                      <span className="text-sm font-medium text-foreground">Service Provider</span>
                    </label>
                  </RadioGroup>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">
                    Phone number <span className="text-xs font-normal text-muted-foreground">(optional)</span>
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+1 555 000 0000"
                    autoComplete="tel"
                  />
                </div>

                <Button type="submit" className="w-full rounded-lg" disabled={loading}>
                  {loading ? "Creating account…" : "Continue"}
                </Button>
                <Button type="button" variant="outline" className="w-full rounded-lg" disabled={loading} onClick={handleCancel}>
                  Use a different sign-in method
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
