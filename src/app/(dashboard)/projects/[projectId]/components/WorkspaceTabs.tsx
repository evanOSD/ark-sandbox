import { cn } from "@/lib/utils";

interface WorkspaceTabsProps {
  activeTab: "draft" | "keyTerms" | "transcribe" | "backTranslate" | "consult";
  setActiveTab: (tab: "draft" | "keyTerms" | "transcribe" | "backTranslate" | "consult") => void;
}

export function WorkspaceTabs({ activeTab, setActiveTab }: WorkspaceTabsProps) {
  return (
    <div className="h-10 bg-zinc-900 border-b border-zinc-800 flex shrink-0">
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
              "flex-1 text-xs font-bold tracking-wide uppercase border-r border-zinc-850 transition-all text-center focus:outline-none",
              isActive
                ? "bg-zinc-950 text-amber-500 border-b border-b-amber-500 font-black"
                : "text-zinc-500 hover:bg-zinc-900/50 hover:text-zinc-200"
            )}
          >
            {labels[tab]}
          </button>
        );
      })}
    </div>
  );
}
