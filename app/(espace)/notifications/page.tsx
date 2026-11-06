"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Bell, CalendarClock, CheckCheck, ClipboardList, MessageCircle, Trash2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useCounters } from "@/hooks/useCounters";
import { must, useQuery } from "@/hooks/useQuery";
import { PageTitle } from "@/components/vet/bits";
import { Alert, Button, Card, EmptyState, PageLoader, Pagination, cn, useToast } from "@/components/ui";
import { getSupabase, errorMessage } from "@/lib/supabase";
import { formatDateTime, timeAgo } from "@/lib/labels";
import type { Notification } from "@/lib/types";

const PER_PAGE = 15;

function iconFor(type: string) {
  if (type === "demande") return <ClipboardList />;
  if (type === "consultation") return <CalendarClock />;
  if (type === "message") return <MessageCircle />;
  return <Bell />;
}

export default function NotificationsPage() {
  const { user } = useAuth();
  const me = user?.id ?? "";
  const router = useRouter();
  const toast = useToast();
  const { notifTick, refresh } = useCounters();
  const [filter, setFilter] = useState<"toutes" | "non_lues">("toutes");
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState(false);

  const { data, loading, error, setData } = useQuery<Notification[]>(
    () =>
      must(getSupabase().from("notifications").select("*").eq("user_id", me).order("created_at", { ascending: false }).limit(300)).then(
        (d) => (d as Notification[]) ?? [],
      ),
    `notifications:${me}:${notifTick}`,
    !!me,
  );

  const all = data ?? [];
  const list = filter === "non_lues" ? all.filter((n) => !n.read_at) : all;
  const unread = all.filter((n) => !n.read_at).length;
  const pageCount = Math.max(1, Math.ceil(list.length / PER_PAGE));
  const current = Math.min(page, pageCount);
  const shown = list.slice((current - 1) * PER_PAGE, current * PER_PAGE);

  async function markRead(ids: string[]) {
    if (!ids.length) return;
    const now = new Date().toISOString();
    const { error } = await getSupabase().from("notifications").update({ read_at: now }).in("id", ids);
    if (error) return toast(errorMessage(error), "error");
    setData((l) => (l ?? []).map((n) => (ids.includes(n.id) ? { ...n, read_at: now } : n)));
    refresh();
  }

  async function markAll() {
    setBusy(true);
    const now = new Date().toISOString();
    const { error } = await getSupabase().from("notifications").update({ read_at: now }).eq("user_id", me).is("read_at", null);
    setBusy(false);
    if (error) return toast(errorMessage(error), "error");
    setData((l) => (l ?? []).map((n) => ({ ...n, read_at: n.read_at ?? now })));
    refresh();
    toast("Toutes les notifications sont marquées comme lues");
  }

  async function remove(id: string) {
    const { error } = await getSupabase().from("notifications").delete().eq("id", id);
    if (error) return toast(errorMessage(error), "error");
    setData((l) => (l ?? []).filter((n) => n.id !== id));
    refresh();
  }

  async function open(n: Notification) {
    if (!n.read_at) await markRead([n.id]);
    if (n.link) router.push(n.link);
  }

  if (loading && !data) return <PageLoader />;

  return (
    <div className="mx-auto max-w-4xl">
      <PageTitle
        title="Notifications"
        subtitle={unread ? `${unread} notification${unread > 1 ? "s" : ""} non lue${unread > 1 ? "s" : ""}` : "Vous êtes à jour."}
        action={
          <Button variant="outline" onClick={markAll} loading={busy} disabled={!unread} icon={<CheckCheck className="size-4" />}>
            Tout marquer comme lu
          </Button>
        }
      />
      <Alert>{error}</Alert>
      <Card className="overflow-hidden">
        <div className="flex gap-1 border-b border-line px-3 pt-2">
          {(
            [
              ["toutes", `Toutes (${all.length})`],
              ["non_lues", `Non lues (${unread})`],
            ] as const
          ).map(([v, label]) => (
            <button
              key={v}
              onClick={() => {
                setFilter(v);
                setPage(1);
              }}
              className={cn("border-b-2 px-4 py-3 text-sm font-semibold transition", filter === v ? "border-primary text-primary" : "border-transparent text-muted hover:text-navy")}
            >
              {label}
            </button>
          ))}
        </div>
        {shown.length === 0 ? (
          <EmptyState icon={<Bell />} title="Aucune notification" text={filter === "non_lues" ? "Toutes vos notifications ont été lues." : "Vous recevrez ici les nouvelles demandes et mises à jour."} />
        ) : (
          <ul className="divide-y divide-line">
            {shown.map((n) => (
              <li key={n.id} className={cn("group flex items-start gap-3 px-4 py-4 sm:px-5", !n.read_at && "bg-primary-soft/40")}>
                <span className={cn("grid size-11 shrink-0 place-items-center rounded-xl [&>svg]:size-5", n.read_at ? "bg-page text-muted" : "bg-white text-primary shadow-sm")}>{iconFor(n.type)}</span>
                <button onClick={() => open(n)} className="min-w-0 flex-1 text-left">
                  <div className="flex items-center gap-2">
                    {!n.read_at && <span className="size-2 shrink-0 rounded-full bg-primary" />}
                    <span className={cn("text-sm text-navy", n.read_at ? "font-semibold" : "font-bold")}>{n.title}</span>
                  </div>
                  {n.body && <p className="mt-0.5 text-sm text-body">{n.body}</p>}
                  <p className="mt-1 text-xs text-muted" title={formatDateTime(n.created_at)}>
                    {timeAgo(n.created_at)}
                  </p>
                </button>
                <div className="flex shrink-0 gap-1">
                  {!n.read_at && (
                    <button onClick={() => markRead([n.id])} className="rounded-full p-2 text-muted hover:bg-white hover:text-primary" aria-label="Marquer comme lue" title="Marquer comme lue">
                      <CheckCheck className="size-4" />
                    </button>
                  )}
                  <button onClick={() => remove(n.id)} className="rounded-full p-2 text-muted hover:bg-red-50 hover:text-red-600" aria-label="Supprimer" title="Supprimer">
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
      <div className="mt-6 flex justify-center">
        <Pagination page={current} pageCount={pageCount} onChange={setPage} />
      </div>
    </div>
  );
}
