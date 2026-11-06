"use client";

import { useState } from "react";
import { FileText } from "lucide-react";
import { must, useQuery } from "@/hooks/useQuery";
import { signedDocumentUrl } from "@/lib/storage";
import { getSupabase } from "@/lib/supabase";
import type { AnimalDocument } from "@/lib/types";
import { Button, Card, useToast } from "../ui";

/** Documents déposés par le propriétaire lors de la soumission (carnet, pedigree…). */
export function OwnerDocumentsCard({ animalId }: { animalId: string }) {
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const { data } = useQuery<AnimalDocument[]>(
    () => must(getSupabase().from("animal_documents").select("*").eq("animal_id", animalId).order("created_at")).then((d) => (d as AnimalDocument[]) ?? []),
    `animal-docs:${animalId}`,
  );

  async function open(d: AnimalDocument) {
    setBusy(d.id);
    const w = window.open("", "_blank");
    try {
      const url = await signedDocumentUrl(d.file_path);
      if (!url) throw new Error();
      if (w) w.location.href = url;
      else window.location.assign(url);
    } catch {
      w?.close();
      toast("Impossible d'ouvrir ce document.", "error");
    } finally {
      setBusy(null);
    }
  }

  return (
    <Card className="p-5">
      <h3 className="mb-3 text-lg font-bold">Documents du propriétaire</h3>
      {!data?.length ? (
        <p className="text-sm text-muted">Aucun document fourni.</p>
      ) : (
        <ul className="space-y-3">
          {data.map((d) => (
            <li key={d.id} className="flex items-center gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary">
                <FileText className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-bold text-navy">{d.title}</div>
                <div className="truncate text-xs text-muted">{d.file_name}</div>
              </div>
              <Button variant="outline" size="sm" loading={busy === d.id} onClick={() => open(d)}>
                Voir
              </Button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
