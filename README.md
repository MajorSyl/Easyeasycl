# Easyfen

A marketplace app for finding and listing properties in Freetown, Sierra Leone. Mobile + web app built with React Native (Expo), backed by Supabase; a separate Next.js dashboard for moderation and admin tasks.

> The app previously also covered hotels and local services. It's now focused entirely on properties (rent/sale/land). The underlying `hotels`/`services` tables and code still exist but are no longer reachable from the app's UI — see "Where the data lives" below.

## What's in the app

- **Home** — browse property listings; filter by For Rent / For Sale / Land / Daily-Hourly; save favorites with the heart icon
- **Search** — search by name or neighborhood, with an NLE budget filter and price sorting
- **Add Listing** — post a property with up to 10 compressed photos
- **Messages** — real-time chat between buyers and agents, with online status, unread counts, and per-user blocking
- **Profile** — edit your details, choose your role (regular user or agent), manage/edit/delete your listings, upload an avatar
- **Public profiles** — view any agent's active listings, message them, report or block them
- **Legal pages** — `/privacy`, `/terms`, `/guidelines`, `/agent-agreement`, linked from a footer on every web page

Sign-in is email + password. Browsing works without an account; posting, favoriting, messaging, and rating require one.

> **Legal page content is placeholder text**, not reviewed legal copy — replace it with your actual policies before app store submission or a public launch. See `app/privacy.tsx`, `app/terms.tsx`, `app/guidelines.tsx`, `app/agent-agreement.tsx`.

## Repo layout

```
app/                    Expo Router screens (the mobile + web app)
components/              Shared UI (ListingCard, Logo, PhotoPicker, ...)
lib/                     Supabase client, auth context, upload, sanitize, errors
constants/theme.ts       Design tokens (colors, spacing, type scale)
assets/                  App icon, adaptive icon layers, favicon, splash
assets/brand/            Source SVGs + exported sizes for the logo/icon
apps/admin/               Separate Next.js app — moderation dashboard (its own package.json)
.github/workflows/        CI: OTA publish, on-demand APK build
```

## Brand

The mark is a magnifying glass standing in for the "a" in a lowercase "easyfen" wordmark (blue "e/s/y", gold "fen") — echoing the app's core action, search. Source SVGs live in `assets/brand/`; the in-app version renders via `components/Logo.tsx` (react-native-svg, not a static image, so it scales cleanly at any size). The app icon uses the glass mark alone, since the full wordmark doesn't read at notification-icon sizes.

## Where the data lives

Everything is stored in a Supabase project called **Easyfen** (project ref `axeprqcffgwgocglijst`). This same Supabase project also hosts an unrelated inventory/staff-tracking app (`stores`, `staff`, `products`, `batches`, `alerts` tables) — leave those alone when working in this DB.

