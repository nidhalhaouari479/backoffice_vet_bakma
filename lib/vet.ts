// Helpers spécifiques au back-office vétérinaire (requêtes, filtres, libellés).
import { SEX_LABEL, formatAge, type Tone } from "./labels";
import type { Animal, Consultation, ConsultationStatus } from "./types";

/** Sélection « liste » des consultations (FK nommées — cf. BRIEF-DEV). */
export const CONSULTATION_LIST =
  "*, animal:animals!consultations_animal_id_fkey(id, name, breed, age_value, age_unit, sex, color, city, cover_url, status, category_id, category:categories!animals_category_id_fkey(*), owner:profiles!animals_owner_id_fkey(id, full_name, avatar_url, city)), request:publication_requests!consultations_request_id_fkey(id, ref, status, step, submitted_at)";

/** Sélection complète pour la fiche consultation. */
export const CONSULTATION_FULL =
  "*, animal:animals!consultations_animal_id_fkey(*, category:categories!animals_category_id_fkey(*), photos:animal_photos!animal_photos_animal_id_fkey(*), owner:profiles!animals_owner_id_fkey(*, contact:profile_contacts!profile_contacts_id_fkey(*))), vet:profiles!consultations_vet_id_fkey(*, contact:profile_contacts!profile_contacts_id_fkey(*), veterinarian:veterinarians!veterinarians_profile_id_fkey(*)), request:publication_requests!consultations_request_id_fkey(*), exams:consultation_exams!consultation_exams_consultation_id_fkey(*), vaccinations!vaccinations_consultation_id_fkey(*), documents:consultation_documents!consultation_documents_consultation_id_fkey(*), photos:consultation_photos!consultation_photos_consultation_id_fkey(*)";

/** Onglets de la page Demandes. */
export type DemandeTab = "nouvelles" | "en_cours" | "a_revoir" | "terminees" | "toutes";

export const DEMANDE_TABS: { value: DemandeTab; label: string }[] = [
  { value: "nouvelles", label: "Nouvelles" },
  { value: "en_cours", label: "En cours" },
  { value: "a_revoir", label: "À revoir" },
  { value: "terminees", label: "Terminées" },
  { value: "toutes", label: "Toutes" },
];

/** Consultations réellement pertinentes pour le vétérinaire : le pool « nouvelle » + les siennes. */
export function isRelevant(c: Consultation, me: string): boolean {
  if (c.vet_id === me) return true;
  return c.vet_id == null && c.status === "nouvelle";
}

export function matchTab(c: Consultation, tab: DemandeTab, me: string): boolean {
  if (!isRelevant(c, me)) return false;
  switch (tab) {
    case "nouvelles":
      return c.status === "nouvelle";
    case "en_cours":
      return c.vet_id === me && c.status === "en_cours";
    case "a_revoir":
      return c.vet_id === me && c.status === "a_revoir";
    case "terminees":
      return c.vet_id === me && c.status === "terminee";
    default:
      return true;
  }
}

export function countByStatus(list: Consultation[], me: string) {
  const out: Record<"nouvelles" | "en_cours" | "terminees" | "a_revoir", number> = { nouvelles: 0, en_cours: 0, terminees: 0, a_revoir: 0 };
  for (const c of list) {
    if (matchTab(c, "nouvelles", me)) out.nouvelles++;
    else if (matchTab(c, "en_cours", me)) out.en_cours++;
    else if (matchTab(c, "terminees", me)) out.terminees++;
    else if (matchTab(c, "a_revoir", me)) out.a_revoir++;
  }
  return out;
}

/** Date de la demande (soumission) d'une consultation. */
export const requestDate = (c: Consultation) => c.request?.submitted_at ?? c.created_at;

/** « 3 mois · Mâle » */
export function ageSex(a: Pick<Animal, "age_value" | "age_unit" | "sex"> | null | undefined): string {
  if (!a) return "";
  const parts = [a.age_value != null ? formatAge(a.age_value, a.age_unit) : null, a.sex ? SEX_LABEL[a.sex] : null].filter(Boolean);
  return parts.join(" · ");
}

/** Couleur de la pastille « type d'animal » (cf. spec : Chien beige, Chat lavande, Rongeur vert, Oiseau bleu). */
export function categoryTone(slug: string | null | undefined): Tone {
  switch (slug) {
    case "chiens":
      return "orange";
    case "chats":
      return "purple";
    case "rongeurs":
      return "green";
    case "oiseaux":
      return "blue";
    case "poissons":
      return "teal";
    default:
      return "grey";
  }
}

/** Texte de recherche normalisé (sans accents). */
export function norm(s: string | null | undefined): string {
  return (s ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

export function consultationHaystack(c: Consultation): string {
  return norm([c.animal?.name, c.animal?.breed, c.animal?.owner?.full_name, c.animal?.category?.name, c.request?.ref, c.animal?.city].join(" "));
}

export const STATUS_ORDER: ConsultationStatus[] = ["nouvelle", "en_cours", "a_revoir", "terminee", "annulee"];

/** « Dr. Prénom » à partir du nom complet. */
export function drName(fullName: string | null | undefined, full = false): string {
  const n = (fullName ?? "").trim();
  if (!n) return "Docteur";
  const clean = n.replace(/^dr\.?\s+/i, "");
  return `Dr. ${full ? clean : clean.split(/\s+/)[0]}`;
}

/** Valeur pour <input type="datetime-local"> à partir d'une date ISO (heure locale). */
export function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

/** Lundi de la semaine de d. */
export function startOfWeek(d: Date): Date {
  const x = startOfDay(d);
  const day = (x.getDay() + 6) % 7;
  x.setDate(x.getDate() - day);
  return x;
}

export function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

/** « Lundi 8 oct. 2026 » */
export function dayLabel(d: Date): string {
  const wd = new Intl.DateTimeFormat("fr-FR", { weekday: "long" }).format(d);
  const date = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric" }).format(d);
  return `${wd.charAt(0).toUpperCase()}${wd.slice(1)} ${date}`;
}
