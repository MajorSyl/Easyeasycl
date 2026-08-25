# Easyfen

A marketplace app for finding and listing properties in Freetown, Sierra Leone. Mobile + web app built with React Native (Expo), backed by Supabase; a separate Next.js dashboard for moderation and admin tasks.

> The app previously also covered hotels and local services. It's now focused entirely on properties (rent/sale/land). The underlying `hotels`/`services` tables and code still exist but are no longer reachable from the app's UI — see "Where the data lives" below.

## What's in the app

- **Home** — browse property listings; filter by For Rent / For Sale / Land / Daily-Hourly; save favorites with the heart icon; "Listed X days ago" freshness signal on every card; "Browse by Neighborhood" entry point
- **Search** — search by name or neighborhood, with an SLE budget filter and price sorting; save a search to get notified when a new listing matches it
- **Neighborhood browsing** — active listings grouped by known Freetown areas (Aberdeen, Wilberforce, Congo Cross, Lumley, Goderich, and others), each showing a live count
- **Saved Searches** — manage your saved searches from Profile; delete ones you no longer want
- **Notifications** — unread messages and new saved-search matches in one feed; tapping a match opens the listing and marks it read
- **Add Listing** — post a property with up to 10 compressed photos
- **Messages** — real-time chat between buyers and agents, with online status, unread counts, and per-user blocking
- **Profile** — edit your details, choose your role (regular user or agent), manage/edit/delete your listings, upload an avatar, request phone verification, confirm a listing is still available when it's gone stale
- **Public profiles** — view any agent's active listings, message them, report or block them; verification badge shown if they have one
- **Listing report flow** — anyone can report a listing (not their own); it's suspended immediately and the owner's account is flagged for admin review
- **Legal pages** — `/privacy`, `/terms`, `/guidelines`, `/agent-agreement`, linked from the bottom of the Profile screen only (`components/WebFooter.tsx` on web, an equivalent native-only row otherwise) — not shown on Home or any other screen

Sign-in is email + password, or "Continue with Google" (Supabase Auth's Google OAuth provider — see Authentication below). Browsing works without an account; posting, favoriting, messaging, saving searches, and rating require one.

> **Legal page content is a substantive first draft**, not lawyer-reviewed copy — have it reviewed before app store submission or a public launch. See `app/privacy.tsx`, `app/terms.tsx`, `app/guidelines.tsx`, `app/agent-agreement.tsx`.

## Authentication

- Email/password via Supabase Auth, plus "Continue with Google" (`lib/google-auth.ts`, one button on `app/auth.tsx` for both sign-in and sign-up — Google has no separate sign-up step). Requires the Google provider already enabled in the Supabase dashboard with real Google Cloud Console credentials; this repo only does the app-side half.
- **One manual step this repo can't do for you**: Supabase Auth rejects any OAuth `redirectTo` that isn't on its allow-list (Authentication → URL Configuration → Redirect URLs). Add the web callback (e.g. `https://easyfen.com/auth-callback`, plus whatever dev URL you test from) and a wildcard for the native deep link (`easyfen://**`) there, or Google sign-in will fail at the final redirect with an "invalid redirect URL" error from Supabase.
- New Google sign-ins get a `profiles` row exactly like email signups do — same `handle_new_user()` trigger, same `role = 'user'` default (upgradeable to agent from the `/select-role` picker, which a first-time Google sign-in is routed to the same as a first-time email signup). If a Google email matches an existing password-based account's (confirmed) email, Supabase Auth links the new identity to that same account automatically — this repo doesn't implement any account-merging logic itself, and shouldn't; that's GoTrue's job and doing it in application code would be a lot easier to get wrong (account takeover risk if an app-level merge doesn't check email verification as carefully as GoTrue already does).
- Google sign-in only proves email identity — it never touches `verification_tier`, `payments`, or `app_settings`. Verified Agent status and launch-mode/payment state stay exactly as they already worked.

## Repo layout

