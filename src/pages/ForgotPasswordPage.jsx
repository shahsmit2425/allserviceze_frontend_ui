import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { toast } from "sonner";
import { ArrowLeft, Mail, CheckCircle } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const { forgotPassword } = useAuth();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");

  const handleSendCode = async (e) => {
    e.preventDefault();

    if (!email) {
      toast.error("Please enter your email");
      return;
    }

    setLoading(true);
    try {
      await forgotPassword(email);
      toast.success("If the email exists, a password reset link has been sent");
      setStep(2);
    } catch (error) {
      if (error.response?.status === 429) {
        toast.error("Too many attempts. Please try again later");
      } else {
        toast.error(error.response?.data?.detail || error.message || "Failed to send reset link");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    setLoading(true);
    try {
      await forgotPassword(email);
      toast.success("If the email exists, a new reset link has been sent");
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to resend email");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-transparent flex flex-col">
      <header className="page-shell safe-top-shell py-4">
        <Link
          to="/auth"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to login
        </Link>
      </header>

      <div className="page-shell safe-bottom-shell flex-1 py-6 sm:py-12">
        <div className="mx-auto w-full max-w-md">
          {step === 1 && (
            <>
              <div className="mb-6 text-center sm:mb-8">
                <span className="page-kicker mb-4 inline-flex">Password recovery</span>
                <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-lg bg-primary/10 shadow-sm">
                  <Mail className="w-8 h-8 text-primary" />
                </div>
                <h1 className="font-heading font-bold text-3xl mb-2">Forgot Password?</h1>
                <p className="text-muted-foreground">
                  Enter your email and we'll send you a secure link to reset your password
                </p>
                <p className="text-xs text-muted-foreground mt-3">
                  If you normally sign in with Apple or Google, use that provider instead.
                </p>
              </div>

              <Card className="form-shell border-0">
                <CardHeader>
                  <CardTitle>Reset Password</CardTitle>
                  <CardDescription>
                    You'll receive a secure email link to create a new password
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSendCode} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="you@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </div>

                    <Button
                      type="submit"
                      className="w-full rounded-lg"
                      disabled={loading}
                    >
                      {loading ? "Sending..." : "Send Reset Link"}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </>
          )}

          {step === 2 && (
            <>
              <div className="mb-6 text-center sm:mb-8">
                <span className="page-kicker mb-4 inline-flex">Check your email</span>
                <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-lg bg-primary/10 shadow-sm">
                  <CheckCircle className="w-8 h-8 text-primary" />
                </div>
                <h1 className="font-heading font-bold text-3xl mb-2">Reset Link Sent</h1>
                <div className="glass-panel mx-auto mt-4 max-w-sm px-4 py-3">
                  <p className="text-sm text-muted-foreground">We sent a password reset link to</p>
                  <p className="mt-1 break-all font-semibold text-foreground">{email}</p>
                </div>
              </div>

              <Card className="form-shell border-0">
                <CardHeader>
                  <CardTitle>Finish Password Reset</CardTitle>
                  <CardDescription>
                    Open the link in your email to choose a new password, then return here and sign in.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <Button
                      type="button"
                      className="w-full rounded-lg"
                      onClick={() => navigate("/auth")}
                    >
                      Back to Login
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
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