- Tables: `profiles`, `listings`, `favorites`, `conversations`, `messages`, `ratings`, `reports`, `blocks` (plus `hotels`/`services` — legacy, unused by the app's current UI, kept intact rather than dropped)
- Storage buckets: `listing-photos`, `avatars` — both capped at 5MB, images-only (`allowed_mime_types`), enforced at the storage layer, not just client-side
- Chat updates arrive live via Supabase Realtime; presence channel (`online-users`) tracks who's online
- Row Level Security is enabled on every table — see **Security** below for what that actually guarantees

## Security

This has had a real hardening pass, not just a review — every claim below was verified against the live project (RLS simulated as `anon` and as a second real user, not just read from policy definitions).

- **RLS**: users can only read/write their own data; public listing rows are readable by anyone (required for browsing), but `profiles.phone` is blocked from the `anon` role at the column-privilege level — unauthenticated requests can't scrape phone numbers even though the row itself is public
- **Rate limiting** (DB-enforced via triggers, not client-side): max 5 new listings per user per 10 minutes; max 20 messages per user per minute; duplicate-listing detection blocks an identical repost within 24h
- **File uploads**: 5MB limit + image-only MIME allowlist enforced by Supabase Storage itself; the client also rejects (rather than silently uploads) any file that fails image processing
- **IDOR**: editing a listing checks `owner_id` both before rendering the form and again on save; every RLS-protected mutation was tested cross-user (a second account cannot read, edit, or delete another user's data — 0 rows affected, not just an error)
- **Input sanitization**: `lib/sanitize.ts` strips HTML tags and control characters from every text field before it's stored (listing text, messages, profile fields) — defense in depth; no `dangerouslySetInnerHTML` exists anywhere in the codebase, so there's no live XSS render path today, but this keeps stored data clean regardless of how it's rendered elsewhere later
- **Block/report**: `blocks` table + RLS deny message sends between blocked pairs at the database level, not just hidden in the UI; `reports` supports flagging listings or users
- **Admin dashboard**: every server action re-checks `is_admin` independently of RLS (defense in depth); `middleware.ts` verifies the session server-side on every request before a page renders — not a client-side-only gate
- **No `service_role` key anywhere in this codebase.** Admin auth runs entirely on the anon key + RLS/JWT claims via SSR cookies — there's nothing to leak. The one place a `service_role` key is legitimately used is the backup script (see below), and it lives only in that separate repo's GitHub Actions secrets, never in any client bundle.
- **Bot deterrence**: signup has a honeypot field + minimum time-on-form check (no third-party CAPTCHA account required)

**Known open items** (need your account access, not code):
- Leaked-password protection is disabled in Supabase Auth settings (Authentication → Policies) — one toggle, flagged by Supabase's own advisor
- Supabase automated backups require a paid plan — see the DIY weekly backup below instead

## Admin dashboard (`apps/admin/`)

Separate Next.js app for moderation: user list + role management, content flags (`is_verified`/`is_premium`/`is_active`), and a reports queue. Deployed independently on Vercel. Has its own `package.json` — install and run it from inside `apps/admin/`, not the repo root.

## Weekly database backups

Since we're on Supabase's free tier (no automated backups included), a separate private repo — **[MajorSyl/easyfen-backups](https://github.com/MajorSyl/easyfen-backups)** — runs a GitHub Actions workflow every Sunday at 00:00 UTC that exports all ten tables to a dated JSON file, using the `service_role` key (kept only in that repo's Actions secrets) to bypass RLS for a complete export. Keeps the last 12 weekly snapshots. `auth.users` (passwords/tokens) is deliberately excluded — this backs up application data, not authentication credentials.

## Running the app for development

You need [Node.js](https://nodejs.org) (LTS) installed.

```bash
npm install
cp .env.example .env   # then fill in the two values (see below)
npx expo start
```

Scan the QR code with the **Expo Go** app on your phone (same WiFi network required).

The two values in `.env`:

- `EXPO_PUBLIC_SUPABASE_URL` — the Supabase project URL
- `EXPO_PUBLIC_SUPABASE_ANON_KEY` — the Supabase publishable key

Both are visible in the Supabase dashboard under Project Settings → API, and both also appear in `eas.json` and `.github/workflows/eas-update.yml` (they are client-side values, safe to be public; data protection comes from Row Level Security, not from hiding these).

## How code reaches a phone (read this before assuming a fix "didn't work")

Two completely different delivery mechanisms exist, and mixing them up is the most common source of confusion:

**1. OTA JS updates — automatic, ~2 minutes, JavaScript-only changes**
Every push to `claude/repo-overview-g2rgj1` triggers `.github/workflows/eas-update.yml`, which publishes the new JS bundle to the `preview` channel on Expo's servers. Any already-installed APK on that channel fetches it automatically on next launch. **This cannot deliver native code changes** — a new native dependency (e.g. `react-native-svg`), a changed `app.json` (permissions, icon, adaptive icon color), or an Expo SDK bump will not reach an existing install this way, and if the JS references something the native binary doesn't have, the app crashes on launch with no catchable error (this happened once — see git history around the `react-native-svg` addition for the real incident).

**2. APK builds — manual trigger, 15–60 min, required after any native change**
`.github/workflows/eas-build.yml` (Actions tab → **Build Android APK** → **Run workflow**) builds a fresh native binary via EAS Build and posts a download link in the run's job summary. Trigger this whenever you've added a native dependency or changed anything in `app.json`'s native-facing config. Needs the `EXPO_TOKEN` repo secret (already configured).

**3. Web** — `vercel.json` builds this same Expo project with `npx expo export --platform web`. Confirm which Vercel project is actually connected to *this* repo before assuming a push reached the live site — see the note below.

## ⚠️ Web deployment: verify which Vercel project is actually live

While investigating a "the web still shows old branding" report, I found a Vercel project named **`eaysfen`** in this account whose git history is completely unrelated to this repo (different commit author, different feature set, built by a different tool). If `easyfen.com` is pointed at that project rather than one connected to `MajorSyl/Easyeasycl`, none of this repo's work — including everything in this README — is actually live. **Before debugging any "the website doesn't match the code" issue, confirm in the Vercel dashboard which project owns the `easyfen.com` domain and which GitHub repo it's connected to.**

## Building an installable Android APK (occasional)

1. On GitHub, open the **Actions** tab → **Build Android APK** → **Run workflow**
2. The job finishes in ~1 minute and prints a link to the build page on expo.dev in its Summary
3. Open that link on the phone; when the build says **Finished** (15–60 min on the free tier), tap **Install**

## Pre-launch checklist

- [ ] Replace placeholder legal page content with real, reviewed policy text
- [ ] Confirm which Vercel project actually serves `easyfen.com` (see warning above)
- [ ] Turn "Confirm email" back on in Supabase Dashboard → Authentication → Settings (may be off from testing)
- [ ] Remove or mark inactive any seed/test listings before going public
- [ ] **Rotate the Expo access token** — a previous version of this repo's docs had it committed in plaintext; even though it's since been redacted, it lived in git history and should be treated as compromised. Generate a new one at [expo.dev/settings/access-tokens](https://expo.dev/settings/access-tokens) and update the `EXPO_TOKEN` GitHub secret before revoking the old one, or builds will stop working in between.
- [ ] Enable Supabase's leaked-password protection (Authentication → Policies)
- [ ] Add the two Supabase secrets to `MajorSyl/easyfen-backups` if you haven't yet (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`) and confirm a weekly backup has actually succeeded once
- [ ] App Store / Play Store submission needs a `production` EAS build profile (`eas build --platform android --profile production` / iOS equivalent) and store review — neither has happened yet
- [ ] If `is_premium` is meant to charge money, no payment processor is wired up yet

## Architecture notes

- Chat uses Supabase Realtime on the `messages` table — no third-party service needed. Realtime `postgres_changes` re-checks the row's SELECT RLS per subscriber before delivering an event, so a user can't receive messages from a conversation they're not part of even if they guess the conversation ID.
- Online presence uses Supabase Realtime presence channels (`online-users`)
- Photos are resized (longer edge capped at 1600px) and re-encoded as JPEG at 70% quality before upload (`lib/upload.ts`)
- Home tab uses a 60s in-memory cache with pub/sub invalidation (`lib/listings-cache-bus.ts`) — any add/edit/delete triggers a refresh
- Android bottom inset is clamped to a 48px minimum (`lib/use-bottom-gap.ts`) — some Android skins report a zero inset while still overlaying a system nav bar
- `lib/errors.ts` maps Postgres/Supabase errors to plain-English messages; nothing raw ever reaches an Alert