```
app/                    Expo Router screens (the mobile + web app)
components/              Shared UI (ListingCard, Logo, PhotoPicker, ...)
lib/                     Supabase client, auth context, upload, sanitize, errors
constants/theme.ts       Design tokens (colors, spacing, type scale, shadows)
constants/neighborhoods.ts  Known Freetown neighborhood names used for browsing
assets/                  App icon, adaptive icon layers, favicon, splash
assets/brand/            Source SVGs + exported sizes for the logo/icon
apps/admin/               Separate Next.js app — moderation dashboard (its own package.json)
.github/workflows/        CI: OTA publish, on-demand APK build
```

## Brand & design system

The mark is a magnifying glass standing in for the "a" in a lowercase "easyfen" wordmark (blue "e/s/y", gold "fen") — echoing the app's core action, search. `components/Logo.tsx` renders the official logo file itself (via `expo-image`) rather than a redrawn approximation — the canonical source lives at `assets/brand/source/easyfen-wordmark-official.png`, with derived crops (`logo-wordmark.png`/`-white.png`, `mark-black.png`/`mark-white.png`) generated from it and checked in alongside it. The app icon (`assets/icon.png`, `assets/android-icon-foreground.png`/`-monochrome.png`, `assets/favicon.png`) uses the glass mark alone — recolored white and placed on the brand-blue background — since the full wordmark doesn't read at notification-icon sizes. A black-on-white alternative (the literal brand-kit treatment) was generated for comparison and rejected; the blue-background version is final. The pre-PNG SVG-based mark/wordmark (`assets/brand/*.svg`, `assets/brand/app-icon/`) is superseded and kept only for history; nothing in the app references it anymore.

