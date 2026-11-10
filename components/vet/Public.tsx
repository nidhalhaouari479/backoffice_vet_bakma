"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, Search, User, X } from "lucide-react";
import { Logo } from "../Logo";

const SITE = process.env.NEXT_PUBLIC_SITE_URL || "";

const LINKS = [
  { href: `${SITE}/`, label: "Accueil" },
  { href: `${SITE}/animaux`, label: "Animaux" },
  { href: `${SITE}/comment-ca-marche`, label: "Comment ça marche" },
  { href: `${SITE}/a-propos`, label: "À propos" },
];

/** En-tête public (pages de connexion). */
export function PublicHeader() {
  const [open, setOpen] = useState(false);
  return (
    <header className="relative z-20 border-b border-line bg-white">
      <div className="mx-auto flex h-[72px] max-w-[1440px] items-center gap-4 px-4 sm:px-8 lg:h-[88px]">
        <button onClick={() => setOpen((o) => !o)} className="grid size-11 place-items-center rounded-xl bg-primary-soft text-primary lg:hidden" aria-label="Menu">
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
        <div className="flex flex-1 justify-center lg:flex-none">
          <Logo height={46} />
        </div>
        <nav className="ml-6 hidden items-center gap-8 lg:flex">
          {LINKS.map((l) => (
            <a key={l.label} href={l.href} className="text-[15px] font-medium text-navy transition hover:text-primary">
              {l.label}
            </a>
          ))}
        </nav>
        <form action={`${SITE}/animaux`} className="relative ml-auto hidden w-64 xl:block">
          <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-navy" />
          <input name="q" placeholder="Rechercher un animal…" className="h-12 w-full rounded-full border border-line pl-12 pr-4 text-sm outline-none placeholder:text-muted focus:border-primary" />
        </form>
        <div className="flex items-center gap-2 lg:ml-0">
          <a href={`${SITE}/animaux`} className="grid size-11 place-items-center rounded-full text-primary lg:hidden" aria-label="Rechercher">
            <Search className="size-5" />
          </a>
          <Link href="/connexion" className="hidden h-12 items-center gap-2 rounded-full border border-line px-5 text-sm font-semibold text-navy transition hover:border-primary lg:inline-flex">
            <User className="size-5" /> Se connecter
          </Link>
          <Link href="/connexion" className="grid size-11 place-items-center rounded-full bg-primary text-white lg:hidden" aria-label="Compte">
            <User className="size-5" />
          </Link>
        </div>
      </div>
      {open && (
        <nav className="absolute inset-x-0 top-full border-b border-line bg-white px-4 py-3 shadow-lg lg:hidden">
          {LINKS.map((l) => (
            <a key={l.label} href={l.href} className="block rounded-xl px-3 py-3 font-medium text-navy hover:bg-page">
              {l.label}
            </a>
          ))}
        </nav>
      )}
    </header>
  );
}

const SOCIAL: { label: string; path: string }[] = [
  {
    label: "Facebook",
    path: "M12 2a10 10 0 0 0-1.56 19.88v-7H7.9V12h2.54V9.8c0-2.5 1.49-3.89 3.78-3.89 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.44 2.89h-2.34v7A10 10 0 0 0 12 2Z",
  },
  {
    label: "Instagram",
    path: "M12 7.4a4.6 4.6 0 1 0 0 9.2 4.6 4.6 0 0 0 0-9.2Zm0 7.6a3 3 0 1 1 0-6 3 3 0 0 1 0 6Zm5.85-7.8a1.07 1.07 0 1 1-2.14 0 1.07 1.07 0 0 1 2.14 0ZM21 8.2c-.06-1.4-.37-2.64-1.4-3.66C18.6 3.5 17.36 3.2 15.96 3.13 14.5 3.05 9.5 3.05 8.04 3.13 6.64 3.2 5.4 3.5 4.38 4.53 3.35 5.56 3.04 6.8 2.97 8.2c-.08 1.45-.08 6.46 0 7.91.07 1.4.38 2.65 1.41 3.67 1.02 1.03 2.26 1.34 3.66 1.41 1.46.08 6.46.08 7.92 0 1.4-.07 2.64-.38 3.66-1.41 1.03-1.02 1.34-2.26 1.41-3.67.08-1.45.08-6.45 0-7.9Zm-1.89 9.45a3 3 0 0 1-1.69 1.69c-1.17.46-3.94.36-5.42.36s-4.26.1-5.42-.36a3 3 0 0 1-1.69-1.69c-.46-1.17-.36-3.94-.36-5.42s-.1-4.26.36-5.42a3 3 0 0 1 1.69-1.7c1.17-.46 3.94-.35 5.42-.35s4.26-.1 5.42.36a3 3 0 0 1 1.69 1.69c.46 1.17.36 3.94.36 5.42s.1 4.26-.36 5.42Z",
  },
  {
    label: "YouTube",
    path: "M21.58 7.19a2.5 2.5 0 0 0-1.77-1.77C18.25 5 12 5 12 5s-6.25 0-7.81.42A2.5 2.5 0 0 0 2.42 7.2C2 8.75 2 12 2 12s0 3.25.42 4.81a2.5 2.5 0 0 0 1.77 1.77C5.75 19 12 19 12 19s6.25 0 7.81-.42a2.5 2.5 0 0 0 1.77-1.77C22 15.25 22 12 22 12s0-3.25-.42-4.81ZM10 15V9l5.2 3L10 15Z",
  },
  {
    label: "LinkedIn",
    path: "M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14ZM8.34 18.34V10.3H5.67v8.04h2.67ZM7 9.2a1.55 1.55 0 1 0 0-3.1 1.55 1.55 0 0 0 0 3.1Zm11.34 9.14v-4.4c0-2.36-.5-4.17-3.26-4.17a2.86 2.86 0 0 0-2.57 1.41h-.04V10.3H9.9v8.04h2.66v-3.98c0-1.05.2-2.07 1.5-2.07 1.29 0 1.3 1.2 1.3 2.14v3.91h2.98Z",
  },
];

/** Pied de page public 4 colonnes. */
export function PublicFooter() {
  return (
    <footer className="border-t border-line bg-white">
      <div className="mx-auto grid max-w-[1440px] gap-8 px-6 py-10 sm:grid-cols-2 sm:px-8 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <Logo height={50} />
          <p className="mt-3 max-w-xs text-sm text-body">Une plateforme dédiée aux animaux et à leur bien-être.</p>
        </div>
        <div>
          <h4 className="mb-3 font-bold">Liens utiles</h4>
          <ul className="space-y-2 text-sm text-body">
            {LINKS.map((l) => (
              <li key={l.label}>
                <a href={l.href} className="hover:text-primary">
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="mb-3 font-bold">Aide</h4>
          <ul className="space-y-2 text-sm text-body">
            {[
              ["Centre d'aide", "/aide"],
              ["Nous contacter", "/contact"],
              ["Conditions d'utilisation", "/conditions"],
              ["Politique de confidentialité", "/confidentialite"],
            ].map(([label, href]) => (
              <li key={label}>
                <a href={`${SITE}${href}`} className="hover:text-primary">
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="mb-3 font-bold">Suivez-nous</h4>
          <div className="flex gap-4">
            {SOCIAL.map((s) => (
              <a key={s.label} href="#" aria-label={s.label} className="text-navy transition hover:text-primary">
                <svg viewBox="0 0 24 24" className="size-6 fill-current" aria-hidden>
                  <path d={s.path} />
                </svg>
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
