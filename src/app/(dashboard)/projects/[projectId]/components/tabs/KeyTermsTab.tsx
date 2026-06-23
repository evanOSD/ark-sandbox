import { Scene } from "../../ProjectClient";

interface KeyTermsTabProps {
  activeScene: Scene | null;
}

export function KeyTermsTab({ activeScene }: KeyTermsTabProps) {
  return (
    <div className="p-4 space-y-4">
      <h3 className="text-sm font-bold text-foreground/90">Glosarium Kata Kunci (Key Terms)</h3>
      <div className="border border-border rounded-xl overflow-hidden bg-muted/10">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-muted text-muted-foreground border-b border-border uppercase font-semibold">
            <tr>
              <th className="p-3">Kata Kunci</th>
              <th className="p-3">Bahasa Asal</th>
              <th className="p-3">Definisi/Catatan</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-850">
            {activeScene?.loops
              .flatMap((l) => l.key_terms)
              .map((term, index) => (
                <tr key={index} className="hover:bg-muted/20">
                  <td className="p-3 font-semibold text-foreground">{term.term}</td>
                  <td className="p-3 font-mono text-muted-foreground">{term.original_word || "-"}</td>
                  <td className="p-3 text-muted-foreground">Referensi glosarium lokal untuk ayat di scene ini.</td>
                </tr>
              ))}
            {(!activeScene || activeScene.loops.flatMap((l) => l.key_terms).length === 0) && (
              <tr>
                <td colSpan={3} className="p-6 text-center text-muted-foreground italic">
                  Tidak ada kata kunci di scene ini.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
