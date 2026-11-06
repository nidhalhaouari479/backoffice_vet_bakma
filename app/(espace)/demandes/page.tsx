"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import { CalendarDays, CheckCircle2, ChevronRight, ClipboardList, Clock, Filter, Hand, Layers, PawPrint, Search, XCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useCounters } from "@/hooks/useCounters";
import { AnimalCell, CategoryPill, PageTitle, RowMenu, useCategories, useMyConsultations } from "@/components/vet/bits";
import { ClaimModal } from "@/components/vet/ClaimModal";
import { StatusBadge } from "@/components/vet/StatusBadge";
import { Alert, AnimalThumb, Avatar, Button, Card, EmptyState, Input, PageLoader, Pagination, Select, cn } from "@/components/ui";
import { formatDate, formatDateTime, formatTime } from "@/lib/labels";
import type { Consultation } from "@/lib/types";
import { DEMANDE_TABS, type DemandeTab, ageSex, consultationHaystack, matchTab, norm, requestDate } from "@/lib/vet";

type DateFilter = "" | "jour" | "7j" | "30j";

const TAB_ICON: Record<DemandeTab, React.ReactNode> = {
  nouvelles: <ClipboardList className="text-primary" />,
  en_cours: <Clock className="text-amber-500" />,
  a_revoir: <XCircle className="text-red-500" />,
  terminees: <CheckCircle2 className="text-emerald-500" />,
  toutes: <Layers className="text-navy" />,
};

