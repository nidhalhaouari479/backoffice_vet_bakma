"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { CalendarDays, CheckCircle2, ChevronRight, ClipboardList, Clock, List, PawPrint, XCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useCounters } from "@/hooks/useCounters";
import { AnimalCell, RowMenu, useMyConsultations } from "@/components/vet/bits";
import { ClaimModal } from "@/components/vet/ClaimModal";
import { StatusBadge } from "@/components/vet/StatusBadge";
import { Alert, AnimalThumb, Button, Card, EmptyState, PageLoader, Select, cn } from "@/components/ui";
import { formatDate, formatDateTime, formatTime } from "@/lib/labels";
import type { Consultation } from "@/lib/types";
import { ageSex, countByStatus, dayLabel, drName, isRelevant, matchTab, requestDate, sameDay } from "@/lib/vet";

type Period = "semaine" | "mois" | "tout";

// StatCard du design system : carte blanche, tuile d'icône 36 px colorée selon l'état.
const KPI_STYLE = {
  blue: { tile: "bg-primary-soft text-primary", text: "text-navy" },
  orange: { tile: "bg-amber-50 text-amber-600", text: "text-amber-700" },
  green: { tile: "bg-emerald-50 text-emerald-600", text: "text-emerald-700" },
  red: { tile: "bg-rose-50 text-rose-600", text: "text-rose-600" },
};

function DashKpi({ icon, value, label, short, tone, href }: { icon: React.ReactNode; value: number; label: string; short: string; tone: keyof typeof KPI_STYLE; href: string }) {
  const s = KPI_STYLE[tone];
  return (
    <Link
      href={href}
      className="flex flex-col rounded-2xl border border-slate-200/80 bg-white p-3 shadow-[var(--shadow-card)] outline-none transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-lift)] focus-visible:ring-2 focus-visible:ring-focus/50 sm:p-5"
    >
      <span className="flex items-start justify-between gap-2">
        <span className="text-xs font-medium text-slate-500 sm:text-[13px]">
          <span className="sm:hidden">{short}</span>
          <span className="hidden sm:inline">{label}</span>
        </span>
        <span className={cn("grid size-8 shrink-0 place-items-center rounded-xl sm:size-9 [&>svg]:size-4 sm:[&>svg]:size-[18px]", s.tile)} aria-hidden>
          {icon}
        </span>
      </span>
      <span className={cn("mt-1 text-2xl font-semibold leading-none tabular-nums", s.text)}>{value}</span>
    </Link>
  );
}

function StatsChart({ data }: { data: { label: string; value: number; color: string }[] }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const H = 120;
  return (
    <svg viewBox="0 0 300 170" className="w-full" role="img" aria-label="Statistiques des consultations">
      {data.map((d, i) => {
        const h = Math.max(4, (d.value / max) * H);
        const x = 22 + i * 72;
        const y = 140 - h;
        return (
          <g key={d.label}>
            <rect x={x} y={y} width={44} height={h} rx={6} fill={d.color} opacity={0.9} />
            <text x={x + 22} y={y - 8} textAnchor="middle" className="fill-navy text-[15px] font-bold">
              {d.value}
            </text>
            <text x={x + 22} y={162} textAnchor="middle" className="fill-[#64748b] text-[11px]">
              {d.label}
            </text>
          </g>
        );
      })}
      <line x1="10" y1="140.5" x2="290" y2="140.5" stroke="#e6ecf5" />
    </svg>
  );
}

function TodayTimeline({ items, compact }: { items: Consultation[]; compact?: boolean }) {
  if (items.length === 0)
    return <p className="rounded-xl bg-page px-4 py-6 text-center text-sm text-muted">Aucun rendez-vous prévu aujourd&apos;hui.</p>;
  return (
    <ol className="relative space-y-2 pl-4 before:absolute before:bottom-3 before:left-[3px] before:top-3 before:w-0.5 before:bg-primary/25">
      {items.slice(0, compact ? 3 : 6).map((c, i) => (
        <li key={c.id} className="relative flex items-center gap-4">
          <span className="absolute -left-4 top-1/2 size-2 -translate-y-1/2 rounded-full bg-primary ring-4 ring-white" />
          <span className="w-12 shrink-0 text-sm font-semibold text-navy">{formatTime(c.scheduled_at)}</span>
          <Link href={`/demandes/${c.id}`} className={cn("min-w-0 flex-1 rounded-xl px-3 py-2.5 transition hover:bg-primary-soft", i % 2 === 0 ? "bg-page" : "bg-white")}>
            <span className="block truncate text-sm font-semibold text-navy">Consultation - {c.animal?.name}</span>
            <span className="block truncate text-xs text-muted">{c.animal?.breed ?? c.animal?.category?.name ?? ""}</span>
          </Link>
        </li>
      ))}
    </ol>
  );
}

