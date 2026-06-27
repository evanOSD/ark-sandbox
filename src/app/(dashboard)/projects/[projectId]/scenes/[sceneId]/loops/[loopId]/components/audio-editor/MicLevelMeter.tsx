"use client";

interface MicLevelMeterProps {
  level: number; // 0–100
}

export function MicLevelMeter({ level }: MicLevelMeterProps) {
  return (
    <div className="flex flex-col items-center justify-center border-l border-border/40 pl-4 h-full select-none w-[70px]">
      <span className="text-[9px] text-muted-foreground font-bold uppercase tracking-wider mb-2">
        Volume
      </span>
      <div className="flex items-center justify-center h-20 w-full">
        <div className="w-4 h-full bg-muted rounded-md overflow-hidden relative flex flex-col justify-end border border-border/40">
          <div
            className="w-full bg-emerald-500 transition-all duration-75"
            style={{ height: `${level}%` }}
          />
        </div>
      </div>
    </div>
  );
}
