"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  Bell,
  CalendarDays,
  ChevronDown,
  ClipboardList,
  Clock,
  Home,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageCircle,
  PawPrint,
  Search,
  ShieldAlert,
  Stethoscope,
  UserCircle2,
  X,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { CountersProvider, useCounters } from "@/hooks/useCounters";
import { getSupabase } from "@/lib/supabase";
import { timeAgo } from "@/lib/labels";
import { drName } from "@/lib/vet";
import { Logo } from "../Logo";
import { Avatar, Button, Card, PageLoader, cn } from "../ui";

type NavItem = { href: string; label: string; icon: React.ElementType; badge?: "requests" | "messages" | "notifications" };

const NAV: NavItem[] = [
  { href: "/", label: "Tableau de bord", icon: LayoutDashboard },
  { href: "/demandes", label: "Demandes", icon: ClipboardList, badge: "requests" },
  { href: "/calendrier", label: "Mon calendrier", icon: CalendarDays },
  { href: "/animaux", label: "Animaux consultés", icon: PawPrint },
  { href: "/messages", label: "Messages", icon: MessageCircle, badge: "messages" },
  { href: "/notifications", label: "Notifications", icon: Bell, badge: "notifications" },
  { href: "/profil", label: "Mon profil", icon: UserCircle2 },
];

const TABS: NavItem[] = [
  { href: "/", label: "Accueil", icon: Home },
  { href: "/demandes", label: "Demandes", icon: ClipboardList, badge: "requests" },
  { href: "/calendrier", label: "Calendrier", icon: CalendarDays },
  { href: "/animaux", label: "Animaux", icon: PawPrint },
];

