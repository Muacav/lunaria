# Lunaria

A private period and cycle tracker that installs on a phone as a web app,
with an optional read-only partner view. English, French and Italian.
No subscription: it runs on free hosting and the Supabase free tier.

## What it does

| | |
| --- | --- |
| **Today** | Cycle dial (one petal per day, coloured by phase; drag around it to look ahead), countdown to the next period, current phase with an explanation and a tip, chance-of-pregnancy label, week strip, quick "Period started / ended" buttons |
| **Calendar** | Logged periods, expected periods, fertile window and ovulation; tap a day for details; "Edit period days" mode to fix dates; swipe between months |
| **Daily log** | Flow, symptoms, mood, discharge, sex, temperature, weight, water, notes |
| **Insights** | Average cycle and period length, variation and regularity, past cycles as bars, most-logged symptoms and moods, usual mood per phase |
| **You** | Profile, language, light/dark/automatic theme, PIN lock, partner sharing, add predictions to the phone calendar (.ics with reminders), backup export/import, delete all data |
| **Partner link** | Read-only page for the partner: her phase, countdown, how to support her, upcoming dates, today's mood/symptoms if she allows it, add her dates to his calendar |

Works offline after the first visit (service worker) and can be added to the
home screen like an app.

### How predictions work

The same calendar method trackers use before they have lots of data:

- a period is a run of logged days; cycle length is the gap between two
  period starts;
- the averages use her last 6 cycles, weighted towards recent ones; cycles
  shorter than 18 or longer than 50 days are left out as outliers;
- until 2 periods are logged, the lengths she gave during setup are used;
- ovulation is estimated 14 days before the next period; the fertile window
  is the 5 days before ovulation plus the day after;
- if the expected day passes with no period logged, the app shows "late by
  N days".

It is an estimate, not contraception, and the app says so.

## Privacy

- Without sync, everything stays in the phone's browser storage.
- With sync, her full data is stored in Supabase under row level security:
  only her signed-in account can read it.
- The partner link only reads a **snapshot** her phone builds: period dates
  from the last ~200 days, her usual lengths, and today's mood/symptoms only
  if she switches those on. Turning the link off deletes the snapshot.
- The PIN lock is a screen lock on the phone (only a hash is stored), not
  encryption.

## Run it locally

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # prediction engine tests
npm run build    # production build in dist/
```

Without Supabase settings the app runs fully local and the sharing section
explains that sync is not set up.

## Turn on sharing (Supabase, free)

1. Create a free project at supabase.com (pick an EU region if you are in
   Europe).
2. In **SQL Editor**, run `supabase/schema.sql`.
3. In **Authentication → URL Configuration**, set the Site URL to where the
   app is hosted (for example `https://<user>.github.io/<repo>/`).
4. Copy the project URL and the **anon / publishable** key from
   **Project Settings → API** into `.env` (see `.env.example`) for local
   use, or into the hosting settings for the live site.

The anon key is designed to be public; row level security is what protects
the data.

The free tier pauses a project after a week with no activity. Daily use of
the app keeps it awake; if it does pause, restore it from the Supabase
dashboard.

## Host it for free

**GitHub Pages** (included): `.github/workflows/deploy.yml` builds and
publishes on every push to `main`.

1. Repository **Settings → Pages → Source: GitHub Actions**.
2. **Settings → Secrets and variables → Actions → Variables**: add
   `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
3. Push to `main`.

GitHub Pages on a private repository needs a paid GitHub plan. For a private
repo, Cloudflare Pages or Netlify are free: build command `npm run build`,
output folder `dist`, plus the same two environment variables.

## Install on her phone

- **iPhone (Safari):** open the link → Share → *Add to Home Screen*.
- **Android (Chrome):** open the link → menu → *Install app*.

## Project layout

```
src/lib/cycle.js      prediction engine (pure, tested)
src/lib/store.js      local state + persistence
src/lib/sync.js       Supabase auth, sync and partner link
src/lib/snapshot.js   what the partner link exposes
src/lib/i18n.js       English / French / Italian text
src/screens/          Today, Calendar, Insights, You, Partner, Onboarding, Lock
src/components/       Dial, LogSheet, Sheet, WeekStrip, PinPad, toast
supabase/schema.sql   tables, row level security, partner RPC
```
