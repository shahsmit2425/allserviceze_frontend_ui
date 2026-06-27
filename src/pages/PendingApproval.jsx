import { AppShell } from "../components/AppShell";
import logger from "@/utils/logger";
import { Card, CardContent } from "../components/ui/card";
import { useAuth } from "../context/AuthContext";
import { Clock, LogOut, CheckCircle } from "lucide-react";
import { Button } from "../components/ui/button";
import { useNavigate } from "react-router-dom";

export default function PendingApproval() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // If already approved, show success state
  if (user?.is_approved === true) {
    return (
      <AppShell theme="provider" className="pb-12" contentClassName="pb-12">
        <div className="page-shell py-8">
          <div className="mx-auto max-w-3xl">
            <section className="page-hero text-center">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-lg bg-primary/10">
                <CheckCircle className="h-10 w-10 text-primary" />
              </div>
              <span className="page-kicker mt-6 inline-flex">Provider onboarding</span>
              <h1 className="heading-2 mt-4 text-foreground">Profile approved</h1>
              <p className="body-lg mt-3 text-muted-foreground">
                Welcome, {user?.full_name}. Your provider profile is live and ready to start taking on work.
              </p>

              <div className="form-shell mx-auto mt-8 max-w-xl p-6">
                <p className="text-sm leading-7 text-muted-foreground">
                  Approval is complete. You can browse projects, submit bids, and start building your pipeline immediately.
                </p>
                <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
                  <Button onClick={() => navigate('/projects')} className="rounded-lg">
                    Browse Projects
                  </Button>
                  <Button variant="outline" onClick={logout} className="gap-2 rounded-lg">
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </Button>
                </div>
              </div>
            </section>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell theme="provider" className="pb-12" contentClassName="pb-12">
      <div className="page-shell py-8">
        <div className="mx-auto max-w-4xl space-y-8">
          <section className="page-hero">
            <div className="workspace-hero-grid">
              <div className="max-w-3xl">
                <span className="page-kicker">Provider onboarding</span>
                <h1 className="heading-2 mt-4 text-foreground">Account pending approval</h1>
                <p className="body-lg mt-3 max-w-2xl text-muted-foreground">
                  Welcome, {user?.full_name}. Your provider account is in review and will unlock full marketplace access as soon as approval clears.
                </p>
              </div>

              <div className="workspace-hero-aside">
                <div className="relative space-y-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/65">Review status</p>
                      <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-white">Your profile is waiting on final approval.</h2>
                    </div>
                    <div className="rounded-lg border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold text-white/80">Review</div>
                  </div>

                  <div className="rounded-lg border border-white/12 bg-white/8 p-4 backdrop-blur-sm">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-copper-600/12">
                        <Clock className="h-6 w-6 text-copper-100" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white">Status in progress</p>
                        <p className="mt-1 text-sm leading-6 text-white/72">You will receive a notification when the review is complete.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <Card className="form-shell overflow-hidden">
            <CardContent className="p-6 sm:p-8">
              <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
                <div>
                  <h2 className="text-2xl font-semibold tracking-[-0.04em] text-foreground">What happens next</h2>
                  <p className="mt-3 text-sm leading-7 text-muted-foreground">
                    The admin team reviews your registration details, approves the account, and then you can start browsing projects and sending bids.
                  </p>

                  <div className="mt-6 space-y-3">
                    <div className="info-tile p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Step 1</p>
                      <p className="mt-2 text-sm font-semibold text-foreground">Registration review</p>
                    </div>
                    <div className="info-tile p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Step 2</p>
                      <p className="mt-2 text-sm font-semibold text-foreground">Approval notification</p>
                    </div>
                    <div className="info-tile p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Step 3</p>
                      <p className="mt-2 text-sm font-semibold text-foreground">Browse projects and submit bids</p>
                    </div>
                  </div>
                </div>

                <div className="workspace-utility-card">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Account note</p>
                  <p className="mt-3 text-sm leading-7 text-muted-foreground">
                    Sign out if you need to return later. Your review status will remain in place while the admin team completes the check.
                  </p>
                  <p className="mt-3 text-sm leading-7 text-muted-foreground">
                    We will unlock the full provider workspace once approval clears.
                  </p>

                  {user?.is_approved === false && (
                    <div className="alert-danger mt-4">
                      <p className="text-sm leading-6 text-red-700">
                        Your account application was not approved. Please contact support for more information.
                      </p>
                    </div>
                  )}

                  <div className="mt-6">
                    <Button variant="outline" onClick={logout} className="gap-2 rounded-lg">
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
