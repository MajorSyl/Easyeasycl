# Easyfen — Next Steps for Phase D and Beyond

Last updated: 2026-07-23  
Last commit: f2d0b04 ("Phase B: add hitSlop touch targets")  
Branch: `claude/repo-overview-g2rgj1`

---

## Where Things Stand

### Phases A–C (DONE)
| Phase | What was done |
|-------|---------------|
| A | Full app scaffolding: auth, listings, hotels, services, chat, favorites, notifications, public profiles, role onboarding, photo upload with compression, OTA auto-update |
| B | Touch target pass (hitSlop on all small Pressables), keyboard fix for Android chat input, MIUI bottom-inset fix (useBottomGap ≥ 48px), 60s home-tab data cache |
| C | Final APK build queued on Expo's servers via `eas-build.yml` workflow (internal distribution, "preview" channel). Every subsequent push auto-publishes an OTA update via `eas-update.yml` in ~2 min. |

---

## Phase D — Admin Dashboard

### What it needs to do
- Show aggregate stats: total users, total listings, total messages, weekly new signups
- List all users with their roles, and let admin change roles
- View all listings/hotels/services; toggle `is_verified` and `is_premium` flags
- Hide or soft-delete fraudulent/spam listings (set `is_active = false`)
- View reported/flagged content (needs a `reports` table — see schema below)

### Recommended tech stack
- **Next.js** (App Router) deployed on **Vercel** — free tier is fine
- **Supabase** service-role key for admin reads/writes (bypasses RLS)
- **Auth**: protect the dashboard with a single hardcoded email check (your email: fannah2026@gmail.com) OR use Supabase's built-in auth with an `is_admin` flag

### Database changes needed for Phase D

```sql
-- Add admin flag to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_admin boolean NOT NULL DEFAULT false;

-- Set your own account as admin (run this once with your user ID from auth.users)
UPDATE profiles SET is_admin = true WHERE id = '<your-user-uuid>';

-- Optional: soft-delete support on listings
ALTER TABLE listings ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;
ALTER TABLE hotels  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;
ALTER TABLE services ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

-- Optional: reports table for flagged content
CREATE TABLE reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id uuid REFERENCES auth.users NOT NULL,
  item_type text NOT NULL CHECK (item_type IN ('listing','hotel','service','user')),
  item_id uuid NOT NULL,
  reason text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users can insert own reports" ON reports FOR INSERT WITH CHECK (auth.uid() = reporter_id);
CREATE POLICY "admins can read all" ON reports FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin)
);
```

### Suggested dashboard pages

```
/                → stats overview (users, listings, messages counts)
/users           → table: name, email, role, joined date, [change role] [ban]
/listings        → table: title, owner, type, verified?, premium?, [toggle] [hide]
/reports         → table: item, reporter, reason, [dismiss] [remove item]
```

### Vercel deployment steps
1. Create `apps/admin/` directory in this repo (or a separate repo)
2. `npx create-next-app@latest apps/admin --ts --app --no-tailwind` (or add Tailwind)
3. Add Supabase service-role key as Vercel env var `SUPABASE_SERVICE_ROLE_KEY`
4. Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. Protect every page with a session check + `is_admin` guard
6. Deploy: `vercel --prod` from `apps/admin/`

---

## Pre-Launch Checklist

- [ ] **Turn "Confirm email" back ON** in Supabase Dashboard → Authentication → Settings → Enable email confirmations. Currently OFF for testing.
- [ ] **Remove or mark seed/test data** — there is a seed agent account with ID `11111111-1111-1111-1111-111111111111`. Delete it or mark listings inactive before going public.
- [ ] **Rotate the Expo token** — the token `v0ARq2m-q_ug8fd-63SL9wIkMPu9UF4i6QLvROeo` is stored as `EXPO_TOKEN` in GitHub Secrets. Before revoking it on expo.dev, generate a new one first and update the secret, otherwise builds will break.
- [ ] **Set up Supabase Storage bucket policy** — confirm `listing-photos` bucket is public (or set signed URL TTL if private).
- [ ] **Enable Supabase email provider** (for production, switch from dev SMTP to a real provider like Resend or Postmark in Supabase → Auth → SMTP settings).
- [ ] **App Store / Play Store submission** — EAS Build can produce an AAB for Play Store. Run `eas build --platform android --profile production` with a new `production` profile in `eas.json`.

---

## Key Environment Variables

| Variable | Where | Value |
|----------|-------|-------|
| `EXPO_PUBLIC_SUPABASE_URL` | `eas.json` + `.env` | Your Supabase project URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | `eas.json` + `.env` | Your Supabase anon key |
| `EXPO_TOKEN` | GitHub Secret | Expo access token (do not log publicly) |
| `SUPABASE_SERVICE_ROLE_KEY` | Admin dashboard only (Vercel) | Never expose to client |

---

## OTA Update Flow (how it works after this session)

Every `git push` to `claude/repo-overview-g2rgj1` automatically:
1. Triggers `.github/workflows/eas-update.yml`
2. Publishes a JS bundle update to the "preview" EAS channel (~2 min)
3. The installed APK fetches and applies the update on next launch

No new APK needed for JS-only changes. Only rebuild APK when:
- Adding a new native module
- Changing `app.json` (permissions, splash, icon)
- Upgrading Expo SDK version

---

## Architecture Notes for the Next Session

- Chat uses Supabase Realtime on the `messages` table — no third-party service needed
- Online presence uses Supabase Realtime presence channels (`online-users`)
- Photos stored in Supabase Storage bucket `listing-photos` (compressed to 1600px/70% JPEG before upload via `lib/upload.ts`)
- Home tab uses 60s in-memory cache with pub/sub invalidation (`lib/listings-cache-bus.ts`) — any add/edit/delete triggers a refresh
- Android bottom inset clamped to 48px minimum in `lib/use-bottom-gap.ts` (MIUI bug workaround)
- Error handling: `lib/errors.ts` maps Postgres/Supabase errors to plain English strings
