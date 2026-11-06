"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { LayoutGrid, List, PawPrint, Search } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { AnimalCell, CategoryPill, PageTitle, useCategories, useMyConsultations } from "@/components/vet/bits";
import { DecisionBadge, StatusBadge } from "@/components/vet/StatusBadge";
import { Alert, AnimalThumb, Avatar, Button, Card, EmptyState, Input, PageLoader, Pagination, Select, cn } from "@/components/ui";
import { formatDate } from "@/lib/labels";
import type { Consultation } from "@/lib/types";
import { ageSex, consultationHaystack, norm } from "@/lib/vet";

type Row = { last: Consultation; count: number };
const PER_PAGE = 12;

const lastDate = (c: Consultation) => c.consulted_at ?? c.updated_at ?? c.created_at;

export default function AnimauxPage() {
  const { user } = useAuth();
  const me = user?.id ?? "";
  const { data, loading, error } = useMyConsultations();
  const { data: categories } = useCategories();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const [decision, setDecision] = useState("");
  const [mode, setMode] = useState<"grille" | "table">("grille");
  const [page, setPage] = useState(1);

  const rows = useMemo(() => {
    const map = new Map<string, Row>();
    for (const c of data ?? []) {
      if (c.vet_id !== me || c.status === "nouvelle" || !c.animal) continue;
      const cur = map.get(c.animal_id);
      if (!cur) map.set(c.animal_id, { last: c, count: 1 });
      else {
        cur.count++;
        if (+new Date(lastDate(c)) > +new Date(lastDate(cur.last))) cur.last = c;
      }
    }
    return [...map.values()].sort((a, b) => +new Date(lastDate(b.last)) - +new Date(lastDate(a.last)));
  }, [data, me]);

  const filtered = useMemo(() => {
    const nq = norm(q.trim());
    return rows.filter(
      (r) =>
        (!nq || consultationHaystack(r.last).includes(nq)) &&
        (!cat || String(r.last.animal?.category_id ?? "") === cat) &&
        (!decision || (decision === "aucune" ? !r.last.decision : r.last.decision === decision)),
    );
  }, [rows, q, cat, decision]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const current = Math.min(page, pageCount);
  const shown = filtered.slice((current - 1) * PER_PAGE, current * PER_PAGE);

  if (loading && !data) return <PageLoader />;

  return (
    <div className="mx-auto max-w-[1400px]">
      <PageTitle
        title="Animaux consultés"
        subtitle={`${rows.length} ${rows.length > 1 ? "animaux examinés" : "animal examiné"} dans le cadre de vos consultations.`}
        action={
          <div className="flex rounded-xl border border-line bg-white p-1">
            {(
              [
                ["grille", LayoutGrid],
                ["table", List],
              ] as const
            ).map(([m, Icon]) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={cn("grid size-9 place-items-center rounded-lg transition", mode === m ? "bg-primary text-white" : "text-muted hover:text-navy")}
                aria-label={m === "grille" ? "Vue grille" : "Vue liste"}
              >
                <Icon className="size-4" />
              </button>
            ))}
          </div>
        }
      />
      <Alert>{error}</Alert>

      <Card className="mb-6 grid gap-3 p-3 sm:p-4 md:grid-cols-[minmax(0,1.6fr)_1fr_1fr]">
        <Input
          icon={<Search />}
          placeholder="Rechercher un animal, une race, un propriétaire…"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setPage(1);
          }}
        />
        <Select
          icon={<PawPrint />}
          value={cat}
          onChange={(e) => {
            setCat(e.target.value);
            setPage(1);
          }}
        >
          <option value="">Tous les types</option>
          {(categories ?? []).map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
        <Select
          value={decision}
          onChange={(e) => {
            setDecision(e.target.value);
            setPage(1);
          }}
        >
          <option value="">Toutes les décisions</option>
          <option value="approuve">Approuvé</option>
          <option value="refuse">Défavorable</option>
          <option value="a_revoir">À revoir</option>
          <option value="aucune">Sans décision</option>
        </Select>
      </Card>

      {shown.length === 0 ? (
        <Card>
          <EmptyState
            icon={<PawPrint />}
            title={rows.length === 0 ? "Aucun animal consulté" : "Aucun résultat"}
            text={rows.length === 0 ? "Les animaux que vous prendrez en charge apparaîtront ici." : "Modifiez votre recherche ou vos filtres."}
            action={
              rows.length === 0 && (
                <Button href="/demandes" variant="soft" size="sm">
                  Voir les demandes
                </Button>
              )
            }
          />
        </Card>
      ) : mode === "grille" ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {shown.map(({ last: c, count }) => (
            <Link key={c.animal_id} href={`/demandes/${c.id}`} className="group">
              <Card className="h-full overflow-hidden transition group-hover:-translate-y-0.5 group-hover:shadow-lg">
                <div className="relative">
                  <AnimalThumb src={c.animal?.cover_url} alt={c.animal?.name} className="aspect-[4/3] w-full" />
                  <div className="absolute left-3 top-3">
                    <StatusBadge status={c.status} className="bg-white/95 shadow-sm" />
                  </div>
                </div>
                <div className="space-y-2 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="truncate text-lg font-bold">{c.animal?.name}</h3>
                    <CategoryPill category={c.animal?.category} />
                  </div>
                  <p className="truncate text-sm text-body">
                    {c.animal?.breed}
                    {ageSex(c.animal) && ` · ${ageSex(c.animal)}`}
                  </p>
                  <div className="flex items-center gap-2 text-sm text-body">
                    <Avatar src={c.animal?.owner?.avatar_url} name={c.animal?.owner?.full_name} size={24} />
                    <span className="truncate">{c.animal?.owner?.full_name}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2 border-t border-line pt-3">
                    <span className="text-xs text-muted">
                      Dernière consultation
                      <br />
                      <span className="font-semibold text-navy">{formatDate(lastDate(c))}</span>
                      {count > 1 && <span> · {count} consultations</span>}
                    </span>
                    <DecisionBadge decision={c.decision} />
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto p-3">
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead>
                <tr className="bg-page/80 text-[13px] font-semibold text-navy">
                  <th className="rounded-l-xl px-3 py-3">Animal</th>
                  <th className="px-3 py-3">Propriétaire</th>
                  <th className="px-3 py-3">Type</th>
                  <th className="px-3 py-3">Dernière consultation</th>
                  <th className="px-3 py-3">Décision</th>
                  <th className="px-3 py-3">Statut</th>
                  <th className="rounded-r-xl px-3 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {shown.map(({ last: c, count }) => (
                  <tr key={c.animal_id}>
                    <td className="px-3 py-3">
                      <AnimalCell c={c} size="sm" />
                    </td>
                    <td className="px-3 py-3 text-body">{c.animal?.owner?.full_name}</td>
                    <td className="px-3 py-3">
                      <CategoryPill category={c.animal?.category} />
                    </td>
                    <td className="px-3 py-3 text-body">
                      {formatDate(lastDate(c))}
                      {count > 1 && <div className="text-xs text-muted">{count} consultations</div>}
                    </td>
                    <td className="px-3 py-3">
                      <DecisionBadge decision={c.decision} />
                    </td>
                    <td className="px-3 py-3">
                      <StatusBadge status={c.status} />
                    </td>
                    <td className="px-3 py-3 text-right">
                      <Button size="sm" variant="outline" href={`/demandes/${c.id}`} className="px-5">
                        Voir
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <div className="mt-6 flex justify-center">
        <Pagination page={current} pageCount={pageCount} onChange={setPage} />
      </div>
    </div>
  );
}
