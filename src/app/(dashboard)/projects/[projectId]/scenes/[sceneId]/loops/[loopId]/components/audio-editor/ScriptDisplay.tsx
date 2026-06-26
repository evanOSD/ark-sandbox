interface ScriptDisplayProps {
  scriptText: string;
  sourceName: string;
}

export function ScriptDisplay({ scriptText, sourceName }: ScriptDisplayProps) {
  return (
    <div className="p-4 rounded-xl border border-border bg-muted/30 relative min-h-[90px]">
      <div className="flex items-center justify-between mb-1.5">
        <div className="text-[10px] text-indigo-400 uppercase font-bold tracking-widest">
          Naskah Skrip ({sourceName})
        </div>
      </div>
      <p className="text-sm text-foreground leading-relaxed font-medium">
        {scriptText || (
          <span className="text-muted-foreground italic">
            Skrip teks tidak tersedia untuk tab ini.
          </span>
        )}
      </p>
    </div>
  );
}
