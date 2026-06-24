import { Button } from "@/components/ui/button";

interface AudioSource {
  name: string;
  url: string;
  script_text?: string | null;
}

interface AudioSourceTabsProps {
  audioSources: AudioSource[];
  activeTabIdx: number;
  onTabChange: (index: number) => void;
}

export function AudioSourceTabs({
  audioSources,
  activeTabIdx,
  onTabChange,
}: AudioSourceTabsProps) {
  return (
    <div className="flex flex-wrap gap-1.5 p-1 bg-background border border-border rounded-lg w-fit">
      {audioSources.length > 0 ? (
        audioSources.map((source, index) => (
          <Button
            key={source.name}
            type="button"
            variant="ghost"
            onClick={() => onTabChange(index)}
            className={`h-8.5 text-xs font-semibold px-4 transition-all rounded-md ${
              activeTabIdx === index
                ? "bg-indigo-600 text-white shadow-md hover:bg-indigo-700"
                : "text-muted-foreground hover:text-foreground hover:bg-muted bg-transparent"
            }`}
          >
            {source.name}
          </Button>
        ))
      ) : (
        <div className="h-8.5 px-4 flex items-center text-xs font-semibold text-muted-foreground">
          Default
        </div>
      )}
    </div>
  );
}
