"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Check, Lock, Mail, MapPin, MessageCircle, Phone, X } from "lucide-react";
import { getSupabase, errorMessage } from "@/lib/supabase";
import { LISTING_TYPE, SEX_LABEL, formatAge, formatDate } from "@/lib/labels";
import type { Animal, Consultation, Profile, ProfileContact, Veterinarian } from "@/lib/types";
import { CategoryPill } from "../vet/bits";
import { AnimalThumb, Avatar, Badge, Button, Card, cn, useToast } from "../ui";

type Owner = Profile & { contact?: ProfileContact | null };

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[130px_minmax(0,1fr)] gap-3 py-1.5 text-sm">
      <dt className="text-body">{label}</dt>
      <dd className="font-medium text-navy">{children}</dd>
    </div>
  );
}

function HealthFlag({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold", ok ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500")}>
      {ok ? <Check className="size-3.5" /> : <X className="size-3.5" />}
      {label}
    </span>
  );
}

/** Carte animal : galerie + caractéristiques + santé déclarée. */
export function AnimalCard({ animal, submittedAt }: { animal: Animal; submittedAt?: string | null }) {
  const photos = [...(animal.photos ?? [])].sort((a, b) => a.position - b.position).map((p) => p.url);
  if (photos.length === 0 && animal.cover_url) photos.push(animal.cover_url);
  const [active, setActive] = useState(0);
  const main = photos[Math.min(active, Math.max(0, photos.length - 1))];

  return (
    <Card className="p-4 sm:p-5">
      <div className="grid gap-5 md:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
        <div>
          <AnimalThumb src={main} alt={animal.name} className="aspect-[4/3] w-full rounded-2xl" />
          {photos.length > 1 && (
            <div className="mt-2 grid grid-cols-4 gap-2">
              {photos.slice(0, 8).map((u, i) => (
                <button key={u} onClick={() => setActive(i)} className={cn("overflow-hidden rounded-xl ring-2 transition", i === active ? "ring-primary" : "ring-transparent hover:ring-primary/40")}>
                  <AnimalThumb src={u} alt="" className="aspect-square w-full" />
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <h2 className="text-2xl font-extrabold">{animal.name}</h2>
            <CategoryPill category={animal.category} />
            <Badge tone={LISTING_TYPE[animal.listing_type].tone} dot={false}>
              {LISTING_TYPE[animal.listing_type].label}
            </Badge>
          </div>
          <dl>
            {animal.breed && <Row label="Race">{animal.breed}</Row>}
            <Row label="Âge">{formatAge(animal.age_value, animal.age_unit)}</Row>
            <Row label="Sexe">{animal.sex ? `${animal.sex === "male" ? "♂" : "♀"} ${SEX_LABEL[animal.sex]}` : "—"}</Row>
            <Row label="Couleur">{animal.color || "—"}</Row>
            <Row label="Poids déclaré">{animal.weight_kg != null ? `${animal.weight_kg} kg` : "—"}</Row>
            {animal.size && <Row label="Taille">{animal.size}</Row>}
            <Row label="Ville">{animal.city || "—"}</Row>
            <Row label="Propriétaire">{animal.owner?.full_name ?? "—"}</Row>
            {submittedAt && <Row label="Date de soumission">{formatDate(submittedAt)}</Row>}
          </dl>
          <div className="mt-3">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Santé déclarée par le propriétaire</p>
            <div className="flex flex-wrap gap-2">
              <HealthFlag ok={animal.vaccinated} label="Vacciné" />
              <HealthFlag ok={animal.dewormed} label="Vermifugé" />
              <HealthFlag ok={animal.sterilized} label="Stérilisé" />
              <HealthFlag ok={animal.healthy} label="En bonne santé" />
            </div>
          </div>
        </div>
      </div>
      {(animal.description || animal.short_description) && (
        <div className="mt-5 rounded-2xl bg-page/70 p-4">
          <p className="mb-1 text-sm font-bold text-navy">Description</p>
          <p className="whitespace-pre-line text-sm text-body">{animal.description || animal.short_description}</p>
        </div>
      )}
    </Card>
  );
}

/** Carte propriétaire. Les coordonnées ne sont lisibles (RLS) qu'après prise en charge. */
export function OwnerCard({ owner, consultation, canContact }: { owner: Owner | null | undefined; consultation: Consultation; canContact: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  if (!owner) return null;
  const contact = owner.contact;

  async function contactOwner() {
    setBusy(true);
    const { data, error } = await getSupabase().rpc("start_conversation", { p_other: owner!.id, p_animal_id: consultation.animal_id });
    setBusy(false);
    if (error || !data) {
      toast(errorMessage(error), "error");
      return;
    }
    router.push(`/messages?c=${data}`);
  }

  return (
    <Card className="p-5">
      <h3 className="mb-4 text-lg font-bold">Informations du propriétaire</h3>
      <div className="flex items-start gap-4">
        <Avatar src={owner.avatar_url} name={owner.full_name} size={72} />
        <div className="min-w-0 space-y-1.5 text-sm">
          <div className="text-base font-bold text-navy">{owner.full_name}</div>
          {canContact && contact ? (
            <>
              {contact.email && (
                <a href={`mailto:${contact.email}`} className="flex items-center gap-2 text-body hover:text-primary">
                  <Mail className="size-4 shrink-0 text-muted" />
                  <span className="truncate">{contact.email}</span>
                </a>
              )}
              {contact.phone && (
                <a href={`tel:${contact.phone}`} className="flex items-center gap-2 text-body hover:text-primary">
                  <Phone className="size-4 shrink-0 text-muted" />
                  {contact.phone}
                </a>
              )}
            </>
          ) : (
            <p className="flex items-center gap-2 text-xs text-muted">
              <Lock className="size-3.5" /> Coordonnées visibles après prise en charge
            </p>
          )}
          {owner.city && (
            <p className="flex items-center gap-2 text-body">
              <MapPin className="size-4 shrink-0 text-muted" />
              {owner.city}, Tunisie
            </p>
          )}
        </div>
      </div>
      {canContact && (
        <Button variant="outline" className="mt-4 w-full text-primary" onClick={contactOwner} loading={busy} icon={<MessageCircle className="size-4" />}>
          Contacter le propriétaire
        </Button>
      )}
    </Card>
  );
}

/** Carte « Vétérinaire ayant effectué la consultation ». */
export function VetCard({ vet }: { vet: (Profile & { contact?: ProfileContact | null; veterinarian?: Veterinarian | null }) | null | undefined }) {
  if (!vet) return null;
  const v = vet.veterinarian;
  return (
    <Card className="p-5">
      <h3 className="mb-4 text-lg font-bold">Vétérinaire ayant effectué la consultation</h3>
      <div className="flex items-start gap-4">
        <Avatar src={vet.avatar_url} name={vet.full_name} size={64} />
        <div className="min-w-0 space-y-1 text-sm">
          <div className="text-base font-bold text-navy">Dr. {vet.full_name.replace(/^dr\.?\s+/i, "")}</div>
          {v?.clinic_name && <div className="text-body">{v.clinic_name}</div>}
          {vet.contact?.phone && (
            <p className="flex items-center gap-2 text-body">
              <Phone className="size-4 text-muted" /> {vet.contact.phone}
            </p>
          )}
          {(v?.city || vet.city) && (
            <p className="flex items-center gap-2 text-body">
              <MapPin className="size-4 text-muted" /> {v?.city || vet.city}, Tunisie
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}
