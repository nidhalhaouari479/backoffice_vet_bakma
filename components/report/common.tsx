"use client";

import { Activity, CalendarClock, Ear, FileText, PawPrint, Scale, Smile, Stethoscope, Thermometer } from "lucide-react";
import { useState } from "react";
import { signedDocumentUrl } from "@/lib/storage";
import { norm } from "@/lib/vet";
import { Button, cn, useToast } from "../ui";

/** Icône associée à un examen (par nom). */
export function ExamIcon({ name, className }: { name: string; className?: string }) {
  const n = norm(name);
  if (n.includes("clinique")) return <Stethoscope className={className} />;
  if (n.includes("temperature")) return <Thermometer className={className} />;
  if (n.includes("poids")) return <Scale className={className} />;
  if (n.includes("pelage") || n.includes("peau")) return <PawPrint className={className} />;
  if (n.includes("dent")) return <Smile className={className} />;
  if (n.includes("oreille")) return <Ear className={className} />;
  if (n.includes("rendez") || n.includes("rdv")) return <CalendarClock className={className} />;
  return <Activity className={className} />;
}

export const DOC_KINDS = [
  { value: "rapport", label: "Rapport de consultation", tile: "bg-violet-50 text-violet-600" },
  { value: "vaccination", label: "Carnet de vaccination", tile: "bg-blue-50 text-blue-600" },
  { value: "certificat", label: "Certificat de bonne santé", tile: "bg-red-50 text-red-500" },
  { value: "autre", label: "Autre document", tile: "bg-slate-100 text-slate-600" },
] as const;

export const docKind = (k: string | null | undefined) => DOC_KINDS.find((d) => d.value === k) ?? DOC_KINDS[3];

export function DocTile({ kind }: { kind: string | null | undefined }) {
  return (
    <span className={cn("grid size-12 shrink-0 place-items-center rounded-xl", docKind(kind).tile)}>
      <FileText className="size-6" />
    </span>
  );
}

/** Bouton « Voir » d'un document privé (URL signée 1 h). */
export function ViewDocButton({ path }: { path: string }) {
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  return (
    <Button
      size="sm"
      variant="outline"
      loading={busy}
      className="px-5 text-primary"
      onClick={async () => {
        setBusy(true);
        const url = await signedDocumentUrl(path);
        setBusy(false);
        if (url) window.open(url, "_blank", "noopener");
        else toast("Document indisponible", "error");
      }}
    >
      Voir
    </Button>
  );
}

export function SectionTitle({ children, icon, action }: { children: React.ReactNode; icon?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h3 className="flex items-center gap-2 text-base font-bold text-navy [&>svg]:size-5 [&>svg]:text-primary">
        {icon}
        {children}
      </h3>
      {action}
    </div>
  );
}
