"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CheckCircle2, Eye, EyeOff, KeyRound, Lock } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { PublicFooter, PublicHeader } from "@/components/vet/Public";
import { Alert, Button, Field, Input, Spinner } from "@/components/ui";
import { getSupabase, errorMessage } from "@/lib/supabase";

export default function ResetPasswordPage() {
  const router = useRouter();
  const { loading, user, profile } = useAuth();
  const [pwd, setPwd] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (pwd.length < 8) return setError("Le mot de passe doit contenir au moins 8 caractères.");
    if (pwd !== confirm) return setError("Les mots de passe ne correspondent pas.");
    setBusy(true);
    const { error } = await getSupabase().auth.updateUser({ password: pwd });
    setBusy(false);
    if (error) return setError(errorMessage(error));
    setDone(true);
  }

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <PublicHeader />
      <main className="flex flex-1 items-center justify-center bg-gradient-to-br from-[#eef5fd] via-[#f5f9fe] to-white px-4 py-12">
        <div className="w-full max-w-[460px] rounded-[28px] bg-white p-6 shadow-[0_20px_60px_rgba(15,40,90,0.10)] sm:p-9">
          <span className="grid size-16 place-items-center rounded-full bg-primary-soft text-primary">
            <KeyRound className="size-8" />
          </span>
          <h1 className="mt-5 text-[28px] font-extrabold leading-tight">Nouveau mot de passe</h1>

          {loading ? (
            <div className="grid place-items-center py-10">
              <Spinner />
            </div>
          ) : done ? (
            <div className="mt-5 space-y-5">
              <div className="flex items-start gap-3 rounded-2xl bg-emerald-50 p-4 text-emerald-800">
                <CheckCircle2 className="size-6 shrink-0" />
                <p className="text-sm font-medium">Votre mot de passe a bien été modifié.</p>
              </div>
              <Button className="h-13 w-full" onClick={() => router.replace(profile?.role === "veterinaire" ? "/" : "/connexion")}>
                {profile?.role === "veterinaire" ? "Accéder à mon espace" : "Se connecter"}
              </Button>
            </div>
          ) : !user ? (
            <div className="mt-5 space-y-5">
              <Alert tone="orange">Ce lien de réinitialisation est invalide ou a expiré. Demandez un nouveau lien depuis la page de connexion.</Alert>
              <Button href="/connexion" className="h-13 w-full">
                Retour à la connexion
              </Button>
            </div>
          ) : (
            <form onSubmit={submit} className="mt-6 space-y-5">
              <p className="text-body">Choisissez un nouveau mot de passe pour {user.email}.</p>
              <Field label="Nouveau mot de passe">
                <Input
                  type={show ? "text" : "password"}
                  value={pwd}
                  onChange={(e) => setPwd(e.target.value)}
                  icon={<Lock />}
                  autoComplete="new-password"
                  className="h-14"
                  right={
                    <button type="button" onClick={() => setShow((s) => !s)} className="p-1 text-muted hover:text-primary" aria-label="Afficher le mot de passe">
                      {show ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
                    </button>
                  }
                />
              </Field>
              <Field label="Confirmer le mot de passe">
                <Input type={show ? "text" : "password"} value={confirm} onChange={(e) => setConfirm(e.target.value)} icon={<Lock />} autoComplete="new-password" className="h-14" />
              </Field>
              <Alert>{error}</Alert>
              <Button type="submit" loading={busy} size="lg" className="h-14 w-full">
                Enregistrer le mot de passe
              </Button>
            </form>
          )}
        </div>
      </main>
      <div className="hidden sm:block">
        <PublicFooter />
      </div>
    </div>
  );
}
