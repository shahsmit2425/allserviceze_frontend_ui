import { useState, useEffect } from "react";
import logger from "@/utils/logger";
import { useSearchParams, useNavigate } from "react-router-dom";
import { AppShell } from "../components/AppShell";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { useAuth } from "../context/AuthContext";
import axios from "axios";
import { CheckCircle, XCircle, Loader2, Home, Briefcase, Crown } from "lucide-react";

const API_URL = `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'}/api`;

const stateStyles = {
  success: {
    wrapperClassName: "bg-primary/10",
    iconClassName: "text-primary",
    headingClassName: "text-primary",
  },
  warning: {
    wrapperClassName: "bg-amber-100",
    iconClassName: "text-amber-600",
    headingClassName: "text-foreground",
  },
  error: {
    wrapperClassName: "bg-red-100",
    iconClassName: "text-red-600",
    headingClassName: "text-foreground",
  },
};

export default function SubscriptionSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { getAuthHeader } = useAuth();
  
  const [status, setStatus] = useState("checking");
  const [paymentData, setPaymentData] = useState(null);
  const sessionId = searchParams.get("session_id");

  useEffect(() => {
    if (sessionId) {
      pollPaymentStatus();
    } else {
      setStatus("error");
    }
  }, [sessionId]);

  const pollPaymentStatus = async (attempts = 0) => {
    const maxAttempts = 10;
    
    if (attempts >= maxAttempts) {
      setStatus("timeout");
      return;
    }

    try {
      const response = await axios.get(`${API_URL}/subscriptions/checkout-status/${sessionId}`, {
        headers: getAuthHeader()
      });

      if (response.data.payment_status === "paid") {
        setStatus("success");
        setPaymentData(response.data);
        return;
      } else if (response.data.status === "expired") {
        setStatus("expired");
        return;
      }

      // Continue polling
      setTimeout(() => pollPaymentStatus(attempts + 1), 2000);
    } catch (error) {
      logger.error("Error checking payment status:", error);
      setTimeout(() => pollPaymentStatus(attempts + 1), 2000);
    }
  };

  return (
    <AppShell theme="provider" className="pb-12" contentClassName="pb-12">
      <div className="page-shell py-8">
        <div className="mx-auto max-w-3xl">
          <section className="page-hero text-center">
            <span className="page-kicker inline-flex">Subscription status</span>
            <h1 className="heading-2 mt-4 text-foreground">Provider plan activation</h1>
            <p className="body-lg mt-3 text-muted-foreground">
              We are confirming your Stripe session and updating your provider subscription status.
            </p>
          </section>

          <Card className="form-shell overflow-hidden">
            <CardContent className="p-8 text-center sm:p-10">
            {status === "checking" && (
              <>
                <Loader2 className="w-16 h-16 text-primary mx-auto mb-6 animate-spin" />
                <h1 className="heading-2 mb-2">Activating Your Subscription</h1>
                <p className="text-muted-foreground">Please wait while we set up your account...</p>
              </>
            )}

            {status === "success" && (
              <>
                <div className={`mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-lg ${stateStyles.success.wrapperClassName}`}>
                  <Crown className={`h-10 w-10 ${stateStyles.success.iconClassName}`} />
                </div>
                <h1 className={`heading-2 mb-2 ${stateStyles.success.headingClassName}`}>Welcome to Premium!</h1>
                <p className="text-muted-foreground mb-6">
                  Your subscription is now active. Enjoy unlimited access to all features!
                </p>
                {paymentData && (
                  <div className="info-tile mb-6 p-4">
                    <p className="text-sm text-muted-foreground">Amount Paid</p>
                    <p className="text-2xl font-bold text-primary">
                      ${paymentData.amount?.toFixed(2)} {paymentData.currency?.toUpperCase()}
                    </p>
                  </div>
                )}
                <div className="flex flex-col gap-3">
                  <Button onClick={() => navigate("/projects")} className="rounded-lg">
                    <Briefcase className="w-4 h-4 mr-2" />
                    Start Bidding on Projects
                  </Button>
                  <Button variant="outline" onClick={() => navigate("/dashboard")} className="rounded-lg">
                    <Home className="w-4 h-4 mr-2" />
                    Go to Dashboard
                  </Button>
                </div>
              </>
            )}

            {status === "expired" && (
              <>
                <div className={`mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-lg ${stateStyles.warning.wrapperClassName}`}>
                  <XCircle className={`h-10 w-10 ${stateStyles.warning.iconClassName}`} />
                </div>
                <h1 className={`heading-2 mb-2 ${stateStyles.warning.headingClassName}`}>Session Expired</h1>
                <p className="text-muted-foreground mb-6">
                  Your payment session has expired. Please try again.
                </p>
                <Button onClick={() => navigate("/subscription")} className="rounded-lg">
                  View Plans
                </Button>
              </>
            )}

            {status === "timeout" && (
              <>
                <div className={`mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-lg ${stateStyles.warning.wrapperClassName}`}>
                  <Loader2 className={`h-10 w-10 ${stateStyles.warning.iconClassName}`} />
                </div>
                <h1 className={`heading-2 mb-2 ${stateStyles.warning.headingClassName}`}>Processing</h1>
                <p className="text-muted-foreground mb-6">
                  We're still processing your subscription. Check your email for confirmation.
                </p>
                <Button onClick={() => navigate("/subscription")} className="rounded-lg">
                  Check Subscription Status
                </Button>
              </>
            )}

            {status === "error" && (
              <>
                <div className={`mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-lg ${stateStyles.error.wrapperClassName}`}>
                  <XCircle className={`h-10 w-10 ${stateStyles.error.iconClassName}`} />
                </div>
                <h1 className={`heading-2 mb-2 ${stateStyles.error.headingClassName}`}>Something Went Wrong</h1>
                <p className="text-muted-foreground mb-6">
                  We couldn't process your subscription. Please try again.
                </p>
                <Button onClick={() => navigate("/subscription")} className="rounded-lg">
                  Try Again
                </Button>
              </>
            )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
