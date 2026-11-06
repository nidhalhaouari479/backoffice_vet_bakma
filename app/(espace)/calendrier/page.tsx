"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CalendarClock, CalendarDays, ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { PageTitle, useMyConsultations } from "@/components/vet/bits";
import { StatusBadge } from "@/components/vet/StatusBadge";
import { Alert, AnimalThumb, Button, Card, EmptyState, PageLoader, cn } from "@/components/ui";
import { formatDate, formatTime } from "@/lib/labels";
import type { Consultation } from "@/lib/types";
import { addDays, dayLabel, sameDay, startOfDay, startOfWeek } from "@/lib/vet";

type View = "semaine" | "mois" | "jour";

const HOURS = Array.from({ length: 12 }, (_, i) => 8 + i); // 8h → 19h
const SLOT = 56; // px par heure
const WEEKDAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

const EVENT_TONE: Record<string, string> = {
  nouvelle: "border-blue-400 bg-blue-50 text-blue-800",
  en_cours: "border-amber-400 bg-amber-50 text-amber-800",
  a_revoir: "border-red-400 bg-red-50 text-red-700",
  terminee: "border-emerald-400 bg-emerald-50 text-emerald-800",
  annulee: "border-slate-300 bg-slate-50 text-slate-500",
};

const monthFmt = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric" });

function EventChip({ c, compact }: { c: Consultation; compact?: boolean }) {
  return (
    <Link
      href={`/demandes/${c.id}`}
      className={cn("block truncate rounded-lg border-l-4 px-2 py-1 text-[11px] font-semibold leading-tight transition hover:brightness-95", EVENT_TONE[c.status])}
      title={`${formatTime(c.scheduled_at)} · ${c.animal?.name ?? ""}`}
    >
      {formatTime(c.scheduled_at)} {compact ? "" : "· "}
      {c.animal?.name}
    </Link>
  );
}

