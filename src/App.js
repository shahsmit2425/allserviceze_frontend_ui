import { lazy, Suspense, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { Toaster } from "./components/ui/sonner";
import AnnouncementBar from "./components/AnnouncementBar";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ChatProvider } from "./context/ChatContext";
import { NotificationProvider, useNotifications } from "./context/NotificationContext";
import { Loader2 } from "lucide-react";
import ErrorBoundary from "./components/ErrorBoundary";

// CRITICAL: Load API debugger FIRST to catch all network requests
import "./utils/apiDebug";

// Eager load critical pages
import LandingPage from "./pages/LandingPage";
const AuthPage = lazy(() => import("./pages/AuthPage"));
const OfflineIndicator = lazy(() => import("./mobile/components/OfflineIndicator"));
const PushNotificationsInit = lazy(() => import("./mobile/components/PushNotificationsInit"));

// Lazy load all other pages
const ForgotPasswordPage = lazy(() => import("./pages/ForgotPasswordPage"));
const ServicesPage = lazy(() => import("./pages/ServicesPage"));
const PricingPage = lazy(() => import("./pages/PricingPage"));
const HelpCenterPage = lazy(() => import("./pages/HelpCenterPage"));
const ProviderProfile = lazy(() => import("./pages/ProviderProfile"));
const CustomerDashboard = lazy(() => import("./pages/CustomerDashboard"));
const ProviderDashboard = lazy(() => import("./pages/ProviderDashboard"));
const Messages = lazy(() => import("./pages/Messages"));
const ProviderOnboarding = lazy(() => import("./pages/ProviderOnboarding"));
const ProviderBusinessSetup = lazy(() => import("./pages/ProviderBusinessSetup"));
const ProviderDocumentVerification = lazy(() => import("./pages/ProviderDocumentVerification"));
const Favorites = lazy(() => import("./pages/Favorites"));
const ProviderBusinessProfile = lazy(() => import("./pages/ProviderBusinessProfile"));
const ProviderSchedule = lazy(() => import("./pages/ProviderSchedule"));
const BrowseProjects = lazy(() => import("./pages/BrowseProjects"));
const BrowseProviders = lazy(() => import("./pages/BrowseProviders"));
const ProjectDetail = lazy(() => import("./pages/ProjectDetail"));
const PostProject = lazy(() => import("./pages/PostProject"));
const Subscription = lazy(() => import("./pages/Subscription"));
const SubscriptionSuccess = lazy(() => import("./pages/SubscriptionSuccess"));
const PendingApproval = lazy(() => import("./pages/PendingApproval"));
const SearchResults = lazy(() => import("./pages/SearchResults"));
const PrivacyPage = lazy(() => import("./pages/PrivacyPage"));
const TermsPage = lazy(() => import("./pages/TermsPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const OAuthCallbackPage = lazy(() => import("./pages/OAuthCallbackPage"));
const SocialSetupPage = lazy(() => import("./pages/SocialSetupPage"));

// Loading fallback component
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <Loader2 className="w-8 h-8 animate-spin text-primary" />
  </div>
);

const isNativeRuntime = () => window.Capacitor?.isNativePlatform?.() ?? false;

const NativeRuntimeEnhancements = () => {
  if (!isNativeRuntime()) {
    return null;
  }

  return (
    <Suspense fallback={null}>
      <OfflineIndicator />
      <PushNotificationsInit />
    </Suspense>
  );
};

const ProtectedRoute = ({ children, allowedRoles, requireAdmin, skipOnboardingCheck, skipApprovalCheck, skipVerificationCheck }) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/auth" replace />;
  }
  
  // Check admin requirement
  if (requireAdmin && !user.is_admin) {
    return <Navigate to="/dashboard" replace />;
  }

  if (user.account_setup_completed === false && location.pathname !== "/social-setup") {
    return <Navigate to="/social-setup" replace />;
  }
  
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }
  
  // NEW: Redirect providers who haven't completed business setup (first priority)
  if (!skipVerificationCheck && user.role === "provider" && !user.business_setup_completed) {
    return <Navigate to="/provider-setup" replace />;
  }
  
  // NEW: Redirect providers who haven't verified documents (second priority)
  if (!skipVerificationCheck && user.role === "provider" && user.business_setup_completed && !user.document_verified) {
    return <Navigate to="/provider-verification" replace />;
  }
  
  // Redirect unapproved providers to pending approval page (third priority - after verification)
  if (!skipApprovalCheck && user.role === "provider" && user.document_verified && user.is_approved !== true) {
    return <Navigate to="/pending-approval" replace />;
  }
  
  // Old onboarding check (keep for backward compatibility for existing providers)
  if (!skipOnboardingCheck && user.role === "provider" && user.onboarding_completed === false && user.business_setup_completed !== true) {
    return <Navigate to="/provider-onboarding" replace />;
  }
  
  return children;
};

