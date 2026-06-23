import React from "react";
import { MessageSquare, Plus, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Note, Scene } from "../ProjectClient";

interface NotesPanelProps {
  notes: Note[];
  setNotes: React.Dispatch<React.SetStateAction<Note[]>>;
  newNoteText: string;
  setNewNoteText: (text: string) => void;
  selectedNoteLoop: string;
  setSelectedNoteLoop: (loop: string) => void;
  activeScene: Scene | null;
  handleAddNote: (e: React.FormEvent) => void;
  isLoading: boolean;
}

export function NotesPanel({
  notes,
  setNotes,
  newNoteText,
  setNewNoteText,
  selectedNoteLoop,
  setSelectedNoteLoop,
  activeScene,
  handleAddNote,
  isLoading,
}: NotesPanelProps) {
  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-zinc-900/30">
      <div className="h-9 border-b border-zinc-800 bg-zinc-900/80 px-3 flex items-center gap-2 shrink-0 select-none">
        <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">Notes</span>
        <span className="text-zinc-650">|</span>
        <button
          type="button"
          className="text-zinc-400 hover:text-white flex items-center gap-0.5 text-xs font-bold"
          onClick={() => document.getElementById("new-note-input")?.focus()}
          title="Add Note"
        >
          <MessageSquare className="h-4 w-4" />
          <Plus className="h-3 w-3 -ml-1 mt-1 font-bold" />
        </button>
      </div>

      {/* Notes List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
        {notes.map((note) => (
          <div key={note.id} className="border border-zinc-800/80 bg-zinc-950/45 rounded p-2.5 space-y-1.5 hover:border-zinc-750 transition-colors">
            <div className="flex items-start justify-between text-[10px] text-zinc-400">
              <div className="flex items-center gap-1">
                <Star className="h-3 w-3 text-amber-500/70" />
                <span className="font-semibold text-zinc-300">{note.author}</span>
                <span>[{note.age}]</span>
              </div>
              <span className="bg-zinc-900 border border-zinc-800 px-1.5 py-0.5 rounded font-mono text-[9px] text-amber-600/80">
                {note.loopName}
              </span>
            </div>
            <p className="text-xs text-zinc-300 leading-relaxed pl-4 border-l border-zinc-800">
              {note.text}
            </p>
            <div className="flex items-center justify-end gap-3 text-[9px] text-zinc-550 font-semibold pt-1">
              <button type="button" className="hover:text-zinc-300 transition-colors">Add Comment</button>
              <button
                type="button"
                disabled={isLoading}
                className="hover:text-red-400 disabled:opacity-50 transition-colors"
                onClick={() => setNotes((prev) => prev.filter((n) => n.id !== note.id))}
              >
                Delete Note
              </button>
              <button type="button" className="hover:text-zinc-300 transition-colors">Unassigned</button>
            </div>
          </div>
        ))}

        {notes.length === 0 && (
          <div className="text-center py-8 text-xs text-zinc-650 italic">
            Belum ada catatan proyek.
          </div>
        )}
      </div>

      {/* Note Input Box */}
      <form onSubmit={handleAddNote} className="p-2.5 border-t border-zinc-800 bg-zinc-900/60 flex flex-col gap-2 shrink-0">
        <div className="flex gap-2">
          <select
            value={selectedNoteLoop}
            onChange={(e) => setSelectedNoteLoop(e.target.value)}
            className="bg-zinc-950 border border-zinc-800 text-[10px] rounded p-1 text-zinc-400 focus:outline-none focus:border-zinc-700 w-fit cursor-pointer"
          >
            <option value="">Pilih Loop (Opsional)</option>
            {activeScene?.loops.map((l) => (
              <option key={l.id} value={l.name}>
                {l.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex gap-2">
          <Input
            id="new-note-input"
            value={newNoteText}
            onChange={(e) => setNewNoteText(e.target.value)}
            placeholder="Ketik catatan atau umpan balik baru..."
            className="h-8.5 text-xs bg-zinc-950 border-zinc-850"
            required
          />
          <Button type="submit" size="sm" disabled={isLoading} className="h-8 px-3 font-semibold text-xs shrink-0">
            Kirim
          </Button>
        </div>
      </form>
    </div>
  );
}
