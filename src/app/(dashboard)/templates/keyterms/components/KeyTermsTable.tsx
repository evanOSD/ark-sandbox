"use client";

import React from "react";
import { Edit, Trash2, Link2 } from "lucide-react";
import { KeyTermDB, LoopKeyTermDB } from "@/types/key-terms";
import { Button } from "@/components/ui/button";
import {
  renderFormattedText,
  stripFormattingTags,
} from "@/utils/text-formatting";

interface KeyTermsTableProps {
  terms: KeyTermDB[];
  activeRelations: LoopKeyTermDB[];
  onOpenLoopModal: (term: KeyTermDB) => void;
  onOpenEditModal: (term: KeyTermDB) => void;
  onDeleteTerm: (term: KeyTermDB) => void;
}

export function KeyTermsTable({
  terms,
  activeRelations,
  onOpenLoopModal,
  onOpenEditModal,
  onDeleteTerm,
}: KeyTermsTableProps) {
  return (
    <div className="border border-border rounded-xl bg-card overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-muted/80 text-muted-foreground border-b border-border uppercase font-bold tracking-wider select-none animate-none">
            <tr>
              <th className="p-3.5">Kata Kunci (Term)</th>
              <th className="p-3.5">Bahasa Asal</th>
              <th className="p-3.5">Pengelompokan (Category)</th>
              <th className="p-3.5">Definisi & Catatan</th>
              <th className="p-3.5 text-center">Loop Terkait</th>
              <th className="p-3.5 text-center w-40">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {terms.map((kt) => {
              const boundCount = activeRelations.filter(
                (rel) => rel.key_term_id === kt.id,
              ).length;
              return (
                <tr
                  key={kt.id}
                  className="hover:bg-muted/10 transition-colors text-foreground"
                >
                  {/* Term */}
                  <td className="p-3.5 font-bold">{kt.term}</td>

                  {/* Original Word */}
                  <td className="p-3.5 font-mono text-muted-foreground text-[11px]">
                    {kt.original_word || "-"}
                  </td>

                  {/* Category Grouping */}
                  <td className="p-3.5 text-muted-foreground font-semibold">
                    {kt.category ? (
                      <span className="bg-muted px-2.5 py-0.5 rounded border border-border/80 text-[11px] font-bold text-foreground/80">
                        {kt.category}
                      </span>
                    ) : (
                      <span className="italic text-muted-foreground/50">
                        Belum ada
                      </span>
                    )}
                  </td>

                  {/* Meaning / Note */}
                  <td
                    className="p-3.5 text-muted-foreground whitespace-pre-line max-w-sm truncate leading-relaxed"
                    title={stripFormattingTags(kt.meaning_or_note)}
                  >
                    {renderFormattedText(kt.meaning_or_note) || "-"}
                  </td>

                  {/* Bindings Count */}
                  <td className="p-3.5 text-center font-bold">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px]
                      ${
                        boundCount > 0
                          ? "bg-amber-500/10 border border-amber-500/20 text-amber-500"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {boundCount} Loops
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="p-3.5 text-center">
                    <div className="flex items-center justify-center gap-1">
                      {/* Manage Loops */}
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => onOpenLoopModal(kt)}
                        title="Kelola Hubungan Loop"
                        className="text-muted-foreground hover:text-amber-500 cursor-pointer"
                      >
                        <Link2 className="h-4 w-4" />
                      </Button>

                      {/* Edit */}
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => onOpenEditModal(kt)}
                        title="Edit Detail"
                        className="text-muted-foreground hover:text-primary cursor-pointer"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>

                      {/* Delete */}
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => onDeleteTerm(kt)}
                        title="Hapus Kata Kunci"
                        className="text-muted-foreground hover:text-red-500 cursor-pointer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}

            {terms.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="p-10 text-center text-muted-foreground italic select-none"
                >
                  Tidak ada kata kunci ditemukan.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
