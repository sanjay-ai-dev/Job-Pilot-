import { MapPin, Briefcase, Sparkles } from "lucide-react";
import { ScoreRing, MatchBadge } from "@/components/score-ring";
import { Badge } from "@/components/ui/badge";
import { brandColor, initials } from "@/lib/utils";

const PREVIEW_JOBS = [
  { title: "Senior AI Engineer", company: "Sarvam AI", loc: "Bengaluru", salary: "₹32–55 LPA", score: 92, ago: "2h ago", reason: "Strong RAG + Python overlap; 4y exp fits the 3–5y ask." },
  { title: "Full Stack Engineer", company: "Razorpay", loc: "Remote", salary: "₹24–40 LPA", score: 84, ago: "5h ago", reason: "Next.js + PostgreSQL match; strong product-eng signal." },
];

export function LandingFeedPreview() {
  return (
    <div className="relative">
      {/* ATS score floating card */}
      <div className="absolute -left-6 -top-8 z-20 hidden animate-fade-up rounded-2xl border bg-card p-4 shadow-xl [animation-delay:300ms] sm:block">
        <div className="flex items-center gap-3">
          <ScoreRing value={82} size={76} stroke={7} />
          <div>
            <div className="text-xs font-medium text-muted-foreground">ATS Score</div>
            <div className="text-sm font-semibold">Interview-ready</div>
            <div className="mt-1 flex items-center gap-1 text-xs text-success">
              <Sparkles className="h-3 w-3" /> +14 after fixes
            </div>
          </div>
        </div>
      </div>

      {/* Feed card */}
      <div className="rounded-3xl border bg-card p-5 shadow-2xl shadow-primary/10">
        <div className="mb-4 flex items-center justify-between">
          <div className="text-sm font-semibold">Your matches</div>
          <Badge variant="secondary" className="text-[11px]">Newest first</Badge>
        </div>
        <div className="space-y-3">
          {PREVIEW_JOBS.map((j) => (
            <div key={j.company} className="rounded-2xl border bg-background p-4 transition-shadow hover:shadow-md">
              <div className="flex items-start gap-3">
                <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl text-sm font-bold text-white ${brandColor(j.company)}`}>
                  {initials(j.company)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate font-semibold">{j.title}</div>
                      <div className="text-sm text-muted-foreground">{j.company}</div>
                    </div>
                    <MatchBadge score={j.score} />
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{j.loc}</span>
                    <span className="flex items-center gap-1"><Briefcase className="h-3 w-3" />{j.salary}</span>
                    <span>{j.ago}</span>
                  </div>
                  <p className="mt-2 rounded-lg bg-accent/50 px-2.5 py-1.5 text-xs text-accent-foreground">
                    <Sparkles className="mr-1 inline h-3 w-3" />{j.reason}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
