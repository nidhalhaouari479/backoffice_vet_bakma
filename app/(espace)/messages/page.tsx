"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, MessageCircle, PawPrint, Search, Send } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useCounters } from "@/hooks/useCounters";
import { must, useQuery } from "@/hooks/useQuery";
import { PageTitle } from "@/components/vet/bits";
import { Alert, AnimalThumb, Avatar, Card, EmptyState, PageLoader, Spinner, cn } from "@/components/ui";
import { getSupabase, errorMessage } from "@/lib/supabase";
import { formatDate, formatTime, timeAgo } from "@/lib/labels";
import type { Conversation, Message } from "@/lib/types";
import { norm, sameDay } from "@/lib/vet";

const CONV_SELECT =
  "*, animal:animals!conversations_animal_id_fkey(id,name,cover_url), a:profiles!conversations_participant_a_fkey(*), b:profiles!conversations_participant_b_fkey(*)";

const other = (c: Conversation, me: string) => (c.participant_a === me ? c.b : c.a);

function Thread({ conv, me, onBack }: { conv: Conversation; me: string; onBack: () => void }) {
  const { refresh } = useCounters();
  const [messages, setMessages] = useState<Message[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);
  const person = other(conv, me);

  useEffect(() => {
    const supabase = getSupabase();
    let active = true;
    supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conv.id)
      .order("created_at", { ascending: true })
      .limit(500)
      .then(({ data, error }) => {
        if (!active) return;
        if (error) setError(errorMessage(error));
        else setMessages((data as Message[]) ?? []);
      });
    // Marquer comme lus
    supabase
      .from("messages")
      .update({ read_at: new Date().toISOString() })
      .eq("conversation_id", conv.id)
      .neq("sender_id", me)
      .is("read_at", null)
      .then(() => refresh());

    const channel = supabase
      .channel(`thread-${conv.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conv.id}` }, (payload) => {
        const m = payload.new as Message;
        setMessages((l) => (l && !l.some((x) => x.id === m.id) ? [...l, m] : l));
        if (m.sender_id !== me) {
          supabase
            .from("messages")
            .update({ read_at: new Date().toISOString() })
            .eq("id", m.id)
            .then(() => refresh());
        }
      })
      .subscribe();
    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [conv.id, me, refresh]);

  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "end" });
  }, [messages]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const text = body.trim();
    if (!text) return;
    setSending(true);
    const { data, error } = await getSupabase().from("messages").insert({ conversation_id: conv.id, sender_id: me, body: text }).select().single();
    setSending(false);
    if (error) return setError(errorMessage(error));
    setBody("");
    const m = data as Message;
    setMessages((l) => (l && !l.some((x) => x.id === m.id) ? [...l, m] : l));
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center gap-3 border-b border-line px-4 py-3">
        <button onClick={onBack} className="rounded-full p-1.5 text-navy hover:bg-page md:hidden" aria-label="Retour">
          <ArrowLeft className="size-5" />
        </button>
        <Avatar src={person?.avatar_url} name={person?.full_name} size={42} />
        <div className="min-w-0 flex-1">
          <div className="truncate font-bold text-navy">{person?.full_name ?? "Utilisateur"}</div>
          {conv.animal && (
            <div className="flex items-center gap-1 truncate text-xs text-muted">
              <PawPrint className="size-3" /> À propos de {conv.animal.name}
            </div>
          )}
        </div>
        {conv.animal && <AnimalThumb src={conv.animal.cover_url} alt={conv.animal.name} className="size-10 rounded-lg" />}
      </div>

      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto bg-page/50 px-4 py-4">
        {error && <Alert>{error}</Alert>}
        {messages === null ? (
          <div className="grid h-full place-items-center">
            <Spinner />
          </div>
        ) : messages.length === 0 ? (
          <EmptyState icon={<MessageCircle />} title="Aucun message" text="Écrivez votre premier message ci-dessous." />
        ) : (
          messages.map((m, i) => {
            const mineMsg = m.sender_id === me;
            const prev = messages[i - 1];
            const showDay = !prev || !sameDay(new Date(prev.created_at), new Date(m.created_at));
            return (
              <div key={m.id}>
                {showDay && <div className="my-3 text-center text-[11px] font-semibold uppercase tracking-wide text-muted">{formatDate(m.created_at)}</div>}
                <div className={cn("flex", mineMsg ? "justify-end" : "justify-start")}>
                  <div className={cn("max-w-[80%] rounded-2xl px-4 py-2.5 text-sm shadow-sm", mineMsg ? "rounded-br-md bg-primary text-white" : "rounded-bl-md bg-white text-navy")}>
                    <p className="whitespace-pre-line break-words">{m.body}</p>
                    <p className={cn("mt-1 text-right text-[10px]", mineMsg ? "text-white/70" : "text-muted")}>{formatTime(m.created_at)}</p>
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottom} />
      </div>

      <form onSubmit={send} className="flex items-end gap-2 border-t border-line bg-white p-3">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              e.currentTarget.form?.requestSubmit();
            }
          }}
          rows={1}
          placeholder="Écrire un message…"
          className="max-h-32 min-h-11 flex-1 resize-none rounded-[var(--radius-input)] border border-line px-4 py-2.5 text-sm text-navy outline-none placeholder:text-muted focus:border-primary focus:ring-4 focus:ring-primary/10"
        />
        <button
          type="submit"
          disabled={sending || !body.trim()}
          className="grid size-11 shrink-0 place-items-center rounded-full bg-primary text-white transition hover:bg-primary-dark disabled:opacity-50"
          aria-label="Envoyer"
        >
          {sending ? <Spinner className="size-4 text-white" /> : <Send className="size-4" />}
        </button>
      </form>
    </div>
  );
}

