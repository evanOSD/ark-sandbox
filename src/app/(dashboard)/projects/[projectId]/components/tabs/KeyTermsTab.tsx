import { Scene } from "../../ProjectClient";

interface KeyTermsTabProps {
  activeScene: Scene | null;
}

export function KeyTermsTab({ activeScene }: KeyTermsTabProps) {
  return (
    <div className="p-4 space-y-4">
      <h3 className="text-sm font-bold text-zinc-300">Glosarium Kata Kunci (Key Terms)</h3>
      <div className="border border-zinc-800 rounded-xl overflow-hidden bg-zinc-900/10">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-zinc-900 text-zinc-400 border-b border-zinc-800 uppercase font-semibold">
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
                <tr key={index} className="hover:bg-zinc-900/20">
                  <td className="p-3 font-semibold text-zinc-200">{term.term}</td>
                  <td className="p-3 font-mono text-zinc-450">{term.original_word || "-"}</td>
                  <td className="p-3 text-zinc-450">Referensi glosarium lokal untuk ayat di scene ini.</td>
                </tr>
              ))}
            {(!activeScene || activeScene.loops.flatMap((l) => l.key_terms).length === 0) && (
              <tr>
                <td colSpan={3} className="p-6 text-center text-zinc-500 italic">
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
