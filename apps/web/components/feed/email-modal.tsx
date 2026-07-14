"use client";
import { useEffect, useMemo, useState } from "react";
import { Mail, Sparkles, ShieldCheck, Send, UserX, Loader2 } from "lucide-react";
import { mockEmail } from "@jobpilot/core";
import type { MatchView, RecruiterContact } from "@jobpilot/core/types";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useApp } from "@/lib/store";
import { DEMO_PROFILE } from "@/lib/data";
import { PLAN_LIMITS } from "@jobpilot/config";

export function EmailModal({
  open,
  onOpenChange,
  match,
  contact,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  match: MatchView;
  contact: RecruiterContact | null;
}) {
  const { recordEmail, setStatus, plan, emailsSentToday, pushToast } = useApp();
  const [generating, setGenerating] = useState(false);
  const [sent, setSent] = useState(false);

  const draft = useMemo(
    () => (contact ? mockEmail(contact, match.job, DEMO_PROFILE) : null),
    [contact, match.job],
  );
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  // Simulate the AI drafting delay each time the modal opens.
  useEffect(() => {
    if (!open || !contact || !draft) return;
    setGenerating(true);
    setSubject("");
    setBody("");
    const t = setTimeout(() => {
      setSubject(draft.subject);
      setBody(draft.body);
      setGenerating(false);
    }, 700);
    return () => clearTimeout(t);
  }, [open, contact, draft]);

  const cap = PLAN_LIMITS[plan].emailsPerDay;

  function send() {
    if (!recordEmail()) {
      pushToast(`Daily email cap reached (${cap}/day)`);
      return;
    }
    setSent(true);
    setStatus(match.id, "emailed");
    setTimeout(() => {
      onOpenChange(false);
      pushToast(`Email sent to ${contact?.name}`);
      setSent(false);
    }, 900);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" /> Reach out to a recruiter
          </DialogTitle>
          <DialogDescription>
            {match.job.title} @ {match.job.company}
          </DialogDescription>
        </DialogHeader>

        {!contact ? (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-10 text-center">
            <UserX className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-medium">No recruiter contact found</p>
            <p className="max-w-xs text-xs text-muted-foreground">
              We couldn't find a verified contact at {match.job.company}. Use <b>Apply Now</b> to go straight to the posting.
            </p>
          </div>
        ) : (
          <>
            {/* Contact chip */}
            <div className="flex items-center justify-between rounded-xl border bg-muted/40 px-3 py-2.5">
              <div>
                <div className="text-sm font-medium">{contact.name}</div>
                <div className="text-xs text-muted-foreground">{contact.title}</div>
              </div>
              <Badge variant="secondary" className="text-[11px]">via Apollo</Badge>
            </div>

            {generating ? (
              <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Drafting a personalised email…
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">Subject</label>
                  <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
                </div>
                <div>
                  <label className="mb-1 flex items-center gap-1 text-xs font-medium text-muted-foreground">
                    <Sparkles className="h-3 w-3 text-primary" /> AI draft — edit before sending
                  </label>
                  <Textarea value={body} onChange={(e) => setBody(e.target.value)} className="min-h-[210px] leading-relaxed" />
                </div>
              </div>
            )}

            <div className="flex items-center gap-2 rounded-lg bg-accent/50 px-3 py-2 text-xs text-accent-foreground">
              <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
              Sends from your verified address <b>priya.sharma@gmail.com</b> · {emailsSentToday}/{cap} used today
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button variant="gradient" onClick={send} disabled={generating || sent}>
                {sent ? "Sent ✓" : (<>Send email <Send className="h-4 w-4" /></>)}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
