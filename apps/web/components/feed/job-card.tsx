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
  ChevronDown,
  ChevronUp,
  ShieldCheck,
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
  const [expanded, setExpanded] = useState(false);

  const job = match.job;
  const contact = useMemo(() => findRecruiterContact(job.company), [job.company]);
  const salary = formatLpa(job.salaryMinLpa, job.salaryMaxLpa);
  const applied = match.status === "applied" || match.status === "emailed";

  function apply() {
    if (!job.applyUrl) {
      pushToast("No application link on this posting yet");
      return;
    }
    // Open the real posting first so we mark applied only when the user actually
    // gets to the destination. Popup blockers require this to be inside the
    // click handler (no awaits before window.open).
    const opened = window.open(job.applyUrl, "_blank", "noopener,noreferrer");
    if (!opened) {
      pushToast("Popup blocked — allow popups and try again");
      return;
    }
    setStatus(match.id, "applied");
    pushToast(`Opened ${job.company} — mark applied?`, {
      label: "Not applied",
      run: () => setStatus(match.id, "new"),
    });
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

          {/* Details toggle */}
          {job.description && (
            <button
              onClick={() => setExpanded((v) => !v)}
              className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              {expanded ? (
                <>Hide details <ChevronUp className="h-3.5 w-3.5" /></>
              ) : (
                <>Read job description <ChevronDown className="h-3.5 w-3.5" /></>
              )}
            </button>
          )}
          {expanded && job.description && (
            <div className="mt-2 animate-fade-up space-y-2 rounded-lg border bg-muted/30 p-3">
              <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Job description</div>
              <p className="whitespace-pre-line text-sm leading-relaxed text-foreground">
                {job.description}
              </p>
              {job.applyUrl && (
                <a
                  href={job.applyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 pt-1 text-xs font-medium text-primary hover:underline"
                >
                  View full posting on {SOURCE_LABEL[job.source] ?? job.source} <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant={applied ? "success" : "gradient"}
              onClick={apply}
              disabled={!applied && !job.applyUrl}
              title={!job.applyUrl ? "No application link on this posting" : undefined}
            >
              {applied ? "Applied ✓" : (<>Apply on {SOURCE_LABEL[job.source] ?? "posting"} <ExternalLink className="h-3.5 w-3.5" /></>)}
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

          <p className="mt-2 flex items-center gap-1 text-[10.5px] text-muted-foreground">
            <ShieldCheck className="h-3 w-3" />
            Apply opens the original posting — we don&apos;t submit for you.
          </p>
        </div>
      </div>

      <EmailModal open={emailOpen} onOpenChange={setEmailOpen} match={match} contact={contact} />
      <AssistedModal open={assistOpen} onOpenChange={setAssistOpen} match={match} />
      <PaywallModal feature={paywall} onClose={() => setPaywall(null)} />
    </div>
  );
}
