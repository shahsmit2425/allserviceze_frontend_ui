import { Link } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { FormCallout, FormField } from "../components/ui/form-field";
import { Switch } from "../components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import TimezoneSelector from "../components/TimezoneSelector";
import {
  Bell,
  ChevronRight,
  Clock3,
  FileText,
  Lock,
  Mail,
  RefreshCcw,
  Target,
  Trash2,
  LogOut,
} from "lucide-react";

const panelClassName = "rounded-xl border border-border/60 bg-white p-4 shadow-sm";
const compactLinkClassName = "flex items-center justify-between rounded-lg border border-border/60 bg-white px-3.5 py-3 text-sm font-medium transition-all duration-200 hover:border-primary/20 hover:bg-white hover:text-primary";

const formatLastSavedAt = (value) => {
  if (!value) {
    return "";
  }

  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(value);
};

export default function SettingsPageSections({
  user,
  isNative,
  isNativePhone,
  pushNotificationsEnabled,
  notificationPreferences,
  loadingPreferences,
  updatePreferenceField,
  updateGroupChannel,
  handleSavePreferences,
  savingPreferences,
  pushDiagnostics,
  loadingPushDiagnostics,
  refreshingPushDiagnostics,
  syncingPushToken,
  sendingTestNotification,
  refreshPushDiagnostics,
  handleSyncPushToken,
  handleSendTestNotification,
  setShowDeleteDialog,
  logout,
  lastSavedAt,
  lastSaveError,
}) {
  const lastSavedLabel = formatLastSavedAt(lastSavedAt);

  return (
    <>
      <div className="mb-6 grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-5 lg:col-start-2 lg:row-start-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Lock className="h-4 w-4" /> Security
              </CardTitle>
              <CardDescription>Update the credentials that protect this account.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-1">
              <Link to="/forgot-password" className={compactLinkClassName}>
                Change Password
                <ChevronRight className="h-4 w-4" />
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="h-4 w-4" /> Legal
              </CardTitle>
              <CardDescription>Review the policies that govern how the platform operates.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Link to="/terms" className={compactLinkClassName}>
                Terms of Service
                <ChevronRight className="h-4 w-4" />
              </Link>
              <Link to="/privacy" className={compactLinkClassName}>
                Privacy Policy
                <ChevronRight className="h-4 w-4" />
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Bell className="h-4 w-4" /> Notification Preferences
          </CardTitle>
          <CardDescription>
            These settings apply across the website and the native app, including push, email, in-app inbox, quiet hours, and provider opportunity targeting.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {loadingPreferences || !notificationPreferences ? (
            <p className="text-sm text-muted-foreground">Loading notification preferences…</p>
          ) : (
            <>
              <FormCallout icon={Bell} title="Save once to sync website and native app delivery controls.">
                These preferences affect in-app inbox alerts, email delivery, quiet hours, and any native push routes connected to this account.
              </FormCallout>

              <div className="grid gap-4 md:grid-cols-3">
                <div className={panelClassName}>
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium">In-app inbox</p>
                      <p className="text-xs text-muted-foreground">Bell, inbox list, and web realtime</p>
                    </div>
                    <Switch
                      aria-label="Toggle in-app inbox notifications"
                      checked={notificationPreferences.in_app_enabled}
                      onCheckedChange={(checked) => updatePreferenceField("in_app_enabled", checked)}
                    />
                  </div>
                </div>
                <div className={panelClassName}>
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium">Push notifications</p>
                      <p className="text-xs text-muted-foreground">Native device alerts for supported mobile builds</p>
                    </div>
                    <Switch
                      aria-label="Toggle push notifications"
                      checked={notificationPreferences.push_enabled}
                      onCheckedChange={(checked) => updatePreferenceField("push_enabled", checked)}
                    />
                  </div>
                </div>
                <div className={panelClassName}>
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium">Email notifications</p>
                      <p className="text-xs text-muted-foreground">Transactional and digest email delivery</p>
                    </div>
                    <Switch
                      aria-label="Toggle email notifications"
                      checked={notificationPreferences.email_enabled}
                      onCheckedChange={(checked) => updatePreferenceField("email_enabled", checked)}
                    />
                  </div>
                </div>
              </div>

              <div className={`${panelClassName} space-y-4`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Quiet hours</p>
                    <p className="text-xs text-muted-foreground">Queue non-urgent push and email outside your preferred hours</p>
                  </div>
                  <Switch
                    aria-label="Toggle quiet hours"
                    checked={notificationPreferences.quiet_hours_enabled}
                    onCheckedChange={(checked) => updatePreferenceField("quiet_hours_enabled", checked)}
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    id="quiet-hours-start"
                    type="time"
                    label="Quiet hours start"
                    icon={Clock3}
                    value={notificationPreferences.quiet_hours_start || "22:00"}
                    onChange={(e) => updatePreferenceField("quiet_hours_start", e.target.value)}
                    disabled={!notificationPreferences.quiet_hours_enabled}
                    hint="Local time based on the timezone below."
                  />
                  <FormField
                    id="quiet-hours-end"
                    type="time"
                    label="Quiet hours end"
                    icon={Clock3}
                    value={notificationPreferences.quiet_hours_end || "07:00"}
                    onChange={(e) => updatePreferenceField("quiet_hours_end", e.target.value)}
                    disabled={!notificationPreferences.quiet_hours_enabled}
                    hint="Queued notifications resume after this time."
                  />
                </div>

                <TimezoneSelector
                  value={notificationPreferences.quiet_hours_timezone}
                  onChange={(value) => updatePreferenceField("quiet_hours_timezone", value)}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <FormField label="Email delivery cadence" id="email-delivery-cadence" icon={Mail} hint="Immediate sends every eligible update. Daily digest batches them.">
                  <Select
                    value={notificationPreferences.email_digest_frequency || "immediate"}
                    onValueChange={(value) => updatePreferenceField("email_digest_frequency", value)}
                  >
                    <SelectTrigger id="email-delivery-cadence" className="pl-11" aria-label="Email delivery cadence">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="immediate">Immediate</SelectItem>
                      <SelectItem value="daily">Daily digest</SelectItem>
                    </SelectContent>
                  </Select>
                </FormField>

                <div className={panelClassName}>
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium">Hide announcements</p>
                      <p className="text-xs text-muted-foreground">Opt out of admin announcement banners in the app</p>
                    </div>
                    <Switch
                      aria-label="Toggle announcements"
                      checked={notificationPreferences.announcement_opt_out}
                      onCheckedChange={(checked) => updatePreferenceField("announcement_opt_out", checked)}
                    />
                  </div>
                </div>
              </div>

              {user?.role === "provider" && (
                <div className={`${panelClassName} space-y-4`}>
                  <div>
                    <p className="text-sm font-medium">Project opportunity targeting</p>
                    <p className="text-xs text-muted-foreground">Control how precisely new project alerts should match your provider profile.</p>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField label="Opportunity scope" id="project-opportunity-scope" icon={Target}>
                      <Select
                        value={notificationPreferences.project_opportunity_scope || "all"}
                        onValueChange={(value) => updatePreferenceField("project_opportunity_scope", value)}
                      >
                        <SelectTrigger id="project-opportunity-scope" className="pl-11" aria-label="Project opportunity scope">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All live projects</SelectItem>
                          <SelectItem value="matching_services">Only matching service categories</SelectItem>
                          <SelectItem value="nearby_matching_services">Nearby matching service categories</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormField>
                    <FormField
                      id="project-radius"
                      type="number"
                      min="1"
                      max="250"
                      label="Targeting radius (miles)"
                      icon={Target}
                      value={notificationPreferences.project_opportunity_radius_miles ?? ""}
                      onChange={(e) => updatePreferenceField(
                        "project_opportunity_radius_miles",
                        e.target.value === "" ? null : Number(e.target.value)
                      )}
                      hint="Used when nearby matching is selected."
                    />
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium">Channel controls by category</p>
                  <p className="text-xs text-muted-foreground">Turn individual channels on or off for each class of update.</p>
                </div>
                <div className="space-y-3">
                  {(notificationPreferences.available_groups || []).map((group) => (
                    <div key={group.key} className={panelClassName}>
                      <div className="mb-3">
                        <p className="text-sm font-medium">{group.label}</p>
                        <p className="text-xs text-muted-foreground">{group.types.join(", ")}</p>
                      </div>
                      <div className="grid gap-3 md:grid-cols-3">
                        {[
                          ["in_app", "In-app"],
                          ["push", "Push"],
                          ["email", "Email"],
                        ].map(([channel, label]) => (
                          <div key={channel} className="flex items-center justify-between rounded-xl bg-muted/50 px-3 py-2.5 shadow-inner">
                            <span className="text-sm">{label}</span>
                            <Switch
                              aria-label={`${group.label} ${label} toggle`}
                              checked={Boolean(notificationPreferences.type_overrides?.[group.key]?.[channel])}
                              onCheckedChange={(checked) => updateGroupChannel(group.key, channel, checked)}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mobile-form-tray sticky bottom-3 z-20 flex items-center justify-between gap-3 sm:static sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none">
                <p className={`text-xs ${lastSaveError ? "text-destructive" : "text-muted-foreground"}`}>
                  {lastSaveError ? lastSaveError : lastSavedLabel ? `Saved at ${lastSavedLabel}` : "Changes sync across your web and mobile sessions."}
                </p>
                <Button onClick={handleSavePreferences} disabled={savingPreferences} aria-label={savingPreferences ? "Saving notification preferences" : "Save notification preferences"}>
                  {savingPreferences ? "Saving…" : "Save Preferences"}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {isNative && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Bell className="h-4 w-4" /> Notifications
            </CardTitle>
            <CardDescription>
              Use this to verify notification history, websocket delivery, and native push on this device.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!pushNotificationsEnabled && (
              <p className="alert-warning rounded-2xl px-3 py-2 text-xs text-amber-700">
                Native push registration is disabled in this build. Test notifications will still verify database and in-app delivery, but not OS-level push.
              </p>
            )}

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div className={panelClassName}>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">Build flag</p>
                <p className="mt-2 text-sm font-semibold text-foreground">{pushNotificationsEnabled ? "Enabled" : "Disabled"}</p>
              </div>
              <div className={panelClassName}>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">Backend FCM</p>
                <p className="mt-2 text-sm font-semibold text-foreground">
                  {loadingPushDiagnostics ? "Checking…" : pushDiagnostics?.fcm_configured ? "Configured" : "Not configured"}
                </p>
              </div>
              <div className={panelClassName}>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">Android tokens</p>
                <p className="mt-2 text-sm font-semibold text-foreground">
                  {loadingPushDiagnostics ? "Checking…" : (pushDiagnostics?.registered_android_device_tokens ?? 0)}
                </p>
              </div>
              <div className={panelClassName}>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">Registered platforms</p>
                <p className="mt-2 text-sm font-semibold capitalize text-foreground">
                  {loadingPushDiagnostics ? "Checking…" : (pushDiagnostics?.registered_platforms?.join(", ") || "None")}
                </p>
              </div>
            </div>

            <div className="rounded-lg border border-border/60 bg-white px-4 py-3 text-xs text-muted-foreground">
              Android push requires a push-enabled mobile build, at least one registered Android device token for this account, and backend FCM credentials.
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={refreshPushDiagnostics}
                disabled={loadingPushDiagnostics || refreshingPushDiagnostics}
                aria-label={loadingPushDiagnostics || refreshingPushDiagnostics ? "Refreshing push status" : "Refresh push status"}
              >
                <RefreshCcw className="mr-1 h-4 w-4" />
                {loadingPushDiagnostics || refreshingPushDiagnostics ? "Refreshing..." : "Refresh Push Status"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSyncPushToken}
                disabled={syncingPushToken || !pushNotificationsEnabled}
                aria-label={syncingPushToken ? "Syncing device token" : "Sync device token"}
              >
                {syncingPushToken ? "Syncing..." : "Sync Device Token"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleSendTestNotification(0)}
                disabled={sendingTestNotification}
                aria-label="Send test notification now"
              >
                Send Test Now
              </Button>
              <Button
                size="sm"
                onClick={() => handleSendTestNotification(10)}
                disabled={sendingTestNotification}
                aria-label={sendingTestNotification ? "Scheduling test notification" : "Send test notification in 10 seconds"}
              >
                {sendingTestNotification ? "Scheduling..." : "Send in 10 Seconds"}
              </Button>
            </div>

            <p className="text-xs text-muted-foreground">
              The delayed option gives you time to background the app and confirm lock-screen delivery.
            </p>
          </CardContent>
        </Card>
      )}

      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base text-destructive">
            <Trash2 className="h-4 w-4" /> Danger Zone
          </CardTitle>
          <CardDescription>
            These actions are permanent and cannot be undone.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-4 rounded-xl border border-destructive/15 bg-destructive/5 p-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-medium">Delete Account</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Permanently delete your account and all associated data. This action
                cannot be reversed.
              </p>
            </div>
            <Button
              variant="destructive"
              size="sm"
              className={isNativePhone ? "w-full shrink-0" : "shrink-0"}
              onClick={() => setShowDeleteDialog(true)}
              aria-label="Open delete account confirmation"
            >
              Delete Account
            </Button>
          </div>

          <div className="flex flex-col gap-4 rounded-xl border border-border/60 bg-background/85 p-4 shadow-sm sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-medium">Sign Out</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Sign out of your account on this device.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className={isNativePhone ? "w-full shrink-0" : "shrink-0"}
              onClick={logout}
              aria-label="Sign out of your account"
            >
              <LogOut className="mr-1 h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </CardContent>
      </Card>
    </>
  );
}