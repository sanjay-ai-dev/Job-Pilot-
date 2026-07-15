import Link from "next/link";
import {
  ArrowRight,
  Sparkles,
  Gauge,
  Radar,
  Mail,
  Wand2,
  ShieldCheck,
  Zap,
  Check,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Logo } from "@/components/brand";
import { LandingFeedPreview } from "@/components/landing-feed-preview";

const FEATURES = [
  {
    icon: Gauge,
    title: "ATS score in seconds",
    body: "Upload a PDF or DOCX and get a 0–100 ATS score with section-by-section fixes tuned to your target role.",
  },
  {
    icon: Radar,
    title: "The whole web, one feed",
    body: "We continuously aggregate jobs from legitimate sources and rank them by an AI match score — newest first, always fresh.",
  },
  {
    icon: Wand2,
    title: "Assisted Apply",
    body: "One click prepares a tailored resume, cover letter, and screening answers. You review and submit — we never auto-submit.",
  },
  {
    icon: Mail,
    title: "AI recruiter outreach",
    body: "Find the right recruiter and send a sharp, personalised email from your own verified address — no spam, real replies.",
  },
  {
    icon: Zap,
    title: "Act instantly",
    body: "Apply Now deep-links, Call the recruiter, or save to your pipeline. Every job, every action, one tap away.",
  },
  {
    icon: ShieldCheck,
    title: "Compliant by design",
    body: "Legitimate aggregator APIs, verified sender identities, daily caps, and a human click on every application.",
  },
];

const STEPS = [
  { n: "01", title: "Tell us your target", body: "Pick up to 3 roles, your locations, experience and expected CTC." },
  { n: "02", title: "Upload your resume", body: "Get your ATS score and the top 5 fixes that move the needle." },
  { n: "03", title: "Your feed fills up", body: "Matching jobs land within ~2 minutes and refresh every 4 hours." },
  { n: "04", title: "Take action", body: "Apply, email, call or assisted-apply — track everything in one pipeline." },
];

