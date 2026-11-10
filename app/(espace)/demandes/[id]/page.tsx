"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, CalendarClock, CalendarDays, ClipboardList, Hand, Info, MessageSquareWarning } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useCounters } from "@/hooks/useCounters";
import { must, useQuery } from "@/hooks/useQuery";
import { AnimalCard, OwnerCard, VetCard } from "@/components/report/Cards";
import { ReportEditor } from "@/components/report/ReportEditor";
import { DocumentsView, PhotosView, ReportView } from "@/components/report/ReportView";
import { ClaimModal } from "@/components/vet/ClaimModal";
import { OwnerDocumentsCard } from "@/components/vet/OwnerDocuments";
import { DecisionBadge, StatusBadge } from "@/components/vet/StatusBadge";
import { Alert, Button, Card, EmptyState, Field, Input, Modal, PageLoader, useToast } from "@/components/ui";
import { getSupabase, errorMessage } from "@/lib/supabase";
import { REQUEST_STATUS, REQUEST_STEPS, formatDate, formatDateTime } from "@/lib/labels";
import type { Consultation } from "@/lib/types";
import { CONSULTATION_FULL, toLocalInput } from "@/lib/vet";

function ScheduleCard({ c, editable, onSaved }: { c: Consultation; editable: boolean; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [when, setWhen] = useState(toLocalInput(c.scheduled_at));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  async function save(clear = false) {
    setBusy(true);
    setError(null);
    const { error } = await getSupabase()
      .from("consultations")
      .update({ scheduled_at: clear || !when ? null : new Date(when).toISOString() })
      .eq("id", c.id);
    setBusy(false);
    if (error) return setError(errorMessage(error));
    toast(clear ? "Rendez-vous annulé" : "Rendez-vous enregistré");
    setOpen(false);
    onSaved();
  }

  return (
    <Card className="p-5">
      <h3 className="mb-3 text-lg font-bold">Rendez-vous</h3>
      <div className="flex items-center gap-3">
        <span className="grid size-12 place-items-center rounded-xl bg-primary-soft text-primary">
          <CalendarClock className="size-6" />
        </span>
        <div>
          <div className="font-semibold text-navy">{c.scheduled_at ? formatDateTime(c.scheduled_at) : "Non planifié"}</div>
          <div className="text-xs text-muted">{c.scheduled_at ? "Consultation planifiée" : "Aucun rendez-vous fixé"}</div>
        </div>
      </div>
      {editable && (
        <Button variant="outline" className="mt-4 w-full text-primary" icon={<CalendarDays className="size-4" />} onClick={() => setOpen(true)}>
          {c.scheduled_at ? "Replanifier" : "Planifier le rendez-vous"}
        </Button>
      )}
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={c.scheduled_at ? "Replanifier le rendez-vous" : "Planifier le rendez-vous"}
        size="sm"
        footer={
          <>
            {c.scheduled_at && (
              <Button variant="ghost" onClick={() => save(true)} disabled={busy}>
                Retirer le RDV
              </Button>
            )}
            <Button onClick={() => save()} loading={busy} disabled={!when}>
              Enregistrer
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <Field label="Date et heure">
            <Input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} icon={<CalendarClock />} />
          </Field>
          <Alert>{error}</Alert>
        </div>
      </Modal>
    </Card>
  );
}

function RequestCard({ c }: { c: Consultation }) {
  const r = c.request;
  if (!r) return null;
  const stepIndex = REQUEST_STEPS.findIndex((s) => s.key === r.step);
  return (
    <Card className="p-5">
      <h3 className="mb-3 text-lg font-bold">Demande de publication</h3>
      <dl className="mb-4 space-y-1.5 text-sm">
        <div className="flex justify-between gap-3">
          <dt className="text-body">Référence</dt>
          <dd className="font-semibold text-navy">#{r.ref}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-body">Soumise le</dt>
          <dd className="font-medium text-navy">{formatDateTime(r.submitted_at)}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-body">Statut</dt>
          <dd className="font-medium text-navy">{REQUEST_STATUS[r.status].label}</dd>
        </div>
      </dl>
      <ol className="space-y-2">
        {REQUEST_STEPS.map((s, i) => (
          <li key={s.key} className="flex items-center gap-2.5 text-sm">
            <span
              className={`grid size-6 place-items-center rounded-full text-[11px] font-bold ${
                i < stepIndex ? "bg-emerald-500 text-white" : i === stepIndex ? "bg-primary text-white" : "bg-page text-muted"
              }`}
            >
              {i + 1}
            </span>
            <span className={i <= stepIndex ? "font-semibold text-navy" : "text-muted"}>{s.label}</span>
          </li>
        ))}
      </ol>
    </Card>
  );
}

export default function DemandeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const me = user?.id ?? "";
  const { refresh } = useCounters();
  const [claiming, setClaiming] = useState(false);
  const [version, setVersion] = useState(0);

  const { data: c, loading, error, reload } = useQuery<Consultation | null>(
    () =>
      must(getSupabase().from("consultations").select(CONSULTATION_FULL).eq("id", id).maybeSingle()).then(
        (d) => (d as unknown as Consultation | null) ?? null,
      ),
    `consultation:${id}`,
    !!id,
  );

  const reloadAll = () => {
    refresh();
    reload();
    setVersion((v) => v + 1);
  };

  if (loading && !c) return <PageLoader />;
  if (error && !c) return <Alert>{error}</Alert>;
  if (!c || !c.animal)
    return (
      <Card>
        <EmptyState
          icon={<ClipboardList />}
          title="Demande introuvable"
          text="Cette demande n'existe pas, a été annulée ou a été prise en charge par un autre vétérinaire."
          action={
            <Button href="/demandes" variant="soft">
              Retour aux demandes
            </Button>
          }
        />
      </Card>
    );

  const mine = c.vet_id === me;
  const claimable = c.status === "nouvelle" && (c.vet_id == null || mine);
  const editable = mine && (c.status === "en_cours" || c.status === "a_revoir");
  const done = c.status === "terminee";

  return (
    <div className="mx-auto max-w-[1400px]">
      <Link href="/demandes" className="mb-2 inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 transition hover:text-navy">
        <ArrowLeft className="size-3.5" aria-hidden /> Retour aux demandes
      </Link>

      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-[22px] font-semibold leading-tight tracking-[-0.02em] text-navy sm:text-[26px]">
            {done ? "Résultat de la consultation" : "Demande de consultation"}
          </h1>
          <p className="mt-1 text-[13.5px] text-slate-500">
            {done
              ? "Rapport vétérinaire et décision transmis à l'administration."
              : "Vérifiez l'état de santé de l'animal et rédigez votre rapport."}
          </p>
        </div>
        <div className="flex flex-col gap-1.5 lg:items-end">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={c.status} icon className="px-3 py-1.5 text-sm" />
            {done && <DecisionBadge decision={c.decision} className="px-3 py-1.5 text-sm" />}
          </div>
          <p className="text-sm text-body">Demande du {formatDate(c.request?.submitted_at ?? c.created_at)}</p>
          {c.request?.ref && <p className="text-sm font-semibold text-navy">#{c.request.ref}</p>}
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0 space-y-6">
          <AnimalCard animal={c.animal} submittedAt={c.request?.submitted_at} />

          {claimable && (
            <Card className="flex flex-col items-start gap-4 border-primary/30 bg-primary-soft/40 p-5 sm:flex-row sm:items-center">
              <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-white text-primary">
                <Hand className="size-6" />
              </span>
              <div className="flex-1">
                <p className="font-bold text-navy">{c.vet_id ? "Cette demande vous a été attribuée" : "Cette demande attend un vétérinaire"}</p>
                <p className="text-sm text-body">
                  {c.proposed_slots?.length
                    ? "Acceptez-la en choisissant une des 3 dates proposées par le propriétaire :"
                    : "Prenez-la en charge pour accéder aux coordonnées du propriétaire et rédiger votre rapport."}
                </p>
                {c.proposed_slots?.length > 0 && (
                  <ul className="mt-2 flex flex-wrap gap-2">
                    {c.proposed_slots.map((d) => (
                      <li key={d} className="flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-semibold text-navy">
                        <CalendarClock className="size-3.5 text-primary" /> {formatDateTime(d)}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <Button onClick={() => setClaiming(true)} icon={<Hand className="size-4" />}>
                {c.proposed_slots?.length ? "Choisir une date et accepter" : "Prendre en charge"}
              </Button>
            </Card>
          )}

          {mine && c.status === "a_revoir" && (
            <Card className="flex gap-3 border-amber-200 bg-amber-50 p-5">
              <MessageSquareWarning className="size-6 shrink-0 text-amber-600" />
              <div>
                <p className="font-bold text-amber-800">Compléments demandés au propriétaire</p>
                <p className="text-sm text-amber-800/90">{c.review_reason || "—"}</p>
                <p className="mt-1 text-xs text-amber-700">Complétez votre rapport puis rendez votre décision finale.</p>
              </div>
            </Card>
          )}

          {c.status === "annulee" && (
            <Card className="flex gap-3 p-5">
              <Info className="size-6 shrink-0 text-muted" />
              <p className="text-sm text-body">Cette demande a été annulée. Aucune action n&apos;est possible.</p>
            </Card>
          )}

          {editable && <ReportEditor key={`${c.id}-${version}`} c={c} onCompleted={reloadAll} />}
          {done && <ReportView c={c} />}
        </div>

        <div className="space-y-6">
          <OwnerCard owner={c.animal.owner} consultation={c} canContact={mine} />
          {c.status !== "annulee" && <OwnerDocumentsCard animalId={c.animal_id} />}
          {mine && c.status !== "annulee" && <ScheduleCard key={c.scheduled_at ?? "none"} c={c} editable={editable} onSaved={reload} />}
          {done && <VetCard vet={c.vet} />}
          {done && <DocumentsView c={c} />}
          {done && <PhotosView c={c} />}
          <RequestCard c={c} />
        </div>
      </div>

      <ClaimModal
        consultation={claiming ? c : null}
        onClose={() => setClaiming(false)}
        onDone={() => {
          setClaiming(false);
          reloadAll();
        }}
      />
    </div>
  );
}
