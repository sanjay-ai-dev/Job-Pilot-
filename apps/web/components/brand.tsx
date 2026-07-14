import { cn } from "@/lib/utils";
import { Navigation } from "lucide-react";

export function Logo({ className, showText = true }: { className?: string; showText?: boolean }) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="relative grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br from-primary to-violet-600 shadow-md shadow-primary/30">
        <Navigation className="h-4 w-4 -rotate-45 text-white" fill="currentColor" />
      </div>
      {showText && <span className="text-lg font-bold tracking-tight">JobPilot</span>}
    </div>
  );
}
