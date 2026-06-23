interface PlaceholderTabProps {
  activeTab: "transcribe" | "backTranslate" | "consult";
}

export function PlaceholderTab({ activeTab }: PlaceholderTabProps) {
  return (
    <div className="text-center py-12 text-zinc-500 text-xs italic">
      Bagian evaluasi {activeTab} siap digunakan. Admin dapat meninjau rekaman draft suara yang terkumpul.
    </div>
  );
}
