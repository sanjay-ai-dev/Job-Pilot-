"use client";
import { useMemo, useState } from "react";
import {
  MapPin,
  IndianRupee,
  ExternalLink,
  Mail,
  Phone,
  Wand2,
  Bookmark,
  X,
  Sparkles,
  Building2,
  Wifi,
} from "lucide-react";
import type { MatchView } from "@jobpilot/core/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MatchBadge } from "@/components/score-ring";
import { cn, timeAgo, formatLpa, initials, brandColor } from "@/lib/utils";
import { useApp } from "@/lib/store";
import { findRecruiterContact } from "@/lib/data";
import { EmailModal } from "./email-modal";
import { AssistedModal } from "./assisted-modal";
import { PaywallModal } from "./paywall-modal";

const SOURCE_LABEL: Record<string, string> = {
  jsearch: "JSearch",
  adzuna: "Adzuna",
  apify_linkedin: "LinkedIn",
  apify_naukri: "Naukri",
};

export function JobCard({ match }: { match: MatchView }) {
  const { setStatus, plan, pushToast } = useApp();
  const [emailOpen, setEmailOpen] = useState(false);
  const [assistOpen, setAssistOpen] = useState(false);
  const [paywall, setPaywall] = useState<null | "email" | "assisted">(null);

  const job = match.job;
  const contact = useMemo(() => findRecruiterContact(job.company), [job.company]);
  const salary = formatLpa(job.salaryMinLpa, job.salaryMaxLpa);
  const applied = match.status === "applied" || match.status === "emailed";

  function apply() {
    setStatus(match.id, "applied");
    pushToast(`Marked "${job.title}" as applied`, {
      label: "Undo",
      run: () => setStatus(match.id, "new"),
    });
    // Real: window.open(job.applyUrl, "_blank")
  }

  function save() {
    setStatus(match.id, match.status === "saved" ? "new" : "saved");
  }

  function dismiss() {
    setStatus(match.id, "dismissed");
    pushToast(`Dismissed "${job.title}"`, { label: "Undo", run: () => setStatus(match.id, "new") });
  }

  function onEmail() {
    if (plan === "free") return setPaywall("email");
    setEmailOpen(true);
  }
  function onAssist() {
    if (plan === "free") return setPaywall("assisted");
    setAssistOpen(true);
  }

  return (
    <div
      className={cn(
        "group rounded-2xl border bg-card p-5 shadow-sm transition-all hover:border-primary/30 hover:shadow-md",
        match.status === "saved" && "ring-1 ring-primary/30",
      )}
    >
      <div className="flex gap-4">
        <div
          className={cn(
            "grid h-12 w-12 shrink-0 place-items-center rounded-xl text-sm font-bold text-white",
            brandColor(job.company),
          )}
        >
          {initials(job.company)}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="truncate text-base font-semibold leading-snug">{job.title}</h3>
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Building2 className="h-3.5 w-3.5" />
                {job.company}
              </div>
            </div>
            <MatchBadge score={match.matchScore} />
          </div>

          {/* Meta chips */}
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              {job.locations.join(", ")}
            </span>
            {job.remote && (
              <span className="flex items-center gap-1 text-success">
                <Wifi className="h-3.5 w-3.5" /> Remote
              </span>
            )}
            {salary && (
              <span className="flex items-center gap-1">
                <IndianRupee className="h-3.5 w-3.5" />
                {salary.replace("₹", "")}
              </span>
            )}
            <Badge variant="source" className="px-2 py-0">
              {SOURCE_LABEL[job.source] ?? job.source}
            </Badge>
            <span>{timeAgo(job.postedAt)}</span>
          </div>

          {/* Why this matches */}
          <p className="mt-3 flex items-start gap-1.5 rounded-lg bg-accent/50 px-3 py-2 text-xs text-accent-foreground">
            <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>{match.matchReason}</span>
          </p>

          {/* Actions */}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Button size="sm" variant={applied ? "success" : "gradient"} onClick={apply}>
              {applied ? "Applied ✓" : (<>Apply Now <ExternalLink className="h-3.5 w-3.5" /></>)}
            </Button>
            <Button size="sm" variant="outline" onClick={onEmail}>
              <Mail className="h-3.5 w-3.5" /> Email
            </Button>
            {contact?.phone ? (
              <Button size="sm" variant="outline" asChild>
                <a href={`tel:${contact.phone.replace(/\s/g, "")}`}>
                  <Phone className="h-3.5 w-3.5" /> Call
                </a>
              </Button>
            ) : (
              <Button size="sm" variant="outline" disabled title="No recruiter phone found">
                <Phone className="h-3.5 w-3.5" /> Call
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={onAssist}>
              <Wand2 className="h-3.5 w-3.5" /> Assisted Apply
            </Button>
            <div className="ml-auto flex items-center gap-1">
              <Button
                size="icon"
                variant="ghost"
                className={cn("h-8 w-8", match.status === "saved" && "text-primary")}
                onClick={save}
                title="Save"
              >
                <Bookmark className={cn("h-4 w-4", match.status === "saved" && "fill-current")} />
              </Button>
              <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground" onClick={dismiss} title="Dismiss">
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <EmailModal open={emailOpen} onOpenChange={setEmailOpen} match={match} contact={contact} />
      <AssistedModal open={assistOpen} onOpenChange={setAssistOpen} match={match} />
      <PaywallModal feature={paywall} onClose={() => setPaywall(null)} />
    </div>
  );
}