function DayList({ items }: { items: Consultation[] }) {
  if (items.length === 0) return <EmptyState icon={<CalendarDays />} title="Aucun rendez-vous" text="Aucune consultation n'est planifiée ce jour-là." />;
  return (
    <ul className="divide-y divide-line">
      {items.map((c) => (
        <li key={c.id}>
          <Link href={`/demandes/${c.id}`} className="flex items-center gap-4 px-2 py-3 transition hover:bg-page">
            <span className="w-14 shrink-0 text-center">
              <span className="block text-lg font-extrabold text-navy">{formatTime(c.scheduled_at)}</span>
            </span>
            <AnimalThumb src={c.animal?.cover_url} alt={c.animal?.name} className="size-12 shrink-0 rounded-xl" />
            <div className="min-w-0 flex-1">
              <div className="truncate font-bold text-navy">Consultation - {c.animal?.name}</div>
              <div className="truncate text-sm text-muted">
                {c.animal?.breed ?? c.animal?.category?.name} · {c.animal?.owner?.full_name}
              </div>
            </div>
            <StatusBadge status={c.status} />
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default function CalendrierPage() {
  const { user } = useAuth();
  const me = user?.id ?? "";
  const { data, loading, error } = useMyConsultations();
  const [view, setView] = useState<View>("semaine");
  const [today] = useState(() => startOfDay(new Date()));
  const [cursor, setCursor] = useState(() => startOfDay(new Date()));

  const mine = useMemo(() => (data ?? []).filter((c) => c.vet_id === me && c.status !== "annulee"), [data, me]);
  const events = useMemo(
    () => mine.filter((c) => c.scheduled_at).sort((a, b) => +new Date(a.scheduled_at!) - +new Date(b.scheduled_at!)),
    [mine],
  );
  const toPlan = useMemo(() => mine.filter((c) => !c.scheduled_at && (c.status === "en_cours" || c.status === "a_revoir")), [mine]);
  const on = (d: Date) => events.filter((c) => sameDay(new Date(c.scheduled_at!), d));

  const weekStart = startOfWeek(cursor);
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const monthStart = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const gridStart = startOfWeek(monthStart);
  const monthDays = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));

  function move(dir: -1 | 1) {
    if (view === "jour") setCursor((d) => addDays(d, dir));
    else if (view === "semaine") setCursor((d) => addDays(d, 7 * dir));
    else setCursor((d) => new Date(d.getFullYear(), d.getMonth() + dir, 1));
  }

  const title =
    view === "jour"
      ? dayLabel(cursor)
      : view === "semaine"
        ? `${formatDate(weekDays[0])} – ${formatDate(weekDays[6])}`
        : monthFmt.format(cursor).replace(/^./, (s) => s.toUpperCase());

  if (loading && !data) return <PageLoader />;

  return (
    <div className="mx-auto max-w-[1400px]">
      <PageTitle title="Mon calendrier" subtitle="Vos rendez-vous de consultation planifiés." />
      <Alert>{error}</Alert>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <Card className="min-w-0 overflow-hidden">
          <div className="flex flex-col gap-3 border-b border-line px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <div className="flex items-center gap-2">
              <button onClick={() => move(-1)} className="grid size-9 place-items-center rounded-xl border border-line text-navy hover:border-primary hover:text-primary" aria-label="Précédent">
                <ChevronLeft className="size-4" />
              </button>
              <button onClick={() => move(1)} className="grid size-9 place-items-center rounded-xl border border-line text-navy hover:border-primary hover:text-primary" aria-label="Suivant">
                <ChevronRight className="size-4" />
              </button>
              <Button size="sm" variant="outline" onClick={() => setCursor(today)}>
                Aujourd&apos;hui
              </Button>
              <h2 className="ml-2 text-base font-bold sm:text-lg">{title}</h2>
            </div>
            <div className="flex rounded-xl bg-page p-1">
              {(["jour", "semaine", "mois"] as View[]).map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={cn("rounded-lg px-4 py-1.5 text-sm font-semibold capitalize transition", view === v ? "bg-white text-primary shadow-sm" : "text-muted hover:text-navy")}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>

          {view === "jour" && (
            <div className="p-3 sm:p-4">
              <DayList items={on(cursor)} />
            </div>
          )}

          {view === "semaine" && (
            <div className="overflow-x-auto">
              <div className="min-w-[760px]">
                <div className="grid grid-cols-[56px_repeat(7,minmax(0,1fr))] border-b border-line">
                  <div />
                  {weekDays.map((d, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        setCursor(d);
                        setView("jour");
                      }}
                      className={cn("py-3 text-center transition hover:bg-page", sameDay(d, today) && "text-primary")}
                    >
                      <div className="text-xs font-semibold uppercase text-muted">{WEEKDAYS[i]}</div>
                      <div className={cn("mx-auto mt-1 grid size-8 place-items-center rounded-full text-sm font-bold", sameDay(d, today) ? "bg-primary text-white" : "text-navy")}>
                        {d.getDate()}
                      </div>
                    </button>
                  ))}
                </div>
                <div className="relative grid grid-cols-[56px_repeat(7,minmax(0,1fr))]">
                  <div>
                    {HOURS.map((h) => (
                      <div key={h} className="relative border-b border-line/60 pr-2 text-right text-[11px] text-muted" style={{ height: SLOT }}>
                        <span className="relative -top-2">{h}h</span>
                      </div>
                    ))}
                  </div>
                  {weekDays.map((d, i) => {
                    const evs = on(d);
                    return (
                      <div key={i} className={cn("relative border-l border-line/60", sameDay(d, today) && "bg-primary-soft/30")}>
                        {HOURS.map((h) => (
                          <div key={h} className="border-b border-line/60" style={{ height: SLOT }} />
                        ))}
                        {evs.map((c) => {
                          const dt = new Date(c.scheduled_at!);
                          const hour = dt.getHours() + dt.getMinutes() / 60;
                          const clamped = Math.min(Math.max(hour, 8), 19.5);
                          return (
                            <div key={c.id} className="absolute inset-x-1" style={{ top: (clamped - 8) * SLOT + 2, minHeight: SLOT - 6 }}>
                              <Link
                                href={`/demandes/${c.id}`}
                                className={cn("block h-full overflow-hidden rounded-lg border-l-4 px-2 py-1.5 text-[11px] leading-tight shadow-sm transition hover:brightness-95", EVENT_TONE[c.status])}
                              >
                                <span className="block font-bold">{formatTime(c.scheduled_at)}</span>
                                <span className="block truncate font-semibold">{c.animal?.name}</span>
                                <span className="block truncate opacity-80">{c.animal?.breed}</span>
                              </Link>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {view === "mois" && (
            <div className="p-2 sm:p-4">
              <div className="grid grid-cols-7 text-center text-xs font-semibold uppercase text-muted">
                {WEEKDAYS.map((w) => (
                  <div key={w} className="py-2">
                    {w}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {monthDays.map((d, i) => {
                  const evs = on(d);
                  const inMonth = d.getMonth() === cursor.getMonth();
                  return (
                    <div key={i} className={cn("min-h-20 rounded-xl border p-1 sm:min-h-24 sm:p-1.5", inMonth ? "border-line bg-white" : "border-transparent bg-page/60", sameDay(d, today) && "border-primary")}>
                      <button
                        onClick={() => {
                          setCursor(d);
                          setView("jour");
                        }}
                        className={cn("mb-1 grid size-6 place-items-center rounded-full text-xs font-bold", sameDay(d, today) ? "bg-primary text-white" : inMonth ? "text-navy hover:bg-page" : "text-muted")}
                      >
                        {d.getDate()}
                      </button>
                      <div className="space-y-0.5">
                        {evs.slice(0, 2).map((c) => (
                          <div key={c.id} className="hidden sm:block">
                            <EventChip c={c} compact />
                          </div>
                        ))}
                        {evs.length > 0 && <span className="block size-1.5 rounded-full bg-primary sm:hidden" />}
                        {evs.length > 2 && <span className="hidden text-[10px] font-semibold text-muted sm:block">+{evs.length - 2} autre(s)</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </Card>

        <div className="space-y-6">
          <Card className="p-5">
            <h3 className="mb-1 text-lg font-bold">Aujourd&apos;hui</h3>
            <p className="mb-3 text-sm text-muted">{dayLabel(today)}</p>
            <DayList items={on(today)} />
          </Card>
          <Card className="p-5">
            <h3 className="mb-1 flex items-center gap-2 text-lg font-bold">
              <CalendarClock className="size-5 text-primary" /> À planifier
            </h3>
            <p className="mb-3 text-sm text-muted">Consultations prises en charge sans rendez-vous.</p>
            {toPlan.length === 0 ? (
              <p className="rounded-xl bg-page px-4 py-5 text-center text-sm text-muted">Tout est planifié.</p>
            ) : (
              <ul className="space-y-2">
                {toPlan.map((c) => (
                  <li key={c.id}>
                    <Link href={`/demandes/${c.id}`} className="flex items-center gap-3 rounded-xl border border-line p-2.5 transition hover:border-primary">
                      <AnimalThumb src={c.animal?.cover_url} alt={c.animal?.name} className="size-10 shrink-0 rounded-lg" />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-bold text-navy">{c.animal?.name}</div>
                        <div className="flex items-center gap-1 text-xs text-muted">
                          <Clock className="size-3" /> Demande du {formatDate(c.request?.submitted_at ?? c.created_at)}
                        </div>
                      </div>
                      <StatusBadge status={c.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
