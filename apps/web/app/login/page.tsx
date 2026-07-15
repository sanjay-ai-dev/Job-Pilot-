"use client";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Mail, ArrowRight, Loader2, KeyRound, ArrowLeft, ShieldCheck, Lock } from "lucide-react";
import { Logo } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { authEnabled } from "@/lib/supabase/config";
import { bootstrapProfile } from "./actions";
import { cn } from "@/lib/utils";

export default function LoginPage() {
  return (
    <Suspense>
      <LoginInner />
    </Suspense>
  );
}

type View = "password" | "code-email" | "code-verify";

function LoginInner() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") ?? "/dashboard";

  const [view, setView] = useState<View>("password");
  const [signup, setSignup] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function afterAuth() {
    await bootstrapProfile().catch(() => {});
    router.push(next);
    router.refresh();
  }

  async function passwordSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setInfo(null);
    const supabase = createClient();
    try {
      if (signup) {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        if (!data.session) {
          setInfo("Account created. If email confirmation is on, confirm via the email; otherwise just sign in.");
          setSignup(false);
          return;
        }
        await afterAuth();
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        await afterAuth();
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
      if (error) throw error;
      setView("code-verify");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.verifyOtp({ email, token: code, type: "email" });
      if (error) throw error;
      await afterAuth();
    } catch (err) {
      setError((err as Error).message);
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

  const title =
    view === "code-verify" ? "Check your email" : signup ? "Create your account" : "Sign in to JobPilot";
  const subtitle =
    view === "code-verify"
      ? `Enter the 6-digit code sent to ${email}`
      : signup
        ? "Use an email and password to get started."
        : "Welcome back — sign in to your copilot.";

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
                {view === "code-verify" ? <KeyRound className="h-6 w-6" /> : <Lock className="h-6 w-6" />}
              </div>
              <h1 className="text-xl font-bold tracking-tight">{title}</h1>
              <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
            </div>

            {!authEnabled && (
              <div className="mb-4 rounded-lg bg-warning/10 px-3 py-2 text-xs text-warning-foreground">
                Auth isn&apos;t enabled on this deployment yet — you can explore the demo without signing in.
              </div>
            )}

            {view === "password" && (
              <form onSubmit={passwordSubmit} className="space-y-3">
                <Input type="email" required placeholder="you@email.com" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus />
                <Input type="password" required placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} />
                <Button type="submit" variant="gradient" className="w-full" disabled={busy || !authEnabled}>
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : (<>{signup ? "Create account" : "Sign in"} <ArrowRight className="h-4 w-4" /></>)}
                </Button>
                <button type="button" className="w-full text-center text-xs text-muted-foreground hover:text-foreground" onClick={() => { setSignup((s) => !s); setError(null); setInfo(null); }}>
                  {signup ? "Already have an account? Sign in" : "New here? Create an account"}
                </button>
              </form>
            )}

            {view === "code-email" && (
              <form onSubmit={sendCode} className="space-y-3">
                <Input type="email" required placeholder="you@email.com" value={email} onChange={(e) => setEmail(e.target.value)} autoFocus />
                <Button type="submit" variant="gradient" className="w-full" disabled={busy || !authEnabled}>
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : (<>Email me a code <Mail className="h-4 w-4" /></>)}
                </Button>
              </form>
            )}

            {view === "code-verify" && (
              <form onSubmit={verifyCode} className="space-y-3">
                <Input inputMode="numeric" required placeholder="123456" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} className="text-center text-lg tracking-[0.4em]" autoFocus />
                <Button type="submit" variant="gradient" className="w-full" disabled={busy || code.length < 6}>
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify & continue"}
                </Button>
              </form>
            )}

            {view !== "code-verify" && (
              <>
                <div className="my-4 flex items-center gap-3 text-xs text-muted-foreground">
                  <div className="h-px flex-1 bg-border" /> or <div className="h-px flex-1 bg-border" />
                </div>
                <div className="space-y-2">
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => { setView(view === "password" ? "code-email" : "password"); setError(null); setInfo(null); }}
                    disabled={busy}
                  >
                    {view === "password" ? (<><Mail className="h-4 w-4" /> Email me a code instead</>) : (<><Lock className="h-4 w-4" /> Use a password instead</>)}
                  </Button>
                  <Button variant="outline" className="w-full" onClick={google} disabled={busy || !authEnabled}>
                    <GoogleIcon /> Continue with Google
                  </Button>
                </div>
              </>
            )}

            {view === "code-verify" && (
              <button type="button" className="mt-3 w-full text-center text-xs text-muted-foreground hover:text-foreground" onClick={() => { setView("code-email"); setCode(""); setError(null); }}>
                Use a different email
              </button>
            )}

            {info && <p className="mt-3 text-center text-xs text-primary">{info}</p>}
            {error && <p className="mt-3 text-center text-xs text-destructive">{error}</p>}
          </div>

          <p className={cn("mt-4 flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground")}>
            <ShieldCheck className="h-3.5 w-3.5" /> Secure sign-in. We never post on your behalf.
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