function AppRoutes() {
  const { user, loading } = useAuth();
  const { markAsRead } = useNotifications();
  const navigate = useNavigate();

  // Handle OAuth deep links on iOS native (e.g. com.servicetones.dev://auth/callback?csrf=...)
  // Capacitor only fires this event in a native context, so web is unaffected.
  useEffect(() => {
    if (!isNativeRuntime()) {
      return undefined;
    }

    let isDisposed = false;
    let removeListener = null;

    const attachNativeListener = async () => {
      const [{ App: CapacitorApp }, { Browser }] = await Promise.all([
        import("@capacitor/app"),
        import("@capacitor/browser"),
      ]);

      const listener = await CapacitorApp.addListener('appUrlOpen', ({ url }) => {
        try {
          if (url.includes('auth/logout')) {
            Browser.close().catch(() => {});
            navigate('/auth', { replace: true });
            return;
          }

          if (!url.includes('auth/callback')) return;
          const u = new URL(url);
          if (u.searchParams.has('native_session')) return;
          const params = new URLSearchParams();
          ['csrf', 'error', 'email', 'social_setup', 'setup_token', 'name'].forEach((k) => {
            const v = u.searchParams.get(k);
            if (v) params.set(k, v);
          });
          Browser.close().catch(() => {});
          navigate(`/auth/callback?${params.toString()}`, { replace: true });
        } catch {
          // Ignore malformed URLs
        }
      });

      if (isDisposed) {
        listener.remove();
        return;
      }

      removeListener = () => listener.remove();
    };

    attachNativeListener().catch(() => {});

    return () => {
      isDisposed = true;
      removeListener?.();
    };
  }, [navigate]);

  useEffect(() => {
    if (!isNativeRuntime()) {
      return undefined;
    }

    let removeListener = null;

    const attachPushNavigation = async () => {
      const { consumePendingPushNavigation, PUSH_NOTIFICATION_NAVIGATION_EVENT } = await import("./mobile/utils/pushNotifications");

      const handlePushNavigation = () => {
        if (loading || !user) {
          return;
        }

        const pendingNavigation = consumePendingPushNavigation();
        if (pendingNavigation?.route) {
          if (pendingNavigation.notificationId) {
            markAsRead(pendingNavigation.notificationId);
          }
          navigate(pendingNavigation.route);
        }
      };

      window.addEventListener(PUSH_NOTIFICATION_NAVIGATION_EVENT, handlePushNavigation);
      handlePushNavigation();

      removeListener = () => {
        window.removeEventListener(PUSH_NOTIFICATION_NAVIGATION_EVENT, handlePushNavigation);
      };
    };

    attachPushNavigation().catch(() => {});

    return () => {
      removeListener?.();
    };
  }, [loading, markAsRead, navigate, user]);

  // Determine default redirect for authenticated users
  const getDefaultRedirect = () => {
    if (!user) return "/";
    if (user.account_setup_completed === false) return "/social-setup";
    // Admins should use separate admin portal (admin.servicetones.com)
    return "/dashboard";
  };
  
  return (
    <>
    <AnnouncementBar />
    <Suspense fallback={<PageLoader />}>
      <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/auth" element={user ? <Navigate to={getDefaultRedirect()} replace /> : <AuthPage />} />
      <Route path="/services" element={<ServicesPage />} />
      <Route path="/pricing" element={<PricingPage />} />
      <Route path="/help" element={<HelpCenterPage />} />
      
      {/* Search Route - Public */}
      <Route path="/search" element={<SearchResults />} />
      
      {/* Browse Routes - Public */}
      <Route path="/forgot-password" element={user ? <Navigate to={getDefaultRedirect()} replace /> : <ForgotPasswordPage />} />
      <Route path="/providers" element={<BrowseProviders />} />
      <Route path="/providers/:providerId" element={<ProviderProfile />} />
      <Route 
        path="/dashboard" 
        element={
          <ProtectedRoute>
            {user?.is_admin ? <Navigate to="/admin" replace /> : 
             user?.role === "provider" ? <ProviderDashboard /> : <CustomerDashboard />}
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/messages" 
        element={
          <ProtectedRoute>
            <Messages />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/messages/:partnerId" 
        element={
          <ProtectedRoute>
            <Messages />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/favorites" 
        element={
          <ProtectedRoute>
            <Favorites />
          </ProtectedRoute>
        } 
      />


      <Route 
        path="/provider-setup" 
        element={
          <ProtectedRoute allowedRoles={["provider"]} skipOnboardingCheck skipApprovalCheck skipVerificationCheck>
            <ProviderBusinessSetup />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/provider-verification" 
        element={
          <ProtectedRoute allowedRoles={["provider"]} skipOnboardingCheck skipApprovalCheck skipVerificationCheck>
            <ProviderDocumentVerification />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/provider-onboarding" 
        element={
          <ProtectedRoute allowedRoles={["provider"]} skipOnboardingCheck skipApprovalCheck skipVerificationCheck>
            <ProviderOnboarding />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/pending-approval" 
        element={
          <ProtectedRoute allowedRoles={["provider"]} skipOnboardingCheck skipApprovalCheck skipVerificationCheck>
            <PendingApproval />
          </ProtectedRoute>
        } 
      />
      
      {/* Project Routes */}
      <Route path="/projects" element={<BrowseProjects />} />
      <Route path="/projects/:projectId" element={<ProjectDetail />} />
      <Route 
        path="/projects/post" 
        element={
          <ProtectedRoute allowedRoles={["customer"]}>
            <PostProject />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/projects/:projectId/edit" 
        element={
          <ProtectedRoute allowedRoles={["customer"]}>
            <PostProject />
          </ProtectedRoute>
        } 
      />


      <Route 
        path="/business-profile" 
        element={
          <ProtectedRoute allowedRoles={["provider"]}>
            <ProviderBusinessProfile />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/schedule" 
        element={
          <ProtectedRoute allowedRoles={["provider"]}>
            <ProviderSchedule />
          </ProtectedRoute>
        } 
      />
      <Route path="/provider-schedule" element={<Navigate to="/schedule" replace />} />
      
      {/* Subscription Routes */}
      <Route path="/subscription" element={<Subscription />} />
      <Route 
        path="/subscription-success" 
        element={
          <ProtectedRoute allowedRoles={["provider"]}>
            <SubscriptionSuccess />
          </ProtectedRoute>
        } 
      />

      {/* Legal / Public Pages */}
      <Route path="/privacy" element={<PrivacyPage />} />
      <Route path="/terms" element={<TermsPage />} />

      {/* OAuth callback — social login (Sign in with Apple / Google) */}
      <Route path="/auth/callback" element={<OAuthCallbackPage />} />
      <Route path="/social-setup" element={<SocialSetupPage />} />

      {/* Account Settings (protected) */}
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <SettingsPage />
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </Suspense>
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <AuthProvider>
          <NotificationProvider>
            <ChatProvider>
              <NativeRuntimeEnhancements />
              <AppRoutes />
              <Toaster position="top-right" richColors />
            </ChatProvider>
          </NotificationProvider>
        </AuthProvider>
      </ErrorBoundary>
    </BrowserRouter>
  );
}

export default App;
