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
      <div className="flex items-center gap-1.5 h-20 w-full justify-center">
        {/* Left side: dB markers aligned vertically */}
        <div className="flex flex-col justify-between h-full text-[7.5px] font-mono font-bold text-muted-foreground/75 leading-none py-0.5 select-none text-right pr-0.5 w-[20px]">
          <span>0</span>
          <span>-6</span>
          <span>-12</span>
          <span>-24</span>
          <span>-40</span>
          <span>-60</span>
        </div>

        {/* Right side: Gradient Level bar with reveal mask */}
        <div className="w-3 h-full bg-muted-foreground/15 rounded-sm overflow-hidden relative flex flex-col justify-end border border-border/30">
          {/* Audio level color gradient */}
          <div
            className="absolute inset-0 w-full h-full bg-gradient-to-t from-emerald-500 via-yellow-500 to-red-500"
          />
          {/* Mask that translates level into revealed height */}
          <div
            className="absolute top-0 left-0 w-full bg-background transition-all duration-75"
            style={{ height: `${100 - level}%` }}
          />
        </div>
      </div>
    </div>
  );
}
