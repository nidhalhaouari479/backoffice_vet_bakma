"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowRight, ClipboardList, Eye, EyeOff, Lock, Mail, PawPrint, ShieldCheck, Stethoscope, UserPlus } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { PublicFooter, PublicHeader } from "@/components/vet/Public";
import { Alert, Button, Field, Input, Modal } from "@/components/ui";
import { getSupabase, errorMessage } from "@/lib/supabase";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "";
const VET = process.env.NEXT_PUBLIC_VET_URL || "";

const POINTS = [
  { icon: ClipboardList, text: ["Consultez", "les demandes"] },
  { icon: ShieldCheck, text: ["Vérifiez l'état de santé", "des animaux"] },
  { icon: PawPrint, text: ["Participez à une adoption", "responsable"] },
];

function ForgotModal({ open, onClose, initialEmail }: { open: boolean; onClose: () => void; initialEmail: string }) {
  const [email, setEmail] = useState(initialEmail);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return setError("Indiquez votre adresse e-mail.");
    setBusy(true);
    setError(null);
    const base = VET || window.location.origin;
    const { error } = await getSupabase().auth.resetPasswordForEmail(email.trim(), { redirectTo: `${base}/reinitialiser-mot-de-passe` });
    setBusy(false);
    if (error) return setError(errorMessage(error));
    setSent(true);
  }

  return (
    <Modal open={open} onClose={onClose} title="Mot de passe oublié" size="sm">
      {sent ? (
        <Alert tone="green">Si un compte existe pour {email}, un e-mail de réinitialisation vient d&apos;être envoyé. Consultez votre boîte de réception.</Alert>
      ) : (
        <form onSubmit={send} className="space-y-4">
          <p className="text-sm text-body">Saisissez votre adresse e-mail : nous vous enverrons un lien pour choisir un nouveau mot de passe.</p>
          <Field label="Adresse e-mail">
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} icon={<Mail />} placeholder="votre@email.com" autoFocus />
          </Field>
          <Alert>{error}</Alert>
          <Button type="submit" loading={busy} className="w-full">
            Envoyer le lien
          </Button>
        </form>
      )}
    </Modal>
  );
}

