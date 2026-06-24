import { lazy, Suspense, useEffect, useState } from "react";
import { AppShell } from "../components/AppShell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Helmet } from "react-helmet-async";
import { useAuth } from "../context/AuthContext";
import { isTruthyEnvFlag } from "@/utils/envFlags";
import { toast } from "sonner";
import axios from "axios";
import { Shield, Bell, Loader2 } from "lucide-react";
import { usePlatform } from "@/mobile/hooks/usePlatform";

const API_URL = `${import.meta.env.VITE_BACKEND_URL || "http://localhost:5000"}/api`;
const SETTINGS_CANONICAL_URL = "https://servicetones.com/settings";
const panelClassName = "rounded-lg border border-border/60 bg-white/90 p-4 shadow-sm";

const LazySettingsSections = lazy(() => import("./SettingsPageSections"));
const LazySettingsDeleteDialog = lazy(() => import("./SettingsDeleteDialog"));

const scheduleAfterInitialPaint = (callback, timeout = 1500) => {
  if (typeof window === "undefined") {
    return () => {};
  }

  if ("requestIdleCallback" in window) {
    const idleId = window.requestIdleCallback(callback, { timeout });
    return () => window.cancelIdleCallback(idleId);
  }

  const timerId = window.setTimeout(callback, 350);
  return () => window.clearTimeout(timerId);
};

const DeferredSectionFallback = () => (
  <Card className="mb-6">
    <CardContent className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" />
      Loading settings controls…
    </CardContent>
  </Card>
);

