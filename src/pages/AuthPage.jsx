import { lazy, Suspense, useEffect, useState } from "react";
import axios from "axios";
import logger from "@/utils/logger";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useAuth } from "../context/AuthContext";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card, CardContent } from "../components/ui/card";
import { Tabs, TabsContent } from "../components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "../components/ui/radio-group";
import { Checkbox } from "../components/ui/checkbox";
import { toast } from "sonner";
import { Eye, EyeOff, ArrowLeft, Mail, KeyRound, Phone, Star, ShieldCheck, UserRound, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  NATIVE_GOOGLE_IOS_SESSION_SOURCE,
  setAuthSessionSource,
} from "@/mobile/utils/authSessionSource";

const BACKEND_URL = (import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000');
const API_URL = `${BACKEND_URL}/api`;
const AUTH_PAGE_URL = 'https://servicetones.com/auth';
const AUTH_OG_IMAGE = 'https://servicetones.com/og-image.png';
const GOOGLE_REDIRECT_PENDING_KEY = 'servicetones_google_redirect_pending';
const PENDING_SOCIAL_SETUP_KEY = 'servicetones_pending_social_setup';
const LazyBiometricLogin = lazy(() => import("@/mobile/components/BiometricLogin"));

let firebaseAuthServicePromise;
const getFirebaseAuthService = async () => {
  if (!firebaseAuthServicePromise) {
    firebaseAuthServicePromise = import("../services/firebaseAuthService").then((module) => module.default);
  }

  return firebaseAuthServicePromise;
};

let secureStoragePromise;
const getSecureStorage = async () => {
  if (!secureStoragePromise) {
    secureStoragePromise = import("@/mobile/utils/secureStorage").then((module) => module.secureStorage);
  }

  return secureStoragePromise;
};

let biometricAuthPromise;
const getBiometricAuth = async () => {
  if (!biometricAuthPromise) {
    biometricAuthPromise = import("@/mobile/utils/biometricAuth").then((module) => module.biometricAuth);
  }

  return biometricAuthPromise;
};

const authRoleOptions = [
  {
    value: "customer",
    label: "Customer",
    description: "Post a project, compare providers, and keep every quote organized.",
  },
  {
    value: "provider",
    label: "Provider",
    description: "Track leads, bids, scheduling, and delivery in one workspace.",
  },
];

const formatAuthError = (error, fallbackMessage) => {
  return error?.response?.data?.detail || error?.response?.data?.message || error?.message || fallbackMessage;
};

const GOOGLE_ACCOUNT_NOT_REGISTERED_MESSAGE = 'No ServiceTones account exists for this Google email. Please register first with email and password.';
const authTrustStats = [
  { value: '15,000+', label: 'verified providers', icon: ShieldCheck },
  { value: '25,000+', label: 'completed projects', icon: Users },
  { value: '4.8', label: 'average rating', icon: Star },
];

const authRightRailMoments = [
  'Contractors actively working on-site',
  'Home renovation projects with real scope and budgets',
  'Customers reviewing details directly with providers',
];

const authAudienceSignals = [
  'For homeowners searching for reliable local professionals',
  'For service providers managing leads and client follow-up',
  'Built around verified profiles, organized quotes, and clear next steps',
];
const authSchema = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "name": "ServiceTones",
      "url": "https://servicetones.com",
      "logo": AUTH_OG_IMAGE,
      "description": "Marketplace for finding, comparing, and managing verified home service professionals.",
    },
    {
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "What can I do after creating a ServiceTones account?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Customers can compare providers, manage quotes, and message professionals. Providers can review projects, respond to leads, and manage their workspace."
          }
        },
        {
          "@type": "Question",
          "name": "Can I use Google sign-in with ServiceTones?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Yes. ServiceTones supports Google sign-in in supported environments, or you can continue with email and password."
          }
        }
      ]
    }
  ]
};

const shouldFallbackToRedirect = (error) => {
  const code = error?.code || '';
  return [
    'auth/popup-blocked',
    'auth/popup-closed-by-user',
    'auth/cancelled-popup-request',
  ].includes(code);
};

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
    token: data?.setup_token || data?.token || '',
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

const buildSocialSetupPath = (data) => {
  const params = new URLSearchParams({
    token: data?.setup_token || data?.token || '',
    name: data?.name || '',
    email: data?.email || '',
  });

  return `/social-setup?${params.toString()}`;
};

const redirectToSocialSetup = (navigate, data) => {
  const pendingSetup = savePendingSocialSetup(data);
  if (!pendingSetup) {
    return false;
  }

  navigate(buildSocialSetupPath(pendingSetup), { replace: true });
  return true;
};

const getPostAuthPath = (user) => {
  return user?.account_setup_completed === false ? '/social-setup' : '/dashboard';
};


function AuthBrandLink({ className, compact = false, dark = false }) {
  return (
    <Link
      to="/"
      className={cn(
        "inline-flex items-center gap-2.5 transition-opacity duration-200 hover:opacity-80",
        className,
      )}
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-sm font-heading font-bold text-primary-foreground">
        ST
      </span>
      <span className={cn("font-heading text-[1.05rem] font-bold tracking-[-0.03em]", dark ? "text-white" : "text-foreground")}>
        ServiceTones
      </span>
    </Link>
  );
}

function AuthDivider({ children }) {
  return (
    <div className="flex items-center gap-3 py-1 text-[0.68rem] font-medium uppercase tracking-[0.18em] text-muted-foreground/70">
      <span className="h-px flex-1 bg-border" />
      <span>{children}</span>
      <span className="h-px flex-1 bg-border" />
    </div>
  );
}

