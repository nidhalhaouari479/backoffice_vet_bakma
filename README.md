# Bakma Store — Back-office vétérinaire

Espace des vétérinaires partenaires de Bakma Store (port **3002**) : prise en charge des demandes de
vérification sanitaire, rédaction du rapport vétérinaire, calendrier des rendez-vous et messagerie
avec les propriétaires.

## Démarrage

```bash
cp .env.example .env.local   # renseigner les clés Supabase et les URLs des 3 applications
npm install
npm run dev                  # http://localhost:3002
```

La base de données se crée avec `../supabase/schema.sql`. Un vétérinaire s'inscrit depuis le site public
(`/inscription?role=veterinaire`) puis doit être **validé** par un administrateur avant d'accéder aux demandes.

## Pages

| Route | Contenu |
|---|---|
| `/connexion`, `/reinitialiser-mot-de-passe` | Connexion vétérinaire, mot de passe oublié |
| `/` | Tableau de bord (KPI, dernières demandes, agenda du jour, statistiques) |
| `/demandes` | Demandes (nouvelles / en cours / à revoir / terminées), filtres, prise en charge |
| `/demandes/[id]` | Fiche consultation : animal, propriétaire, RDV, rapport (examens, vaccins, documents, photos), décision |
| `/calendrier` | Vues jour / semaine / mois des rendez-vous, consultations à planifier |
| `/animaux` | Animaux consultés |
| `/messages`, `/notifications`, `/profil` | Messagerie temps réel, notifications, profil et clinique |

## Technique

Next.js 16 (App Router, `cacheComponents`), React 19, Tailwind CSS v4, Supabase (RLS + RPC).
Les pages sont des composants client ; les transitions de workflow passent par les RPC
`claim_consultation`, `complete_consultation` et `start_conversation`.
