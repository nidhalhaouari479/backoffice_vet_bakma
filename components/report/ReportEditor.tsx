"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CheckCircle2,
  ClipboardCheck,
  FileText,
  FileUp,
  Images,
  MessageSquareWarning,
  Plus,
  Save,
  ShieldCheck,
  Stethoscope,
  Syringe,
  Trash2,
  XCircle,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { getSupabase, errorMessage } from "@/lib/supabase";
import { uploadPrivateDocument } from "@/lib/storage";
import { DEFAULT_EXAMS, DEFAULT_VACCINES, EXAM_RESULT, VACCINATION_STATUS, formatTime } from "@/lib/labels";
import type { Consultation, ConsultationDocument, ConsultationExam, ExamResult, Vaccination, VaccinationStatus, VetDecision } from "@/lib/types";
import { ImageUploader } from "../ImageUploader";
import { Alert, Button, Card, Checkbox, Field, Input, Modal, Select, Textarea, cn, useToast } from "../ui";
import { DOC_KINDS, DocTile, SectionTitle, ViewDocButton, docKind, ExamIcon } from "./common";

// Évite un double pré-remplissage des examens (StrictMode / remontage).
const prefilled = new Set<string>();

const RESULT_STYLE: Record<ExamResult, string> = {
  normal: "bg-emerald-500 text-white border-emerald-500",
  a_surveiller: "bg-amber-500 text-white border-amber-500",
  anormal: "bg-red-500 text-white border-red-500",
};

const toNum = (s: string): number | null => {
  const v = parseFloat(s.replace(",", "."));
  return Number.isFinite(v) ? v : null;
};

type Fields = { summary: string; observations: string; weight: string; temperature: string };

// ---------------------------------------------------------------- Examens
function ExamRow({ exam, onChange, onDelete }: { exam: ConsultationExam; onChange: (e: ConsultationExam) => void; onDelete: () => void }) {
  const [name, setName] = useState(exam.name);
  const [note, setNote] = useState(exam.note ?? "");
  const toast = useToast();

  async function patch(p: Partial<ConsultationExam>) {
    const { error } = await getSupabase().from("consultation_exams").update(p).eq("id", exam.id);
    if (error) toast(errorMessage(error), "error");
    else onChange({ ...exam, ...p });
  }

  return (
    <li className="rounded-2xl border border-line p-3 sm:p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <ExamIcon name={name} className="size-5 shrink-0 text-navy/70" />
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => name.trim() && name !== exam.name && patch({ name: name.trim() })}
            className="min-w-0 flex-1 rounded-lg border border-transparent bg-transparent px-2 py-1 text-sm font-semibold text-navy outline-none hover:border-line focus:border-primary"
            aria-label="Nom de l'examen"
          />
        </div>
        <div className="flex items-center gap-1.5">
          {(Object.keys(EXAM_RESULT) as ExamResult[]).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => r !== exam.result && patch({ result: r })}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-semibold transition",
                exam.result === r ? RESULT_STYLE[r] : "border-line bg-white text-body hover:border-primary",
              )}
            >
              {EXAM_RESULT[r].label}
            </button>
          ))}
          <button type="button" onClick={onDelete} className="ml-1 rounded-full p-2 text-muted hover:bg-red-50 hover:text-red-600" aria-label="Supprimer l'examen">
            <Trash2 className="size-4" />
          </button>
        </div>
      </div>
      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        onBlur={() => note !== (exam.note ?? "") && patch({ note: note.trim() || null })}
        placeholder="Note (optionnelle)"
        className="mt-2 w-full rounded-lg border border-line bg-page/40 px-3 py-2 text-sm text-navy outline-none placeholder:text-muted focus:border-primary focus:bg-white"
      />
    </li>
  );
}

