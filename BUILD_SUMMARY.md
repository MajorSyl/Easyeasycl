# Easyfen — Build Summary

A running log of everything built on the `claude/repo-overview-g2rgj1` branch, in the order it happened. For live technical/setup documentation, see [`README.md`](./README.md) — this file is a narrative record of *what was done and why*, not a maintenance guide.

---

## 1. Scope reduction — properties only

The app originally covered three verticals: property listings, hotels, and local services. Hotels and services were removed from the app's UI and navigation so the product is focused entirely on properties (for rent, for sale, land, daily/hourly). The underlying `hotels`/`services` database tables and screen code were **kept intact rather than deleted** — they're simply unreachable from any current navigation path, so re-enabling them later doesn't require rebuilding from scratch. `app/hotel/[id].tsx` and `app/service/[id].tsx` still exist as dead code for this reason.

## 2. Codebase health check

A pass over the existing codebase to find and fix latent bugs before building new features on top of it, rather than inheriting problems into new work.

## 3. Retention features

Features aimed at bringing users back to the app rather than a one-time visit:

- **Saved Searches** — save a query + budget filter; a database trigger matches new listings against saved searches automatically and populates `saved_search_matches`.
- **Notifications feed** — unread messages and new saved-search matches in one screen; tapping a match opens the listing and marks it read.
- **Listing freshness signal** — every listing shows "Listed X days ago"; once an agent hasn't confirmed a listing in 30+ days, their My Listings screen prompts them to confirm it's still available.
- **Enquiry receipts** — a trigger records a listing's first buyer message and the agent's first response time (`enquiry_receipts` table). No UI surfaces this yet — it's raw data laid down for a future agent-responsiveness signal.

## 4. Trust infrastructure

- **Verification tiers** on profiles (`none` → `phone_verified` → `agent_verified` → `id_verified`), with a manual phone-verification flow: a user requests it, an admin approves from the dashboard. No SMS/OTP provider is wired up — this is deliberately manual.
- **Report → suspend → flag pipeline**: anyone (except the owner) can report a listing. A database trigger immediately suspends the listing and flags the owner's account for admin review — not something the client can be tricked into doing to an arbitrary listing, since it's server-side.
- **Admin review tools**: a "Flagged" badge with a Clear action, a reports queue, and content-flag toggles (verified/premium/active) in the admin dashboard.

## 5. Security hardening

Not a review — a hardening pass, with every claim verified against the live Supabase project (RLS tested as `anon` and as a second real logged-in user, not just read from policy definitions).

