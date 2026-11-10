"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Bell, CalendarDays, ClipboardList, Clock, Home, LayoutDashboard, LogOut, MessageCircle, PawPrint, ShieldAlert, Stethoscope, UserCircle2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { CountersProvider, useCounters } from "@/hooks/useCounters";
import { getSupabase } from "@/lib/supabase";
import type { Notification } from "@/lib/types";
import { drName } from "@/lib/vet";
import { Logo } from "../Logo";
import { AppFrame, type NavGroup, type NavItem } from "../shell/AppFrame";
import { Button, Card, PageLoader } from "../ui";

/** Cadre de l'espace vétérinaire (barre latérale groupée, barre du haut, onglets mobiles). */
function Frame({ children, onSignOut }: { children: React.ReactNode; onSignOut: () => void }) {
  const { profile } = useAuth();
  const { unreadNotifications, unreadMessages, newRequests, latestNotifications, refresh } = useCounters();
  const router = useRouter();

  const groups: NavGroup[] = [
    {
      title: "Général",
      items: [
        { href: "/", label: "Tableau de bord", icon: LayoutDashboard },
        { href: "/calendrier", label: "Mon calendrier", icon: CalendarDays },
      ],
    },
    {
      title: "Consultations",
      items: [
        { href: "/demandes", label: "Demandes", icon: ClipboardList, badge: newRequests },
        { href: "/animaux", label: "Animaux consultés", icon: PawPrint },
      ],
    },
    {
      title: "Échanges",
      items: [
        { href: "/messages", label: "Messages", icon: MessageCircle, badge: unreadMessages },
        { href: "/notifications", label: "Notifications", icon: Bell, badge: unreadNotifications },
      ],
    },
    { title: "Compte", items: [{ href: "/profil", label: "Mon profil", icon: UserCircle2 }] },
  ];

  const tabs: NavItem[] = [
    { href: "/", label: "Accueil", icon: Home },
    { href: "/demandes", label: "Demandes", icon: ClipboardList, badge: newRequests },
    { href: "/calendrier", label: "Calendrier", icon: CalendarDays },
    { href: "/animaux", label: "Animaux", icon: PawPrint },
  ];

  async function markAll() {
    if (!profile) return;
    await getSupabase().from("notifications").update({ read_at: new Date().toISOString() }).eq("user_id", profile.id).is("read_at", null);
    refresh();
  }

  async function openNotif(n: Notification) {
    if (!n.read_at) {
      await getSupabase().from("notifications").update({ read_at: new Date().toISOString() }).eq("id", n.id);
      refresh();
    }
    router.push(n.link || "/notifications");
  }

  const name = drName(profile?.full_name);

  return (
    <AppFrame
      storageKey="bakma-vet:sidebar-collapsed"
      groups={groups}
      mobileTabs={tabs}
      user={{ name, avatar: profile?.avatar_url, role: "Vétérinaire", greeting: name }}
      notifications={{ count: unreadNotifications, items: latestNotifications, onOpen: openNotif, onMarkAll: markAll, allHref: "/notifications" }}
      menuLinks={[
        { href: "/profil", label: "Mon profil", icon: UserCircle2 },
        { href: "/notifications", label: "Notifications", icon: Bell },
        { href: "/messages", label: "Messages", icon: MessageCircle },
      ]}
      search={{ placeholder: "Rechercher un animal, un propriétaire…", toHref: (q) => `/demandes?tab=toutes&q=${encodeURIComponent(q)}` }}
      onLogout={onSignOut}
    >
      {children}
    </AppFrame>
  );
}

function Blocked({ icon, title, text, children }: { icon: React.ReactNode; title: string; text: string; children?: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-xl py-10">
      <Card className="flex flex-col items-center gap-2 px-6 py-10 text-center">
        <span className="grid size-10 place-items-center rounded-full bg-primary-soft text-primary [&>svg]:size-5" aria-hidden>
          {icon}
        </span>
        <h1 className="mt-2 text-lg font-semibold">{title}</h1>
        <p className="max-w-md text-sm text-slate-600">{text}</p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">{children}</div>
      </Card>
    </div>
  );
}

/** Layout de l'espace vétérinaire + gardes d'accès. */
export function VetShell({ children }: { children: React.ReactNode }) {
  const { loading, user, profile, vet, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace("/connexion");
  }, [loading, user, router]);

  // Si le profil ne se charge jamais (ligne absente), on finit par afficher l'écran « réservé ».
  useEffect(() => {
    if (!user || profile) return;
    const t = setTimeout(() => setTimedOut(true), 5000);
    return () => clearTimeout(t);
  }, [user, profile]);

  async function handleSignOut() {
    await signOut();
    router.replace("/connexion");
  }

  if (loading || !user) return <PageLoader />;
  if (!profile && !timedOut) return <PageLoader />;

  const site = process.env.NEXT_PUBLIC_SITE_URL || "/";

  if (!profile || profile.role !== "veterinaire") {
    return (
      <div className="min-h-screen bg-shell px-4">
        <div className="flex justify-center pt-10">
          <Logo height={48} />
        </div>
        <Blocked
          icon={<ShieldAlert />}
          title="Espace réservé aux vétérinaires"
          text="Votre compte n'a pas accès au back-office vétérinaire. Connectez-vous avec un compte vétérinaire ou retournez sur le site Bakma Store."
        >
          <Button variant="outline" onClick={() => (window.location.href = site)}>
            Retour au site
          </Button>
          <Button onClick={handleSignOut} icon={<LogOut className="size-4" />}>
            Se déconnecter
          </Button>
        </Blocked>
      </div>
    );
  }

  let content = children;
  if (profile.status === "suspendu") {
    content = (
      <Blocked icon={<ShieldAlert />} title="Compte suspendu" text="Votre compte a été suspendu par l'administration. Contactez le support Bakma Store pour plus d'informations.">
        <Button onClick={handleSignOut} icon={<LogOut className="size-4" />}>
          Se déconnecter
        </Button>
      </Blocked>
    );
  } else if (!vet?.is_verified && pathname !== "/profil") {
    content = (
      <Blocked
        icon={<Clock />}
        title="Compte en attente de validation par l'administration"
        text="Votre compte vétérinaire a bien été créé. Un administrateur doit vérifier vos informations professionnelles (clinique, numéro d'Ordre) avant que vous puissiez consulter les demandes."
      >
        <Button href="/profil" icon={<Stethoscope className="size-4" />}>
          Compléter mon profil clinique
        </Button>
        <Button variant="outline" onClick={handleSignOut} icon={<LogOut className="size-4" />}>
          Se déconnecter
        </Button>
      </Blocked>
    );
  }

  return (
    <CountersProvider userId={user.id}>
      <Frame onSignOut={handleSignOut}>{content}</Frame>
    </CountersProvider>
  );
}