const isActive = (pathname: string, href: string) => (href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`));

function CountBadge({ n, className }: { n: number; className?: string }) {
  if (!n) return null;
  return (
    <span className={cn("grid h-5 min-w-5 place-items-center rounded-full bg-red-500 px-1.5 text-[11px] font-bold leading-none text-white", className)}>
      {n > 99 ? "99+" : n}
    </span>
  );
}

function useBadge(kind: NavItem["badge"]): number {
  const c = useCounters();
  if (kind === "requests") return c.newRequests;
  if (kind === "messages") return c.unreadMessages;
  if (kind === "notifications") return c.unreadNotifications;
  return 0;
}

function SideLink({ item, onNavigate }: { item: NavItem; onNavigate?: () => void }) {
  const pathname = usePathname();
  const active = isActive(pathname, item.href);
  const n = useBadge(item.badge);
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={cn(
        "relative flex h-13 items-center gap-3.5 rounded-2xl px-4 text-[15px] font-medium transition",
        active ? "bg-primary-soft font-semibold text-primary" : "text-body hover:bg-page hover:text-navy",
      )}
    >
      {active && <span className="absolute -left-3 top-2.5 bottom-2.5 w-1 rounded-full bg-primary" />}
      <Icon className={cn("size-5 shrink-0", active ? "text-primary" : "text-navy/70")} />
      <span className="flex-1 truncate">{item.label}</span>
      <CountBadge n={n} />
    </Link>
  );
}

function Sidebar({ onNavigate, onSignOut }: { onNavigate?: () => void; onSignOut: () => void }) {
  return (
    <nav className="flex h-full flex-col gap-1.5 px-5 py-6">
      {NAV.map((item) => (
        <SideLink key={item.href} item={item} onNavigate={onNavigate} />
      ))}
      <div className="flex-1" />
      <button onClick={onSignOut} className="flex h-13 items-center gap-3.5 rounded-2xl px-4 text-[15px] font-semibold text-primary transition hover:bg-primary-soft">
        <LogOut className="size-5" />
        Se déconnecter
      </button>
    </nav>
  );
}

function BellMenu() {
  const { unreadNotifications, latestNotifications, refresh } = useCounters();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  async function openNotif(id: string, link: string | null, read: boolean) {
    setOpen(false);
    if (!read) {
      await getSupabase().from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id);
      refresh();
    }
    router.push(link || "/notifications");
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative grid size-11 place-items-center rounded-full text-navy transition hover:bg-page"
        aria-label="Notifications"
      >
        <Bell className="size-6" />
        <CountBadge n={unreadNotifications} className="absolute right-0.5 top-0.5 h-[18px] min-w-[18px] px-1 text-[10px]" />
      </button>
      {open && (
        <Card className="absolute right-0 top-13 z-40 w-[min(360px,calc(100vw-24px))] overflow-hidden p-0">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <span className="font-bold text-navy">Notifications</span>
            <Link href="/notifications" onClick={() => setOpen(false)} className="text-sm font-semibold text-primary">
              Voir toutes
            </Link>
          </div>
          {latestNotifications.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted">Aucune notification</p>
          ) : (
            <ul className="max-h-96 divide-y divide-line overflow-y-auto">
              {latestNotifications.map((n) => (
                <li key={n.id}>
                  <button onClick={() => openNotif(n.id, n.link, !!n.read_at)} className="flex w-full gap-3 px-4 py-3 text-left transition hover:bg-page">
                    <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", n.read_at ? "bg-transparent" : "bg-primary")} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-navy">{n.title}</span>
                      {n.body && <span className="line-clamp-2 block text-xs text-muted">{n.body}</span>}
                      <span className="mt-0.5 block text-[11px] text-muted">{timeAgo(n.created_at)}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}
    </div>
  );
}

function UserMenu({ onSignOut }: { onSignOut: () => void }) {
  const { profile } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen((o) => !o)} className="flex items-center gap-3 rounded-full p-1 transition hover:bg-page lg:pr-3">
        <Avatar src={profile?.avatar_url} name={profile?.full_name} size={44} />
        <span className="hidden text-left lg:block">
          <span className="block text-sm font-bold text-navy">{drName(profile?.full_name)}</span>
          <span className="block text-xs text-muted">Vétérinaire</span>
        </span>
        <ChevronDown className="hidden size-4 text-navy lg:block" />
      </button>
      {open && (
        <Card className="absolute right-0 top-14 z-40 w-56 p-2">
          <Link href="/profil" onClick={() => setOpen(false)} className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-body hover:bg-page">
            <UserCircle2 className="size-4" /> Mon profil
          </Link>
          <Link href="/notifications" onClick={() => setOpen(false)} className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-body hover:bg-page">
            <Bell className="size-4" /> Notifications
          </Link>
          <Link href="/messages" onClick={() => setOpen(false)} className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-body hover:bg-page">
            <MessageCircle className="size-4" /> Messages
          </Link>
          <button onClick={onSignOut} className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50">
            <LogOut className="size-4" /> Se déconnecter
          </button>
        </Card>
      )}
    </div>
  );
}

function HeaderSearch({ className }: { className?: string }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  return (
    <form
      className={cn("relative", className)}
      onSubmit={(e) => {
        e.preventDefault();
        router.push(`/demandes?tab=toutes&q=${encodeURIComponent(q.trim())}`);
      }}
    >
      <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-navy/70" />
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Rechercher un animal, un propriétaire…"
        className="h-12 w-full rounded-full border border-line bg-page/60 pl-12 pr-4 text-sm text-navy outline-none transition placeholder:text-muted focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/10"
      />
    </form>
  );
}

function MobileTabs() {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-line bg-white pb-[env(safe-area-inset-bottom)] shadow-[0_-6px_24px_rgba(15,40,90,0.06)] lg:hidden">
      {TABS.map((t) => (
        <MobileTab key={t.href} item={t} active={isActive(pathname, t.href)} />
      ))}
    </nav>
  );
}

function MobileTab({ item, active }: { item: NavItem; active: boolean }) {
  const n = useBadge(item.badge);
  const Icon = item.icon;
  return (
    <Link href={item.href} className={cn("flex flex-col items-center gap-1 py-2.5 text-[11px] font-semibold", active ? "text-primary" : "text-muted")}>
      <span className="relative">
        <Icon className={cn("size-6", active && "fill-primary/15")} />
        <CountBadge n={n} className="absolute -right-3 -top-2 h-4 min-w-4 px-1 text-[9px]" />
      </span>
      {item.label}
    </Link>
  );
}

function Frame({ children, onSignOut }: { children: React.ReactNode; onSignOut: () => void }) {
  const [drawer, setDrawer] = useState(false);
  return (
    <div className="min-h-screen bg-page">
      <header className="sticky top-0 z-30 flex h-[72px] items-center gap-3 border-b border-line bg-white/95 px-3 backdrop-blur sm:px-5 lg:h-[84px] lg:gap-6 lg:px-0">
        <button onClick={() => setDrawer(true)} className="grid size-11 place-items-center rounded-xl text-navy hover:bg-page lg:hidden" aria-label="Menu">
          <Menu className="size-6" />
        </button>
        <div className="flex flex-1 justify-center lg:w-[280px] lg:flex-none lg:justify-start lg:pl-10">
          <Logo height={42} />
        </div>
        <HeaderSearch className="hidden max-w-xl flex-1 md:block" />
        <div className="flex items-center gap-1 sm:gap-3 lg:ml-auto lg:pr-8">
          <BellMenu />
          <UserMenu onSignOut={onSignOut} />
        </div>
      </header>

      <div className="flex">
        <aside className="sticky top-[84px] hidden h-[calc(100vh-84px)] w-[280px] shrink-0 border-r border-line bg-white lg:block">
          <Sidebar onSignOut={onSignOut} />
        </aside>
        <main className="min-w-0 flex-1 px-4 pb-28 pt-5 sm:px-6 lg:px-8 lg:pb-10 lg:pt-7">
          <HeaderSearch className="mb-4 md:hidden" />
          {children}
        </main>
      </div>

      <MobileTabs />

      {drawer && (
        <div className="fixed inset-0 z-50 bg-navy/40 backdrop-blur-sm lg:hidden" onClick={() => setDrawer(false)}>
          <div className="h-full w-[290px] max-w-[85vw] bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex h-[72px] items-center justify-between border-b border-line px-5">
              <Logo height={38} />
              <button onClick={() => setDrawer(false)} className="rounded-full p-2 text-muted hover:bg-page" aria-label="Fermer">
                <X className="size-5" />
              </button>
            </div>
            <div className="h-[calc(100%-72px)]">
              <Sidebar onNavigate={() => setDrawer(false)} onSignOut={onSignOut} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Blocked({ icon, title, text, children }: { icon: React.ReactNode; title: string; text: string; children?: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-xl py-10">
      <Card className="flex flex-col items-center gap-4 px-6 py-12 text-center">
        <span className="grid size-18 place-items-center rounded-full bg-primary-soft text-primary [&>svg]:size-8">{icon}</span>
        <h1 className="text-2xl font-extrabold">{title}</h1>
        <p className="max-w-md text-body">{text}</p>
        <div className="mt-2 flex flex-wrap justify-center gap-3">{children}</div>
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
      <div className="min-h-screen bg-page px-4">
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
