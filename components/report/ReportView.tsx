"use client";

import { CheckCircle2, FileText, Images, Stethoscope, Syringe, XCircle } from "lucide-react";
import { useState } from "react";
import { EXAM_RESULT, VACCINATION_STATUS, formatDate, formatDateTime } from "@/lib/labels";
import type { Consultation } from "@/lib/types";
import { DecisionBadge } from "../vet/StatusBadge";
import { Badge, Card, EmptyState, Modal } from "../ui";
import { DocTile, ViewDocButton, docKind, ExamIcon } from "./common";

/** Rapport vétérinaire en lecture seule (format maquette admin-04). */
export function ReportView({ c }: { c: Consultation }) {
  const exams = [...(c.exams ?? [])].sort((a, b) => a.position - b.position);
  const vaccs = c.vaccinations ?? [];
  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 pb-3 pt-5 sm:px-6">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-xl font-bold">Rapport vétérinaire</h2>
          <DecisionBadge decision={c.decision} className="px-3 py-1.5 text-sm" />
        </div>
        <p className="text-sm text-body">Date de consultation : {formatDateTime(c.consulted_at ?? c.updated_at)}</p>
      </div>

      <div className="space-y-6 px-5 pb-5 sm:px-6">
        <div className="flex gap-4 rounded-2xl bg-primary-soft/60 p-4 sm:p-5">
          <span className="grid size-12 shrink-0 place-items-center rounded-full bg-white text-primary">
            <Stethoscope className="size-6" />
          </span>
          <div>
            <p className="font-bold text-navy">Résumé du rapport</p>
            <p className="mt-1 whitespace-pre-line text-sm text-body">{c.summary || "Aucun résumé renseigné."}</p>
            {(c.weight_kg != null || c.temperature != null) && (
              <p className="mt-2 flex flex-wrap gap-4 text-sm font-semibold text-navy">
                {c.weight_kg != null && <span>Poids : {c.weight_kg} kg</span>}
                {c.temperature != null && <span>Température : {c.temperature} °C</span>}
              </p>
            )}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2 lg:divide-x lg:divide-line">
          <div>
            <h3 className="mb-3 text-base font-bold">Examens effectués</h3>
            {exams.length === 0 ? (
              <p className="text-sm text-muted">Aucun examen renseigné.</p>
            ) : (
              <ul className="space-y-2.5">
                {exams.map((e) => {
                  return (
                    <li key={e.id} className="flex items-start gap-3">
                      <ExamIcon name={e.name} className="mt-0.5 size-5 shrink-0 text-navy/70" />
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium text-navy">{e.name}</div>
                        {e.note && <div className="text-xs text-muted">{e.note}</div>}
                      </div>
                      <Badge tone={EXAM_RESULT[e.result].tone} dot={false}>
                        {EXAM_RESULT[e.result].label}
                      </Badge>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
          <div className="space-y-6 lg:pl-6">
            <div>
              <h3 className="mb-3 text-base font-bold">Vaccinations</h3>
              {vaccs.length === 0 ? (
                <p className="text-sm text-muted">Aucune vaccination renseignée.</p>
              ) : (
                <ul className="space-y-2.5">
                  {vaccs.map((v) => (
                    <li key={v.id} className="grid grid-cols-[20px_minmax(0,1fr)_auto_auto] items-center gap-3 text-sm">
                      <Syringe className="size-5 text-navy/70" />
                      <span className="truncate font-medium text-navy">{v.name}</span>
                      <Badge tone={VACCINATION_STATUS[v.status].tone} dot={false}>
                        {VACCINATION_STATUS[v.status].label}
                      </Badge>
                      <span className="text-right text-xs text-body">
                        {formatDate(v.vaccinated_on)}
                        {v.next_due_on && <span className="block text-muted">Rappel : {formatDate(v.next_due_on)}</span>}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <h3 className="mb-3 text-base font-bold">Observations</h3>
              <div className="flex gap-3 text-sm text-body">
                <FileText className="size-5 shrink-0 text-navy/70" />
                <p className="whitespace-pre-line">{c.observations || "Aucune observation."}</p>
              </div>
            </div>
          </div>
        </div>

        {c.decision === "approuve" && (
          <div className="flex items-start gap-3 rounded-2xl bg-emerald-50 px-5 py-4">
            <CheckCircle2 className="mt-0.5 size-6 shrink-0 fill-emerald-500 text-white" />
            <div>
              <p className="font-bold text-emerald-800">Avis du vétérinaire</p>
              <p className="text-sm text-emerald-800/90">Je certifie que cet animal est en bonne santé et apte à être publié sur la plateforme.</p>
            </div>
          </div>
        )}
        {c.decision === "refuse" && (
          <div className="flex items-start gap-3 rounded-2xl bg-red-50 px-5 py-4">
            <XCircle className="mt-0.5 size-6 shrink-0 fill-red-500 text-white" />
            <div>
              <p className="font-bold text-red-700">Avis défavorable du vétérinaire</p>
              <p className="text-sm text-red-700/90">{c.review_reason || "L'animal n'est pas jugé apte à être publié sur la plateforme."}</p>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

export function DocumentsView({ c }: { c: Consultation }) {
  const docs = c.documents ?? [];
  return (
    <Card className="p-5">
      <h3 className="mb-4 text-lg font-bold">Documents du vétérinaire</h3>
      {docs.length === 0 ? (
        <p className="text-sm text-muted">Aucun document.</p>
      ) : (
        <ul className="space-y-3">
          {docs.map((d) => (
            <li key={d.id} className="flex items-center gap-3">
              <DocTile kind={d.kind} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-navy">{d.title}</div>
                <div className="truncate text-xs text-muted">{d.file_name ?? docKind(d.kind).label}</div>
              </div>
              <ViewDocButton path={d.file_path} />
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export function PhotosView({ c }: { c: Consultation }) {
  const photos = c.photos ?? [];
  const [all, setAll] = useState(false);
  const [zoom, setZoom] = useState<string | null>(null);
  return (
    <Card className="p-5">
      <h3 className="mb-4 text-lg font-bold">Photos de la consultation</h3>
      {photos.length === 0 ? (
        <EmptyState icon={<Images />} title="Aucune photo" />
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-2">
          {photos.slice(0, 3).map((p) => (
            <button key={p.id} onClick={() => setZoom(p.url)} className="overflow-hidden rounded-xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.url} alt="" className="aspect-square w-full object-cover transition hover:scale-105" />
            </button>
          ))}
          {photos.length > 3 && (
            <button onClick={() => setAll(true)} className="grid aspect-square place-items-center rounded-xl border-2 border-dashed border-line text-sm font-semibold text-navy hover:border-primary">
              Voir toutes
              <br />({photos.length} photos)
            </button>
          )}
        </div>
      )}
      <Modal open={all} onClose={() => setAll(false)} title="Photos de la consultation" size="lg">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {photos.map((p) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={p.id} src={p.url} alt="" className="aspect-square w-full rounded-xl object-cover" />
          ))}
        </div>
      </Modal>
      <Modal open={!!zoom} onClose={() => setZoom(null)} title="Photo" size="lg">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {zoom && <img src={zoom} alt="" className="w-full rounded-xl" />}
      </Modal>
    </Card>
  );
}
