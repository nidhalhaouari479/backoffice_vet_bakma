"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Eye, Hand, MessageCircle, MoreHorizontal } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { must, useQuery } from "@/hooks/useQuery";
import { getSupabase } from "@/lib/supabase";
import type { Category, Consultation } from "@/lib/types";
import { CONSULTATION_LIST, ageSex, categoryTone } from "@/lib/vet";
import { AnimalThumb, Badge, Card, cn } from "../ui";

/** Toutes les consultations pertinentes pour le vétérinaire connecté : les siennes + le pool « nouvelle ». */
export function useMyConsultations() {
  const { user } = useAuth();
  const me = user?.id ?? "";
  return useQuery<Consultation[]>(
    () =>
      must(
        getSupabase()
          .from("consultations")
          .select(CONSULTATION_LIST)
          .or(`vet_id.eq.${me},and(vet_id.is.null,status.eq.nouvelle)`)
          .order("created_at", { ascending: false })
          .limit(1000),
      ).then((d) => (d as unknown as Consultation[]) ?? []),
    `consultations:${me}`,
    !!me,
  );
}

export function useCategories() {
  return useQuery<Category[]>(
    () => must(getSupabase().from("categories").select("*").order("sort_order")).then((d) => (d as Category[]) ?? []),
    "categories",
  );
}

export function PageTitle({ title, subtitle, action, kicker }: { title: React.ReactNode; subtitle?: React.ReactNode; action?: React.ReactNode; kicker?: string }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {kicker && <p className="text-sm font-medium text-body">{kicker}</p>}
        <h1 className="text-2xl font-extrabold tracking-tight sm:text-[32px] sm:leading-tight">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-body sm:text-base">{subtitle}</p>}
      </div>
      {action && <div className="flex shrink-0 flex-wrap gap-2">{action}</div>}
    </div>
  );
}

export function CategoryPill({ category }: { category: Category | null | undefined }) {
  if (!category) return null;
  return (
    <Badge tone={categoryTone(category.slug)} dot={false}>
      {category.name}
    </Badge>
  );
}

/** Cellule « Animal » : photo + nom + race + âge · sexe */
export function AnimalCell({ c, size = "md" }: { c: Consultation; size?: "sm" | "md" }) {
  const a = c.animal;
  return (
    <div className="flex min-w-0 items-center gap-3">
      <AnimalThumb src={a?.cover_url} alt={a?.name} className={cn("shrink-0 rounded-xl", size === "md" ? "size-16" : "size-12")} />
      <div className="min-w-0">
        <div className="truncate font-bold text-navy">{a?.name ?? "Animal indisponible"}</div>
        {a?.breed && <div className="truncate text-sm text-body">{a.breed}</div>}
        <div className="truncate text-xs text-muted">{ageSex(a)}</div>
      </div>
    </div>
  );
}

/** Menu ⋮ des lignes de demandes. */
export function RowMenu({ c, onClaim }: { c: Consultation; onClaim?: (c: Consultation) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const claimable = c.status === "nouvelle" && (c.vet_id == null || c.vet_id === user?.id);
  const mine = c.vet_id === user?.id && c.status !== "nouvelle";

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="grid size-9 place-items-center rounded-full border border-line text-muted transition hover:border-primary hover:text-primary"
        aria-label="Plus d'actions"
      >
        <MoreHorizontal className="size-4" />
      </button>
      {open && (
        <Card className="absolute right-0 top-11 z-20 w-56 p-1.5 text-left">
          <Link href={`/demandes/${c.id}`} className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-body hover:bg-page">
            <Eye className="size-4" /> Voir la demande
          </Link>
          {claimable && onClaim && (
            <button
              onClick={() => {
                setOpen(false);
                onClaim(c);
              }}
              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-primary hover:bg-primary-soft"
            >
              <Hand className="size-4" /> Prendre en charge
            </button>
          )}
          {mine && c.animal?.owner && (
            <button
              onClick={async () => {
                setOpen(false);
                const { data, error } = await getSupabase().rpc("start_conversation", { p_other: c.animal!.owner!.id, p_animal_id: c.animal_id });
                if (!error && data) router.push(`/messages?c=${data}`);
              }}
              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-body hover:bg-page"
            >
              <MessageCircle className="size-4" /> Contacter le propriétaire
            </button>
          )}
        </Card>
      )}
    </div>
  );
}
