"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import type { Notification } from "@/lib/types";

interface Counters {
  unreadNotifications: number;
  unreadMessages: number;
  newRequests: number;
  latestNotifications: Notification[];
  /** incrémenté à chaque évènement realtime (notifications) */
  notifTick: number;
  /** incrémenté à chaque évènement realtime (messages) */
  messageTick: number;
  refresh: () => void;
}

const Ctx = createContext<Counters>({
  unreadNotifications: 0,
  unreadMessages: 0,
  newRequests: 0,
  latestNotifications: [],
  notifTick: 0,
  messageTick: 0,
  refresh: () => {},
});

type Data = Pick<Counters, "unreadNotifications" | "unreadMessages" | "newRequests" | "latestNotifications">;

async function fetchCounters(userId: string): Promise<Data> {
  const supabase = getSupabase();
  const [notifs, latest, msgs, pool, mine] = await Promise.all([
    supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", userId).is("read_at", null),
    supabase.from("notifications").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(6),
    supabase.from("messages").select("id", { count: "exact", head: true }).neq("sender_id", userId).is("read_at", null),
    supabase.from("consultations").select("id", { count: "exact", head: true }).is("vet_id", null).eq("status", "nouvelle"),
    supabase.from("consultations").select("id", { count: "exact", head: true }).eq("vet_id", userId).eq("status", "nouvelle"),
  ]);
  return {
    unreadNotifications: notifs.count ?? 0,
    latestNotifications: (latest.data as Notification[]) ?? [],
    unreadMessages: msgs.count ?? 0,
    newRequests: (pool.count ?? 0) + (mine.count ?? 0),
  };
}

/** Compteurs du layout (cloche, badges de la sidebar) + abonnement realtime. */
export function CountersProvider({ userId, children }: { userId: string; children: React.ReactNode }) {
  const [data, setData] = useState<Data>({ unreadNotifications: 0, unreadMessages: 0, newRequests: 0, latestNotifications: [] });
  const [version, setVersion] = useState(0);
  const [notifTick, setNotifTick] = useState(0);
  const [messageTick, setMessageTick] = useState(0);

  useEffect(() => {
    let active = true;
    fetchCounters(userId)
      .then((d) => {
        if (active) setData(d);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [userId, version, notifTick, messageTick]);

  useEffect(() => {
    const supabase = getSupabase();
    const channel = supabase
      .channel(`vet-counters-${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` }, () =>
        setNotifTick((t) => t + 1),
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, () => setMessageTick((t) => t + 1))
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const refresh = useCallback(() => setVersion((v) => v + 1), []);
  const value = useMemo(() => ({ ...data, notifTick, messageTick, refresh }), [data, notifTick, messageTick, refresh]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useCounters = () => useContext(Ctx);
