/**
 * OAuthCallbackPage
 *
 * Compatibility page for legacy auth callback URLs.
 *
 * The active Google sign-in flow now completes through Firebase in AuthPage,
 * but older native/web redirects may still land here with a backend session
 * cookie and a CSRF token.
 */
import { useEffect, useState, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Button } from "../components/ui/button";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import axios from "axios";
import { clearAuthSessionSource } from "@/mobile/utils/authSessionSource";

const API_URL = `${import.meta.env.VITE_BACKEND_URL || "http://localhost:5000"}/api`;

export default function OAuthCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { refreshUser } = useAuth();
  const [error, setError] = useState(null);
  // Guard: prevent the effect running twice when both ASWebAuthenticationSession
  // (AuthPage) and appUrlOpen (App.js) navigate here in the same render cycle.
  const handledRef = useRef(false);

  useEffect(() => {
    if (handledRef.current) return;
    handledRef.current = true;
    const handle = async () => {
      clearAuthSessionSource();

      const socialSetup = searchParams.get("social_setup");
      if (socialSetup === "true") {
        setError("This social sign-in flow has been retired. Please sign in again from the main auth page.");
        return;
      }

      const errorParam = searchParams.get("error");
      if (errorParam) {
        setError(`Sign-in failed: ${errorParam.replace(/_/g, " ")}`);
        return;
      }

      const nativeSession = searchParams.get("native_session");
      if (nativeSession) {
        setError("This native sign-in callback is no longer supported. Please sign in again.");
        return;
      }

      const csrf = searchParams.get("csrf");

      // Seed CSRF into storage so the /auth/me request inside refreshUser() is
      // authorised. refreshUser() will then save to SecureStorage on native.
      if (csrf) {
        const isNative = window.Capacitor?.isNativePlatform?.() ?? false;
        const storage = isNative ? localStorage : sessionStorage;
        storage.setItem("servicetones_csrf", csrf);
      }

      try {
        // Load the authenticated user (the session cookie was already set by the backend)
        await refreshUser(); // ← saves to SecureStorage on native automatically
        toast.success("Welcome! You are now signed in.");
        navigate("/dashboard", { replace: true });
      } catch {
        setError("We could not load your account. Please try signing in again.");
      }
    };

    handle();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (error) {
    return (
      <div className="min-h-screen bg-transparent px-4 py-8" data-theme="customer">
        <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-xl items-center justify-center">
          <div className="w-full rounded-2xl border border-white/70 bg-white/88 p-8 text-center shadow-xl shadow-deep-navy-800/5 backdrop-blur-sm sm:p-10">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">Social sign in</p>
            <h1 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-foreground">We could not finish sign in</h1>
            <p className="mt-4 text-sm leading-7 text-destructive">{error}</p>
            <Button onClick={() => navigate("/auth", { replace: true })} className="mt-8 rounded-lg">
              Back to sign in
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent px-4 py-8" data-theme="customer">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-xl items-center justify-center">
        <div className="w-full rounded-2xl border border-white/70 bg-white/88 p-8 text-center shadow-xl shadow-deep-navy-800/5 backdrop-blur-sm sm:p-10">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground">Social sign in</p>
          <h1 className="mt-4 text-3xl font-semibold tracking-[-0.04em] text-foreground">Completing your account</h1>
          <div className="mt-8 flex flex-col items-center gap-3 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm">Completing sign in…</p>
          </div>
        </div>
      </div>
    </div>
  );
}