function MessagesInner() {
  const { user } = useAuth();
  const me = user?.id ?? "";
  const sp = useSearchParams();
  const router = useRouter();
  const selected = sp.get("c");
  const { messageTick } = useCounters();
  const [q, setQ] = useState("");

  const { data, loading, error } = useQuery<Conversation[]>(
    () =>
      must(
        getSupabase()
          .from("conversations")
          .select(CONV_SELECT)
          .or(`participant_a.eq.${me},participant_b.eq.${me}`)
          .order("last_message_at", { ascending: false })
          .limit(200),
      ).then((d) => (d as unknown as Conversation[]) ?? []),
    `conversations:${me}:${messageTick}`,
    !!me,
  );

  // Messages non lus par conversation
  const { data: unread } = useQuery<Record<string, number>>(
    async () => {
      const rows = await must(getSupabase().from("messages").select("conversation_id").neq("sender_id", me).is("read_at", null).limit(1000));
      const out: Record<string, number> = {};
      for (const r of (rows as { conversation_id: string }[]) ?? []) out[r.conversation_id] = (out[r.conversation_id] ?? 0) + 1;
      return out;
    },
    `unread:${me}:${messageTick}:${selected}`,
    !!me,
  );

  const list = useMemo(() => {
    const nq = norm(q.trim());
    return (data ?? []).filter((c) => !nq || norm(`${other(c, me)?.full_name} ${c.animal?.name ?? ""}`).includes(nq));
  }, [data, q, me]);
  const conv = (data ?? []).find((c) => c.id === selected) ?? null;

  if (loading && !data) return <PageLoader />;

  return (
    <div className="mx-auto max-w-[1400px]">
      <PageTitle title="Messages" subtitle="Échangez avec les propriétaires des animaux que vous consultez." />
      <Alert>{error}</Alert>
      <Card className="grid h-[calc(100dvh-300px)] min-h-[480px] overflow-hidden md:grid-cols-[320px_minmax(0,1fr)] md:h-[calc(100dvh-210px)]">
        <div className={cn("flex min-h-0 flex-col border-r border-line", conv && "hidden md:flex")}>
          <div className="border-b border-line p-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Rechercher une conversation…"
                className="h-10 w-full rounded-xl border border-line bg-page/60 pl-9 pr-3 text-sm outline-none focus:border-primary focus:bg-white"
              />
            </div>
          </div>
          {list.length === 0 ? (
            <EmptyState icon={<MessageCircle />} title="Aucune conversation" text="Contactez un propriétaire depuis la fiche d'une demande prise en charge." />
          ) : (
            <ul className="min-h-0 flex-1 divide-y divide-line overflow-y-auto">
              {list.map((c) => {
                const p = other(c, me);
                const n = unread?.[c.id] ?? 0;
                return (
                  <li key={c.id}>
                    <Link
                      href={`/messages?c=${c.id}`}
                      replace
                      className={cn("flex items-center gap-3 px-3 py-3 transition hover:bg-page", c.id === selected && "bg-primary-soft/70")}
                    >
                      <Avatar src={p?.avatar_url} name={p?.full_name} size={44} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className={cn("truncate text-sm text-navy", n ? "font-bold" : "font-semibold")}>{p?.full_name ?? "Utilisateur"}</span>
                          <span className="shrink-0 text-[10px] text-muted">{timeAgo(c.last_message_at)}</span>
                        </div>
                        {c.animal && <div className="truncate text-[11px] font-medium text-primary">{c.animal.name}</div>}
                        <div className="flex items-center gap-2">
                          <span className={cn("flex-1 truncate text-xs", n ? "font-semibold text-navy" : "text-muted")}>{c.last_message ?? "Nouvelle conversation"}</span>
                          {n > 0 && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">{n}</span>}
                        </div>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        <div className={cn("min-h-0", !conv && "hidden md:block")}>
          {conv ? (
            <Thread key={conv.id} conv={conv} me={me} onBack={() => router.replace("/messages")} />
          ) : (
            <div className="grid h-full place-items-center">
              <EmptyState icon={<MessageCircle />} title="Sélectionnez une conversation" text="Choisissez une conversation dans la liste pour afficher les messages." />
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

export default function MessagesPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <MessagesInner />
    </Suspense>
  );
}