**`#3E6FBF` is the one official brand blue** — confirmed against everything that actually ships (`app.json`'s `adaptiveIcon.backgroundColor`, `assets/icon.png`, `assets/android-icon-background.png`, `assets/favicon.png` all verified pixel-exact). `constants/theme.ts` holds a **separate, deliberately different** set of design tokens (colors, spacing, type scale, font weights, shadows) for UI/interaction — the app runs an ice-blue / electric-blue palette (`background` `#EBF3FF`, `accent` `#0052FF`) rather than the brand mark's blue, and that's intentional, not a mixed-up value: `gold` is kept separate from `accent` specifically so premium/verified/rating signals never collide visually with the blue interaction color, and `accent` itself was chosen and WCAG-AA-checked as a *UI* color, independent of the brand mark. Every color pairing was checked against WCAG AA (4.5:1 for text, 3:1 for large text/UI) rather than picked by eye — several tokens (`textMuted`, `success`, `danger`) are deliberately darker than their literal reference values because they fell just under 4.5:1 against the new lighter background otherwise. Screens use these tokens consistently rather than inline hex values — if you're adding a new screen, pull colors/spacing/type from `theme.ts`, don't hardcode.

First-run/Home/Listing-detail were redesigned around this palette. First run (see "First-run flow" below) is `app/splash.tsx` → `app/onboarding.tsx`; the illustrations on both come from `components/illustrations.tsx` (flat SVG built from react-native-svg primitives — no illustration library, no stock photos), separate from `Logo.tsx`'s real-asset-based logo above. Home has a "New Listings" horizontal strip and a "Recommended" feed that surfaces boosted/premium listings first; Listing detail has a floating hero card, a real-data `AmenityBar` (bedrooms/category/views/photos — no invented ratings or hotel-style amenities), and a single real pricing card. `components/EdgeFade.tsx` gives horizontal scrolling lists (New Listings, filter chips) a fade-to-background cue at the trailing edge instead of an abrupt clipped-looking edge, without pulling in a gradient library.

### First-run flow

- `app/splash.tsx`: logo fade-in over a lightweight vector skyline/coastline silhouette. Always the first screen on a bare cold launch (`app/_layout.tsx` redirects there, but only when the initial path is exactly `/` — it deliberately leaves a deep link or the web Google OAuth callback landing on `/auth-callback` alone, since hijacking either would strip the real destination). After ~1.5s it checks `ONBOARDING_SEEN_KEY` (AsyncStorage — the same abstraction covers both mobile and web transparently) and continues to `/onboarding` (never seen it) or `/` (seen it before).
- `app/onboarding.tsx`: a 4-screen swipeable carousel (paging `ScrollView`, progress dots, Skip) — Cotton Tree line-art, a Lumley Beach-nodding wave/palm motif, a chat-bubbles illustration, and the skyline motif again for the agent-focused screen. Sets `ONBOARDING_SEEN_KEY` and routes to `/` on Skip or the final "Get Started".
- `app/select-role.tsx` (renamed from the old `app/onboarding.tsx`): the buyer/agent role picker, unchanged in behavior — shown right after signup (email or Google), writes straight to `profiles.role`. This is a different concept from the carousel above: select-role is per-account (once per new signup), the carousel is per-device (once ever, tracked locally).

A subsequent UX/accessibility pass fixed content clipping behind the bottom tab bar (`lib/use-bottom-gap.ts`'s `useTabBarGap()`), added `accessibilityLabel`s to every icon-only button found across the app, gave selectable pills/chips a non-color-only active state (fill + checkmark, not just a color swap), and added alt text to listing photos derived from their titles.

## Where the data lives

Everything is stored in a Supabase project called **Easyfen** (project ref `axeprqcffgwgocglijst`). This same Supabase project also hosts an unrelated inventory/staff-tracking app (`stores`, `staff`, `products`, `batches`, `alerts` tables) — leave those alone when working in this DB.

- **Core tables**: `profiles`, `listings`, `favorites`, `conversations`, `messages`, `ratings`, `reports`, `blocks` (plus `hotels`/`services` — legacy, unused by the app's current UI, kept intact rather than dropped)
- **Retention/trust tables**: `saved_searches` + `saved_search_matches` (saved-search alerts, matches populated by a trigger on listing insert), `enquiry_receipts` (tracks a listing's first buyer message and the agent's first response time, populated by a trigger on message insert — no UI built for this yet, just the tracking table)
- **Trust columns on `listings`**: `last_confirmed_at` (freshness signal, backfilled to `created_at` for old rows)
- **Trust columns on `profiles`**: `verification_tier` (`none` / `phone_verified` / `agent_verified` / `id_verified` — only the first two are wired up; the other two are schema-ready but have no UI anywhere, admin included), `phone_verification_requested_at` (self-serve request flag), `flagged_for_review_at` (set automatically when one of a user's listings gets reported)
- Storage buckets: `listing-photos`, `avatars` — both capped at 5MB, images-only (`allowed_mime_types`), enforced at the storage layer, not just client-side
- Chat updates arrive live via Supabase Realtime; presence channel (`online-users`) tracks who's online
- Row Level Security is enabled on every table — see **Security** below for what that actually guarantees

## Trust infrastructure

- **Listing freshness**: every listing has `last_confirmed_at`. Cards and the detail view show "Listed X days ago"; once a listing's own agent hasn't confirmed it in 30+ days, My Listings shows a "Still available?" prompt that updates the timestamp on confirmation.
- **Phone verification**: no SMS provider is configured in this project, so this is manual rather than an automated OTP flow — a user taps "Verify Phone" in Profile (sets a request flag), an admin reviews and approves from the admin Users page. The tier itself is never client-settable, even by its own owner — see Security below.
- **Report → suspend → flag**: reporting a listing (available to anyone except its owner) immediately sets it inactive and flags the owner's account for admin review, via a database trigger — not something the client can be tricked into doing to an arbitrary listing. My Listings shows a "SUSPENDED" badge so the owner knows something happened; the admin Users page shows a "Flagged" badge with a Clear action.
- **Enquiry receipts**: `enquiry_receipts` records a listing's first buyer message and the agent's first response time automatically, entirely server-side (a trigger on `messages`, not a client write) — intended as raw data for a future agent-responsiveness signal; no UI surfaces it yet.
- **What's still missing**: there's no pre-publish review gate — a new listing goes live immediately and moderation is retroactive only (via the report flow above or a manual sweep of the admin content page). Adding a "pending until approved" step is a deliberate product decision, not a bug, and hasn't been made yet.

## Security

This has had a real hardening pass, not just a review — every claim below was verified against the live project (RLS simulated as `anon` and as a second real user, not just read from policy definitions).

- **RLS**: users can only read/write their own data; public listing rows are readable by anyone (required for browsing), but `profiles.phone` has no direct SELECT grant for `anon` or `authenticated` — neither an unauthenticated request nor another logged-in user can scrape phone numbers straight off the table. The only way to read a phone number is `get_profile_phone`/`get_profile_phones`, two `SECURITY DEFINER` RPCs that return a phone only to its owner or an admin (checked server-side against `auth.uid()`/the admin JWT claim).
- **Column-level write lockdown**: `profiles.is_admin` and `profiles.verification_tier` and `listings.is_verified`/`is_premium`/`is_active` are *not* directly client-writable at all, even by the row's own owner. This closed two real, verified-exploitable bugs found during hardening: any signed-in user could previously run `update profiles set is_admin = true where id = auth.uid()` and pass the admin dashboard's fallback admin check; an agent could self-set `is_verified`/`is_premium` (fake trust badges) or flip a report-suspended listing's `is_active` straight back to `true`, defeating the report flow outright. Both are fixed by narrowing the table-level grant to an explicit safe-column list and routing the sensitive fields through admin-gated `SECURITY DEFINER` RPCs (`admin_set_verification_tier`, `admin_set_listing_flags`) that re-check the caller's admin JWT claim server-side. If you add a new "trust/admin-only" column to `profiles` or `listings`, follow this same pattern — don't just add the column and assume RLS row-ownership checks are enough, since they don't restrict *which columns* an owner can touch.
- **Rate limiting** (DB-enforced via triggers, not client-side): max 5 new listings per user per 10 minutes; max 20 messages per user per minute; duplicate-listing detection blocks an identical repost within 24h
- **File uploads**: 5MB limit + image-only MIME allowlist enforced by Supabase Storage itself; the client also rejects (rather than silently uploads) any file that fails image processing
- **IDOR**: editing a listing checks `owner_id` both before rendering the form and again on save; every RLS-protected mutation was tested cross-user (a second account cannot read, edit, or delete another user's data — 0 rows affected, not just an error)
- **Input sanitization**: `lib/sanitize.ts` strips HTML tags and control characters from every text field before it's stored (listing text, messages, profile fields) — defense in depth; no `dangerouslySetInnerHTML` exists anywhere in the codebase, so there's no live XSS render path today, but this keeps stored data clean regardless of how it's rendered elsewhere later
- **Block/report**: `blocks` table + RLS deny message sends between blocked pairs at the database level, not just hidden in the UI; `reports` supports flagging listings or users, and a listing report auto-suspends + flags the owner (see Trust infrastructure above)
- **Admin dashboard**: every server action re-checks `is_admin` independently of RLS (defense in depth); `middleware.ts` verifies the session server-side on every request before a page renders — not a client-side-only gate
- **No `service_role` key anywhere in this codebase.** Admin auth runs entirely on the anon key + RLS/JWT claims via SSR cookies — there's nothing to leak. The one place a `service_role` key is legitimately used is the backup script (see below), and it lives only in that separate repo's GitHub Actions secrets, never in any client bundle.
- **Bot deterrence**: signup has a honeypot field + minimum time-on-form check (no third-party CAPTCHA account required)

**Known open items** (need your account access, not code):
- Leaked-password protection is disabled in Supabase Auth settings (Authentication → Policies) — one toggle, flagged by Supabase's own advisor
- Supabase automated backups require a paid plan — see the DIY weekly backup below instead
- The `hotels`/`services` legacy tables were not brought under the same column-level write lockdown as `listings` — lower priority since they're unreachable from the app's UI, but a direct API call could still self-set their `is_verified`/`is_premium`/`is_active` today

## Admin dashboard (`apps/admin/`)

Separate Next.js app for moderation: user list + role management, phone verification approval (approve/revoke, with the pending-request date shown), flagged-account review with a Clear action, content flags (`is_verified`/`is_premium`/`is_active`), a reports queue, and a payments review queue (see Monetization below). Deployed independently on Vercel. Has its own `package.json` — install and run it from inside `apps/admin/`, not the repo root.

## Monetization

There is no live payment gateway — mobile money merchant/API credentials aren't set up yet, and this app never fakes a successful charge. Instead, purchases go through **manual mobile money verification**: the buyer sends money in their own mobile money app to a number this business controls, then submits the SMS reference code in-app; an admin checks the money actually arrived and approves before anything activates.

- Three purchasable products, all defined with placeholder pricing in `constants/payments.ts`: a 7-day listing boost (`listing_boost`), a 30-day agent subscription that keeps all of an agent's listings featured (`agent_subscription`), and paid agent verification (`agent_verification`). One shared purchase screen (`app/pay.tsx`) drives all three via `?purpose=`.
- `payments` is the ledger and single source of truth (`pending` → `approved`/`rejected`). A client can only insert their own row in `pending` state — `status`/`reviewed_at`/`reviewed_by` are not client-writable, so a forged pre-approved insert is rejected by RLS. The only way a payment becomes `approved` is the admin-gated `admin_review_payment` RPC, which also activates the effect (flips `listings.is_premium`, writes `listing_boosts`/`agent_subscriptions`, or bumps `verification_tier`) in the same transaction.
- Boosts and subscriptions lapse automatically: a `pg_cron` job (`expire_premium_listings`, every 15 minutes) turns `is_premium` back off once neither an active boost nor an active subscription still covers that listing.
- Exactly two providers are supported — Orange Money and Afrimoney — matching the two mobile money products actually usable in Sierra Leone. The buyer also uploads a screenshot of the payment confirmation (required, capped at 5MB, image-only — same upload pipeline as listing photos, stored in the `payment-screenshots` bucket and linked to the `payments` row via `screenshot_url`), shown alongside the reference code in the admin review queue.
- **Before accepting real money**, replace the placeholder values in `constants/payments.ts` (`MOBILE_MONEY_RECEIVING` — currently `REPLACE_WITH_YOUR_ORANGE_MONEY_NUMBER` / `REPLACE_WITH_YOUR_AFRIMONEY_NUMBER` / `REPLACE_WITH_YOUR_BUSINESS_NAME`) with your actual Orange Money / Afrimoney receiving number and account name, and revisit the placeholder prices.
- There is no automated refund path — approving a payment in the admin dashboard is immediate and irreversible from the app's side, so admins should verify the reference code against the actual mobile money account before approving.
- **Launch mode** (`app_settings.launch_mode_active`, on by default) sits on top of all of the above and lets agents claim any of the three products for free while it's on — no mobile money step, no real receiving number needed yet. Each free claim still writes a full `payments` row (`amount = 0`, `is_launch_promo = true`, `status = 'approved'`) via the `claim_launch_promo` RPC, so there's a clean historical record of who was grandfathered in free once you flip it off from the admin Settings page. Turning it off does not touch anything already claimed for free; it only routes new purchases back through the real mobile money flow above — so the placeholder numbers above still need to be real before that switch is flipped. The same Settings page also has an editable note shown to agents on the new package-selection screen (`app/packages.tsx`, linked from Profile → Plans & Pricing) and a manual-only milestone widget (active listings / distinct owners with an active listing vs. configurable targets, default 150/40) — nothing automatic happens when a target is hit.

## Weekly database backups

Since we're on Supabase's free tier (no automated backups included), a separate private repo — **[MajorSyl/easyfen-backups](https://github.com/MajorSyl/easyfen-backups)** — runs a GitHub Actions workflow every Sunday at 00:00 UTC that exports tables to a dated JSON file, using the `service_role` key (kept only in that repo's Actions secrets) to bypass RLS for a complete export. Keeps the last 12 weekly snapshots. `auth.users` (passwords/tokens) is deliberately excluded — this backs up application data, not authentication credentials.

> The backup script was written against the original ten tables. `saved_searches`, `saved_search_matches`, and `enquiry_receipts` were added afterward — confirm the backup script's table list includes them before relying on it as a complete export.

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

This produces a `preview`-profile `.apk` — for sideloading/testing, not what Play Store accepts.

## Building the production Android App Bundle for Play Store submission

`eas.json` has a `production` profile (`buildType: "app-bundle"`, `distribution: "store"`, `autoIncrement: true` so `versionCode` bumps itself on every build).

1. On GitHub, open the **Actions** tab → **Build Production Android AAB** → **Run workflow**
2. Same pattern as the APK workflow above — watch progress and download the `.aab` from the printed expo.dev link
3. This step only produces the build artifact. Uploading it to Play Console and finishing the store listing (screenshots, description, content rating, Data Safety form, target audience) is a manual step in your Play Console account — nothing here automates that part.

> **Native splash screen is now wired up** (`expo-splash-screen` in `app.json`'s `plugins`, `assets/splash-icon.png` as the image, `#EBF3FF` — the app's own `colors.background` token, not a separate brand color — as the background). That background choice is deliberate: `app/splash.tsx` (the JS-level splash route, a different thing — see "First-run flow" above) uses the same `#EBF3FF` background, so the handoff between native splash and JS splash is a same-color transition with no visible seam, rather than a jarring color jump. `app/_layout.tsx` calls `SplashScreen.hideAsync()` unconditionally in its mount effect, independent of which route it's redirecting to — see the comment there for why that independence matters (a deep-link or OAuth-callback cold launch never redirects to `/splash`, so tying the hide to that redirect would leave native splash stuck up forever on those paths). This is a native-config change (like the icon/permissions), so it needs a fresh build via the workflow above to actually appear — an OTA update alone won't show it, and it hasn't been verified against a real device build yet.

## Pre-launch checklist

- [ ] `/privacy`, `/terms`, `/guidelines`, `/agent-agreement` have real, substantive draft content (Sierra Leone governing law, accurate description of what data is actually collected including payment screenshots, no false claims like location tracking) — but this is **a first pass, not lawyer-reviewed**. Get local legal review before launch, and confirm `support@easyfen.com` / `agents@easyfen.com` are real, monitored inboxes (they're referenced as the contact method but were never verified to exist).
- [ ] Confirm which Vercel project actually serves `easyfen.com` (see warning above)
- [ ] Turn "Confirm email" back on in Supabase Dashboard → Authentication → Settings (may be off from testing)
- [ ] Remove or mark inactive any seed/test listings before going public
- [ ] **Rotate the Expo access token** — a previous version of this repo's docs had it committed in plaintext; even though it's since been redacted, it lived in git history and should be treated as compromised. Generate a new one at [expo.dev/settings/access-tokens](https://expo.dev/settings/access-tokens) and update the `EXPO_TOKEN` GitHub secret before revoking the old one, or builds will stop working in between.
- [ ] Enable Supabase's leaked-password protection (Authentication → Policies)
- [ ] Add the two Supabase secrets to `MajorSyl/easyfen-backups` if you haven't yet (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`) and confirm a weekly backup has actually succeeded once, and that its table list covers the newer tables (see Weekly database backups above)
- [ ] The `production` EAS build profile now exists (`eas.json` + the **Build Production Android AAB** GitHub Actions workflow) but has never actually been run — trigger it, then upload the resulting `.aab` to Play Console and complete the store listing (screenshots, description, content rating, Data Safety form). iOS submission needs its own equivalent (Apple Developer account, App Store Connect listing) and hasn't been started.
- [x] Native splash screen wired up (`expo-splash-screen`, see "Building the production Android App Bundle" above) — not yet verified against a real device build
- [x] App icon decided: white mark on brand blue (`#3E6FBF`), not the literal black-on-white brand-kit treatment. `assets/icon.png` is now that final art (copied from the former `assets/icon-blue-bg.png` comparison file); the black-on-white comparison (`assets/icon-black-white.png`) was deleted.
- [ ] Replace the placeholder mobile money receiving number/account name in `constants/payments.ts` (`MOBILE_MONEY_RECEIVING`) with real ones, and review the placeholder prices in `PAYMENT_PRODUCTS`, before turning launch mode off — while it's on (the default), purchases are free and don't touch these values at all (see Monetization above)
- [ ] Decide whether new listings need a pre-publish admin review gate before going live, or retroactive moderation (current behavior) is acceptable — see Trust infrastructure above
- [ ] If real SMS-based phone verification (OTP) is wanted instead of the current manual admin-approval flow, an SMS provider (Twilio/MessageBird/etc.) needs to be configured in Supabase Auth settings — nothing here today sends an SMS
- [x] Google sign-in fully configured and verified working end-to-end on web (`easyfen.com`): Google provider enabled in Supabase with real credentials, Site URL fixed from its `localhost:3000` default to `https://easyfen.com`, and Redirect URLs allow-list has `https://easyfen.com/auth-callback`, `https://*.easyfen.com/auth-callback` (needed because the site actually serves from `www.easyfen.com`), and `easyfen://**`. **Native (iOS/Android) has not been tested** — the code path is different there (`expo-web-browser` + deep link, vs. web's full-page redirect) and this sandbox has no way to run a real device/simulator test; verify it once you have a native build to test against.

## Architecture notes

- Chat uses Supabase Realtime on the `messages` table — no third-party service needed. Realtime `postgres_changes` re-checks the row's SELECT RLS per subscriber before delivering an event, so a user can't receive messages from a conversation they're not part of even if they guess the conversation ID.
- Online presence uses Supabase Realtime presence channels (`online-users`)
- Photos are resized (longer edge capped at 1600px) and re-encoded as JPEG at 70% quality before upload (`lib/upload.ts`)
- Home tab uses a 60s in-memory cache with pub/sub invalidation (`lib/listings-cache-bus.ts`) — any add/edit/delete triggers a refresh
- Android bottom inset is clamped to a 48px minimum (`lib/use-bottom-gap.ts`) — some Android skins report a zero inset while still overlaying a system nav bar
- `lib/errors.ts` maps Postgres/Supabase errors to plain-English messages; nothing raw ever reaches an alert
- **Never import `Alert` from `react-native` directly — use `appAlert` from `lib/alert.tsx` instead.** `react-native-web`'s `Alert.alert` is a hard no-op (`static alert() {}`); it renders nothing on web, so every error message, confirmation, and action-sheet choice built on it silently did nothing there until this was fixed. `appAlert()` is a drop-in replacement with the same `(title, message, buttons)` signature — real native `Alert.alert` on iOS/Android, a themed modal (`AlertProvider`, mounted once in `app/_layout.tsx`) on web. Same story for `Share.share`: on web it forwards to `navigator.share()`, which most desktop browsers don't implement and which throws rather than degrading gracefully — use `shareText()` from `lib/share.ts`, which falls back to copying to the clipboard on web.
- Side effects that must not be spoofable by the client (saved-search match notifications, enquiry receipts, report-triggered suspension) are implemented as Postgres triggers with `SECURITY DEFINER` functions, not client-side logic — the client only ever inserts the "cause" row (a listing, a message, a report); the "effect" row is always written server-side
