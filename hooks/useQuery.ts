"use client";

import { useCallback, useEffect, useState } from "react";
import { errorMessage } from "@/lib/supabase";

type State<T> = { key: string | null; data: T | null; error: string | null };

/**
 * Chargement asynchrone côté client (getSupabase() n'est appelé que dans l'effet).
 * `key` identifie la requête : quand elle change, la requête est relancée.
 * `enabled = false` suspend le chargement (ex. utilisateur pas encore connu).
 */
export function useQuery<T>(fn: () => Promise<T>, key: string, enabled = true) {
  const [version, setVersion] = useState(0);
  const [state, setState] = useState<State<T>>({ key: null, data: null, error: null });
  const fullKey = `${key}#${version}`;

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    fn().then(
      (data) => {
        if (active) setState({ key: fullKey, data, error: null });
      },
      (e) => {
        if (active) setState((s) => ({ key: fullKey, data: s.data, error: errorMessage(e) }));
      },
    );
    return () => {
      active = false;
    };
    // fn est volontairement exclue : la clé décrit la requête.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fullKey, enabled]);

  const reload = useCallback(() => setVersion((v) => v + 1), []);
  const setData = useCallback((updater: (d: T | null) => T | null) => setState((s) => ({ ...s, data: updater(s.data) })), []);

  return {
    data: state.data,
    error: state.error,
    /** vrai tant que la requête courante n'a pas répondu */
    loading: enabled && state.key !== fullKey,
    reload,
    setData,
  };
}

/** Lance une requête Supabase et lève l'erreur éventuelle. */
export async function must<T>(p: PromiseLike<{ data: T | null; error: unknown }>): Promise<T> {
  const { data, error } = await p;
  if (error) throw error;
  return data as T;
}