function DemandesInner({ initialTab, initialQ }: { initialTab: DemandeTab; initialQ: string }) {
  const { user } = useAuth();
  const me = user?.id ?? "";
  const router = useRouter();
  const { refresh } = useCounters();
  const { data, loading, error, reload } = useMyConsultations();
  const { data: categories } = useCategories();

  const [tab, setTab] = useState<DemandeTab>(initialTab);
  const [q, setQ] = useState(initialQ);
  const [cat, setCat] = useState("");
  const [dateF, setDateF] = useState<DateFilter>("");
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(8);
  const [claiming, setClaiming] = useState<Consultation | null>(null);
  const [now] = useState(() => Date.now());

  const all = useMemo(() => data ?? [], [data]);
  const counts = useMemo(() => {
    const out = {} as Record<DemandeTab, number>;
    for (const t of DEMANDE_TABS) out[t.value] = all.filter((c) => matchTab(c, t.value, me)).length;
    return out;
  }, [all, me]);

  const filtered = useMemo(() => {
    const nq = norm(q.trim());
    const minDate = dateF === "jour" ? new Date(now).setHours(0, 0, 0, 0) : dateF === "7j" ? now - 7 * 86400000 : dateF === "30j" ? now - 30 * 86400000 : 0;
    return all
      .filter((c) => matchTab(c, tab, me))
      .filter((c) => !nq || consultationHaystack(c).includes(nq))
      .filter((c) => !cat || String(c.animal?.category_id ?? "") === cat)
      .filter((c) => +new Date(requestDate(c)) >= minDate)
      .sort((a, b) => +new Date(requestDate(b)) - +new Date(requestDate(a)));
  }, [all, tab, q, cat, dateF, me, now]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / perPage));
  const current = Math.min(page, pageCount);
  const rows = filtered.slice((current - 1) * perPage, current * perPage);

  function reset() {
    setQ("");
    setCat("");
    setDateF("");
    setPage(1);
  }

  const claimable = (c: Consultation) => c.status === "nouvelle" && (c.vet_id == null || c.vet_id === me);

  return (
    <div className="mx-auto max-w-[1400px]">
      <PageTitle title="Demandes de consultation" subtitle="Consultez les demandes de vérification sanitaire, prenez-les en charge et rédigez vos rapports." />

      <Card className="overflow-hidden">
        <div className="px-3 pt-3 sm:px-5">
          <div className="flex gap-1 overflow-x-auto rounded-2xl bg-page/70 p-1 scrollbar-none">
            {DEMANDE_TABS.map((t) => (
              <button
                key={t.value}
                onClick={() => {
                  setTab(t.value);
                  setPage(1);
                }}
                className={cn(
                  "flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition [&>svg]:size-4",
                  tab === t.value ? "bg-white text-primary shadow-sm ring-1 ring-primary/20" : "text-navy/80 hover:bg-white/70",
                )}
              >
                {TAB_ICON[t.value]}
                {t.label} <span className="font-medium opacity-70">({counts[t.value] ?? 0})</span>
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-3 px-3 py-4 sm:px-5 md:grid-cols-[minmax(0,1.6fr)_1fr_1fr_auto]">
          <Input
            icon={<Search />}
            placeholder="Rechercher par nom, race, propriétaire…"
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
            <option value="">Type d&apos;animal</option>
            {(categories ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
          <Select
            icon={<CalendarDays />}
            value={dateF}
            onChange={(e) => {
              setDateF(e.target.value as DateFilter);
              setPage(1);
            }}
          >
            <option value="">Date de la demande</option>
            <option value="jour">Aujourd&apos;hui</option>
            <option value="7j">7 derniers jours</option>
            <option value="30j">30 derniers jours</option>
          </Select>
          <Button variant="outline" onClick={reset} icon={<Filter className="size-4" />} className="h-12 text-primary">
            Réinitialiser
          </Button>
        </div>

        {error && (
          <div className="px-5 pb-4">
            <Alert>{error}</Alert>
          </div>
        )}

        {loading && !data ? (
          <PageLoader />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={<ClipboardList />}
            title="Aucune demande"
            text={q || cat || dateF ? "Aucune demande ne correspond à vos filtres." : "Il n'y a aucune demande dans cette catégorie pour le moment."}
            action={
              (q || cat || dateF) && (
                <Button variant="soft" size="sm" onClick={reset}>
                  Réinitialiser les filtres
                </Button>
              )
            }
          />
        ) : (
          <>
            <div className="hidden overflow-x-auto px-3 lg:block">
              <table className="w-full min-w-[920px] text-left text-sm">
                <thead>
                  <tr className="bg-page/80 text-[13px] font-semibold text-navy">
                    <th className="rounded-l-xl px-3 py-3">Animal</th>
                    <th className="px-3 py-3">Propriétaire</th>
                    <th className="px-3 py-3">Type</th>
                    <th className="px-3 py-3">Date de la demande</th>
                    <th className="px-3 py-3">Rendez-vous</th>
                    <th className="px-3 py-3">Statut</th>
                    <th className="rounded-r-xl px-3 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {rows.map((c) => (
                    <tr key={c.id}>
                      <td className="px-3 py-3">
                        <AnimalCell c={c} size="sm" />
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2.5">
                          <Avatar src={c.animal?.owner?.avatar_url} name={c.animal?.owner?.full_name} size={36} />
                          <div className="min-w-0">
                            <div className="truncate font-semibold text-navy">{c.animal?.owner?.full_name ?? "—"}</div>
                            <div className="truncate text-xs text-muted">{c.animal?.city ?? c.animal?.owner?.city ?? ""}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <CategoryPill category={c.animal?.category} />
                      </td>
                      <td className="px-3 py-3">
                        <div className="text-body">{formatDate(requestDate(c))}</div>
                        <div className="text-xs text-muted">{formatTime(requestDate(c))}</div>
                      </td>
                      <td className="px-3 py-3 text-body">{c.scheduled_at ? formatDateTime(c.scheduled_at) : <span className="text-muted">—</span>}</td>
                      <td className="px-3 py-3">
                        <StatusBadge status={c.status} icon />
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center justify-end gap-2">
                          {claimable(c) && (
                            <Button size="sm" variant="soft" icon={<Hand className="size-4" />} onClick={() => setClaiming(c)}>
                              Prendre en charge
                            </Button>
                          )}
                          <Button size="sm" variant="outline" href={`/demandes/${c.id}`} className="px-5">
                            Voir
                          </Button>
                          <RowMenu c={c} onClaim={setClaiming} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <ul className="divide-y divide-line px-4 lg:hidden">
              {rows.map((c) => (
                <li key={c.id} className="py-3">
                  <Link href={`/demandes/${c.id}`} className="flex items-center gap-3">
                    <AnimalThumb src={c.animal?.cover_url} alt={c.animal?.name} className="size-16 shrink-0 rounded-xl" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate font-bold text-navy">{c.animal?.name}</span>
                        <CategoryPill category={c.animal?.category} />
                      </div>
                      <div className="truncate text-xs text-body">
                        {c.animal?.breed} {ageSex(c.animal) && `· ${ageSex(c.animal)}`}
                      </div>
                      <div className="truncate text-xs text-muted">{c.animal?.owner?.full_name}</div>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1.5">
                      <StatusBadge status={c.status} />
                      <span className="text-[11px] text-muted">{formatDateTime(requestDate(c))}</span>
                    </div>
                    <ChevronRight className="size-5 shrink-0 text-navy" />
                  </Link>
                  {claimable(c) && (
                    <Button size="sm" variant="soft" className="mt-2 w-full" icon={<Hand className="size-4" />} onClick={() => setClaiming(c)}>
                      Prendre en charge
                    </Button>
                  )}
                </li>
              ))}
            </ul>

            <div className="flex flex-col items-center justify-between gap-3 border-t border-line px-5 py-4 sm:flex-row">
              <p className="text-sm text-body">
                Affichage de {(current - 1) * perPage + 1} à {Math.min(current * perPage, filtered.length)} sur {filtered.length} demande
                {filtered.length > 1 ? "s" : ""}
              </p>
              <div className="flex items-center gap-4">
                <div className="hidden items-center gap-2 text-sm text-body sm:flex">
                  Éléments par page
                  <div className="w-20">
                    <Select
                      value={perPage}
                      onChange={(e) => {
                        setPerPage(Number(e.target.value));
                        setPage(1);
                      }}
                      className="h-9"
                    >
                      {[8, 16, 32].map((n) => (
                        <option key={n} value={n}>
                          {n}
                        </option>
                      ))}
                    </Select>
                  </div>
                </div>
                <Pagination page={current} pageCount={pageCount} onChange={setPage} />
              </div>
            </div>
          </>
        )}
      </Card>

      <ClaimModal
        consultation={claiming}
        onClose={() => setClaiming(null)}
        onDone={(c) => {
          setClaiming(null);
          refresh();
          reload();
          router.push(`/demandes/${c.id}`);
        }}
      />
    </div>
  );
}

function DemandesFromParams() {
  const sp = useSearchParams();
  const t = sp.get("tab") as DemandeTab | null;
  const tab: DemandeTab = t && DEMANDE_TABS.some((x) => x.value === t) ? t : "nouvelles";
  const q = sp.get("q") ?? "";
  return <DemandesInner key={sp.toString()} initialTab={tab} initialQ={q} />;
}

export default function DemandesPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <DemandesFromParams />
    </Suspense>
  );
}
