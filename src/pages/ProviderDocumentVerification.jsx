import { useState, useEffect } from "react";
import logger from "@/utils/logger";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { useAuth } from "../context/AuthContext";
import { toast } from "sonner";
import axios from "axios";
import { 
  Shield, CheckCircle, Loader2, AlertCircle, 
  FileText, Camera, Clock, ExternalLink, RefreshCw 
} from "lucide-react";

const API_URL = `${import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'}/api`;

export default function ProviderDocumentVerification() {
  const navigate = useNavigate();
  const { user, getAuthHeader, refreshUser } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [verificationUrl, setVerificationUrl] = useState(null);
  const [status, setStatus] = useState(null);
  const [checking, setChecking] = useState(true);
  const [pollingInterval, setPollingInterval] = useState(null);

  useEffect(() => {
    checkVerificationStatus();
    
    // Cleanup polling on unmount
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, []);

  const checkVerificationStatus = async () => {
    try {
      const response = await axios.get(`${API_URL}/providers/verification/status`, {
        headers: getAuthHeader()
      });
      setStatus(response.data);
      
      // If already verified, redirect to pending approval
      if (response.data.document_verified) {
        toast.success("Already verified!");
        navigate("/pending-approval");
      }
    } catch (error) {
      logger.error("Failed to check status:", error);
    } finally {
      setChecking(false);
    }
  };

  const startVerification = async (isRetry = false) => {
    setLoading(true);
    
    // Clear existing polling if any
    if (pollingInterval) {
      clearInterval(pollingInterval);
      setPollingInterval(null);
    }
    
    // Reset URL to force new session
    setVerificationUrl(null);
    
    try {
      const response = await axios.post(
        `${API_URL}/providers/verification/create-session`,
        {},
        { headers: getAuthHeader() }
      );
      
      // Open Stripe verification in new window
      const newUrl = response.data.url;
      setVerificationUrl(newUrl);
      window.open(newUrl, '_blank', 'noopener,noreferrer,width=600,height=800');
      
      if (isRetry) {
        toast.success("New verification session created! Complete in the new window.");
      } else {
        toast.success("Verification started! Complete the process in the new window.");
      }
      
      // Start polling for verification status
      startStatusPolling();
    } catch (error) {
      toast.error(error.response?.data?.detail || "Failed to start verification");
      setLoading(false);
    }
  };

  const startStatusPolling = () => {
    setLoading(false);
    
    const interval = setInterval(async () => {
      try {
        const response = await axios.get(`${API_URL}/providers/verification/status`, {
          headers: getAuthHeader()
        });
        
        if (response.data.document_verified) {
          clearInterval(interval);
          setPollingInterval(null);
          await refreshUser();
          toast.success("Identity verified! Redirecting...");
          setTimeout(() => navigate("/pending-approval"), 2000);
        } else if (response.data.stripe_verification_status === 'requires_input') {
          // Update status to show error
          setStatus(response.data);
        }
      } catch (error) {
        logger.error("Polling error:", error);
      }
    }, 5000); // Check every 5 seconds

    setPollingInterval(interval);
    
    // Stop polling after 15 minutes
    setTimeout(() => {
      clearInterval(interval);
      setPollingInterval(null);
    }, 15 * 60 * 1000);
  };

  const handleRetry = () => {
    startVerification(true);
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background" data-theme="provider">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent" data-theme="provider">
      <div className="page-shell safe-top-shell safe-bottom-shell py-6 sm:py-8">
        <section className="page-hero mb-5 sm:mb-6">
          <div className="relative grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div>
              <span className="page-kicker">
                <Shield className="h-3.5 w-3.5" /> Provider verification
              </span>
              <h1 className="heading-2 mt-4 text-foreground">Verify your identity with a cleaner mobile flow</h1>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
                Complete the final provider setup step without the old oversized desktop card layout getting in the way on iPhone.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <span className="info-chip">Step 2 of 2</span>
                <span className="info-chip">Powered by Stripe Identity</span>
                <span className="info-chip">2 to 3 minute flow</span>
              </div>
            </div>

            <div className="hidden lg:block glass-panel p-5">
              <div className="rounded-lg border border-white/70 bg-white/75 p-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">Current status</p>
                <p className="mt-2 text-xl font-semibold tracking-[-0.03em] text-foreground">
                  {status?.document_verified ? "Verified" : status?.stripe_verification_status === 'requires_input' ? "Retry needed" : verificationUrl ? "In progress" : "Ready to begin"}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {status?.verification_submitted_at
                    ? `Last attempt ${new Date(status.verification_submitted_at).toLocaleString()}`
                    : "Start the identity check and return here while we monitor completion."}
                </p>
              </div>
            </div>
          </div>
        </section>

        <Card className="form-shell border-0">
          <CardHeader>
            <CardTitle>Document Verification Required</CardTitle>
            <CardDescription>
              We use Stripe Identity to securely verify your government-issued ID
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Test Mode Instructions */}
            {import.meta.env.VITE_ENVIRONMENT === 'dev' && (
              <div className="form-section border-sky-100 bg-sky-50/90">
                <div className="flex gap-3">
                  <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-blue-900 mb-2">🧪 Test Mode Instructions</h4>
                    <div className="text-sm text-blue-800 space-y-2">
                      <p><strong>Step 1:</strong> Click "Start Identity Verification" below</p>
                      <p><strong>Step 2:</strong> In the Stripe window, select <strong>"Verification success"</strong> from the dropdown</p>
                      <p><strong>Step 3:</strong> Click <strong>"Submit"</strong></p>
                      <p className="text-xs mt-2 opacity-75 italic">
                        ℹ️ No need to upload real documents in test mode - just select the result you want!
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* What You'll Need (Production) */}
            {import.meta.env.VITE_ENVIRONMENT !== 'dev' && (
              <div className="form-section">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  What you'll need:
                </h3>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                    <span>A government-issued ID (Driver's License, Passport, or State ID)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Camera className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                    <span>A device with a camera for ID photo and selfie</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Clock className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                    <span>About 2-3 minutes to complete the process</span>
                  </li>
                </ul>
              </div>
            )}

            {/* Process Steps (Production) */}
            {import.meta.env.VITE_ENVIRONMENT !== 'dev' && (
              <div className="form-section space-y-3">
                <h3 className="font-semibold">Verification Process:</h3>
                <div className="grid gap-3">
                  <div className="flex gap-3 items-start">
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 text-primary font-semibold flex-shrink-0">
                      1
                    </div>
                    <div>
                      <p className="font-medium">Take a photo of your ID</p>
                      <p className="text-sm text-muted-foreground">Front and back of your document</p>
                    </div>
                  </div>
                  <div className="flex gap-3 items-start">
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 text-primary font-semibold flex-shrink-0">
                      2
                    </div>
                    <div>
                      <p className="font-medium">Take a selfie</p>
                      <p className="text-sm text-muted-foreground">To match with your ID photo</p>
                    </div>
                  </div>
                  <div className="flex gap-3 items-start">
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 text-primary font-semibold flex-shrink-0">
                      3
                    </div>
                    <div>
                      <p className="font-medium">Instant verification</p>
                      <p className="text-sm text-muted-foreground">Get approved and start working</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Security Info */}
            <div className="form-section border-emerald-200 bg-emerald-50/90">
              <div className="flex gap-3">
                <Shield className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-green-900 mb-1">Your data is secure</h4>
                  <p className="text-sm text-green-800">
                    We use Stripe Identity, a trusted third-party service that securely processes your documents. Your information is encrypted and never stored on our servers.
                  </p>
                </div>
              </div>
            </div>

            {/* Error Display */}
            {status?.stripe_verification_status === 'requires_input' && (
              <div className="form-section border-amber-100 bg-amber-50/90">
                <div className="flex gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-amber-900 mb-1">Verification Failed - Action Required</h4>
                    <p className="text-sm text-amber-800 mb-2">
                      Your document could not be verified. Common reasons:
                    </p>
                    <ul className="text-sm text-amber-800 list-disc list-inside space-y-1 mb-3">
                      <li>Photo quality was too low or blurry</li>
                      <li>ID document was not fully visible</li>
                      <li>Selfie didn't match the ID photo</li>
                      {import.meta.env.VITE_ENVIRONMENT === 'dev' && (
                        <li><strong>Test Mode:</strong> Make sure to select "Verification success" from the dropdown</li>
                      )}
                    </ul>
                    <p className="text-sm text-amber-800 font-medium">
                      Click "Start New Verification" below to try again.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="mobile-form-tray sticky bottom-3 z-20 space-y-3 sm:static sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none">
              {verificationUrl && !status?.stripe_verification_status ? (
                <>
                  <Button
                    className="w-full"
                    variant="outline"
                    onClick={handleRetry}
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Creating New Session...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Start New Verification
                      </>
                    )}
                  </Button>
                  <p className="text-sm text-center text-muted-foreground">
                    Waiting for verification completion... or start a new session above
                  </p>
                </>
              ) : (
                <Button
                  className="w-full"
                  size="lg"
                  onClick={() => startVerification(false)}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Starting Verification...
                    </>
                  ) : status?.stripe_verification_status === 'requires_input' ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Start New Verification
                    </>
                  ) : (
                    <>
                      <Shield className="w-4 h-4 mr-2" />
                      Start Identity Verification
                    </>
                  )}
                </Button>
              )}
            </div>

            {status?.verification_submitted_at && !status?.document_verified && (
              <p className="text-sm text-center text-muted-foreground">
                Last attempt: {new Date(status.verification_submitted_at).toLocaleString()}
              </p>
            )}
          </CardContent>
        </Card>

        {/* FAQ */}
        <Card className="mt-6 glass-panel border-0">
          <CardContent className="pt-6">
            <h3 className="font-semibold mb-3">Frequently Asked Questions</h3>
            <div className="space-y-3 text-sm">
              <div>
                <p className="font-medium">Why is this required?</p>
                <p className="text-muted-foreground">Identity verification ensures the safety and trust of our platform for both providers and customers.</p>
              </div>
              <div>
                <p className="font-medium">How long does it take?</p>
                <p className="text-muted-foreground">The verification process usually takes 2-3 minutes, and approval is typically instant.</p>
              </div>
              <div>
                <p className="font-medium">What if the window closed or link expired?</p>
                <p className="text-muted-foreground">Just click "Start New Verification" to create a fresh session. Previous attempts won't affect your new verification.</p>
              </div>
              {import.meta.env.VITE_ENVIRONMENT === 'dev' && (
                <div>
                  <p className="font-medium">Test Mode: How do I pass verification?</p>
                  <p className="text-muted-foreground">In the Stripe window, simply select "Verification success" from the dropdown and click Submit. No real documents needed!</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