export default function SettingsPage() {
  const { user, logout, csrfToken } = useAuth();
  const { isNative, isNativePhone, isNativeTablet } = usePlatform();
  const pushNotificationsEnabled = isTruthyEnvFlag(import.meta.env.VITE_PUSH_NOTIFICATIONS_ENABLED);
  const pageTheme = user?.role === "provider" ? "provider" : "customer";

  // Delete account dialog state
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [sendingTestNotification, setSendingTestNotification] = useState(false);
  const [notificationPreferences, setNotificationPreferences] = useState(null);
  const [loadingPreferences, setLoadingPreferences] = useState(false);
  const [savingPreferences, setSavingPreferences] = useState(false);
  const [pushDiagnostics, setPushDiagnostics] = useState(null);
  const [loadingPushDiagnostics, setLoadingPushDiagnostics] = useState(false);
  const [refreshingPushDiagnostics, setRefreshingPushDiagnostics] = useState(false);
  const [syncingPushToken, setSyncingPushToken] = useState(false);
  const [showDeferredSettings, setShowDeferredSettings] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState(null);
  const [lastSaveError, setLastSaveError] = useState("");

  useEffect(() => scheduleAfterInitialPaint(() => setShowDeferredSettings(true)), []);

  useEffect(() => {
    const loadPreferences = async () => {
      if (!user || !showDeferredSettings) return;

      setLoadingPreferences(true);
      try {
        const response = await axios.get(`${API_URL}/notifications/preferences`, {
          withCredentials: true,
          headers: csrfToken ? { "X-CSRF-Token": csrfToken } : {},
        });
        setNotificationPreferences(response.data);
        setLastSaveError("");
      } catch (error) {
        const msg = error.response?.data?.detail || "Failed to load notification preferences.";
        toast.error(msg);
      } finally {
        setLoadingPreferences(false);
      }
    };

    loadPreferences();
  }, [csrfToken, showDeferredSettings, user]);

  useEffect(() => {
    const loadPushDiagnostics = async () => {
      if (!user || !isNative || !csrfToken || !showDeferredSettings) return;

      setLoadingPushDiagnostics(true);
      try {
        const response = await axios.get(`${API_URL}/notifications/runtime-status`, {
          withCredentials: true,
          headers: { "X-CSRF-Token": csrfToken },
        });
        setPushDiagnostics(response.data);
      } catch (error) {
        const msg = error.response?.data?.detail || "Failed to load push diagnostics.";
        toast.error(msg);
      } finally {
        setLoadingPushDiagnostics(false);
      }
    };

    loadPushDiagnostics();
  }, [csrfToken, isNative, showDeferredSettings, user]);

  const updatePreferenceField = (field, value) => {
    setLastSaveError("");
    setNotificationPreferences((prev) => ({
      ...(prev || {}),
      [field]: value,
    }));
  };

  const updateGroupChannel = (groupKey, channel, value) => {
    setLastSaveError("");
    setNotificationPreferences((prev) => ({
      ...(prev || {}),
      type_overrides: {
        ...(prev?.type_overrides || {}),
        [groupKey]: {
          ...(prev?.type_overrides?.[groupKey] || {}),
          [channel]: value,
        },
      },
    }));
  };

  const handleSavePreferences = async () => {
    if (!notificationPreferences) return;

    setSavingPreferences(true);
    setLastSaveError("");
    try {
      const response = await axios.put(
        `${API_URL}/notifications/preferences`,
        {
          in_app_enabled: notificationPreferences.in_app_enabled,
          push_enabled: notificationPreferences.push_enabled,
          email_enabled: notificationPreferences.email_enabled,
          quiet_hours_enabled: notificationPreferences.quiet_hours_enabled,
          quiet_hours_start: notificationPreferences.quiet_hours_start,
          quiet_hours_end: notificationPreferences.quiet_hours_end,
          quiet_hours_timezone: notificationPreferences.quiet_hours_timezone,
          email_digest_frequency: notificationPreferences.email_digest_frequency,
          project_opportunity_scope: notificationPreferences.project_opportunity_scope,
          project_opportunity_radius_miles: notificationPreferences.project_opportunity_radius_miles,
          announcement_opt_out: notificationPreferences.announcement_opt_out,
          type_overrides: notificationPreferences.type_overrides,
        },
        {
          withCredentials: true,
          headers: csrfToken ? { "X-CSRF-Token": csrfToken } : {},
        }
      );
      setNotificationPreferences(response.data);
      setLastSavedAt(new Date());
      toast.success("Notification preferences updated.");
    } catch (error) {
      const msg = error.response?.data?.detail || "Failed to update notification preferences.";
      setLastSaveError(msg);
      toast.error(msg);
    } finally {
      setSavingPreferences(false);
    }
  };

  const handleSendTestNotification = async (delaySeconds = 0) => {
    setSendingTestNotification(true);
    try {
      const response = await axios.post(
        `${API_URL}/notifications/test-delivery`,
        { delay_seconds: delaySeconds },
        {
          withCredentials: true,
          headers: csrfToken ? { "X-CSRF-Token": csrfToken } : {},
        }
      );

      const emailEnabled = response.data?.email_enabled;
      const emailConfigured = response.data?.email_configured;
      const emailFrom = response.data?.email_from;
      const fcmConfigured = response.data?.fcm_configured;
      const registeredAndroidTokens = response.data?.registered_android_device_tokens;
      let emailStatus = "";
      let pushStatus = "";

      if (emailEnabled === false) {
        emailStatus = " Email alerts are disabled on the backend.";
      } else if (emailConfigured === false) {
        emailStatus = " Email SMTP is not fully configured on the backend.";
      } else if (emailFrom) {
        emailStatus = ` Email sender: ${emailFrom}.`;
      }

      if (fcmConfigured === false) {
        pushStatus = " Android FCM is not configured on the backend.";
      } else if (registeredAndroidTokens === 0) {
        pushStatus = " No Android device token is registered for this account yet.";
      }

      if (delaySeconds > 0) {
        toast.success(`Test notification scheduled in ${delaySeconds} seconds. Background the app now to verify native push.${pushStatus}${emailStatus}`);
      } else {
        toast.success(`Test notification sent.${pushStatus}${emailStatus}`);
      }
    } catch (error) {
      const msg = error.response?.data?.detail || "Failed to send test notification.";
      toast.error(msg);
    } finally {
      setSendingTestNotification(false);
    }
  };

  const refreshPushDiagnostics = async () => {
    if (!user || !isNative || !csrfToken) {
      return;
    }

    setRefreshingPushDiagnostics(true);
    try {
      const response = await axios.get(`${API_URL}/notifications/runtime-status`, {
        withCredentials: true,
        headers: { "X-CSRF-Token": csrfToken },
      });
      setPushDiagnostics(response.data);
    } catch (error) {
      const msg = error.response?.data?.detail || "Failed to refresh push diagnostics.";
      toast.error(msg);
    } finally {
      setRefreshingPushDiagnostics(false);
    }
  };

  const handleSyncPushToken = async () => {
    setSyncingPushToken(true);
    try {
      const { getStoredDeviceToken, pushNotificationManager } = await import("@/mobile/utils/pushNotifications");
      const storedToken = getStoredDeviceToken();

      if (!storedToken) {
        toast.error("No local device token is stored on this device yet.");
        return;
      }

      const synced = await pushNotificationManager.syncStoredTokenToBackend();
      if (!synced) {
        toast.error("Device token sync did not complete. Check permission and login state.");
        return;
      }

      toast.success("Device token synced to the backend.");
      await refreshPushDiagnostics();
    } catch (error) {
      toast.error(error?.message || "Failed to sync device token.");
    } finally {
      setSyncingPushToken(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== "DELETE") {
      toast.error('Type "DELETE" to confirm');
      return;
    }

    setDeleting(true);
    try {
      await axios.delete(`${API_URL}/auth/account`, {
        withCredentials: true,
        headers: csrfToken ? { "X-CSRF-Token": csrfToken } : {},
      });

      toast.success("Your account has been permanently deleted.");

      // Clear local storage and redirect
      localStorage.removeItem("servicetones_user");
      localStorage.removeItem("servicetones_csrf");
      sessionStorage.removeItem("servicetones_csrf");

      // Attempt to clear mobile secure storage
      try {
        if (window.Capacitor?.isNativePlatform?.()) {
          const { secureStorage } = await import("@/mobile/utils/secureStorage");
          await secureStorage.disableBiometric();
        }
      } catch {
        // Non-critical
      }

      // Small delay so the toast is visible before redirect
      setTimeout(() => {
        window.location.href = "/";
      }, 1500);
    } catch (error) {
      const msg =
        error.response?.data?.detail || "Account deletion failed. Please try again.";
      toast.error(msg);
    } finally {
      setDeleting(false);
      setShowDeleteDialog(false);
      setDeleteConfirmText("");
    }
  };

  const quietHoursStatus = !showDeferredSettings || loadingPreferences
    ? "Loading…"
    : notificationPreferences?.quiet_hours_enabled
      ? "Enabled"
      : "Off";

  return (
    <AppShell theme={pageTheme}>
      <Helmet>
        <title>Account Settings | ServiceTones</title>
        <meta
          name="description"
          content="Manage ServiceTones account security, notification delivery, quiet hours, and mobile sync settings from a single workspace."
        />
        <link rel="canonical" href={SETTINGS_CANONICAL_URL} />
        <meta name="robots" content="noindex, nofollow" />
        <meta property="og:title" content="Account Settings | ServiceTones" />
        <meta
          property="og:description"
          content="Update your ServiceTones security preferences, notification delivery channels, and device sync controls."
        />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={SETTINGS_CANONICAL_URL} />
      </Helmet>
      <div className="page-shell safe-bottom-shell py-6 sm:py-8">
        <div className="mx-auto max-w-5xl">
        <section className="page-hero mb-6">
          <div className={isNativeTablet ? "relative grid gap-5 xl:grid-cols-[1.2fr_0.8fr] xl:items-start" : "relative grid gap-5 lg:grid-cols-[1.2fr_0.8fr] lg:items-start"}>
            <div>
              <span className="page-kicker">
                <Bell className="h-3.5 w-3.5" /> Unified delivery controls
              </span>
              <h1 className="mt-3 font-heading text-3xl font-bold tracking-[-0.04em] text-foreground sm:text-4xl">
                Account settings
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
                Manage security, legal details, and how notifications reach you across the website, inbox, email, and native app delivery from one place.
              </p>
            </div>
            <div className="glass-panel p-4 sm:p-5">
              <div className={isNativeTablet ? "grid gap-3 sm:grid-cols-3 xl:grid-cols-1" : "grid gap-3 sm:grid-cols-3 lg:grid-cols-1"}>
                <div className="rounded-lg border border-border/60 bg-white/90 p-4 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">Role</p>
                  <p className="mt-2 text-lg font-semibold capitalize text-foreground">{user?.role || "User"}</p>
                </div>
                <div className="rounded-lg border border-border/60 bg-white/90 p-4 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">Device sync</p>
                  <p className="mt-2 text-lg font-semibold text-foreground">{isNative ? "Web + Mobile" : "Web"}</p>
                </div>
                <div className="rounded-lg border border-border/60 bg-white/90 p-4 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">Quiet hours</p>
                  <p className="mt-2 text-lg font-semibold text-foreground">
                    {quietHoursStatus}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className={isNativeTablet ? "mb-6 grid gap-5 xl:grid-cols-[1.15fr_0.85fr]" : "mb-6 grid gap-5 lg:grid-cols-[1.15fr_0.85fr]"}>
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="w-4 h-4" /> Account
              </CardTitle>
              <CardDescription>Your identity, role, and verification status at a glance.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <div className={panelClassName}>
                <div className="flex justify-between gap-4">
                  <span>Name</span>
                  <span className="text-right font-medium text-foreground">{user?.name || user?.full_name || "—"}</span>
                </div>
              </div>
              <div className={panelClassName}>
                <div className="flex justify-between gap-4">
                  <span>Role</span>
                  <span className="capitalize text-foreground">{user?.role || "—"}</span>
                </div>
              </div>
              <div className={panelClassName}>
                <div className="flex justify-between gap-4">
                  <span>Account verified</span>
                  <span className={user?.is_verified ? "font-medium text-emerald-600" : "font-medium text-amber-600"}>
                    {user?.is_verified ? "Yes" : "Pending"}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {showDeferredSettings ? (
          <Suspense fallback={<DeferredSectionFallback />}>
            <LazySettingsSections
              user={user}
              isNative={isNative}
              isNativePhone={isNativePhone}
              pushNotificationsEnabled={pushNotificationsEnabled}
              notificationPreferences={notificationPreferences}
              loadingPreferences={loadingPreferences}
              updatePreferenceField={updatePreferenceField}
              updateGroupChannel={updateGroupChannel}
              handleSavePreferences={handleSavePreferences}
              savingPreferences={savingPreferences}
              pushDiagnostics={pushDiagnostics}
              loadingPushDiagnostics={loadingPushDiagnostics}
              refreshingPushDiagnostics={refreshingPushDiagnostics}
              syncingPushToken={syncingPushToken}
              sendingTestNotification={sendingTestNotification}
              refreshPushDiagnostics={refreshPushDiagnostics}
              handleSyncPushToken={handleSyncPushToken}
              handleSendTestNotification={handleSendTestNotification}
              setShowDeleteDialog={setShowDeleteDialog}
              logout={logout}
              lastSavedAt={lastSavedAt}
              lastSaveError={lastSaveError}
            />
          </Suspense>
        ) : (
          <DeferredSectionFallback />
        )}
        </div>
      </div>

      <Suspense fallback={null}>
        <LazySettingsDeleteDialog
          open={showDeleteDialog}
          onOpenChange={(open) => {
            setShowDeleteDialog(open);
            if (!open) {
              setDeleteConfirmText("");
            }
          }}
          deleteConfirmText={deleteConfirmText}
          setDeleteConfirmText={setDeleteConfirmText}
          deleting={deleting}
          onDelete={handleDeleteAccount}
        />
      </Suspense>
    </AppShell>
  );
}
