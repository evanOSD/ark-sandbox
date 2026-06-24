import { Sliders } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface AudioSettingsPopoverProps {
  isRecording: boolean;
  noiseSuppression: boolean;
  autoGainControl: boolean;
  echoCancellation: boolean;
  onToggleNoiseSuppression: () => void;
  onToggleAutoGainControl: () => void;
  onToggleEchoCancellation: () => void;
}

export function AudioSettingsPopover({
  isRecording,
  noiseSuppression,
  autoGainControl,
  echoCancellation,
  onToggleNoiseSuppression,
  onToggleAutoGainControl,
  onToggleEchoCancellation,
}: AudioSettingsPopoverProps) {
  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            className="w-fit cursor-pointer h-8 text-xs font-semibold m-0"
            style={{ marginTop: 0 }}
          />
        }
      >
        <Sliders className="w-3.5 h-3.5 mr-1.5 text-emerald-500" /> Audio Settings
      </PopoverTrigger>
      <PopoverContent className="w-[220px] p-2" align="end">
        <div className="space-y-2 text-foreground">
          <div className="flex items-center justify-between border-b border-border pb-1.5 px-1">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Sliders className="w-3 h-3 text-emerald-500" /> Audio Settings
            </span>
          </div>
          <div className="grid grid-cols-1 gap-1.5">
            <DSPToggleButton
              label="Noise Suppression"
              description="Reduksi bising sekitar"
              active={noiseSuppression}
              disabled={isRecording}
              onToggle={onToggleNoiseSuppression}
            />
            <DSPToggleButton
              label="Auto Gain Control"
              description="Penyesuaian volume"
              active={autoGainControl}
              disabled={isRecording}
              onToggle={onToggleAutoGainControl}
            />
            <DSPToggleButton
              label="Echo Cancellation"
              description="Mencegah gema speaker"
              active={echoCancellation}
              disabled={isRecording}
              onToggle={onToggleEchoCancellation}
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

interface DSPToggleButtonProps {
  label: string;
  description: string;
  active: boolean;
  disabled: boolean;
  onToggle: () => void;
}

function DSPToggleButton({
  label,
  description,
  active,
  disabled,
  onToggle,
}: DSPToggleButtonProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      className={`flex items-center justify-between p-2 rounded-lg border text-left transition-all duration-200 ${
        disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
      } ${
        active
          ? "bg-emerald-500/10 border-emerald-500/30 hover:bg-emerald-500/15"
          : "bg-background/40 border-border hover:bg-muted/60"
      }`}
    >
      <div className="flex flex-col pr-1.5">
        <span className="text-[10px] font-bold text-foreground">{label}</span>
        <span className="text-[8px] text-muted-foreground mt-0.5 leading-tight">
          {description}
        </span>
      </div>
      <span
        className={`shrink-0 text-[8px] font-bold px-1.5 py-0.5 rounded ${
          active
            ? "bg-emerald-500/20 text-emerald-700"
            : "bg-muted text-muted-foreground"
        }`}
      >
        {active ? "ON" : "OFF"}
      </span>
    </button>
  );
}