export default function ConnexionPage() {
  const router = useRouter();
  const { loading, user, profile } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forgot, setForgot] = useState(false);

  // Déjà connecté en tant que vétérinaire → tableau de bord
  useEffect(() => {
    if (!loading && user && profile?.role === "veterinaire") router.replace("/");
  }, [loading, user, profile, router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password) return setError("Renseignez votre e-mail et votre mot de passe.");
    setBusy(true);
    setError(null);
    const supabase = getSupabase();
    const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error || !data.user) {
      setBusy(false);
      return setError(errorMessage(error));
    }
    const { data: p } = await supabase.from("profiles").select("role").eq("id", data.user.id).maybeSingle();
    if (p?.role !== "veterinaire") {
      await supabase.auth.signOut();
      setBusy(false);
      return setError("Ce compte n'est pas un compte vétérinaire. Utilisez le site Bakma Store pour vous connecter en tant que particulier.");
    }
    router.replace("/");
  }

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <PublicHeader />

      <main className="relative flex-1 overflow-hidden bg-gradient-to-br from-[#eef5fd] via-[#f5f9fe] to-white">
        {/* Image mobile */}
        <div className="relative h-64 sm:h-80 lg:hidden">
          <Image src="/hero-vet.jpg" alt="Vétérinaire avec un chien et un chat" fill priority sizes="100vw" className="object-cover object-[center_20%]" />
          <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-white to-transparent" />
        </div>

        <div className="relative mx-auto grid max-w-[1440px] lg:min-h-[680px] lg:grid-cols-[minmax(0,1fr)_480px]">
          {/* Hero desktop */}
          <section className="relative hidden lg:block">
            <div className="absolute inset-y-0 right-0 w-[62%]">
              <Image src="/hero-vet.jpg" alt="Vétérinaire avec un chien et un chat" fill priority sizes="40vw" className="object-cover object-top" />
              <div className="absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-[#f1f7fe] to-transparent" />
            </div>
            <div className="relative z-10 flex h-full max-w-[460px] flex-col justify-center py-16 pl-12">
              <span className="grid size-20 place-items-center rounded-full bg-primary-soft text-primary">
                <Stethoscope className="size-10" />
              </span>
              <h1 className="mt-6 text-[56px] font-extrabold leading-[1.05] tracking-tight text-navy">
                Espace
                <br />
                Vétérinaire
              </h1>
              <p className="mt-5 text-lg text-body">
                Accédez à votre espace pour consulter les demandes, valider les informations et contribuer à la santé des animaux.
              </p>
              <ul className="mt-8 space-y-5">
                {POINTS.map(({ icon: Icon, text }) => (
                  <li key={text[0]} className="flex items-center gap-4">
                    <span className="grid size-16 shrink-0 place-items-center rounded-full bg-primary-soft text-primary">
                      <Icon className="size-7" />
                    </span>
                    <span className="text-[17px] font-medium leading-snug text-navy">
                      {text[0]}
                      <br />
                      {text[1]}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          {/* Carte de connexion */}
          <section className="relative z-10 -mt-6 px-4 pb-10 sm:px-8 lg:mt-0 lg:flex lg:items-center lg:px-6 lg:py-12">
            <div className="mx-auto w-full max-w-[480px] rounded-[28px] bg-white p-6 shadow-[0_20px_60px_rgba(15,40,90,0.10)] sm:p-9">
              <h2 className="text-[28px] font-extrabold leading-tight sm:text-[32px]">Connexion Vétérinaire</h2>
              <p className="mt-2 text-body">Accédez à votre espace pour consulter et valider les demandes.</p>

              <form onSubmit={submit} className="mt-7 space-y-5">
                <Field label="Adresse e-mail">
                  <Input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="votre@email.com" icon={<Mail />} className="h-14" />
                </Field>
                <div>
                  <Field label="Mot de passe">
                    <Input
                      type={show ? "text" : "password"}
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Votre mot de passe"
                      icon={<Lock />}
                      className="h-14"
                      right={
                        <button type="button" onClick={() => setShow((s) => !s)} className="p-1 text-muted hover:text-primary" aria-label={show ? "Masquer le mot de passe" : "Afficher le mot de passe"}>
                          {show ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
                        </button>
                      }
                    />
                  </Field>
                  <div className="mt-2 text-right">
                    <button type="button" onClick={() => setForgot(true)} className="text-sm font-medium text-primary underline underline-offset-2 hover:text-primary-dark">
                      Mot de passe oublié ?
                    </button>
                  </div>
                </div>

                <Alert>{error}</Alert>

                <Button type="submit" loading={busy} size="lg" className="h-14 w-full from-[#0e8fb5]! to-[#0b6e9e]! text-base">
                  Se connecter {!busy && <ArrowRight className="size-5" />}
                </Button>
              </form>

              <div className="my-6 flex items-center gap-4 text-sm text-body">
                <span className="h-px flex-1 bg-line" />
                ou
                <span className="h-px flex-1 bg-line" />
              </div>

              <a
                href={`${SITE}/inscription`}
                className="flex h-14 w-full items-center justify-center gap-3 rounded-[var(--radius-btn)] border border-primary/40 bg-white text-[15px] font-semibold text-primary transition hover:bg-primary-soft"
              >
                <UserPlus className="size-5" /> Créer un compte
              </a>
              <p className="mt-3 text-center text-xs text-muted">
                Les accès vétérinaires sont activés par l&apos;administration de Bakma Store après création de votre compte.
              </p>

              <div className="mt-6 flex items-center gap-4 rounded-2xl bg-primary-soft/60 p-4">
                <span className="grid size-12 shrink-0 place-items-center rounded-full bg-white text-primary">
                  <Lock className="size-6" />
                </span>
                <div>
                  <p className="font-bold text-primary">Accès sécurisé</p>
                  <p className="text-sm text-body">Vos informations sont protégées et confidentielles.</p>
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>

      <div className="hidden sm:block">
        <PublicFooter />
      </div>

      <ForgotModal key={forgot ? "open" : "closed"} open={forgot} onClose={() => setForgot(false)} initialEmail={email} />
    </div>
  );
}