function ExamsEditor({ c }: { c: Consultation }) {
  const [exams, setExams] = useState<ConsultationExam[]>(() => [...(c.exams ?? [])].sort((a, b) => a.position - b.position));
  const [newName, setNewName] = useState("");
  const toast = useToast();

  useEffect(() => {
    if ((c.exams ?? []).length > 0 || prefilled.has(c.id)) return;
    prefilled.add(c.id);
    getSupabase()
      .from("consultation_exams")
      .insert(DEFAULT_EXAMS.map((name, i) => ({ consultation_id: c.id, name, result: "normal", position: i })))
      .select()
      .then(({ data, error }) => {
        if (error) toast(errorMessage(error), "error");
        else setExams(((data as ConsultationExam[]) ?? []).sort((a, b) => a.position - b.position));
      });
  }, [c.id, c.exams, toast]);

  async function add() {
    const name = newName.trim();
    if (!name) return;
    const position = exams.reduce((m, e) => Math.max(m, e.position), -1) + 1;
    const { data, error } = await getSupabase().from("consultation_exams").insert({ consultation_id: c.id, name, result: "normal", position }).select().single();
    if (error) return toast(errorMessage(error), "error");
    setExams((l) => [...l, data as ConsultationExam]);
    setNewName("");
  }

  async function remove(id: string) {
    const { error } = await getSupabase().from("consultation_exams").delete().eq("id", id);
    if (error) return toast(errorMessage(error), "error");
    setExams((l) => l.filter((e) => e.id !== id));
  }

  return (
    <section>
      <SectionTitle icon={<ClipboardCheck />}>Examens effectués</SectionTitle>
      <ul className="space-y-2.5">
        {exams.map((e) => (
          <ExamRow key={e.id} exam={e} onChange={(x) => setExams((l) => l.map((y) => (y.id === x.id ? x : y)))} onDelete={() => remove(e.id)} />
        ))}
      </ul>
      <div className="mt-3 flex gap-2">
        <div className="flex-1">
          <Input value={newName} onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), add())} placeholder="Ajouter un examen (ex. Auscultation cardiaque)" />
        </div>
        <Button variant="soft" className="h-12" onClick={add} icon={<Plus className="size-4" />}>
          Ajouter
        </Button>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------- Vaccinations
