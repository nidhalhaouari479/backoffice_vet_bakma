"use client";

import { useRef, useState } from "react";
import { BadgeCheck, Building2, Camera, Clock, Eye, EyeOff, KeyRound, Lock, Mail, MapPin, Phone, Save, Stethoscope, User } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, must } from "@/hooks/useQuery";
import { PageTitle } from "@/components/vet/bits";
import { Alert, Avatar, Badge, Button, Card, CardHeader, Field, Input, PageLoader, Select, Spinner, Textarea, useToast } from "@/components/ui";
import { getSupabase, errorMessage } from "@/lib/supabase";
import { uploadPublicFile } from "@/lib/storage";
import { formatDate } from "@/lib/labels";
import type { City } from "@/lib/types";

function ProfileForm() {
  const { user, profile, contact, vet, refreshProfile } = useAuth();
  const toast = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    full_name: profile?.full_name ?? "",
    city: profile?.city ?? "",
    bio: profile?.bio ?? "",
    phone: contact?.phone ?? "",
    clinic_name: vet?.clinic_name ?? "",
    license_number: vet?.license_number ?? "",
    specialty: vet?.specialty ?? "",
    address: vet?.address ?? "",
    vet_city: vet?.city ?? "",
  });
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const { data: cities } = useQuery<City[]>(() => must(getSupabase().from("cities").select("*").order("name")).then((d) => (d as City[]) ?? []), "cities");

  const [pwd, setPwd] = useState({ next: "", confirm: "" });
  const [showPwd, setShowPwd] = useState(false);
  const [pwdBusy, setPwdBusy] = useState(false);
  const [pwdError, setPwdError] = useState<string | null>(null);

  if (!user || !profile) return <PageLoader />;

  async function onAvatar(file: File | undefined) {
    if (!file || !user) return;
    if (!file.type.startsWith("image/")) return toast("Choisissez une image", "error");
    if (file.size > 5 * 1024 * 1024) return toast("L'image dépasse 5 Mo", "error");
    setUploading(true);
    try {
      const url = await uploadPublicFile("avatars", user.id, file);
      const { error } = await getSupabase().from("profiles").update({ avatar_url: url }).eq("id", user.id);
      if (error) throw error;
      await refreshProfile();
      toast("Photo de profil mise à jour");
    } catch (e) {
      toast(errorMessage(e), "error");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    if (!form.full_name.trim()) return setError("Le nom complet est obligatoire.");
    setSaving(true);
    setError(null);
    try {
      const supabase = getSupabase();
      const p = await supabase
        .from("profiles")
        .update({ full_name: form.full_name.trim(), city: form.city || null, bio: form.bio.trim() || null })
        .eq("id", user.id);
      if (p.error) throw p.error;
      const c = await supabase.from("profile_contacts").update({ phone: form.phone.trim() || null }).eq("id", user.id);
      if (c.error) throw c.error;
      if (vet) {
        const v = await supabase
          .from("veterinarians")
          .update({
            clinic_name: form.clinic_name.trim() || null,
            license_number: form.license_number.trim() || null,
            specialty: form.specialty.trim() || null,
            address: form.address.trim() || null,
            city: form.vet_city || null,
          })
          .eq("profile_id", user.id);
        if (v.error) throw v.error;
      }
      await refreshProfile();
      toast("Profil enregistré");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwdError(null);
    if (pwd.next.length < 8) return setPwdError("Le mot de passe doit contenir au moins 8 caractères.");
    if (pwd.next !== pwd.confirm) return setPwdError("Les mots de passe ne correspondent pas.");
    setPwdBusy(true);
    const { error } = await getSupabase().auth.updateUser({ password: pwd.next });
    setPwdBusy(false);
    if (error) return setPwdError(errorMessage(error));
    setPwd({ next: "", confirm: "" });
    toast("Mot de passe modifié");
  }

  const cityOptions = (cities ?? []).map((c) => (
    <option key={c.id} value={c.name}>
      {c.name}
    </option>
  ));

  return (
    <div className="mx-auto max-w-5xl">
      <PageTitle title="Mon profil" subtitle="Gérez vos informations personnelles et celles de votre clinique." />

      <div className="grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
        <div className="space-y-6">
          <Card className="flex flex-col items-center p-6 text-center">
            <div className="relative">
              <Avatar src={profile.avatar_url} name={profile.full_name} size={112} />
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="absolute bottom-0 right-0 grid size-9 place-items-center rounded-full border-2 border-white bg-primary text-white shadow transition hover:bg-primary-dark"
                aria-label="Changer la photo"
              >
                {uploading ? <Spinner className="size-4 text-white" /> : <Camera className="size-4" />}
              </button>
              <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => onAvatar(e.target.files?.[0])} />
            </div>
            <h2 className="mt-4 text-xl font-bold">Dr. {profile.full_name.replace(/^dr\.?\s+/i, "")}</h2>
            <p className="text-sm text-muted">{vet?.specialty || "Vétérinaire"}</p>
            <div className="mt-3">
              {vet?.is_verified ? (
                <Badge tone="green" dot={false} className="px-3 py-1.5">
                  <BadgeCheck className="size-4" /> Compte validé
                </Badge>
              ) : (
                <Badge tone="orange" dot={false} className="px-3 py-1.5">
                  <Clock className="size-4" /> En attente de validation
                </Badge>
              )}
            </div>
            {vet?.is_verified && vet.verified_at && <p className="mt-2 text-xs text-muted">Validé le {formatDate(vet.verified_at)}</p>}
            <div className="mt-5 w-full space-y-2 border-t border-line pt-4 text-left text-sm">
              <p className="flex items-center gap-2 text-body">
                <Mail className="size-4 text-muted" /> <span className="truncate">{contact?.email ?? user.email}</span>
              </p>
              {contact?.phone && (
                <p className="flex items-center gap-2 text-body">
                  <Phone className="size-4 text-muted" /> {contact.phone}
                </p>
              )}
              {vet?.clinic_name && (
                <p className="flex items-center gap-2 text-body">
                  <Building2 className="size-4 text-muted" /> {vet.clinic_name}
                </p>
              )}
              {(vet?.city || profile.city) && (
                <p className="flex items-center gap-2 text-body">
                  <MapPin className="size-4 text-muted" /> {vet?.city || profile.city}, Tunisie
                </p>
              )}
            </div>
          </Card>
          {!vet?.is_verified && (
            <Alert tone="orange">
              Complétez vos informations professionnelles (clinique, n° d&apos;inscription à l&apos;Ordre) : l&apos;administration les vérifiera pour valider votre compte.
            </Alert>
          )}
        </div>

        <div className="space-y-6">
          <form onSubmit={save}>
            <Card>
              <CardHeader title="Informations personnelles" icon={<User />} />
              <div className="grid gap-4 px-6 pb-6 sm:grid-cols-2">
                <Field label="Nom complet *">
                  <Input value={form.full_name} onChange={set("full_name")} icon={<User />} />
                </Field>
                <Field label="Adresse e-mail" hint="L'e-mail de connexion ne peut pas être modifié ici.">
                  <Input value={contact?.email ?? user.email ?? ""} disabled icon={<Mail />} />
                </Field>
                <Field label="Téléphone">
                  <Input value={form.phone} onChange={set("phone")} placeholder="+216 00 000 000" icon={<Phone />} type="tel" />
                </Field>
                <Field label="Ville">
                  <Select value={form.city} onChange={set("city")} icon={<MapPin />}>
                    <option value="">Sélectionner</option>
                    {cityOptions}
                  </Select>
                </Field>
                <Field label="Présentation" className="sm:col-span-2">
                  <Textarea value={form.bio} onChange={set("bio")} placeholder="Votre parcours, vos domaines d'expertise…" />
                </Field>
              </div>
            </Card>

            <Card className="mt-6">
              <CardHeader title="Informations professionnelles" subtitle="Vérifiées par l'administration" icon={<Stethoscope />} />
              {vet ? (
                <div className="grid gap-4 px-6 pb-6 sm:grid-cols-2">
                  <Field label="Nom de la clinique">
                    <Input value={form.clinic_name} onChange={set("clinic_name")} placeholder="Clinique vétérinaire…" icon={<Building2 />} />
                  </Field>
                  <Field label="N° d'inscription à l'Ordre">
                    <Input value={form.license_number} onChange={set("license_number")} placeholder="ex. CNOV-12345" icon={<BadgeCheck />} />
                  </Field>
                  <Field label="Spécialité">
                    <Input value={form.specialty} onChange={set("specialty")} placeholder="ex. Animaux de compagnie, NAC…" icon={<Stethoscope />} />
                  </Field>
                  <Field label="Ville de la clinique">
                    <Select value={form.vet_city} onChange={set("vet_city")} icon={<MapPin />}>
                      <option value="">Sélectionner</option>
                      {cityOptions}
                    </Select>
                  </Field>
                  <Field label="Adresse de la clinique" className="sm:col-span-2">
                    <Input value={form.address} onChange={set("address")} placeholder="Rue, quartier…" icon={<MapPin />} />
                  </Field>
                </div>
              ) : (
                <div className="px-6 pb-6">
                  <Alert tone="orange">Aucune fiche vétérinaire n&apos;est associée à votre compte. Contactez l&apos;administration.</Alert>
                </div>
              )}
              <div className="flex flex-col gap-3 border-t border-line px-6 py-4 sm:flex-row sm:items-center sm:justify-end">
                {error && (
                  <div className="flex-1">
                    <Alert>{error}</Alert>
                  </div>
                )}
                <Button type="submit" loading={saving} icon={<Save className="size-4" />}>
                  Enregistrer les modifications
                </Button>
              </div>
            </Card>
          </form>

          <form onSubmit={changePassword}>
            <Card>
              <CardHeader title="Mot de passe" subtitle="Choisissez un mot de passe d'au moins 8 caractères." icon={<KeyRound />} />
              <div className="grid gap-4 px-6 pb-4 sm:grid-cols-2">
                <Field label="Nouveau mot de passe">
                  <Input
                    type={showPwd ? "text" : "password"}
                    value={pwd.next}
                    onChange={(e) => setPwd({ ...pwd, next: e.target.value })}
                    icon={<Lock />}
                    autoComplete="new-password"
                    right={
                      <button type="button" onClick={() => setShowPwd((s) => !s)} className="text-muted hover:text-primary" aria-label="Afficher le mot de passe">
                        {showPwd ? <EyeOff className="size-[18px]" /> : <Eye className="size-[18px]" />}
                      </button>
                    }
                  />
                </Field>
                <Field label="Confirmer le mot de passe">
                  <Input type={showPwd ? "text" : "password"} value={pwd.confirm} onChange={(e) => setPwd({ ...pwd, confirm: e.target.value })} icon={<Lock />} autoComplete="new-password" />
                </Field>
              </div>
              <div className="flex flex-col gap-3 border-t border-line px-6 py-4 sm:flex-row sm:items-center sm:justify-end">
                {pwdError && (
                  <div className="flex-1">
                    <Alert>{pwdError}</Alert>
                  </div>
                )}
                <Button type="submit" variant="outline" loading={pwdBusy} icon={<KeyRound className="size-4" />}>
                  Changer le mot de passe
                </Button>
              </div>
            </Card>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function ProfilPage() {
  return <ProfileForm />;
}
