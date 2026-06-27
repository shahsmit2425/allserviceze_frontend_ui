import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  ArrowRight,
  BarChart3,
  Briefcase,
  Check,
  Crown,
  Loader2,
  X,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "../components/AppShell";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Label } from "../components/ui/label";
import { Progress } from "../components/ui/progress";
import { Switch } from "../components/ui/switch";
import { useAuth } from "../context/AuthContext";
import logger from "@/utils/logger";

const API_URL = `${import.meta.env.VITE_BACKEND_URL || "http://localhost:5000"}/api`;

const planIcons = {
  free: Briefcase,
  basic: Zap,
  pro: Crown,
};

const planColors = {
  free: "border-deep-navy-100/80",
  basic: "border-primary/40",
  pro: "border-copper-400/80",
};

export default function Subscription() {
  const navigate = useNavigate();
  const { user, getAuthHeader } = useAuth();

  const [plans, setPlans] = useState([]);
  const [currentSubscription, setCurrentSubscription] = useState(null);
  const [usage, setUsage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [billingCycle, setBillingCycle] = useState("monthly");
  const [checkoutLoading, setCheckoutLoading] = useState(null);

  useEffect(() => {
    fetchData();
  }, [user]);

  const fetchData = async () => {
    try {
      const plansRes = await axios.get(`${API_URL}/subscriptions/plans`);
      setPlans(plansRes.data.plans);

      if (user && user.role === "provider") {
        const [subscriptionRes, usageRes] = await Promise.all([
          axios.get(`${API_URL}/subscriptions/current`, { headers: getAuthHeader() }),
          axios.get(`${API_URL}/subscriptions/usage`, { headers: getAuthHeader() }),
        ]);

        setCurrentSubscription(subscriptionRes.data);
        setUsage(usageRes.data);
      }
    } catch (error) {
      logger.error("Error fetching subscription data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async (planId) => {
    if (!user) {
      navigate("/auth");
      return;
    }

    if (user.role !== "provider") {
      toast.error("Subscriptions are for providers only");
      return;
    }

    if (planId === "free") {
      toast.info("You're already on the free plan");
      return;
    }

    setCheckoutLoading(planId);

    try {
      const response = await axios.post(
        `${API_URL}/subscriptions/checkout`,
        {
          plan: planId,
          billing_cycle: billingCycle,
          origin_url: window.location.origin,
        },
        { headers: getAuthHeader() },
      );

      const checkoutUrl = response.data.url;
      if (checkoutUrl && checkoutUrl.startsWith("https://checkout.stripe.com/")) {
        window.location.href = checkoutUrl;
      } else {
        toast.error("Invalid checkout URL received");
        setCheckoutLoading(null);
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to start checkout");
      setCheckoutLoading(null);
    }
  };

  const handleCancelSubscription = async () => {
    if (!window.confirm("Are you sure you want to cancel your subscription? You'll still have access until the end of your billing period.")) {
      return;
    }

    try {
      await axios.post(`${API_URL}/subscriptions/cancel`, {}, { headers: getAuthHeader() });
      toast.success("Subscription cancelled. You'll have access until the end of your billing period.");
      fetchData();
    } catch (error) {
      toast.error("Failed to cancel subscription");
    }
  };

  const handleReactivate = async () => {
    try {
      await axios.post(`${API_URL}/subscriptions/reactivate`, {}, { headers: getAuthHeader() });
      toast.success("Subscription reactivated!");
      fetchData();
    } catch (error) {
      toast.error("Failed to reactivate subscription");
    }
  };

  const getPrice = (plan) => (billingCycle === "monthly" ? plan.price_monthly : plan.price_yearly);

  const getSavings = (plan) => {
    if (plan.price_monthly === 0) {
      return 0;
    }

    const yearlyCost = plan.price_monthly * 12;
    return Math.round(yearlyCost - plan.price_yearly);
  };

  const usagePercent = usage?.bids_limit && usage.bids_limit !== 999999
    ? Math.min(100, (usage.bids_used / usage.bids_limit) * 100)
    : 0;
  const currentPlanName = usage?.plan_name || currentSubscription?.plan || "Free";
  const currentPlanLabel = typeof currentPlanName === "string"
    ? currentPlanName.charAt(0).toUpperCase() + currentPlanName.slice(1)
    : "Free";
  const maxSavings = plans.reduce((maxValue, plan) => Math.max(maxValue, getSavings(plan)), 0);

  if (loading) {
    return (
      <AppShell
        theme={user?.role === "provider" ? "provider" : "customer"}
        className="bg-background"
        contentClassName="pb-0"
        data-testid="subscription-page"
      >
        <div className="page-shell flex items-center justify-center py-24">
          <div className="glass-panel flex items-center gap-3 px-6 py-5 text-sm text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            Loading subscription plans...
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell
      theme={user?.role === "provider" ? "provider" : "customer"}
      className="bg-background"
      contentClassName="pb-12"
      data-testid="subscription-page"
    >
      <div className="page-shell space-y-6 py-8">
        <section className="page-hero">
          <div className="workspace-hero-grid">
            <div className="max-w-3xl">
              <span className="page-kicker">{user?.role === "provider" ? "Provider growth plans" : "Plans and pricing"}</span>
              <h1 className="heading-2 mt-4 text-foreground">Subscription plans</h1>
              <p className="body-lg mt-3 max-w-2xl text-muted-foreground">
                Unlock more bids, better visibility, and the plan headroom to keep your pipeline moving.
              </p>

              <div className="mt-5 flex flex-wrap gap-2">
                <span className="info-chip">
                  <Briefcase className="h-4 w-4 text-primary" />
                  {plans.length} plan options
                </span>
                <span className="info-chip">
                  <BarChart3 className="h-4 w-4 text-emerald-600" />
                  {user?.role === "provider" && usage
                    ? `${usage.bids_used} bids used this month`
                    : maxSavings > 0
                      ? `Save up to $${maxSavings} per year`
                      : "Cancel anytime"}
                </span>
              </div>
            </div>

            <div className="workspace-hero-aside">
              <div className="relative space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/65">Billing control</p>
                    <h2 className="mt-2 text-xl font-semibold tracking-[-0.04em] text-white">Switch plans when your volume changes.</h2>
                  </div>
                  <div className="rounded-lg border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold text-white/80">Stripe</div>
                </div>

                <div className="rounded-lg border border-white/12 bg-white/8 p-4 backdrop-blur-sm">
                  <div className="flex items-center justify-between gap-4">
                    <Label className={billingCycle === "monthly" ? "font-semibold text-white" : "text-white/70"}>Monthly</Label>
                    <Switch
                      checked={billingCycle === "yearly"}
                      onCheckedChange={(checked) => setBillingCycle(checked ? "yearly" : "monthly")}
                    />
                    <Label className={billingCycle === "yearly" ? "font-semibold text-white" : "text-white/70"}>Yearly</Label>
                  </div>
                  <div className="mt-3 inline-flex rounded-lg border border-emerald-300/20 bg-emerald-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-emerald-100">
                    Save up to 17%
                  </div>
                </div>

                <div className="workspace-hero-metrics">
                  <div className="workspace-hero-metric">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/62">Current plan</p>
                    <p className="mt-2 text-2xl font-semibold tracking-[-0.05em] text-white">{currentPlanLabel}</p>
                  </div>
                  <div className="workspace-hero-metric">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/62">Billing</p>
                    <p className="mt-2 text-2xl font-semibold tracking-[-0.05em] capitalize text-white">{billingCycle}</p>
                  </div>
                  <div className="workspace-hero-metric">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/62">Bids used</p>
                    <p className="mt-2 text-2xl font-semibold tracking-[-0.05em] text-white">{usage?.bids_used ?? 0}</p>
                  </div>
                  <div className="workspace-hero-metric">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/62">Remaining</p>
                    <p className="mt-2 text-2xl font-semibold tracking-[-0.05em] text-white">
                      {usage?.bids_limit === 999999 ? "Unlimited" : usage?.bids_remaining ?? "-"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {user?.role === "provider" && usage && (
          <section className="rounded-xl border border-white/70 bg-white/82 p-5 shadow-xl shadow-deep-navy-800/5 backdrop-blur-xl sm:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Current usage</p>
                <h2 className="mt-2 flex items-center gap-2 text-2xl font-semibold tracking-[-0.04em] text-foreground">
                  <BarChart3 className="h-5 w-5" />
                  Your current usage
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Current plan:
                  <Badge variant="outline" className="ml-2">{usage.plan_name}</Badge>
                </p>
              </div>
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-[1.3fr_0.8fr]">
              <div className="rounded-lg border border-deep-navy-100/80 bg-slate-50/80 p-5">
                <div className="flex justify-between gap-3 text-sm">
                  <span className="text-muted-foreground">Bids this month</span>
                  <span className="font-medium text-foreground">
                    {usage.bids_used} / {usage.bids_limit === 999999 ? "Unlimited" : usage.bids_limit}
                  </span>
                </div>
                <Progress value={usagePercent} className="mt-3 h-2.5" />
                {usage.bids_limit !== 999999 && usage.bids_remaining <= 3 && (
                  <p className="mt-2 text-xs font-medium text-orange-600">
                    {usage.bids_remaining} bids remaining
                  </p>
                )}
              </div>

              <div className="rounded-lg border border-deep-navy-100/80 bg-slate-50/80 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Plan note</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Keep an eye on bid capacity before you hit the limit so upgrades happen on your schedule instead of under pressure.
                </p>
              </div>
            </div>

            {currentSubscription?.cancel_at_period_end && (
              <div className="mt-5 rounded-lg border border-yellow-200 bg-yellow-50/90 p-4">
                <p className="text-sm leading-6 text-yellow-800">
                  Your subscription is set to cancel on {new Date(currentSubscription.current_period_end).toLocaleDateString()}.
                  <Button variant="link" className="h-auto p-0 pl-1 text-yellow-800" onClick={handleReactivate}>
                    Reactivate
                  </Button>
                </p>
              </div>
            )}
          </section>
        )}

        <section className="grid gap-5 lg:grid-cols-3">
          {plans.map((plan) => {
            const Icon = planIcons[plan.id] || Briefcase;
            const isCurrentPlan = currentSubscription?.plan === plan.id;
            const isPopular = plan.id === "basic";

            return (
              <Card
                key={plan.id}
                className={`relative overflow-hidden rounded-xl border-2 bg-white/88 shadow-xl shadow-deep-navy-800/5 backdrop-blur-sm ${planColors[plan.id]} ${isPopular ? "lg:-translate-y-2" : ""}`}
              >
                {isPopular && (
                  <div className="absolute left-1/2 top-4 -translate-x-1/2">
                    <Badge className="rounded-lg bg-primary px-3 py-1">Most Popular</Badge>
                  </div>
                )}

                <CardHeader className={`pb-1 text-center ${isPopular ? "pt-12" : "pt-7"}`}>
                  <div
                    className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl ${
                      plan.id === "pro"
                        ? "bg-copper-100"
                        : plan.id === "basic"
                          ? "bg-primary/10"
                          : "bg-deep-navy-50"
                    }`}
                  >
                    <Icon
                      className={`h-7 w-7 ${
                        plan.id === "pro"
                          ? "text-copper-600"
                          : plan.id === "basic"
                            ? "text-primary"
                            : "text-deep-navy-500"
                      }`}
                    />
                  </div>
                  <CardTitle className="text-[1.7rem] tracking-[-0.03em]">{plan.name}</CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                </CardHeader>

                <CardContent className="space-y-5">
                  <div className="text-center">
                    <div className="flex items-baseline justify-center gap-1">
                      <span className="text-[2.5rem] font-bold tracking-[-0.05em] text-foreground">${getPrice(plan)}</span>
                      {plan.price_monthly > 0 && (
                        <span className="text-muted-foreground">/{billingCycle === "monthly" ? "mo" : "yr"}</span>
                      )}
                    </div>
                    {billingCycle === "yearly" && getSavings(plan) > 0 && (
                      <p className="mt-1 text-sm font-medium text-emerald-600">Save ${getSavings(plan)}/year</p>
                    )}
                  </div>

                  <ul className="space-y-2.5 text-sm">
                    <li className="flex items-center gap-3">
                      <Check className="h-5 w-5 flex-shrink-0 text-green-500" />
                      <span>
                        {plan.bids_per_month === -1 ? <strong>Unlimited</strong> : <strong>{plan.bids_per_month}</strong>} bids/month
                      </span>
                    </li>
                    <li className="flex items-center gap-3">
                      {plan.featured_profile ? (
                        <Check className="h-5 w-5 flex-shrink-0 text-green-500" />
                      ) : (
                        <X className="h-5 w-5 flex-shrink-0 text-gray-300" />
                      )}
                      <span className={!plan.featured_profile ? "text-muted-foreground" : ""}>Featured profile badge</span>
                    </li>
                    <li className="flex items-center gap-3">
                      {plan.analytics ? (
                        <Check className="h-5 w-5 flex-shrink-0 text-green-500" />
                      ) : (
                        <X className="h-5 w-5 flex-shrink-0 text-gray-300" />
                      )}
                      <span className={!plan.analytics ? "text-muted-foreground" : ""}>Analytics dashboard</span>
                    </li>
                    <li className="flex items-center gap-3">
                      {plan.priority_support ? (
                        <Check className="h-5 w-5 flex-shrink-0 text-green-500" />
                      ) : (
                        <X className="h-5 w-5 flex-shrink-0 text-gray-300" />
                      )}
                      <span className={!plan.priority_support ? "text-muted-foreground" : ""}>Priority support</span>
                    </li>
                  </ul>

                  {isCurrentPlan ? (
                    <div className="space-y-2">
                      <Button className="w-full rounded-lg" variant="outline" disabled>
                        Current Plan
                      </Button>
                      {plan.id !== "free" && !currentSubscription?.cancel_at_period_end && (
                        <Button
                          variant="ghost"
                          className="w-full text-sm text-muted-foreground"
                          onClick={handleCancelSubscription}
                        >
                          Cancel subscription
                        </Button>
                      )}
                    </div>
                  ) : (
                    <Button
                      className={`w-full rounded-lg ${plan.id === "pro" ? "bg-copper-500 hover:bg-copper-600" : ""}`}
                      onClick={() => handleSubscribe(plan.id)}
                      disabled={checkoutLoading === plan.id || plan.id === "free"}
                    >
                      {checkoutLoading === plan.id ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : plan.id === "free" ? (
                        "Free Forever"
                      ) : currentSubscription?.plan === "free" ? (
                        <>
                          Upgrade to {plan.name}
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </>
                      ) : (
                        <>
                          Switch to {plan.name}
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </>
                      )}
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </section>

        <section className="rounded-xl border border-white/70 bg-white/82 p-5 shadow-xl shadow-deep-navy-800/5 backdrop-blur-xl sm:p-6">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">FAQ</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-foreground">Frequently asked questions</h2>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <Card className="rounded-lg border border-deep-navy-100/80 bg-slate-50/80 shadow-none">
              <CardContent className="p-5">
                <h3 className="mb-2 font-semibold text-foreground">Can I cancel anytime?</h3>
                <p className="text-sm leading-6 text-muted-foreground">
                  Yes. You keep access until the end of the current billing period.
                </p>
              </CardContent>
            </Card>
            <Card className="rounded-lg border border-deep-navy-100/80 bg-slate-50/80 shadow-none">
              <CardContent className="p-5">
                <h3 className="mb-2 font-semibold text-foreground">What happens when I hit my limit?</h3>
                <p className="text-sm leading-6 text-muted-foreground">
                  You cannot submit new bids until the next cycle, or you can upgrade for more capacity immediately.
                </p>
              </CardContent>
            </Card>
            <Card className="rounded-lg border border-deep-navy-100/80 bg-slate-50/80 shadow-none">
              <CardContent className="p-5">
                <h3 className="mb-2 font-semibold text-foreground">Can I switch plans?</h3>
                <p className="text-sm leading-6 text-muted-foreground">
                  Yes. You can move up or down a tier whenever your workload changes.
                </p>
              </CardContent>
            </Card>
            <Card className="rounded-lg border border-deep-navy-100/80 bg-slate-50/80 shadow-none">
              <CardContent className="p-5">
                <h3 className="mb-2 font-semibold text-foreground">Is there a free trial?</h3>
                <p className="text-sm leading-6 text-muted-foreground">
                  The Free plan lets you test the platform before upgrading for more volume and tools.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    </AppShell>
  );
}