- **Two real, verified-exploitable bugs found and fixed**: any signed-in user could previously self-promote to admin (`update profiles set is_admin = true where id = auth.uid()`), and an agent could self-set `is_verified`/`is_premium` or undo a report-triggered suspension by writing straight to `listings.is_active`. Both closed by removing table-level client write access to sensitive columns and routing them through admin-gated `SECURITY DEFINER` RPCs that re-check the caller's admin JWT server-side.
- **Phone numbers** have no direct read access for anyone but the owner or an admin — enforced via RPC, not just RLS row-ownership (which alone doesn't restrict *which columns* an owner can read).
- **Rate limiting** enforced by database triggers: max 5 new listings per user per 10 minutes, max 20 messages per minute, duplicate-listing detection within 24h.
- **File uploads** capped at 5MB, image-only MIME allowlist enforced at the Supabase Storage layer (not just client-side).
- **IDOR testing**: every RLS-protected mutation was tested cross-user to confirm a second account genuinely cannot read, edit, or delete another user's data.
- **Input sanitization** strips HTML/control characters from all text fields before storage, as defense in depth.
- **No `service_role` key anywhere in the app codebase** — admin auth runs entirely on the anon key plus RLS/JWT claims.
- **Bot deterrence** on signup via a honeypot field and a minimum time-on-form check, with no third-party CAPTCHA dependency.

## 6. Design audit, design system cleanup, and screen-by-screen polish

A full pass to replace ad-hoc inline styling with a consistent `constants/theme.ts` token system (colors, spacing, type scale, shadows), audited against WCAG AA contrast requirements screen by screen. This was the original slate-blue/gold brand system, later replaced (see §8).

## 7. Monetization

Built as an honest, fully-functional-today alternative to a live payment gateway, since no mobile money merchant/API credentials exist yet — the system never fakes a successful charge.

- **Manual mobile-money verification flow**: a buyer sends money via their own mobile money app to a number the business controls, submits the SMS reference code in-app, and an admin manually verifies the money arrived before approving.
- **Three products**, placeholder-priced in `constants/payments.ts`: a 7-day listing boost, a 30-day agent subscription (keeps all of an agent's listings featured), and paid agent verification. One shared purchase screen (`app/pay.tsx`) drives all three.
- **`payments` ledger** is the single source of truth. A client can only insert their own `pending` row — `status`, `reviewed_at`, `reviewed_by` are not client-writable, closing off a forged pre-approved insert. The only path to `approved` is the admin-gated `admin_review_payment` RPC, which activates the purchase's effect in the same transaction (flips `is_premium`, writes a boost/subscription row, or bumps verification tier).
- **Automatic expiry**: a `pg_cron` job runs every 15 minutes and turns `is_premium` back off once neither an active boost nor an active subscription still covers a listing.
- **Admin payments queue**: a new `/payments` page in the admin dashboard with pending/approve/reject actions, plus an overview stat card and an explicit disclaimer that approval is immediate and irreversible.
- **Still needs before real money can be accepted**: replace the placeholder mobile money receiving number/account name in `constants/payments.ts`, and review the placeholder prices.

## 8. Ice-blue design reskin

A full visual reskin driven by a supplied 3-screen design reference (onboarding, home, listing detail), implemented with the existing `StyleSheet` + design-tokens pattern rather than adding a new styling dependency (no NativeWind/Tailwind added).

- **`constants/theme.ts`** rewritten to an ice-blue background / electric-blue accent palette, applied app-wide (every screen picks it up automatically through the shared tokens, not just the three redesigned screens).
- **`app/welcome.tsx`** — new one-time first-launch screen, gated by an AsyncStorage flag checked in `app/_layout.tsx`. Uses the real Easyfen brand mark (`components/Logo.tsx`) as the hero visual rather than a fabricated stock photo, since no such asset exists.
- **Home screen redesign** — greeting header with avatar, a pill-shaped search bar, a "New Listings" horizontal strip (honestly labeled — the app has no geolocation data to rank by actual proximity), and a "Recommended" feed that surfaces boosted/premium listings first (giving real product purpose to the boost feature from §7).
- **Listing detail redesign** — a rounded floating hero photo card, a real-data `AmenityBar` (bedrooms/category/views/photos — deliberately not the reference design's hotel-style Parking/Bar/Gym/WiFi icons, which don't exist in this data model), and a single real pricing card in place of a fabricated three-tier Pay-Now/Monthly/Yearly selector (a listing has exactly one real price basis).
- **New reusable components**: `components/PropertyCard.tsx` (wide horizontal card for the Recommended feed), `components/AmenityBar.tsx`, `components/EdgeFade.tsx` (a stacked-opacity fade approximating a gradient scroll cue, without a gradient library dependency).
- **A deliberate accessibility fix inside the reskin itself**: the literal reference palette's `textMuted`/`success`/`danger` values dropped below the WCAG AA 4.5:1 contrast floor against the new lighter background (as low as 4.19:1, confirmed via manual luminance calculation) — all three were darkened slightly to clear AA comfortably rather than shipping a silent regression.

## 9. UX/UI cleanup pass

A structured pass through seven specific problem areas identified from a live screenshot review of the app:

1. **Bottom nav overlap (critical)** — content on all four tab screens (Home/Search/Add Listing/Profile) could render underneath the fixed tab bar. Fixed with a new `useTabBarGap()` hook (`lib/use-bottom-gap.ts`).
2. **Removed the Rent/Buy/Sell segmented control** on Home (redundant with the existing category filter chips), replaced with a distinct "List Your Property" CTA banner routing to Add Listing.
3. **Horizontal carousel affordance** — added `EdgeFade` and a guaranteed partial-card peek so horizontal scrolling (New Listings, filter chips) reads as intentional, plus a card-parity audit (favorite icons, text truncation) across every card type.
4. **Tappable target clarity** — found and fixed a listing card's agent avatar+name that looked tappable but had no `onPress` at all; gave it a real navigation target and an adequate hit area. Clarified the search screen's sort icon and added a clear (×) button to the search input.
5. **Contrast + active-state consistency** — unified every selectable pill/chip in the app (category filters, the mobile-money provider picker) to the same fill + checkmark + bold pattern, so selection is never signaled by color alone.
6. **General mobile UX** — added a missing loading spinner on Home's first load; removed a fixed-height card wrapper that would have clipped text under large system font sizes (Dynamic Type).
7. **Accessibility** — `accessibilityLabel`/`accessibilityRole`/`accessibilityState` added to every icon-only button found across the app (back buttons on ~11 screens, favorite/heart, bell, chat, avatar, search, sort, delete, edit, photo upload/remove), alt text on listing photos derived from their titles, confirmed no `allowFontScaling={false}` exists anywhere (system text scaling already works app-wide).

## 10. Web platform compatibility fixes

Triggered by a real bug report ("tap to upload not working") that turned out to be a much bigger, previously-invisible problem.

- **Root cause found**: `react-native-web`'s `Alert.alert` is a complete no-op — its actual implementation is `static alert() {}`. Every `Alert.alert` call in the app (42 call sites across 12 files: delete confirmations, report/block dialogs, success/error messages, the photo-upload chooser) was silently doing nothing on the web build, not just the one the user happened to notice.
- **Fix**: `lib/alert.tsx` — an `AlertProvider` mounted once at the app root, exposing `appAlert(title, message, buttons)` as a drop-in replacement for `Alert.alert`. Uses the real native `Alert.alert` on iOS/Android (unchanged, already correct there) and a themed modal dialog only on web. All 42 call sites migrated.
- **Related bug found and fixed**: `Share.share` forwards to the browser's `navigator.share()` on web, which most desktop browsers don't implement — it throws rather than degrading gracefully, and none of the three call sites (listing/hotel/service detail screens) caught it. `lib/share.ts`'s `shareText()` now falls back to copying the share text to the clipboard on web when the native share sheet isn't available.
- **Verified (not assumed) already working on web**: `expo-image-picker`'s camera/gallery launchers (read the actual web source — a hidden `<input type=file capture>` that degrades gracefully with no camera present) and React Native's `Modal` (has a genuine, substantial react-native-web implementation), so the existing sort-menu/select-field modals and the new alert modal all render correctly there.

---

## What's still open

Carried forward from `README.md`'s pre-launch checklist — none of this is done yet:

- Legal page content (`/privacy`, `/terms`, `/guidelines`, `/agent-agreement`) is placeholder text, not reviewed policy.
- Real mobile money receiving number/account name still need to replace the placeholders in `constants/payments.ts` before any real purchase can be accepted.
- No pre-publish admin review gate for new listings — moderation is retroactive only (a deliberate, not-yet-decided product question).
- No SMS/OTP provider configured — phone verification is manual admin approval, not automated.
- App Store / Play Store submission hasn't happened; no `production` EAS build profile has been run.
- Supabase's leaked-password protection is still off, and automated backups still rely on the separate weekly GitHub Actions job rather than a paid Supabase plan.