export default function DashboardPage() {
  const { user, profile } = useAuth();
  const me = user?.id ?? "";
  const router = useRouter();
  const { refresh } = useCounters();
  const { data, loading, error, reload } = useMyConsultations();
  const [period, setPeriod] = useState<Period>("semaine");
  const [claiming, setClaiming] = useState<Consultation | null>(null);
  const [today] = useState(() => new Date());

  const list = useMemo(() => (data ?? []).filter((c) => isRelevant(c, me)), [data, me]);
  const kpi = useMemo(() => countByStatus(list, me), [list, me]);
  const latest = useMemo(() => [...list].sort((a, b) => +new Date(requestDate(b)) - +new Date(requestDate(a))).slice(0, 5), [list]);
  const todays = useMemo(
    () =>
      list
        .filter((c) => c.vet_id === me && c.scheduled_at && sameDay(new Date(c.scheduled_at), today) && c.status !== "annulee")
        .sort((a, b) => +new Date(a.scheduled_at!) - +new Date(b.scheduled_at!)),
    [list, me, today],
  );

  const stats = useMemo(() => {
    const since =
      period === "tout" ? 0 : period === "semaine" ? +today - 7 * 86400000 : new Date(today.getFullYear(), today.getMonth(), 1).getTime();
    const ref = (c: Consultation) => +new Date(c.status === "nouvelle" ? requestDate(c) : (c.consulted_at ?? c.updated_at));
    const inPeriod = list.filter((c) => ref(c) >= since);
    return [
      { label: "Nouvelles", value: inPeriod.filter((c) => matchTab(c, "nouvelles", me)).length, color: "#60a5fa" },
      { label: "En cours", value: inPeriod.filter((c) => matchTab(c, "en_cours", me)).length, color: "#fbbf24" },
      { label: "Terminées", value: inPeriod.filter((c) => matchTab(c, "terminees", me)).length, color: "#34c26b" },
      { label: "À revoir", value: inPeriod.filter((c) => matchTab(c, "a_revoir", me)).length, color: "#f87171" },
    ];
  }, [list, me, period, today]);

  if (loading && !data) return <PageLoader />;

  return (
    <div className="mx-auto max-w-[1400px]">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        {/* Colonne principale */}
        <div className="min-w-0 space-y-6">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="mb-1 text-xs font-medium text-slate-500">
                <span className="sm:hidden">Bonjour</span>
                <span className="hidden sm:inline">Bienvenue</span>
              </p>
              <h1 className="truncate text-[22px] font-semibold leading-tight tracking-[-0.02em] text-navy sm:text-[26px]">{drName(profile?.full_name, true)}</h1>
              <p className="mt-1 text-[13.5px] text-slate-500">Voici un aperçu des demandes de consultation.</p>
            </div>
            <Card className="flex shrink-0 items-center gap-2 px-3 py-2 xl:hidden">
              <CalendarDays className="size-5 text-primary" />
              <div className="text-xs">
                <div className="font-semibold text-navy">{formatDate(today)}</div>
                <div className="text-muted">Aujourd&apos;hui</div>
              </div>
            </Card>
          </div>

          <Alert>{error}</Alert>

          <div className="grid grid-cols-4 gap-2 sm:gap-4">
            <DashKpi tone="blue" icon={<ClipboardList />} value={kpi.nouvelles} label="Nouvelles demandes" short="Nouvelles" href="/demandes?tab=nouvelles" />
            <DashKpi tone="orange" icon={<Clock />} value={kpi.en_cours} label="En cours" short="En cours" href="/demandes?tab=en_cours" />
            <DashKpi tone="green" icon={<CheckCircle2 />} value={kpi.terminees} label="Consultations terminées" short="Terminées" href="/demandes?tab=terminees" />
            <DashKpi tone="red" icon={<XCircle />} value={kpi.a_revoir} label="À revoir" short="À revoir" href="/demandes?tab=a_revoir" />
          </div>

          <Card className="overflow-hidden">
            <div className="flex items-center justify-between px-4 pb-3 pt-5 sm:px-6">
              <h2 className="text-lg font-bold sm:text-xl">
                <span className="sm:hidden">Dernières demandes</span>
                <span className="hidden sm:inline">Dernières demandes de consultation</span>
              </h2>
              <Link href="/demandes?tab=toutes" className="text-sm font-semibold text-primary hover:underline">
                Voir toutes
              </Link>
            </div>
            {latest.length === 0 ? (
              <EmptyState icon={<ClipboardList />} title="Aucune demande pour le moment" text="Les nouvelles demandes de vérification apparaîtront ici dès qu'un propriétaire soumettra une annonce." />
            ) : (
              <>
                {/* Desktop : table */}
                <div className="hidden px-4 pb-4 md:block">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="bg-page/80 text-[13px] font-semibold text-navy">
                        <th className="rounded-l-xl px-3 py-3">Animal</th>
                        <th className="px-3 py-3">Propriétaire</th>
                        <th className="px-3 py-3">Date de la demande</th>
                        <th className="px-3 py-3">Statut</th>
                        <th className="rounded-r-xl px-3 py-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {latest.map((c) => (
                        <tr key={c.id} className="align-middle">
                          <td className="px-3 py-3">
                            <AnimalCell c={c} />
                          </td>
                          <td className="px-3 py-3 text-body">{c.animal?.owner?.full_name ?? "—"}</td>
                          <td className="px-3 py-3">
                            <div className="text-body">{formatDate(requestDate(c))}</div>
                            <div className="text-xs text-muted">{formatTime(requestDate(c))}</div>
                          </td>
                          <td className="px-3 py-3">
                            <StatusBadge status={c.status} />
                          </td>
                          <td className="px-3 py-3">
                            <div className="flex items-center gap-2">
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
                {/* Mobile : cartes */}
                <ul className="divide-y divide-line px-4 pb-2 md:hidden">
                  {latest.map((c) => (
                    <li key={c.id}>
                      <Link href={`/demandes/${c.id}`} className="flex items-center gap-3 py-3">
                        <AnimalThumb src={c.animal?.cover_url} alt={c.animal?.name} className="size-16 shrink-0 rounded-xl" />
                        <div className="min-w-0 flex-1">
                          <div className="truncate font-bold text-navy">{c.animal?.name}</div>
                          <div className="truncate text-xs text-body">{c.animal?.breed}</div>
                          <div className="truncate text-xs text-muted">{ageSex(c.animal)}</div>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-1.5">
                          <StatusBadge status={c.status} />
                          <span className="text-[11px] text-muted">{formatDateTime(requestDate(c))}</span>
                        </div>
                        <ChevronRight className="size-5 shrink-0 text-navy" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </Card>
        </div>

        {/* Colonne droite */}
        <div className="space-y-6">
          <Card className="hidden items-center gap-4 px-5 py-4 xl:flex">
            <span className="grid size-12 place-items-center rounded-xl bg-primary-soft text-primary">
              <CalendarDays className="size-6" />
            </span>
            <div>
              <div className="font-semibold text-navy">{dayLabel(today)}</div>
              <div className="text-sm text-muted">Aujourd&apos;hui</div>
            </div>
          </Card>

          <Card className="p-5">
            <div className="mb-1 flex items-center justify-between">
              <h2 className="text-lg font-bold">
                Mon calendrier<span className="xl:hidden"> aujourd&apos;hui</span>
              </h2>
              <Link href="/calendrier" className="text-sm font-semibold text-primary hover:underline">
                Voir tout
              </Link>
            </div>
            <p className="mb-4 font-semibold text-navy">Aujourd&apos;hui - {formatDate(today)}</p>
            <TodayTimeline items={todays} />
          </Card>

          <Card className="p-5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-lg font-bold">Statistiques</h2>
              <div className="w-40">
                <Select value={period} onChange={(e) => setPeriod(e.target.value as Period)} className="h-10 text-[13px]">
                  <option value="semaine">Cette semaine</option>
                  <option value="mois">Ce mois</option>
                  <option value="tout">Tout</option>
                </Select>
              </div>
            </div>
            <StatsChart data={stats} />
          </Card>

          <Card className="p-5">
            <h2 className="mb-4 text-lg font-bold">Actions rapides</h2>
            <div className="space-y-3">
              {[
                { href: "/demandes", label: "Voir toutes les demandes", icon: List },
                { href: "/calendrier", label: "Mon calendrier", icon: CalendarDays },
                { href: "/animaux", label: "Animaux consultés", icon: PawPrint },
              ].map(({ href, label, icon: Icon }) => (
                <Link key={href} href={href} className="flex items-center gap-3 rounded-xl border border-line px-4 py-3 text-sm font-semibold text-primary transition hover:border-primary hover:bg-primary-soft">
                  <Icon className="size-5" />
                  <span className="flex-1">{label}</span>
                  <ChevronRight className="size-4" />
                </Link>
              ))}
            </div>
          </Card>
        </div>
      </div>

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