function AuthField({ id, label, icon: Icon, hint, className, inputClassName, ...props }) {
  return (
    <div className={cn("space-y-2.5", className)}>
      <Label htmlFor={id} className="text-sm font-semibold text-slate-700 block" style={{ fontFamily: "'Lora', serif" }}>{label}</Label>
      <div className="relative">
        {Icon ? <Icon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" /> : null}
        <Input id={id} className={cn("h-12 rounded-xl border border-slate-300 bg-white text-sm text-slate-900 placeholder:text-slate-400 transition-all focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none", Icon ? "pl-12" : "pl-4", inputClassName)} {...props} />
      </div>
      {hint ? <p className="text-xs leading-5 text-slate-500">{hint}</p> : null}
    </div>
  );
}

function SocialLoginButtons() {
  const navigate = useNavigate();
  const { applySession } = useAuth();

  const setPageError = window.__servicetonesSetAuthError || (() => {});

  const routeToRegisterForGoogleAccount = async (error, fallbackEmail = '') => {
    const message = formatAuthError(error, GOOGLE_ACCOUNT_NOT_REGISTERED_MESSAGE);

    if (!message.includes(GOOGLE_ACCOUNT_NOT_REGISTERED_MESSAGE)) {
      return false;
    }

    const firebaseAuthService = await getFirebaseAuthService();
    const oauthEmail = firebaseAuthService.getCurrentUser()?.email || fallbackEmail || '';

    try {
      await firebaseAuthService.deleteCurrentUser();
    } catch (deleteError) {
      logger.warn('Failed to delete orphan Firebase Google user after rejected sign-in', deleteError);
      try {
        await firebaseAuthService.signOut();
      } catch {
        // Best-effort cleanup only.
      }
    }

    sessionStorage.removeItem(GOOGLE_REDIRECT_PENDING_KEY);
    sessionStorage.removeItem(PENDING_SOCIAL_SETUP_KEY);
    setPageError('');

    const params = new URLSearchParams({
      mode: 'register',
      oauth_error: 'not_registered',
    });

    if (oauthEmail) {
      params.set('oauth_email', oauthEmail);
    }

    navigate(`/auth?${params.toString()}`, { replace: true });
    toast.error(message);
    return true;
  };

  const handleSocialLogin = async (provider) => {
    const isNative = window.Capacitor?.isNativePlatform?.() ?? false;
    const platform = window.Capacitor?.getPlatform?.() ?? 'web';
    const webClientId = import.meta.env.VITE_GOOGLE_OAUTH_WEB_CLIENT_ID;

    if (isNative && platform === 'ios' && provider === 'google') {
      const iosClientId = import.meta.env.VITE_GOOGLE_OAUTH_IOS_CLIENT_ID;
      if (!iosClientId) {
        toast.error('Google sign in is not configured for this iOS build yet.');
        return;
      }

      let result;
      try {
        const { NativeGoogleSignIn } = await import('@/mobile/plugins/nativeGoogleSignIn');
        result = await NativeGoogleSignIn.signIn({ clientId: iosClientId });
      } catch (pluginErr) {
        if (pluginErr?.message === 'CANCELED' || pluginErr?.code === 'CANCELED') return;
        toast.error('Google sign in is unavailable on this iOS build.');
        return;
      }

      try {
        const { data } = await axios.post(
          `${API_URL}/auth/google/native-login`,
          { id_token: result?.idToken },
          {
            withCredentials: true,
            timeout: 15000,
          }
        );

        setAuthSessionSource(NATIVE_GOOGLE_IOS_SESSION_SOURCE);

        if (data?.social_setup) {
          redirectToSocialSetup(navigate, data);
          return;
        }

        clearPendingSocialSetup();
        const authenticatedUser = await applySession(data, NATIVE_GOOGLE_IOS_SESSION_SOURCE);
        toast.success(authenticatedUser?.account_setup_completed === false ? 'Finish setting up your account to continue.' : 'Welcome! You are now signed in.');
        navigate(getPostAuthPath(authenticatedUser), { replace: true });
      } catch (error) {
        if (await routeToRegisterForGoogleAccount(error, result?.email || '')) {
          return;
        }
        const message = formatAuthError(error, 'We could not complete Google sign in. Please try again.');
        setPageError(message);
        toast.error(message);
      }
      return;
    }

    if (isNative && platform === 'android' && provider === 'google') {
      let result;
      try {
        const { NativeGoogleSignIn } = await import('@/mobile/plugins/nativeGoogleSignIn');
        result = await NativeGoogleSignIn.signIn({ clientId: webClientId });
      } catch (pluginErr) {
        if (pluginErr?.message === 'CANCELED' || pluginErr?.code === 'CANCELED') return;
        toast.error('Google sign in is unavailable on this Android build.');
        return;
      }

      try {
        const firebaseAuthService = await getFirebaseAuthService();
        const credential = await firebaseAuthService.signInWithGoogleIdToken(result?.idToken);
        const { data } = await axios.post(
          `${API_URL}/auth/login/firebase-session`,
          { id_token: await credential.user.getIdToken() },
          { withCredentials: true }
        );

        if (data?.social_setup) {
          redirectToSocialSetup(navigate, data);
          return;
        }

        clearPendingSocialSetup();
        const authenticatedUser = await applySession(data);
        toast.success(authenticatedUser?.account_setup_completed === false ? 'Finish setting up your account to continue.' : 'Welcome! You are now signed in.');
        navigate(getPostAuthPath(authenticatedUser), { replace: true });
      } catch (error) {
        if (await routeToRegisterForGoogleAccount(error)) {
          return;
        }
        const message = formatAuthError(error, 'We could not complete Google sign in. Please try again.');
        setPageError(message);
        toast.error(message);
      }
      return;
    }

    if (provider !== 'google') {
      toast.error('This provider is not available during the Firebase auth migration yet.');
      return;
    }

    try {
      if (!isNative) {
        setPageError('');
        const firebaseAuthService = await getFirebaseAuthService();
        let result;
        try {
          result = await firebaseAuthService.signInWithGooglePopup();
        } catch (popupError) {
          if (!shouldFallbackToRedirect(popupError)) {
            throw popupError;
          }

          sessionStorage.setItem(GOOGLE_REDIRECT_PENDING_KEY, '1');
          await firebaseAuthService.signInWithGoogleRedirect();
          return;
        }

        if (!result?.user) {
          throw new Error('Google sign in did not return a user. Please try again.');
        }

        const { data } = await axios.post(
          `${API_URL}/auth/login/firebase-session`,
          { id_token: await result.user.getIdToken() },
          { withCredentials: true }
        );

        if (data?.social_setup) {
          redirectToSocialSetup(navigate, data);
          return;
        }

        clearPendingSocialSetup();
        const authenticatedUser = await applySession(data);
        toast.success(authenticatedUser?.account_setup_completed === false ? 'Finish setting up your account to continue.' : 'Welcome! You are now signed in.');
        navigate(getPostAuthPath(authenticatedUser), { replace: true });
        return;
      }

      const firebaseAuthService = await getFirebaseAuthService();
      const result = await firebaseAuthService.signInWithGoogleRedirect();

      if (!result) {
        return;
      }

      const { data } = await axios.post(
        `${API_URL}/auth/login/firebase-session`,
        { id_token: await result.user.getIdToken() },
        { withCredentials: true }
      );

      if (data?.social_setup) {
        redirectToSocialSetup(navigate, data);
        return;
      }

      clearPendingSocialSetup();
      const authenticatedUser = await applySession(data);
      toast.success(authenticatedUser?.account_setup_completed === false ? 'Finish setting up your account to continue.' : 'Welcome! You are now signed in.');
      navigate(getPostAuthPath(authenticatedUser), { replace: true });
    } catch (error) {
      if (await routeToRegisterForGoogleAccount(error)) {
        return;
      }
      const message = formatAuthError(error, 'We could not complete Google sign in. Please try again.');
      setPageError(message);
      toast.error(message);
    }
  };

  return (
    <div className="space-y-2.5">
      <div className="grid grid-cols-2 gap-2.5">
        <button
          type="button"
          onClick={() => handleSocialLogin('apple')}
          aria-label="Continue with Apple"
          className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-border/60 bg-muted/30 px-4 text-sm font-medium text-foreground transition-all duration-150 hover:border-border hover:bg-muted/60"
        >
          <svg className="h-[1.1rem] w-[1.1rem]" viewBox="0 0 24 24" fill="currentColor">
            <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11" />
          </svg>
          Apple
        </button>
        <button
          type="button"
          onClick={() => handleSocialLogin('google')}
          aria-label="Continue with Google"
          className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-border/60 bg-muted/30 px-4 text-sm font-medium text-foreground transition-all duration-150 hover:border-border hover:bg-muted/60"
        >
          <svg className="h-[1.1rem] w-[1.1rem]" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Google
        </button>
      </div>
      <AuthDivider>or continue with email</AuthDivider>
    </div>
  );
}
import { useHaptic } from "@/mobile/hooks/useHaptic";
import { usePlatform } from "@/mobile/hooks/usePlatform";

export default function AuthPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { login, register, verifyEmail, resendVerification, applySession } = useAuth();
  const { hapticSuccess, hapticError } = useHaptic();
  const { isNative, isPhone, isNativeTablet } = usePlatform();
  
  const [activeTab, setActiveTab] = useState(searchParams.get("mode") === "register" ? "register" : "login");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pageError, setPageError] = useState("");
  const [pendingSocialSetup, setPendingSocialSetup] = useState(() => readPendingSocialSetup());
  const authPageTitle = activeTab === "login" ? "Sign In | ServiceTones" : "Create Account | ServiceTones";
  const authPageDescription = activeTab === "login"
    ? "Sign in to ServiceTones to compare verified home service providers, manage quotes, and keep client conversations organized."
    : "Create your ServiceTones account to book trusted home services or manage new project leads in one place.";

  // OAuth "not registered" banner — read once from URL then immediately clean it
  // so refreshing doesn't re-show the banner or keep the email pre-filled.
  const oauthError = searchParams.get("oauth_error");
  const oauthEmail = searchParams.get("oauth_email") || "";

  useEffect(() => {
    window.__servicetonesSetAuthError = setPageError;
    return () => {
      delete window.__servicetonesSetAuthError;
    };
  }, []);

  useEffect(() => {
    if (oauthError || oauthEmail) {
      if (oauthError === 'not_registered') {
        setActiveTab('register');
        setRegisterData((current) => ({ ...current, email: oauthEmail || current.email }));
        setPageError(GOOGLE_ACCOUNT_NOT_REGISTERED_MESSAGE);
      }

      // Replace URL with clean params (keep mode if present, strip oauth_ params)
      const mode = searchParams.get("mode");
      navigate(mode ? `/auth?mode=${mode}` : "/auth", { replace: true });
    }
  }, [navigate, oauthEmail, oauthError, searchParams]);
  
  // Verification state
  const [showVerification, setShowVerification] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  
  // Login form
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [enableBiometric, setEnableBiometric] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  
  // Register form — pre-fill email if coming from OAuth not_registered
  const [registerData, setRegisterData] = useState({
    full_name: "",
    email: oauthEmail,
    phone: "",
    password: "",
    confirmPassword: "",
    role: "customer"
  });

  const clearPendingGoogleRedirect = () => {
    sessionStorage.removeItem(GOOGLE_REDIRECT_PENDING_KEY);
  };

  const syncPendingSocialSetup = () => {
    setPendingSocialSetup(readPendingSocialSetup());
  };

  const clearPendingSocialSetupState = () => {
    clearPendingSocialSetup();
    setPendingSocialSetup(null);
  };

  const clearUnfinishedSocialAuth = async () => {
    clearPendingGoogleRedirect();
    clearPendingSocialSetupState();

    try {
      const firebaseAuthService = await getFirebaseAuthService();
      if (firebaseAuthService.getCurrentUser()) {
        await firebaseAuthService.signOut();
      }
    } catch (error) {
      logger.warn('Failed to clear unfinished Firebase social setup state', error);
    }
  };

  const resumePendingSocialSetup = () => {
    if (!pendingSocialSetup?.token) {
      return;
    }

    setPageError('');
    navigate(buildSocialSetupPath(pendingSocialSetup), { replace: true });
  };

  const handleCancelPendingSocialSetup = async () => {
    setLoading(true);
    try {
      await clearUnfinishedSocialAuth();
      setPageError('');
      toast.success('Google sign-in setup was cleared. You can continue with email or start Google again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const mode = searchParams.get("mode");
    if (mode === "register") {
      setActiveTab("register");
    }
  }, [searchParams]);

  useEffect(() => {
    syncPendingSocialSetup();
  }, []);

  const clearPageError = () => {
    if (pageError) {
      setPageError("");
    }
  };

  const handleTabChange = (value) => {
    setActiveTab(value);
    clearPageError();
  };

  const handleLoginEmailChange = (value) => {
    setLoginEmail(value);
    clearPageError();
  };

  const handleLoginPasswordChange = (value) => {
    setLoginPassword(value);
    clearPageError();
  };

  const updateRegisterField = (field, value) => {
    setRegisterData((current) => ({ ...current, [field]: value }));
    clearPageError();
  };

  useEffect(() => {
    const consumeRedirect = async () => {
      const hadPendingGoogleRedirect = sessionStorage.getItem(GOOGLE_REDIRECT_PENDING_KEY) === '1';

      if (!hadPendingGoogleRedirect) {
        return;
      }

      try {
        const firebaseAuthService = await getFirebaseAuthService();
        const redirectResult = await firebaseAuthService.getGoogleRedirectResult();
        const redirectUser = redirectResult?.user || firebaseAuthService.getCurrentUser();

        if (!redirectUser) {
          if (hadPendingGoogleRedirect) {
            clearPendingGoogleRedirect();
          }
          return;
        }

        clearPendingGoogleRedirect();

        const { data } = await axios.post(
          `${API_URL}/auth/login/firebase-session`,
          { id_token: await redirectUser.getIdToken() },
          { withCredentials: true }
        );

        if (data?.social_setup) {
          clearPendingGoogleRedirect();
          redirectToSocialSetup(navigate, data);
          return;
        }

        clearPendingSocialSetupState();
        const authenticatedUser = await applySession(data);
        toast.success(authenticatedUser?.account_setup_completed === false ? 'Finish setting up your account to continue.' : 'Welcome! You are now signed in.');
        navigate(getPostAuthPath(authenticatedUser), { replace: true });
      } catch (error) {
        clearPendingGoogleRedirect();
        if (error?.code === 'auth/no-auth-event') {
          return;
        }
        if (formatAuthError(error, '').includes(GOOGLE_ACCOUNT_NOT_REGISTERED_MESSAGE)) {
          try {
            const firebaseAuthService = await getFirebaseAuthService();
            await firebaseAuthService.deleteCurrentUser();
          } catch (deleteError) {
            logger.warn('Failed to delete orphan Firebase Google user after redirect rejection', deleteError);
            try {
              const firebaseAuthService = await getFirebaseAuthService();
              await firebaseAuthService.signOut();
            } catch {
              // Best-effort cleanup only.
            }
          }
          clearPendingSocialSetupState();
          setActiveTab('register');
          setRegisterData((current) => ({ ...current, email: redirectUser?.email || current.email }));
          setPageError(GOOGLE_ACCOUNT_NOT_REGISTERED_MESSAGE);
          toast.error(GOOGLE_ACCOUNT_NOT_REGISTERED_MESSAGE);
          return;
        }
        const message = formatAuthError(error, 'Google sign in completed, but we could not finish your session. Please try again.');
        setPageError(message);
        toast.error(message);
        logger.error('Failed to consume Firebase redirect result', error);
      }
    };

    consumeRedirect();
  }, [applySession, navigate]);

  // Check biometric availability on mobile
  useEffect(() => {
    if (!isNative) return;

    const checkBiometric = async () => {
      const biometricAuth = await getBiometricAuth();
      const available = await biometricAuth.isAvailable();
      setBiometricAvailable(available);
    };

    checkBiometric();
  }, [isNative]);

  const handleLogin = async (emailParam, passwordParam) => {
    // Support both form submission and direct call (from BiometricLogin)
    const isFormSubmit = emailParam && emailParam.preventDefault;
    
    if (isFormSubmit) {
      emailParam.preventDefault();
    }

    const email = isFormSubmit ? loginEmail : emailParam;
    const password = isFormSubmit ? loginPassword : passwordParam;

    if (!email || !password) {
      toast.error("Please fill in all fields");
      await hapticError();
      return;
    }
    
    setLoading(true);
    if (pendingSocialSetup?.token) {
      await clearUnfinishedSocialAuth();
    } else {
      clearPendingGoogleRedirect();
    }
    setPageError("");
    try {
      const authenticatedUser = await login(email, password);
      
      // Save credentials for biometric if checkbox was checked
      if (enableBiometric && biometricAvailable && isFormSubmit) {
        const secureStorage = await getSecureStorage();
        const saved = await secureStorage.enableBiometric(email, password);
        if (saved) {
          logger.info('Biometric login enabled');
        }
      }

  toast.success(authenticatedUser?.account_setup_completed === false ? "Finish setting up your account to continue." : "Welcome back!");
      await hapticSuccess();
  navigate(getPostAuthPath(authenticatedUser));
    } catch (error) {
      await hapticError();
      const errorMessage = formatAuthError(error, "Invalid credentials");
      setPageError(errorMessage);
      if (errorMessage.includes("verification") || errorMessage.includes("not verified")) {
        toast.error("Please verify your email first");
        setVerificationEmail(email);
        setShowVerification(true);
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    
    if (!registerData.full_name || !registerData.email || !registerData.password) {
      toast.error("Please fill in all required fields");
      await hapticError();
      return;
    }
    
    if (registerData.password !== registerData.confirmPassword) {
      toast.error("Passwords do not match");
      await hapticError();
      return;
    }
    
    if (registerData.password.length < 8) {
      toast.error("Password must be at least 8 characters");
      await hapticError();
      return;
    }
    
    if (!/[A-Z]/.test(registerData.password)) {
      toast.error("Password must contain at least one uppercase letter");
      await hapticError();
      return;
    }
    
    if (!/[\d\W]/.test(registerData.password)) {
      toast.error("Password must contain at least one number or special character");
      await hapticError();
      return;
    }
    
    setLoading(true);
    if (pendingSocialSetup?.token) {
      await clearUnfinishedSocialAuth();
    } else {
      clearPendingGoogleRedirect();
    }
    setPageError("");
    try {
      const { confirmPassword, ...data } = registerData;
      const result = await register(data);
      
      if (result.needsVerification) {
        const verificationMessage = result.verificationEmailMessage || "Registration successful! Please check your email for verification link.";
        if (result.verificationEmailSent === false) {
          setPageError(verificationMessage);
          toast.error(verificationMessage);
        } else {
          toast.info(verificationMessage);
        }
        await hapticSuccess();
        setVerificationEmail(data.email);
        setIsAdmin(data.role === "admin" || data.email.endsWith("@servicetones.com"));
        setShowVerification(true);
      } else {
        toast.success("Account created successfully!");
        await hapticSuccess();
        navigate("/dashboard");
      }
    } catch (error) {
      const message = formatAuthError(error, "Registration failed");
      setPageError(message);
      toast.error(message);
      await hapticError();
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyEmail = async (e) => {
    e.preventDefault();
    
    setLoading(true);
    setPageError("");
    try {
      const firebaseAuthService = await getFirebaseAuthService();
      if (!firebaseAuthService.getCurrentUser() && isNative && loginPassword) {
        const authenticatedUser = await login(verificationEmail, loginPassword);
        toast.success(authenticatedUser?.account_setup_completed === false ? "Finish setting up your account to continue." : "Welcome back!");
        await hapticSuccess();
        navigate(getPostAuthPath(authenticatedUser));
        return;
      }

      await verifyEmail(verificationEmail, isAdmin);
      toast.success("Email verified successfully! You can now continue.");
      await hapticSuccess();
      setShowVerification(false);
      setActiveTab("login");
      setLoginEmail(verificationEmail);
    } catch (error) {
      const message = formatAuthError(error, "Verification failed");
      setPageError(message);
      toast.error(message);
      await hapticError();
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    setLoading(true);
    if (pendingSocialSetup?.token) {
      await clearUnfinishedSocialAuth();
    } else {
      clearPendingGoogleRedirect();
    }
    setPageError("");
    try {
      const result = await resendVerification(verificationEmail, isAdmin);
      if (result?.sent === false) {
        setPageError(result.message || "We could not resend the verification email.");
        toast.error(result.message || "We could not resend the verification email.");
      } else {
        toast.success(result?.message || "Verification email sent to your inbox");
      }
    } catch (error) {
      const message = formatAuthError(error, "Failed to resend verification email");
      setPageError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  if (showVerification) {
    return (
      <main className="min-h-screen bg-transparent">
        <Helmet>
          <title>Verify Your Email | ServiceTones</title>
          <meta name="description" content="Verify your email to finish creating your ServiceTones account and continue to your customer or provider workspace." />
          <meta property="og:title" content="Verify Your Email | ServiceTones" />
          <meta property="og:description" content="Complete email verification to access your ServiceTones workspace." />
          <meta property="og:url" content={AUTH_PAGE_URL} />
          <meta property="og:image" content={AUTH_OG_IMAGE} />
          <link rel="canonical" href={AUTH_PAGE_URL} />
        </Helmet>
        <div className="page-shell safe-top-shell safe-bottom-shell py-4 sm:py-6">
          <div className="mb-6 flex items-center justify-between gap-4">
            <AuthBrandLink />
            <button
              type="button"
              onClick={() => setShowVerification(false)}
              aria-label="Back to login"
              className="inline-flex min-h-12 items-center gap-2 rounded-lg border border-border/80 bg-card/80 px-4 py-2 text-sm font-medium text-muted-foreground shadow-sm backdrop-blur-sm transition-colors hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to login
            </button>
          </div>

          <div className={isNativeTablet ? "mx-auto grid w-full max-w-5xl gap-6 overflow-hidden rounded-2xl border border-border/80 bg-card/94 shadow-[0_32px_90px_-56px_rgba(15,23,42,0.34)] backdrop-blur-sm xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]" : "mx-auto grid w-full max-w-5xl gap-6 overflow-hidden rounded-2xl border border-border/80 bg-card/94 shadow-[0_32px_90px_-56px_rgba(15,23,42,0.34)] backdrop-blur-sm lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]"}>
            <section className="relative hidden overflow-hidden lg:block">
              <img
                src="/hero-home.jpg"
                alt="Modern interior showcasing a polished ServiceTones atmosphere"
                className="absolute inset-0 h-full w-full object-cover object-center"
              />
              <div className="absolute inset-0 bg-[linear-gradient(140deg,rgba(2,6,23,0.18),rgba(2,6,23,0.62))]" />
              <div className="relative flex h-full flex-col justify-end p-8 text-white">
                <p className="text-[0.7rem] font-semibold uppercase tracking-[0.24em] text-white/68">Account security</p>
                <h2 className="mt-4 max-w-sm font-heading text-4xl font-bold leading-[1] tracking-[-0.05em]">One quick verification before you enter your workspace.</h2>
                <p className="mt-4 max-w-sm text-sm leading-7 text-white/78">We sent a six-digit code to confirm the email on this new account and keep the rest of the setup secure.</p>
              </div>
            </section>

            <section
              className="relative px-5 py-6 sm:px-8 sm:py-8 lg:px-10"
              style={{ background: "linear-gradient(160deg, hsl(var(--card)) 0%, hsl(var(--background)) 56%, hsl(var(--surface-tint)) 100%)" }}
            >
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.72),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(15,23,42,0.05),transparent_34%)]" />
              <div className="relative mx-auto w-full max-w-md">
                <div className="mb-8 text-center lg:text-left">
                  <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 shadow-sm">
                    <Mail className="h-8 w-8 text-primary" />
                  </div>
                  <h1 className="mt-5 font-heading text-3xl font-bold tracking-[-0.04em] text-foreground">Verify your email</h1>
                  <p className="mt-3 text-sm leading-7 text-muted-foreground">
                    We sent a verification link to <span className="font-semibold text-foreground">{verificationEmail}</span>
                  </p>
                </div>

                <Card className="form-shell border-border/80 bg-card/96 shadow-[0_28px_72px_-44px_rgba(15,23,42,0.28)] backdrop-blur-sm">
                  <CardContent className="pt-6">
                    <form onSubmit={handleVerifyEmail} className="space-y-4">
                      {pageError ? (
                        <div className="rounded-lg border border-destructive/20 bg-destructive/8 px-4 py-3 text-sm text-destructive">
                          {pageError}
                        </div>
                      ) : null}

                      <p className="text-sm leading-7 text-muted-foreground">
                        Open the verification email, tap the Firebase verification link, then return here and continue.
                      </p>

                      <Button
                        type="submit"
                        className="w-full rounded-full"
                        disabled={loading}
                      >
                        {loading ? "Checking..." : "I verified my email"}
                      </Button>

                      <div className="text-center">
                        <button
                          type="button"
                          onClick={handleResendCode}
                          disabled={loading}
                          className="text-sm text-primary hover:underline"
                        >
                          Didn't receive the email? Resend
                        </button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
            </div>
          </section>

          {/* Right Panel - Benefits */}
          <section className="hidden lg:flex flex-col justify-center bg-gradient-to-br from-slate-50 via-amber-50/30 to-white p-14 relative overflow-hidden border-l border-slate-200">
            {/* Subtle decorative elements */}
            <div className="absolute top-0 right-0 w-80 h-80 bg-amber-200/8 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-72 h-72 bg-slate-200/5 rounded-full blur-3xl" />
            
            <div className="relative z-10 max-w-lg">
              <div className="mb-14">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-full mb-6 border border-slate-200">
                  <span className="w-2 h-2 rounded-full bg-slate-900" />
                  <span className="text-slate-700 text-sm font-semibold" style={{ fontFamily: "'Lora', serif" }}>Why ServiceTones</span>
                </div>
                <h2 className="text-4xl font-bold mb-4 text-slate-900" style={{ fontFamily: "'Playfair Display', serif" }}>
                  Build Trust, Together
                </h2>
                <p className="text-slate-600 text-lg leading-relaxed" style={{ fontFamily: "'Lora', serif" }}>
                  Connect with verified professionals and manage your entire project in one organized place.
                </p>
              </div>

              <div className="space-y-6">
                {[
                  { icon: "✓", title: "Verified Professionals", desc: "Background checked and rated by real customers" },
                  { icon: "★", title: "Quality Assured", desc: "4.8 rating from 25,000+ completed projects" },
                  { icon: "✓", title: "Transparent Pricing", desc: "Compare quotes side-by-side, no hidden fees" },
                  { icon: "◆", title: "Secure & Organized", desc: "All communication and contracts in one place" }
                ].map((item, idx) => (
                  <div key={idx} className="flex gap-4 group">
                    <div className="flex-shrink-0 mt-1">
                      <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-slate-200 text-slate-700 font-bold text-sm group-hover:bg-slate-300 transition-colors">
                        {item.icon}
                      </div>
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900 mb-1" style={{ fontFamily: "'Playfair Display', serif" }}>{item.title}</h3>
                      <p className="text-slate-600 text-sm" style={{ fontFamily: "'Lora', serif" }}>{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-14 pt-8 border-t border-slate-200">
                <div className="grid grid-cols-3 gap-6">
                  <div>
                    <div className="text-3xl font-bold text-slate-900 mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>15K+</div>
                    <p className="text-slate-600 text-sm" style={{ fontFamily: "'Lora', serif" }}>Verified Professionals</p>
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-slate-900 mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>25K+</div>
                    <p className="text-slate-600 text-sm" style={{ fontFamily: "'Lora', serif" }}>Projects Completed</p>
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-slate-900 mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>4.8★</div>
                    <p className="text-slate-600 text-sm" style={{ fontFamily: "'Lora', serif" }}>Average Rating</p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-amber-50 via-white to-slate-50" style={{ fontFamily: "'Georgia', 'Garamond', serif" }}>
      <Helmet>
        <title>{authPageTitle}</title>
        <meta name="description" content={authPageDescription} />
        <meta property="og:title" content={authPageTitle} />
        <meta property="og:description" content={authPageDescription} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={AUTH_PAGE_URL} />
        <meta property="og:image" content={AUTH_OG_IMAGE} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={authPageTitle} />
        <meta name="twitter:description" content={authPageDescription} />
        <meta name="twitter:image" content={AUTH_OG_IMAGE} />
        <link rel="canonical" href={AUTH_PAGE_URL} />
        <script type="application/ld+json">{JSON.stringify(authSchema)}</script>
        <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700;800&family=Lora:wght@400;500;600&display=swap" rel="stylesheet" />
      </Helmet>
      
      <div className="min-h-screen flex items-center justify-center py-8">
        <div className="w-full max-w-7xl grid grid-cols-1 lg:grid-cols-2 gap-0 rounded-2xl overflow-hidden shadow-2xl">
          {/* Left Panel - Image */}
          <section className="hidden lg:flex flex-col justify-center items-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-12 relative overflow-hidden">
            <div className="absolute inset-0 opacity-40">
              <img 
                src="/auth-hero.png" 
                alt="ServiceTones marketplace" 
                className="w-full h-full object-cover"
              />
            </div>
            <div className="relative z-10 max-w-md text-center text-white">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 rounded-full mb-8 border border-white/20 backdrop-blur-sm">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <span className="text-sm font-semibold" style={{ fontFamily: "'Lora', serif" }}>Join ServiceTones</span>
              </div>
              <h2 className="text-4xl font-bold mb-6" style={{ fontFamily: "'Playfair Display', serif" }}>
                Connect & Grow Together
              </h2>
              <p className="text-white/80 text-lg leading-relaxed mb-12" style={{ fontFamily: "'Lora', serif" }}>
                Join thousands of professionals and homeowners building trust, one project at a time.
              </p>
              
              <div className="space-y-6 pt-8 border-t border-white/20">
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-amber-400/20 text-amber-300 font-semibold">✓</div>
                  </div>
                  <div className="text-left">
                    <p className="font-semibold mb-1" style={{ fontFamily: "'Playfair Display', serif" }}>Verified Professionals</p>
                    <p className="text-white/70 text-sm" style={{ fontFamily: "'Lora', serif" }}>All pros are background checked and rated</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-amber-400/20 text-amber-300 font-semibold">★</div>
                  </div>
                  <div className="text-left">
                    <p className="font-semibold mb-1" style={{ fontFamily: "'Playfair Display', serif" }}>Quality Assured</p>
                    <p className="text-white/70 text-sm" style={{ fontFamily: "'Lora', serif" }}>4.8 rating from 25,000+ projects</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-amber-400/20 text-amber-300 font-semibold">◆</div>
                  </div>
                  <div className="text-left">
                    <p className="font-semibold mb-1" style={{ fontFamily: "'Playfair Display', serif" }}>Secure & Transparent</p>
                    <p className="text-white/70 text-sm" style={{ fontFamily: "'Lora', serif" }}>All communication in one place</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Right Panel - Form */}
          <section className={cn(
            "flex flex-col justify-center bg-white p-8 sm:p-12 lg:p-16",
            isPhone ? "px-5 py-8 sm:px-8" : ""
          )}>
            <div className="w-full max-w-sm mx-auto">
              <div className="mb-12 flex items-center justify-between gap-4">
                <AuthBrandLink compact className="border-transparent bg-transparent px-0 py-0 shadow-none backdrop-blur-0 hover:translate-y-0 hover:border-transparent" />
              </div>

              {oauthError === "not_registered" && (
                <div className="alert-warning mb-5 text-sm text-amber-800 shadow-sm">
                  <p className="font-medium">No account found for this email.</p>
                  <p className="mt-1">Register first, then use Google or Apple next time.</p>
                </div>
              )}

              <Tabs value={activeTab} onValueChange={handleTabChange}>
                {pendingSocialSetup?.token ? (
                  <div className="alert-warning mb-4 text-sm text-amber-900">
                    <p className="font-medium">Finish your Google account setup</p>
                    <p className="mt-1 text-amber-800/90">
                      {pendingSocialSetup.email
                        ? `You already started Google sign-in for ${pendingSocialSetup.email}. Finish picking your role, or clear it and continue with email instead.`
                        : 'You already started Google sign-in. Finish picking your role, or clear it and continue with email instead.'}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button type="button" size="sm" className="rounded-lg" onClick={resumePendingSocialSetup}>
                        Continue setup
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="rounded-lg"
                        onClick={handleCancelPendingSocialSetup}
                        disabled={loading}
                      >
                        Clear Google setup
                      </Button>
                    </div>
                  </div>
                ) : null}

                <TabsContent value="login" className="mt-0">
                  <div className="space-y-3 mb-8">
                    <h1 className="text-5xl font-bold text-slate-900" style={{ fontFamily: "'Playfair Display', serif" }}>
                      Welcome Back
                    </h1>
                    <p className="text-lg text-slate-600" style={{ fontFamily: "'Lora', serif" }}>
                      Sign in to continue your journey
                    </p>
                    </div>

                    <Card className="border border-slate-200 bg-white shadow-lg rounded-2xl">
                      <CardContent className="p-6 sm:p-8">
                        {isNative ? (
                          <Suspense fallback={null}>
                            <LazyBiometricLogin onLogin={handleLogin} className="mb-4" />
                          </Suspense>
                        ) : null}

                        <div className="space-y-5">
                          {pageError ? (
                            <div className="rounded-lg border border-destructive/20 bg-destructive/8 px-4 py-3 text-sm text-destructive">
                              {pageError}
                            </div>
                          ) : null}

                          <form onSubmit={handleLogin} className="space-y-4">
                            <AuthField
                              id="login-email"
                              type="email"
                              label="Email"
                              icon={Mail}
                              placeholder="Enter your email"
                              value={loginEmail}
                              onChange={(e) => handleLoginEmailChange(e.target.value)}
                              data-testid="login-email-input"
                            />

                            <div className="space-y-2.5">
                              <div className="flex items-center justify-between gap-3">
                                <Label htmlFor="login-password">Password</Label>
                                <Link to="/forgot-password" className="text-xs font-medium text-primary hover:underline">
                                  Forgot password?
                                </Link>
                              </div>
                              <div className="relative">
                                <KeyRound className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                  id="login-password"
                                  type={showPassword ? "text" : "password"}
                                  placeholder="Enter your password"
                                  value={loginPassword}
                                  onChange={(e) => handleLoginPasswordChange(e.target.value)}
                                  className="pl-11 pr-11"
                                  data-testid="login-password-input"
                                />
                                <button
                                  type="button"
                                  onClick={() => setShowPassword(!showPassword)}
                                  aria-label={showPassword ? "Hide password" : "Show password"}
                                  aria-pressed={showPassword}
                                  className="absolute right-1 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center text-muted-foreground hover:text-foreground"
                                >
                                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                              </div>
                            </div>

                            {isNative && biometricAvailable ? (
                              <div className="rounded-lg border border-border/75 bg-slate-50/75 px-4 py-3.5">
                                <div className="flex items-start gap-3">
                                  <Checkbox
                                    id="enable-biometric"
                                    checked={enableBiometric}
                                    onCheckedChange={setEnableBiometric}
                                  />
                                  <Label htmlFor="enable-biometric" className="cursor-pointer text-sm font-normal leading-5 text-muted-foreground">
                                    Enable fingerprint or Face ID login on this device
                                  </Label>
                                </div>
                              </div>
                            ) : null}

                        <Button
                          type="submit"
                          className="w-full rounded-xl py-3 bg-gradient-to-r from-slate-900 to-slate-800 text-white font-semibold hover:from-slate-800 hover:to-slate-700 transition-all shadow-md hover:shadow-lg mt-6"
                          disabled={loading}
                          data-testid="login-submit-btn"
                          style={{ fontFamily: "'Lora', serif" }}
                        >
                          {loading ? "Signing in..." : "Sign in"}
                        </Button>
                          </form>

                          <SocialLoginButtons />

                          <p className="text-sm text-muted-foreground">
                            New to ServiceTones?{" "}
                            <button type="button" onClick={() => handleTabChange("register")} className="font-semibold text-primary hover:underline">
                              Register
                            </button>
                          </p>
                        </div>
                      </CardContent>
                    </Card>

                    <p className="text-xs leading-6 text-muted-foreground">
                      By continuing, you agree to our <Link to="/terms" className="underline hover:text-foreground">Terms</Link> and <Link to="/privacy" className="underline hover:text-foreground">Privacy Policy</Link>.
                    </p>
                </TabsContent>

                <TabsContent value="register" className="mt-0">
                  <div className="space-y-3 mb-8">
                    <h1 className="text-5xl font-bold text-slate-900" style={{ fontFamily: "'Playfair Display', serif" }}>
                      Join Us
                    </h1>
                    <p className="text-lg text-slate-600" style={{ fontFamily: "'Lora', serif" }}>
                      {isAdmin
                        ? "Create your admin account"
                        : "Start your journey with ServiceTones"}
                    </p>
                  </div>

                    <Card className="border-border/40 bg-white shadow-sm">
                      <CardContent className="p-5 sm:p-6">
                        <div className="space-y-5">
                          <div className="space-y-3">
                            <p className="text-sm font-semibold tracking-[-0.02em] text-foreground">Start with Apple or Google</p>
                            <SocialLoginButtons />
                          </div>

                          <form onSubmit={handleRegister} className="space-y-4">
                            <AuthField
                              id="register-name"
                              label="Full Name *"
                              icon={UserRound}
                              placeholder="John Doe"
                              value={registerData.full_name}
                              onChange={(e) => updateRegisterField('full_name', e.target.value)}
                              data-testid="register-name-input"
                            />

                          <AuthField
                            id="register-email"
                            type="email"
                            label="Email *"
                            icon={Mail}
                            placeholder="your@email.com"
                            value={registerData.email}
                            onChange={(e) => updateRegisterField('email', e.target.value)}
                            data-testid="register-email-input"
                          />

                            <div className="space-y-2.5">
                              <Label htmlFor="register-password">Password *</Label>
                              <div className="relative">
                                <KeyRound className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                  id="register-password"
                                  type={showPassword ? "text" : "password"}
                                  placeholder="8+ chars, uppercase, number or symbol"
                                  value={registerData.password}
                                  onChange={(e) => updateRegisterField('password', e.target.value)}
                                  className="pl-11 pr-11"
                                  data-testid="register-password-input"
                                />
                                <button
                                  type="button"
                                  onClick={() => setShowPassword(!showPassword)}
                                  aria-label={showPassword ? "Hide password" : "Show password"}
                                  aria-pressed={showPassword}
                                  className="absolute right-1 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center text-muted-foreground hover:text-foreground"
                                >
                                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                              </div>
                            </div>

                            <AuthField
                              id="register-confirm"
                              type="password"
                              label="Confirm Password *"
                              icon={KeyRound}
                              placeholder="Confirm your password"
                              value={registerData.confirmPassword}
                              onChange={(e) => updateRegisterField('confirmPassword', e.target.value)}
                              data-testid="register-confirm-input"
                            />

                          <div className="space-y-3">
                            <Label className="font-semibold text-foreground">I am joining as</Label>

                            <RadioGroup
                              value={registerData.role}
                              onValueChange={(value) => updateRegisterField('role', value)}
                              className="grid grid-cols-1 gap-3"
                            >
                              {authRoleOptions.map((roleOption) => (
                                <div
                                  key={roleOption.value}
                                  className={`rounded-lg border bg-white p-4 transition-all duration-200 ${registerData.role === roleOption.value ? 'border-primary/35 bg-primary/5 shadow-sm shadow-primary/10' : 'border-border/75 hover:border-primary/15'}`}
                                >
                                  <div className="flex items-start space-x-3">
                                    <RadioGroupItem value={roleOption.value} id={roleOption.value} data-testid={`role-${roleOption.value}`} />
                                    <Label htmlFor={roleOption.value} className="cursor-pointer">
                                      <span className="block text-sm font-semibold text-foreground">{roleOption.label}</span>
                                      <span className="mt-1 block text-xs leading-5 text-muted-foreground">{roleOption.description}</span>
                                    </Label>
                                  </div>
                                </div>
                              ))}
                            </RadioGroup>
                          </div>

                          <Button
                            type="submit"
                            className="w-full rounded-xl py-3 bg-gradient-to-r from-slate-900 to-slate-800 text-white font-semibold hover:from-slate-800 hover:to-slate-700 transition-all shadow-md hover:shadow-lg mt-6"
                            disabled={loading}
                            data-testid="register-submit-btn"
                            style={{ fontFamily: "'Lora', serif" }}
                          >
                            {loading ? "Creating account..." : "Create Account"}
                          </Button>
                          </form>
                        </div>
                      </CardContent>
                    </Card>

                    <p className="text-sm text-muted-foreground">
                      Already have an account?{" "}
                      <button type="button" onClick={() => handleTabChange("login")} className="font-semibold text-primary hover:underline">
                        Sign in
                      </button>
                    </p>
                </TabsContent>
              </Tabs>
            </div>
          </section>


        </div>
      </div>
    </main>
  );
}
