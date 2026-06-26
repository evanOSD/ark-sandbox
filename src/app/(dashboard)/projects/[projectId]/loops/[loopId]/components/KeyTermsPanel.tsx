import { Tag } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { KeyTerm } from "../WorkspaceClient";
import { KeyTermCard } from "./KeyTermCard";

interface KeyTermsPanelProps {
  keyTerms: KeyTerm[];
  projectId: string;
}

export function KeyTermsPanel({ keyTerms, projectId }: KeyTermsPanelProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Tag className="h-4.5 w-4.5 text-primary" /> Kamus Kata Kunci (Key
          Terms)
        </CardTitle>
        <CardDescription>
          Kata kunci di putaran ini yang perlu disepakati ejaan dan
          pelafalannya.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 max-h-[400px] overflow-y-auto pr-1">
        {keyTerms.map((term) => (
          <KeyTermCard key={term.id} term={term} projectId={projectId} />
        ))}

        {keyTerms.length === 0 && (
          <div className="text-center p-6 text-xs text-muted-foreground">
            Tidak ada kata kunci yang ditempelkan di putaran ini.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
