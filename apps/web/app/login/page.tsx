"use client";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Mail, ArrowRight, Loader2, KeyRound, ArrowLeft, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { authEnabled } from "@/lib/supabase/config";

export default function LoginPage() {
  return (
    <Suspense>
      <LoginInner />
    </Suspense>
  );
}

function LoginInner() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") ?? "/dashboard";

  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: true },
      });
      if (error) throw error;
      setStep("code");
    } catch (err) {
      setError((err as Error).message || "Couldn't send the code. Try again.");
    } finally {
      setBusy(false);
    }
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.verifyOtp({ email, token: code, type: "email" });
      if (error) throw error;
      router.push(next);
      router.refresh();
    } catch (err) {
      setError((err as Error).message || "Invalid code.");
    } finally {
      setBusy(false);
    }
  }

  async function google() {
    setBusy(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
    });
    if (error) {
      setError(error.message);
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-muted/20">
      <header className="flex h-16 items-center justify-between border-b glass px-6">
        <Link href="/"><Logo /></Link>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/"><ArrowLeft className="h-4 w-4" /> Home</Link>
        </Button>
      </header>

      <div className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-sm animate-fade-up">
          <div className="rounded-2xl border bg-card p-8 shadow-sm">
            <div className="mb-6 text-center">
              <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-primary to-violet-600 text-white shadow-lg shadow-primary/30">
                {step === "email" ? <Mail className="h-6 w-6" /> : <KeyRound className="h-6 w-6" />}
              </div>
              <h1 className="text-xl font-bold tracking-tight">
                {step === "email" ? "Sign in to JobPilot" : "Check your email"}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {step === "email"
                  ? "We'll email you a one-time code — no password needed."
                  : `Enter the 6-digit code sent to ${email}`}
              </p>
            </div>

            {!authEnabled && (
              <div className="mb-4 rounded-lg bg-warning/10 px-3 py-2 text-xs text-warning-foreground">
                Auth isn't enabled on this deployment yet — you can explore the demo without signing in.
              </div>
            )}

            {step === "email" ? (
              <form onSubmit={sendCode} className="space-y-3">
                <Input
                  type="email"
                  required
                  placeholder="you@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoFocus
                />
                <Button type="submit" variant="gradient" className="w-full" disabled={busy || !authEnabled}>
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : (<>Send code <ArrowRight className="h-4 w-4" /></>)}
                </Button>
              </form>
            ) : (
              <form onSubmit={verify} className="space-y-3">
                <Input
                  inputMode="numeric"
                  required
                  placeholder="123456"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                  className="text-center text-lg tracking-[0.4em]"
                  autoFocus
                />
                <Button type="submit" variant="gradient" className="w-full" disabled={busy || code.length < 6}>
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify & continue"}
                </Button>
                <button
                  type="button"
                  className="w-full text-center text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => { setStep("email"); setCode(""); setError(null); }}
                >
                  Use a different email
                </button>
              </form>
            )}

            {step === "email" && (
              <>
                <div className="my-4 flex items-center gap-3 text-xs text-muted-foreground">
                  <div className="h-px flex-1 bg-border" /> or <div className="h-px flex-1 bg-border" />
                </div>
                <Button variant="outline" className="w-full" onClick={google} disabled={busy || !authEnabled}>
                  <GoogleIcon /> Continue with Google
                </Button>
              </>
            )}

            {error && <p className="mt-3 text-center text-xs text-destructive">{error}</p>}
          </div>

          <p className="mt-4 flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5" /> Passwordless & secure. We never post on your behalf.
          </p>
        </div>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1Z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z" />
      <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84Z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38Z" />
    </svg>
  );
}
