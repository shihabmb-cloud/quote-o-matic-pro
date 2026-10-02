import { RFQ_STAGES, stageIndex } from "@/lib/ops";
import { cn } from "@/lib/utils";

export function StageRail({ status }: { status: string }) {
  const current = stageIndex(status);
  return (
    <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
      {RFQ_STAGES.map((stage, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <div key={stage.label} className="flex shrink-0 items-center gap-1.5">
            {i > 0 ? <span className="h-px w-5 bg-border" /> : null}
            <div
              className={cn(
                "flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 transition-colors",
                done && "bg-ready/15 ring-1 ring-ready/40",
                active && "bg-wait/20 ring-2 ring-wait/60 shadow-[0_0_0_4px_rgba(245,158,11,0.12)]",
                !done && !active && "bg-white/[0.02] ring-1 ring-border",
              )}
            >
              <span
                className={cn(
                  "grid size-5 place-items-center rounded-full text-[11px] font-semibold",
                  done && "bg-ready/25 text-ready",
                  active && "bg-wait/30 text-wait",
                  !done && !active && "bg-white/10 text-muted-foreground",
                )}
              >
                {i + 1}
              </span>
              <span
                className={cn(
                  "text-[12px]",
                  done || active ? "font-medium text-foreground" : "text-muted-foreground",
                )}
              >
                {stage.label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