function VaccRow({ v, onChange, onDelete }: { v: Vaccination; onChange: (v: Vaccination) => void; onDelete: () => void }) {
  const [name, setName] = useState(v.name);
  const toast = useToast();

  async function patch(p: Partial<Vaccination>) {
    const { error } = await getSupabase().from("vaccinations").update(p).eq("id", v.id);
    if (error) toast(errorMessage(error), "error");
    else onChange({ ...v, ...p });
  }

  return (
    <li className="grid gap-2 rounded-2xl border border-line p-3 sm:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end">
      <Field label="Vaccin">
        <Input list="vaccine-suggestions" value={name} onChange={(e) => setName(e.target.value)} onBlur={() => name.trim() && name !== v.name && patch({ name: name.trim() })} className="h-10" />
      </Field>
      <Field label="Statut">
        <Select value={v.status} onChange={(e) => patch({ status: e.target.value as VaccinationStatus })} className="h-10">
          {(Object.keys(VACCINATION_STATUS) as VaccinationStatus[]).map((s) => (
            <option key={s} value={s}>
              {VACCINATION_STATUS[s].label}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Date">
        <Input type="date" value={v.vaccinated_on ?? ""} onChange={(e) => patch({ vaccinated_on: e.target.value || null })} className="h-10 px-3" />
      </Field>
      <Field label="Prochain rappel">
        <Input type="date" value={v.next_due_on ?? ""} onChange={(e) => patch({ next_due_on: e.target.value || null })} className="h-10 px-3" />
      </Field>
      <button type="button" onClick={onDelete} className="justify-self-end rounded-full p-2.5 text-muted hover:bg-red-50 hover:text-red-600" aria-label="Supprimer la vaccination">
        <Trash2 className="size-4" />
      </button>
    </li>
  );
}

function VaccinationsEditor({ c }: { c: Consultation }) {
  const [list, setList] = useState<Vaccination[]>(c.vaccinations ?? []);
  const [draft, setDraft] = useState({ name: "", status: "a_jour" as VaccinationStatus, vaccinated_on: "", next_due_on: "" });
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  async function add() {
    if (!draft.name.trim()) return toast("Indiquez le nom du vaccin", "error");
    setBusy(true);
    const { data, error } = await getSupabase()
      .from("vaccinations")
      .insert({
        consultation_id: c.id,
        animal_id: c.animal_id,
        name: draft.name.trim(),
        status: draft.status,
        vaccinated_on: draft.vaccinated_on || null,
        next_due_on: draft.next_due_on || null,
      })
      .select()
      .single();
    setBusy(false);
    if (error) return toast(errorMessage(error), "error");
    setList((l) => [...l, data as Vaccination]);
    setDraft({ name: "", status: "a_jour", vaccinated_on: "", next_due_on: "" });
  }

  async function remove(id: string) {
    const { error } = await getSupabase().from("vaccinations").delete().eq("id", id);
    if (error) return toast(errorMessage(error), "error");
    setList((l) => l.filter((v) => v.id !== id));
  }

  return (
    <section>
      <SectionTitle icon={<Syringe />}>Vaccinations</SectionTitle>
      <datalist id="vaccine-suggestions">
        {DEFAULT_VACCINES.map((v) => (
          <option key={v} value={v} />
        ))}
      </datalist>
      {list.length > 0 && (
        <ul className="mb-3 space-y-2.5">
          {list.map((v) => (
            <VaccRow key={v.id} v={v} onChange={(x) => setList((l) => l.map((y) => (y.id === x.id ? x : y)))} onDelete={() => remove(v.id)} />
          ))}
        </ul>
      )}
      <div className="rounded-2xl border border-dashed border-primary/40 bg-primary-soft/30 p-3">
        <div className="mb-2 flex flex-wrap gap-1.5">
          {DEFAULT_VACCINES.map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setDraft((d) => ({ ...d, name: v }))}
              className={cn("rounded-full border px-3 py-1 text-xs font-semibold transition", draft.name === v ? "border-primary bg-primary text-white" : "border-line bg-white text-body hover:border-primary")}
            >
              {v}
            </button>
          ))}
        </div>
        <div className="grid gap-2 sm:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end">
          <Field label="Vaccin">
            <Input list="vaccine-suggestions" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Nom du vaccin" className="h-10" />
          </Field>
          <Field label="Statut">
            <Select value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value as VaccinationStatus })} className="h-10">
              {(Object.keys(VACCINATION_STATUS) as VaccinationStatus[]).map((s) => (
                <option key={s} value={s}>
                  {VACCINATION_STATUS[s].label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Date">
            <Input type="date" value={draft.vaccinated_on} onChange={(e) => setDraft({ ...draft, vaccinated_on: e.target.value })} className="h-10 px-3" />
          </Field>
          <Field label="Prochain rappel">
            <Input type="date" value={draft.next_due_on} onChange={(e) => setDraft({ ...draft, next_due_on: e.target.value })} className="h-10 px-3" />
          </Field>
          <Button onClick={add} loading={busy} className="h-10" icon={<Plus className="size-4" />}>
            Ajouter
          </Button>
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------- Documents
function DocumentsEditor({ c }: { c: Consultation }) {
  const { user } = useAuth();
  const [docs, setDocs] = useState<ConsultationDocument[]>(c.documents ?? []);
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<string>("rapport");
  const [file, setFile] = useState<File | null>(null);
  const [inputKey, setInputKey] = useState(0);
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  async function upload() {
    if (!user || !file) return toast("Choisissez un fichier", "error");
    if (!/^(application\/pdf|image\/)/.test(file.type)) return toast("Formats acceptés : PDF ou image", "error");
    if (file.size > 10 * 1024 * 1024) return toast("Le fichier dépasse 10 Mo", "error");
    setBusy(true);
    try {
      const path = await uploadPrivateDocument(user.id, file, c.id);
      const { data, error } = await getSupabase()
        .from("consultation_documents")
        .insert({ consultation_id: c.id, title: title.trim() || docKind(kind).label, file_path: path, file_name: file.name, kind })
        .select()
        .single();
      if (error) throw error;
      setDocs((d) => [...d, data as ConsultationDocument]);
      setTitle("");
      setFile(null);
      setInputKey((k) => k + 1);
      toast("Document ajouté");
    } catch (e) {
      toast(errorMessage(e), "error");
    } finally {
      setBusy(false);
    }
  }

  async function remove(d: ConsultationDocument) {
    const supabase = getSupabase();
    const { error } = await supabase.from("consultation_documents").delete().eq("id", d.id);
    if (error) return toast(errorMessage(error), "error");
    await supabase.storage.from("vet-documents").remove([d.file_path]);
    setDocs((l) => l.filter((x) => x.id !== d.id));
  }

  return (
    <section>
      <SectionTitle icon={<FileText />}>Documents</SectionTitle>
      {docs.length > 0 && (
        <ul className="mb-3 space-y-2.5">
          {docs.map((d) => (
            <li key={d.id} className="flex items-center gap-3 rounded-2xl border border-line p-3">
              <DocTile kind={d.kind} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-navy">{d.title}</div>
                <div className="truncate text-xs text-muted">
                  {docKind(d.kind).label} · {d.file_name}
                </div>
              </div>
              <ViewDocButton path={d.file_path} />
              <button onClick={() => remove(d)} className="rounded-full p-2 text-muted hover:bg-red-50 hover:text-red-600" aria-label="Supprimer le document">
                <Trash2 className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="grid gap-2 rounded-2xl border border-dashed border-line p-3 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1.2fr)_auto] md:items-end">
        <Field label="Titre">
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={docKind(kind).label} className="h-10" />
        </Field>
        <Field label="Type">
          <Select value={kind} onChange={(e) => setKind(e.target.value)} className="h-10">
            {DOC_KINDS.map((k) => (
              <option key={k.value} value={k.value}>
                {k.value === "rapport" ? "Rapport" : k.value === "vaccination" ? "Vaccination" : k.value === "certificat" ? "Certificat" : "Autre"}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Fichier (PDF ou image)">
          <input
            key={inputKey}
            type="file"
            accept="application/pdf,image/*"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="block h-10 w-full rounded-[var(--radius-input)] border border-line bg-white text-sm text-body file:mr-3 file:h-full file:border-0 file:bg-primary-soft file:px-3 file:text-sm file:font-semibold file:text-primary"
          />
        </Field>
        <Button onClick={upload} loading={busy} disabled={!file} className="h-10" icon={<FileUp className="size-4" />}>
          Téléverser
        </Button>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------- Photos
function PhotosEditor({ c }: { c: Consultation }) {
  const { user } = useAuth();
  const [photos, setPhotos] = useState(c.photos ?? []);
  const toast = useToast();

  async function onChange(urls: string[]) {
    const supabase = getSupabase();
    const current = photos.map((p) => p.url);
    const added = urls.filter((u) => !current.includes(u));
    const removed = photos.filter((p) => !urls.includes(p.url));
    try {
      if (added.length) {
        const { data, error } = await supabase
          .from("consultation_photos")
          .insert(added.map((url) => ({ consultation_id: c.id, url })))
          .select();
        if (error) throw error;
        setPhotos((l) => [...l, ...((data as typeof photos) ?? [])]);
      }
      if (removed.length) {
        const { error } = await supabase
          .from("consultation_photos")
          .delete()
          .in(
            "id",
            removed.map((p) => p.id),
          );
        if (error) throw error;
        setPhotos((l) => l.filter((p) => !removed.some((r) => r.id === p.id)));
      }
    } catch (e) {
      toast(errorMessage(e), "error");
    }
  }

  if (!user) return null;
  return (
    <section>
      <SectionTitle icon={<Images />}>Photos de la consultation</SectionTitle>
      <ImageUploader bucket="consultation-photos" userId={user.id} folder={c.id} value={photos.map((p) => p.url)} onChange={onChange} max={12} cover={false} />
    </section>
  );
}

// ---------------------------------------------------------------- Éditeur complet
export function ReportEditor({ c, onCompleted }: { c: Consultation; onCompleted: () => void }) {
  const toast = useToast();
  const [fields, setFields] = useState<Fields>({
    summary: c.summary ?? "",
    observations: c.observations ?? "",
    weight: c.weight_kg != null ? String(c.weight_kg) : "",
    temperature: c.temperature != null ? String(c.temperature) : "",
  });
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [decision, setDecision] = useState<VetDecision>("approuve");
  const [certify, setCertify] = useState(false);
  const [reason, setReason] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [decisionError, setDecisionError] = useState<string | null>(null);

  const set = (k: keyof Fields) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFields((f) => ({ ...f, [k]: e.target.value }));
    setDirty(true);
  };

  const save = useCallback(async (): Promise<boolean> => {
    setSaving(true);
    const { error } = await getSupabase()
      .from("consultations")
      .update({
        summary: fields.summary.trim() || null,
        observations: fields.observations.trim() || null,
        weight_kg: toNum(fields.weight),
        temperature: toNum(fields.temperature),
      })
      .eq("id", c.id);
    setSaving(false);
    if (error) {
      setSaveError(errorMessage(error));
      return false;
    }
    setSaveError(null);
    setDirty(false);
    setSavedAt(new Date());
    return true;
  }, [fields, c.id]);

  // Sauvegarde automatique 1,5 s après la dernière frappe.
  useEffect(() => {
    if (!dirty) return;
    const t = setTimeout(() => {
      void save();
    }, 1500);
    return () => clearTimeout(t);
  }, [dirty, save]);

  function openConfirm() {
    setDecisionError(null);
    if (decision === "approuve") {
      if (!fields.summary.trim()) return setDecisionError("Rédigez le résumé du rapport avant d'approuver.");
      if (!certify) return setDecisionError("Cochez la case de certification pour approuver.");
    } else if (!reason.trim()) {
      return setDecisionError(decision === "a_revoir" ? "Indiquez les compléments demandés au propriétaire." : "Indiquez le motif de l'avis défavorable.");
    }
    setConfirm(true);
  }

  async function submit() {
    setSubmitting(true);
    const ok = dirty ? await save() : true;
    if (!ok) {
      setSubmitting(false);
      setConfirm(false);
      return;
    }
    const { error } = await getSupabase().rpc("complete_consultation", {
      p_consultation_id: c.id,
      p_decision: decision,
      p_review_reason: decision === "approuve" ? null : reason.trim(),
    });
    setSubmitting(false);
    setConfirm(false);
    if (error) {
      setDecisionError(errorMessage(error));
      return;
    }
    toast(decision === "approuve" ? "Animal approuvé et certifié" : decision === "a_revoir" ? "Compléments demandés au propriétaire" : "Avis défavorable enregistré");
    onCompleted();
  }

  const DECISIONS: { value: VetDecision; title: string; text: string; icon: React.ReactNode; active: string }[] = [
    { value: "approuve", title: "Approuver et certifier", text: "L'animal est apte à être publié.", icon: <ShieldCheck />, active: "border-emerald-500 bg-emerald-50 text-emerald-700" },
    { value: "a_revoir", title: "Demander des compléments", text: "Le propriétaire doit fournir des informations.", icon: <MessageSquareWarning />, active: "border-amber-500 bg-amber-50 text-amber-700" },
    { value: "refuse", title: "Avis défavorable", text: "L'animal n'est pas apte à la publication.", icon: <XCircle />, active: "border-red-500 bg-red-50 text-red-600" },
  ];

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4 sm:px-6">
          <h2 className="text-xl font-bold">Rapport vétérinaire</h2>
          <div className="flex items-center gap-3 text-xs">
            <span className={cn("font-medium", saveError ? "text-red-600" : dirty ? "text-amber-600" : "text-muted")}>
              {saving
                ? "Enregistrement…"
                : saveError
                  ? "Échec de l'enregistrement"
                  : dirty
                    ? "Modifications non enregistrées"
                    : savedAt
                      ? `Enregistré à ${formatTime(savedAt)}`
                      : "Sauvegarde automatique"}
            </span>
            <Button size="sm" variant="outline" onClick={() => void save()} loading={saving} icon={<Save className="size-4" />}>
              Enregistrer
            </Button>
          </div>
        </div>

        <div className="space-y-8 px-5 py-5 sm:px-6">
          <Alert>{saveError}</Alert>
          <section className="rounded-2xl bg-primary-soft/50 p-4 sm:p-5">
            <SectionTitle icon={<Stethoscope />}>Résumé du rapport</SectionTitle>
            <Textarea value={fields.summary} onChange={set("summary")} placeholder="Ex. L'animal est en bonne santé générale. L'examen clinique ne révèle aucune anomalie…" />
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <Field label="Poids mesuré (kg)">
                <Input inputMode="decimal" value={fields.weight} onChange={set("weight")} placeholder="ex. 8,5" />
              </Field>
              <Field label="Température (°C)">
                <Input inputMode="decimal" value={fields.temperature} onChange={set("temperature")} placeholder="ex. 38,5" />
              </Field>
            </div>
          </section>

          <ExamsEditor c={c} />
          <VaccinationsEditor c={c} />

          <section>
            <SectionTitle icon={<FileText />}>Observations</SectionTitle>
            <Textarea value={fields.observations} onChange={set("observations")} placeholder="Comportement, condition physique, recommandations…" />
          </section>

          <DocumentsEditor c={c} />
          <PhotosEditor c={c} />
        </div>
      </Card>

      <Card className="p-5 sm:p-6">
        <h2 className="mb-1 text-xl font-bold">Décision finale</h2>
        <p className="mb-4 text-sm text-muted">La décision est transmise à l&apos;administration et au propriétaire. Le rapport ne sera plus modifiable une fois l&apos;avis rendu (sauf « compléments »).</p>
        <div className="grid gap-3 md:grid-cols-3">
          {DECISIONS.map((d) => (
            <button
              key={d.value}
              type="button"
              onClick={() => {
                setDecision(d.value);
                setDecisionError(null);
              }}
              className={cn(
                "flex items-start gap-3 rounded-2xl border-2 p-4 text-left transition [&>svg]:mt-0.5 [&>svg]:size-5 [&>svg]:shrink-0",
                decision === d.value ? d.active : "border-line text-navy hover:border-primary/50",
              )}
            >
              {d.icon}
              <span>
                <span className="block font-bold">{d.title}</span>
                <span className="block text-xs opacity-80">{d.text}</span>
              </span>
            </button>
          ))}
        </div>

        <div className="mt-4">
          {decision === "approuve" ? (
            <div className="rounded-2xl bg-emerald-50 p-4">
              <Checkbox
                checked={certify}
                onChange={(e) => setCertify(e.target.checked)}
                label={<span className="font-semibold text-emerald-800">Je certifie que cet animal est en bonne santé et apte à être publié sur la plateforme.</span>}
              />
            </div>
          ) : (
            <Field label={decision === "a_revoir" ? "Compléments demandés (envoyés au propriétaire) *" : "Motif de l'avis défavorable *"}>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={decision === "a_revoir" ? "Ex. Merci d'apporter le carnet de vaccination à jour…" : "Ex. Signes de maladie contagieuse, l'animal doit être traité avant toute publication…"}
              />
            </Field>
          )}
        </div>

        <div className="mt-4 space-y-3">
          <Alert>{decisionError}</Alert>
          <div className="flex justify-end">
            <Button
              variant={decision === "approuve" ? "success" : decision === "refuse" ? "danger" : "primary"}
              size="lg"
              onClick={openConfirm}
              icon={decision === "approuve" ? <CheckCircle2 className="size-5" /> : decision === "refuse" ? <XCircle className="size-5" /> : <MessageSquareWarning className="size-5" />}
            >
              {DECISIONS.find((d) => d.value === decision)?.title}
            </Button>
          </div>
        </div>
      </Card>

      <Modal
        open={confirm}
        onClose={() => setConfirm(false)}
        title="Confirmer la décision"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setConfirm(false)}>
              Annuler
            </Button>
            <Button variant={decision === "refuse" ? "danger" : decision === "approuve" ? "success" : "primary"} onClick={submit} loading={submitting}>
              Confirmer
            </Button>
          </>
        }
      >
        <p className="text-sm text-body">
          {decision === "approuve" && "L'animal sera certifié en bonne santé et la demande transmise à l'administration pour publication."}
          {decision === "a_revoir" && "Le propriétaire sera notifié des compléments demandés. Vous pourrez reprendre le rapport ensuite."}
          {decision === "refuse" && "Votre avis défavorable sera transmis à l'administration. La consultation sera clôturée."}
        </p>
      </Modal>
    </div>
  );
}
