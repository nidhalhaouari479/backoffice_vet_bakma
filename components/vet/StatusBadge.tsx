import { CheckCircle2, CircleMinus, Clock, FileText, XCircle } from "lucide-react";
import { CONSULTATION_STATUS, VET_DECISION } from "@/lib/labels";
import type { ConsultationStatus, VetDecision } from "@/lib/types";
import { Badge, cn } from "../ui";

const ICONS: Record<ConsultationStatus, React.ElementType> = {
  nouvelle: FileText,
  en_cours: Clock,
  terminee: CheckCircle2,
  a_revoir: XCircle,
  annulee: CircleMinus,
};

/** Pastille de statut de consultation (avec icône optionnelle, style maquette admin-03). */
export function StatusBadge({ status, icon = false, className }: { status: ConsultationStatus; icon?: boolean; className?: string }) {
  const meta = CONSULTATION_STATUS[status];
  const Icon = ICONS[status];
  return (
    <Badge tone={meta.tone} dot={!icon} className={className}>
      {icon && <Icon className="size-3.5" />}
      {meta.label}
    </Badge>
  );
}

export function DecisionBadge({ decision, className }: { decision: VetDecision | null; className?: string }) {
  if (!decision) return <span className={cn("text-xs text-muted", className)}>—</span>;
  const meta = VET_DECISION[decision];
  const Icon = decision === "approuve" ? CheckCircle2 : decision === "refuse" ? XCircle : Clock;
  return (
    <Badge tone={meta.tone} dot={false} className={className}>
      <Icon className="size-3.5" />
      {meta.label}
    </Badge>
  );
}
