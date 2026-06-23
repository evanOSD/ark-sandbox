import { cn } from "@/lib/utils";

interface WorkspaceTabsProps {
  activeTab: "draft" | "keyTerms" | "transcribe" | "backTranslate" | "consult";
  setActiveTab: (tab: "draft" | "keyTerms" | "transcribe" | "backTranslate" | "consult") => void;
}

export function WorkspaceTabs({ activeTab, setActiveTab }: WorkspaceTabsProps) {
  return (
    <div className="h-10 bg-muted border-b border-border flex shrink-0">
      {(["draft", "keyTerms", "transcribe", "backTranslate", "consult"] as const).map((tab) => {
        const labels: Record<string, string> = {
          draft: "Draft",
          keyTerms: "Key Terms",
          transcribe: "Transcribe",
          backTranslate: "Back Translate",
          consult: "Consult",
        };
        const isActive = activeTab === tab;
        return (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={cn(
              "flex-1 text-xs font-bold tracking-wide uppercase border-r border-border transition-all text-center focus:outline-none",
              isActive
                ? "bg-background text-amber-500 border-b border-b-amber-500 font-black"
                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
            )}
          >
            {labels[tab]}
          </button>
        );
      })}
    </div>
  );
}