const PLANS = [
  {
    id: "free",
    name: "Free",
    price: "₹0",
    tagline: "See your score, taste the feed",
    features: ["ATS score + fixes", "10 matches / day", "Daily digest email", "1 saved search"],
    cta: "Start free",
    highlight: false,
  },
  {
    id: "pro",
    name: "Pro",
    price: "₹499",
    tagline: "For an active job hunt",
    features: [
      "Unlimited matches, full AI rerank",
      "10 recruiter emails / day",
      "5 Assisted Applies / day",
      "3 saved searches",
      "5 ATS re-scores / month",
    ],
    cta: "Go Pro",
    highlight: true,
  },
  {
    id: "power",
    name: "Power",
    price: "₹999",
    tagline: "Maximum reach & speed",
    features: [
      "Everything in Pro",
      "30 recruiter emails / day",
      "20 Assisted Applies / day",
      "5 saved searches",
      "Unlimited re-scores",
    ],
    cta: "Get Power",
    highlight: false,
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <header className="sticky top-0 z-40 border-b border-border/60 glass">
        <div className="container flex h-16 items-center justify-between">
          <Logo />
          <nav className="hidden items-center gap-8 text-sm font-medium text-muted-foreground md:flex">
            <a href="#features" className="transition-colors hover:text-foreground">Features</a>
            <a href="#how" className="transition-colors hover:text-foreground">How it works</a>
            <a href="#pricing" className="transition-colors hover:text-foreground">Pricing</a>
          </nav>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/login">Sign in</Link>
            </Button>
            <Button variant="gradient" size="sm" asChild>
              <Link href="/onboarding">Get started</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-grid opacity-40 [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)]" />
        <div className="pointer-events-none absolute -top-40 left-1/2 h-96 w-[46rem] -translate-x-1/2 rounded-full bg-primary/20 blur-3xl" />
        <div className="container relative grid items-center gap-12 py-20 lg:grid-cols-2 lg:py-28">
          <div className="animate-fade-up">
            <Badge variant="default" className="mb-5 gap-1.5 px-3 py-1">
              <Sparkles className="h-3.5 w-3.5" /> Built for Indian job seekers
            </Badge>
            <h1 className="text-balance text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
              Your <span className="text-gradient">AI copilot</span> for the entire job hunt.
            </h1>
            <p className="mt-6 max-w-xl text-pretty text-lg text-muted-foreground">
              Upload your resume, fix your ATS score, and let JobPilot surface the freshest matching jobs
              across the web — then apply, email recruiters, and prep tailored applications in one tap.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button size="lg" variant="gradient" asChild>
                <Link href="/onboarding">
                  Score my resume <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/dashboard">See a live feed</Link>
              </Button>
            </div>
            <div className="mt-8 flex items-center gap-5 text-sm text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <div className="flex -space-x-2">
                  {["bg-rose-400", "bg-emerald-400", "bg-sky-400", "bg-violet-400"].map((c) => (
                    <div key={c} className={`h-7 w-7 rounded-full border-2 border-background ${c}`} />
                  ))}
                </div>
                <span>12,000+ seekers</span>
              </div>
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
                ))}
                <span className="ml-1">4.8/5</span>
              </div>
            </div>
          </div>

          <div className="animate-fade-up [animation-delay:120ms]">
            <LandingFeedPreview />
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="container py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Everything you need to land the interview</h2>
          <p className="mt-4 text-muted-foreground">
            From a sharper resume to the recruiter's inbox — JobPilot handles the busywork so you focus on the conversations.
          </p>
        </div>
        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="group rounded-2xl border bg-card p-6 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/5"
            >
              <div className="mb-4 grid h-11 w-11 place-items-center rounded-xl bg-accent text-accent-foreground transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="text-base font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="border-y bg-muted/30 py-20">
        <div className="container">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Four steps to your next role</h2>
          </div>
          <div className="mt-14 grid gap-6 md:grid-cols-4">
            {STEPS.map((s, i) => (
              <div key={s.n} className="relative">
                <div className="text-5xl font-bold text-primary/15">{s.n}</div>
                <h3 className="mt-2 font-semibold">{s.title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{s.body}</p>
                {i < STEPS.length - 1 && (
                  <ArrowRight className="absolute -right-3 top-8 hidden h-5 w-5 text-border md:block" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="container py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Simple, honest pricing</h2>
          <p className="mt-4 text-muted-foreground">Start free. Upgrade only when you're actively applying.</p>
        </div>
        <div className="mt-14 grid gap-6 lg:grid-cols-3">
          {PLANS.map((p) => (
            <div
              key={p.id}
              className={
                "relative rounded-2xl border bg-card p-8 shadow-sm transition-all hover:shadow-lg " +
                (p.highlight ? "border-primary ring-2 ring-primary/30 lg:-translate-y-3" : "")
              }
            >
              {p.highlight && (
                <Badge variant="default" className="absolute -top-3 left-1/2 -translate-x-1/2 shadow">
                  Most popular
                </Badge>
              )}
              <h3 className="text-lg font-semibold">{p.name}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{p.tagline}</p>
              <div className="mt-5 flex items-baseline gap-1">
                <span className="text-4xl font-bold">{p.price}</span>
                <span className="text-muted-foreground">/mo</span>
              </div>
              <ul className="mt-6 space-y-3 text-sm">
                {p.features.map((feat) => (
                  <li key={feat} className="flex items-start gap-2.5">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                    <span className="text-muted-foreground">{feat}</span>
                  </li>
                ))}
              </ul>
              <Button
                className="mt-8 w-full"
                variant={p.highlight ? "gradient" : "outline"}
                asChild
              >
                <Link href="/onboarding">{p.cta}</Link>
              </Button>
            </div>
          ))}
        </div>
      </section>

      {/* Compliance strip */}
      <section className="border-t bg-muted/30 py-12">
        <div className="container flex flex-col items-center gap-4 text-center">
          <ShieldCheck className="h-8 w-8 text-success" />
          <h3 className="text-xl font-semibold">Ethical by architecture</h3>
          <p className="max-w-2xl text-sm text-muted-foreground">
            JobPilot uses legitimate aggregator APIs, never auto-submits on LinkedIn or Naukri, and only sends outreach
            from your own verified email with per-day caps. Assisted Apply always ends with a human click.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t">
        <div className="container flex flex-col items-center justify-between gap-4 py-8 sm:flex-row">
          <Logo />
          <p className="text-sm text-muted-foreground">© {new Date().getFullYear()} JobPilot. Made in India 🇮🇳</p>
          <div className="flex gap-6 text-sm text-muted-foreground">
            <a href="#" className="hover:text-foreground">Privacy</a>
            <a href="#" className="hover:text-foreground">Terms</a>
            <a href="#" className="hover:text-foreground">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
