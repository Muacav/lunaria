# Lunaria

A private period and cycle tracker that installs on a phone as a web app,
with a read-only partner view. English, French and Italian. Free for
everyone who signs up: it runs on Vercel's free plan and the Supabase free
tier.

## What it does

| | |
| --- | --- |
| **Account** | Anyone can create a free account (her friends too). Each account's data is private to that account |
| **Set-up** | One question per screen: name, last period, period length, cycle length, then "All set" |
| **Daily welcome** | Once a day: "Good morning, *her name*", her cycle day, when her period is due, and the illustration of her phase |
| **Today** | Cycle dial (one petal per day, coloured by phase; drag around it to look ahead), countdown, phase explanation with illustration and tip, chance-of-pregnancy label, week strip, "Period started / ended" |
| **Calendar** | Logged and expected periods, fertile window, ovulation; tap a day for details; edit mode to fix dates; swipe between months |
| **Daily log** | Flow, symptoms, mood, discharge, sex, temperature, weight, water, notes, with a small celebration on save |
| **Insights** | Average cycle and period length, variation, regularity, past cycles, most-logged symptoms and moods, usual mood per phase |
| **You** | Account, invite a friend, profile, language, light/dark/automatic, partner link, PIN lock, add predictions to the phone calendar (.ics with reminders), backup, delete account |
| **Partner link** | Read-only page for the partner: her phase, countdown, how to support her, upcoming dates, today's mood/symptoms if she allows it, add her dates to his calendar |

Works offline after the first visit and can be added to the home screen.

### Design

- Type: **Cormorant** for headings and numbers, **Parisienne** (a French
  script) for her name, **Figtree** for everything else. All self-hosted.
- One colour per phase: pomegranate (period), rose (follicular), lagoon
  (fertile), saffron (ovulation), iris (luteal).
- Original illustrations (`src/components/PhaseArt.jsx`): the life of a
  lunaria plant, whose seed pods look like little moons. Bud, opening
  flower, full bloom, moon pods, falling petals, and a crescent moon when a
  period is late. They follow light/dark mode and move gently.
- Motion: dial blooms in and counts its number up, sheets rise, screens
  fade in, the tab pill slides, months slide, chips pop, bars grow, and a
  petal burst celebrates each saved log. Everything respects the phone's
  "reduce motion" setting.

### How predictions work

The same calendar method trackers use before they have lots of data:

- a period is a run of logged days; cycle length is the gap between two
  period starts;
- averages use the last 6 cycles, weighted towards recent ones; cycles
  shorter than 18 or longer than 50 days are left out as outliers;
- until 2 periods are logged, the lengths given during set-up are used;
- ovulation is estimated 14 days before the next period; the fertile window
  is the 5 days before ovulation plus the day after;
- if the expected day passes with no period logged, the app shows "late by
  N days".

It is an estimate, not contraception, and the app says so.

## Privacy and security

- Each user's data lives in `cycle_data` under row level security: only
  that signed-in account can read or write it.
- The partner link reads a **snapshot** her phone builds: period dates from
  the last ~200 days, her usual lengths, and today's mood/symptoms only if
  she switches those on. It is served by `get_partner_view(token)`, which
  returns one snapshot for an exact 32-character random token. Turning the
  link off deletes the snapshot.
- "Delete my account" removes the account and all its rows
  (`delete_my_account()`).
- The PIN lock is a screen lock on the phone (only a hash is stored, never
  synced), not encryption.
- On a shared phone, signing in with another account clears the previous
  person's local data first.

## Backend (Supabase)

Project `lunaria` (`njpgydtncadvwzhbxgpo`, Frankfurt). Schema:
`supabase/schema.sql` (already applied).

Two settings in the Supabase dashboard:

1. **Authentication → Sign In / Providers → Email → Confirm email: off.**
   Supabase's built-in mailer only sends to members of the Supabase team,
   so with confirmation on, friends could never confirm their account. To
   keep confirmation on, add your own SMTP (e.g. Resend) under
   **Authentication → Emails → SMTP Settings**. Password-reset emails need
   SMTP too.
2. **Authentication → URL Configuration:** set **Site URL** to the Vercel
   address (e.g. `https://lunaria.vercel.app`) and add it to
   **Redirect URLs**.

The free tier pauses a project after a week with no activity. Daily use
keeps it awake; if it pauses, restore it from the dashboard.

## Hosting (Vercel, free)

1. On vercel.com: **Add New → Project → Import** this GitHub repository.
2. Keep the detected settings (Vite; `vercel.json` sets the rest) and
   **Deploy**. No environment variables are needed: the public Supabase
   URL and publishable key are in `.env.production`.
3. Every push to `main` redeploys automatically.

## Install on a phone

- **iPhone (Safari):** open the link → Share → *Add to Home Screen*.
- **Android (Chrome):** open the link → menu → *Install app*.

## Develop

```bash
npm install
npm run dev      # local-only mode (no account), http://localhost:5173
npm test         # prediction engine tests
npm run build    # production build with accounts, in dist/
```

To use accounts in development, copy `.env.production` to `.env`.

## Project layout

```
src/lib/cycle.js           prediction engine (pure, tested)
src/lib/store.js           local state + persistence
src/lib/sync.js            accounts, sync, partner link
src/lib/snapshot.js        what the partner link exposes
src/lib/i18n.js            English / French / Italian text
src/lib/motion.js          count-up and reduced-motion helpers
src/screens/               Auth, Onboarding, Welcome, Today, Calendar,
                           Insights, You (Me), Partner, Lock
src/components/            Dial, PhaseArt, Celebrate, LogSheet, Sheet,
                           WeekStrip, PinPad, toast
supabase/schema.sql        tables, row level security, RPC functions
vercel.json                Vercel build and headers
```
